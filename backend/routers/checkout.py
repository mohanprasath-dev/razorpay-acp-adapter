"""Checkout Session Router for Agentic Commerce Protocol (ACP).
Handles creation, updating, retrieval, authoritative totals calculation, and session persistence.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from backend.models import (
	Address,
	AuditAction,
	AuditEntry,
	Buyer,
	CheckoutSession,
	PaymentProvider,
	SessionStatus,
)
from backend.services.pricing import compute_authoritative_totals
from backend.db.firestore import get_firestore_client

router = APIRouter(prefix='/checkout_sessions', tags=['Checkout Sessions'])

# In-memory session store & idempotency cache for local/offline testing
_sessions_store: Dict[str, CheckoutSession] = {}
_idempotency_store: Dict[str, str] = {}
_audit_log_store: List[AuditEntry] = []


class RawLineItemInput(BaseModel):
	product_id: str
	quantity: int = Field(default=1, gt=0)
	unit_price: Optional[float] = None  # Ignored by server, looked up authoritatively


class CreateCheckoutSessionRequest(BaseModel):
	line_items: List[RawLineItemInput] = Field(..., min_length=1, description='List of items to purchase')
	buyer: Optional[Buyer] = None
	fulfillment_address: Optional[Address] = None
	discount: Optional[float] = Field(default=0.0, ge=0.0)


class UpdateCheckoutSessionRequest(BaseModel):
	line_items: Optional[List[RawLineItemInput]] = Field(default=None, description='Updated list of line items')
	buyer: Optional[Buyer] = None
	fulfillment_address: Optional[Address] = None
	discount: Optional[float] = Field(default=None, ge=0.0)


def save_session(session: CheckoutSession):
	"""Saves session to in-memory store and Firestore if available."""
	_sessions_store[session.id] = session
	db = get_firestore_client()
	if db is not None:
		try:
			session_dict = session.model_dump(mode='json')
			db.collection('checkout_sessions').document(session.id).set(session_dict)
		except Exception:
			pass


def get_session_by_id(session_id: str) -> Optional[CheckoutSession]:
	"""Retrieves session by ID from in-memory store or Firestore."""
	if session_id in _sessions_store:
		return _sessions_store[session_id]

	db = get_firestore_client()
	if db is not None:
		try:
			doc = db.collection('checkout_sessions').document(session_id).get()
			if doc.exists:
				session = CheckoutSession(**doc.to_dict())
				_sessions_store[session_id] = session
				return session
		except Exception:
			pass
	return None


def record_audit(
	session_id: str,
	action: AuditAction,
	actor: str = 'buyer_agent_sim',
	reason: Optional[str] = None,
	before_total: Optional[float] = None,
	after_total: Optional[float] = None
) -> AuditEntry:
	"""Records an immutable audit entry into memory and Firestore."""
	audit_entry = AuditEntry(
		id=f'audit_{uuid.uuid4().hex[:12]}',
		session_id=session_id,
		action=action,
		actor=actor,
		reason=reason,
		before_total=before_total,
		after_total=after_total,
		timestamp=datetime.now(timezone.utc)
	)
	_audit_log_store.append(audit_entry)

	db = get_firestore_client()
	if db is not None:
		try:
			audit_dict = audit_entry.model_dump(mode='json')
			db.collection('audit_entries').document(audit_entry.id).set(audit_dict)
		except Exception:
			pass

	return audit_entry


@router.post('', status_code=status.HTTP_201_CREATED, response_model=CheckoutSession, summary='Create Checkout Session')
async def create_checkout_session(
	request: CreateCheckoutSessionRequest,
	idempotency_key: Optional[str] = Header(default=None, alias='Idempotency-Key')
):
	"""
	Creates a new ACP Checkout Session with authoritative pricing, 18% tax calculation,
	Razorpay payment provider metadata, and immutable audit logging.
	Supports Idempotency-Key header for safe retries.
	"""
	# Check Idempotency Key
	if idempotency_key:
		if idempotency_key in _idempotency_store:
			existing_session_id = _idempotency_store[idempotency_key]
			existing_session = get_session_by_id(existing_session_id)
			if existing_session:
				return existing_session

	if not request.line_items:
		raise HTTPException(status_code=400, detail='line_items array cannot be empty.')

	# Compute authoritative totals and line items
	raw_items = [item.model_dump() for item in request.line_items]
	authoritative_items, totals = compute_authoritative_totals(
		raw_items=raw_items,
		discount_amount=request.discount or 0.0
	)

	session_id = f'cs_{uuid.uuid4().hex[:16]}'
	now = datetime.now(timezone.utc)

	session = CheckoutSession(
		id=session_id,
		status=SessionStatus.CREATED,
		line_items=authoritative_items,
		buyer=request.buyer,
		fulfillment_address=request.fulfillment_address,
		totals=totals,
		payment_provider=PaymentProvider(provider='razorpay', razorpay_order_id=None),
		created_at=now,
		updated_at=now
	)

	# Save session
	save_session(session)

	# Store idempotency key mapping
	if idempotency_key:
		_idempotency_store[idempotency_key] = session_id

	# Record audit log
	record_audit(
		session_id=session_id,
		action=AuditAction.CREATE,
		actor='buyer_agent_sim',
		before_total=None,
		after_total=totals.total
	)

	return session


@router.get('/{session_id}', response_model=CheckoutSession, summary='Get Checkout Session')
async def get_checkout_session(session_id: str):
	"""
	Retrieves the current authoritative state of a checkout session.
	Returns HTTP 404 if the session ID does not exist.
	"""
	session = get_session_by_id(session_id)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f'Checkout session with id "{session_id}" was not found.'
		)
	return session


@router.post('/{session_id}', response_model=CheckoutSession, summary='Update Checkout Session')
async def update_checkout_session(session_id: str, request: UpdateCheckoutSessionRequest):
	"""
	Updates an existing checkout session with line item modifications, shipping address,
	or discounts. Recomputes authoritative totals and marks status as 'updated'.
	"""
	session = get_session_by_id(session_id)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f'Checkout session with id "{session_id}" was not found.'
		)

	if session.status in [SessionStatus.COMPLETED, SessionStatus.REJECTED, SessionStatus.CANCELLED]:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Cannot update session "{session_id}" in terminal state "{session.status.value}".'
		)

	before_total = session.totals.total

	# Handle line item or discount updates with authoritative pricing
	new_line_items = session.line_items
	new_discount = request.discount if request.discount is not None else session.totals.discount

	if request.line_items is not None:
		if len(request.line_items) == 0:
			raise HTTPException(status_code=400, detail='line_items array cannot be empty on update.')
		raw_items = [item.model_dump() for item in request.line_items]
		authoritative_items, totals = compute_authoritative_totals(
			raw_items=raw_items,
			discount_amount=new_discount
		)
		new_line_items = authoritative_items
	elif request.discount is not None:
		# Recalculate totals for existing items with new discount
		raw_items = [{'product_id': item.product_id, 'quantity': item.quantity} for item in session.line_items]
		_, totals = compute_authoritative_totals(
			raw_items=raw_items,
			discount_amount=new_discount
		)
	else:
		totals = session.totals

	# Update buyer & address if supplied
	new_buyer = request.buyer if request.buyer is not None else session.buyer
	new_address = request.fulfillment_address if request.fulfillment_address is not None else session.fulfillment_address

	# Refresh session object
	now = datetime.now(timezone.utc)
	session.line_items = new_line_items
	session.buyer = new_buyer
	session.fulfillment_address = new_address
	session.totals = totals
	session.status = SessionStatus.UPDATED
	session.updated_at = now

	# Persist update
	save_session(session)

	# Record audit log
	record_audit(
		session_id=session_id,
		action=AuditAction.UPDATE,
		actor='buyer_agent_sim',
		before_total=before_total,
		after_total=totals.total
	)

	return session
