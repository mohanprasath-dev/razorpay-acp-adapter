"""Checkout Session Router for Agentic Commerce Protocol (ACP).
Handles creation, updating, retrieval, completion, cancellation, guardrail bounds checking, and audit logging.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict
from fastapi import APIRouter, Header, HTTPException, status, Depends
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
from backend.services.guardrails import validate_guardrails
from backend.services.razorpay_service import create_order, create_refund
from backend.services.audit import record_audit_entry, get_all_audit_entries, get_session_audit_entries
from backend.services.webhook import dispatch_webhook_event
from backend.services.rate_limiter import rate_limit_dependency
from backend.db.firestore import get_firestore_client

import threading

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/checkout_sessions', tags=['Checkout Sessions'])

# In-memory session store & idempotency cache for local/offline testing
_sessions_store: Dict[str, CheckoutSession] = {}
_idempotency_store: Dict[str, str] = {}
_idempotency_lock = threading.Lock()


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


class RefundCheckoutSessionRequest(BaseModel):
	reason: Optional[str] = Field(default='Buyer requested post-completion refund', description='Reason for refund')
	amount: Optional[float] = Field(default=None, gt=0.0, description='Refund amount; defaults to full session total')


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


def get_idempotency_session_id(key: str) -> Optional[str]:
	"""Looks up existing session mapped to idempotency key in memory or Firestore."""
	if key in _idempotency_store:
		return _idempotency_store[key]

	db = get_firestore_client()
	if db is not None:
		try:
			doc = db.collection('idempotency_keys').document(key).get()
			if doc.exists:
				session_id = doc.to_dict().get('session_id')
				if session_id:
					_idempotency_store[key] = session_id
					return session_id
		except Exception:
			pass
	return None


def save_idempotency_mapping(key: str, session_id: str):
	"""Saves idempotency key mapping in memory and Firestore."""
	_idempotency_store[key] = session_id
	db = get_firestore_client()
	if db is not None:
		try:
			db.collection('idempotency_keys').document(key).set({
				'key': key,
				'session_id': session_id,
				'created_at': datetime.now(timezone.utc).isoformat()
			})
		except Exception:
			pass


def get_all_sessions() -> List[CheckoutSession]:
	"""Retrieves all sessions from in-memory store and Firestore sorted by created_at descending."""
	sessions_map = dict(_sessions_store)
	db = get_firestore_client()
	if db is not None:
		try:
			docs = db.collection('checkout_sessions').stream()
			for doc in docs:
				data = doc.to_dict()
				session = CheckoutSession(**data)
				sessions_map[session.id] = session
		except Exception:
			pass
	sessions = list(sessions_map.values())
	sessions.sort(key=lambda x: x.created_at, reverse=True)
	return sessions


@router.get('', response_model=List[CheckoutSession], summary='List All Checkout Sessions')
async def list_checkout_sessions():
	"""Lists all active and historical checkout sessions."""
	return get_all_sessions()


@router.post(
	'',
	status_code=status.HTTP_201_CREATED,
	response_model=CheckoutSession,
	dependencies=[Depends(rate_limit_dependency)],
	summary='Create Checkout Session'
)
async def create_checkout_session(
	request: CreateCheckoutSessionRequest,
	idempotency_key: Optional[str] = Header(default=None, alias='Idempotency-Key')
):
	"""
	Creates a new ACP Checkout Session:
	1. Enforces idempotency via Idempotency-Key header.
	2. Computes authoritative pricing from server catalog.
	3. Runs deterministic guardrail rule engine (max discount, max order value, max quantity).
	4. Persists session and writes immutable AuditEntry for all checks (pass or reject).
	5. Dispatches signed HMAC webhook event.
	"""
	with _idempotency_lock:
		# Check Idempotency Key
		if idempotency_key:
			existing_session_id = get_idempotency_session_id(idempotency_key)
			if existing_session_id:
				existing_session = get_session_by_id(existing_session_id)
				if existing_session:
					return existing_session

		if not request.line_items:
			raise HTTPException(status_code=400, detail='line_items array cannot be empty.')

		discount_amount = request.discount or 0.0

		# Compute authoritative totals and line items
		raw_items = [item.model_dump() for item in request.line_items]
		authoritative_items, totals = compute_authoritative_totals(
			raw_items=raw_items,
			discount_amount=discount_amount
		)

		session_id = f'cs_{uuid.uuid4().hex[:16]}'
		now = datetime.now(timezone.utc)

		# Evaluate Guardrails
		passed, reject_reason = validate_guardrails(
			line_items=authoritative_items,
			totals=totals,
			discount_amount=discount_amount
		)

		initial_status = SessionStatus.CREATED if passed else SessionStatus.REJECTED

		session = CheckoutSession(
			id=session_id,
			status=initial_status,
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
			save_idempotency_mapping(idempotency_key, session_id)

		# Record audit log & dispatch webhooks
		if passed:
			record_audit_entry(
				session_id=session_id,
				action=AuditAction.CREATE,
				actor='buyer_agent_sim',
				reason=None,
				before_total=None,
				after_total=totals.total
			)
			dispatch_webhook_event('checkout_session.created', session.model_dump(mode='json'))
			return session
		else:
			record_audit_entry(
				session_id=session_id,
				action=AuditAction.REJECT,
				actor='buyer_agent_sim',
				reason=reject_reason,
				before_total=None,
				after_total=totals.total
			)
			dispatch_webhook_event('checkout_session.rejected', {
				'session_id': session_id,
				'reason': reject_reason,
				'totals': totals.model_dump(mode='json')
			})
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail={
					'error': 'guardrail_violation',
					'reason': reject_reason,
					'session_id': session_id,
					'status': 'rejected'
				}
			)


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


@router.get('/{session_id}/audit', response_model=List[AuditEntry], summary='Get Session Audit Trail')
async def get_session_audit(session_id: str):
	"""Retrieves the chronological audit trail for a specific checkout session."""
	session = get_session_by_id(session_id)
	entries = get_session_audit_entries(session_id)
	if not session and not entries:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f'Checkout session with id "{session_id}" was not found.'
		)
	return entries


@router.post(
	'/{session_id}',
	response_model=CheckoutSession,
	dependencies=[Depends(rate_limit_dependency)],
	summary='Update Checkout Session'
)
async def update_checkout_session(session_id: str, request: UpdateCheckoutSessionRequest):
	"""
	Updates an existing checkout session.
	Evaluates guardrail rules on new configuration before applying.
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
		raw_items = [{'product_id': item.product_id, 'quantity': item.quantity} for item in session.line_items]
		_, totals = compute_authoritative_totals(
			raw_items=raw_items,
			discount_amount=new_discount
		)
	else:
		totals = session.totals

	# Evaluate Guardrails for update
	passed, reject_reason = validate_guardrails(
		line_items=new_line_items,
		totals=totals,
		discount_amount=new_discount
	)

	now = datetime.now(timezone.utc)
	new_buyer = request.buyer if request.buyer is not None else session.buyer
	new_address = request.fulfillment_address if request.fulfillment_address is not None else session.fulfillment_address

	if not passed:
		session.status = SessionStatus.REJECTED
		session.updated_at = now
		save_session(session)

		record_audit_entry(
			session_id=session_id,
			action=AuditAction.REJECT,
			actor='buyer_agent_sim',
			reason=reject_reason,
			before_total=before_total,
			after_total=totals.total
		)

		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail={
				'error': 'guardrail_violation',
				'reason': reject_reason,
				'session_id': session_id,
				'status': 'rejected'
			}
		)

	# Update session
	session.line_items = new_line_items
	session.buyer = new_buyer
	session.fulfillment_address = new_address
	session.totals = totals
	session.status = SessionStatus.UPDATED
	session.updated_at = now

	# Persist update
	save_session(session)

	# Record audit log
	record_audit_entry(
		session_id=session_id,
		action=AuditAction.UPDATE,
		actor='buyer_agent_sim',
		before_total=before_total,
		after_total=totals.total
	)

	return session


@router.post(
	'/{session_id}/complete',
	response_model=CheckoutSession,
	dependencies=[Depends(rate_limit_dependency)],
	summary='Complete Checkout Session'
)
async def complete_checkout_session(session_id: str):
	"""
	Finalizes the checkout session:
	1. Validates active status.
	2. Creates Razorpay Order scoped to total.
	3. Transitions session to 'completed'.
	4. Logs AuditEntry and dispatches signed HMAC webhook event.
	"""
	session = get_session_by_id(session_id)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f'Checkout session with id "{session_id}" was not found.'
		)

	if session.status == SessionStatus.COMPLETED:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Checkout session "{session_id}" is already completed with Razorpay order "{session.payment_provider.razorpay_order_id}".'
		)

	if session.status in [SessionStatus.REJECTED, SessionStatus.CANCELLED, SessionStatus.REFUNDED]:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Cannot complete checkout session "{session_id}" in terminal state "{session.status.value}".'
		)

	# Create real Razorpay test-mode Order scoped to total
	try:
		rzp_order = create_order(
			amount=session.totals.total,
			currency=session.totals.currency,
			session_id=session.id
		)
	except Exception as exc:
		logger.error(f'Failed to bridge to Razorpay Orders API for session {session_id}: {exc}')
		raise HTTPException(
			status_code=status.HTTP_502_BAD_GATEWAY,
			detail=f'Failed to create payment rail order with Razorpay: {str(exc)}'
		)

	now = datetime.now(timezone.utc)
	session.payment_provider.razorpay_order_id = rzp_order['id']
	session.status = SessionStatus.COMPLETED
	session.updated_at = now

	save_session(session)

	record_audit_entry(
		session_id=session_id,
		action=AuditAction.COMPLETE,
		actor='buyer_agent_sim',
		before_total=session.totals.total,
		after_total=session.totals.total
	)

	# Outbound HMAC-signed webhook event
	dispatch_webhook_event('checkout_session.completed', {
		'session_id': session.id,
		'status': 'completed',
		'razorpay_order_id': rzp_order['id'],
		'total': session.totals.total,
		'currency': session.totals.currency
	})

	return session


@router.post(
	'/{session_id}/cancel',
	response_model=CheckoutSession,
	dependencies=[Depends(rate_limit_dependency)],
	summary='Cancel Checkout Session'
)
async def cancel_checkout_session(session_id: str):
	"""
	Cancels an incomplete checkout session.
	Transitions status to 'cancelled', records AuditEntry, and dispatches signed webhook.
	"""
	session = get_session_by_id(session_id)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f'Checkout session with id "{session_id}" was not found.'
		)

	if session.status == SessionStatus.COMPLETED:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail=f'Cannot cancel checkout session "{session_id}" because it is already completed with Razorpay order "{session.payment_provider.razorpay_order_id}". Use /refund endpoint.'
		)

	if session.status == SessionStatus.CANCELLED:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail=f'Checkout session "{session_id}" is already cancelled.'
		)

	if session.status in [SessionStatus.REJECTED, SessionStatus.REFUNDED]:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Cannot cancel checkout session "{session_id}" in terminal state "{session.status.value}".'
		)

	now = datetime.now(timezone.utc)
	session.status = SessionStatus.CANCELLED
	session.updated_at = now

	save_session(session)

	record_audit_entry(
		session_id=session_id,
		action=AuditAction.CANCEL,
		actor='buyer_agent_sim',
		before_total=session.totals.total,
		after_total=session.totals.total
	)

	dispatch_webhook_event('checkout_session.cancelled', {
		'session_id': session.id,
		'status': 'cancelled'
	})

	return session


@router.post(
	'/{session_id}/refund',
	response_model=CheckoutSession,
	dependencies=[Depends(rate_limit_dependency)],
	summary='Refund Completed Checkout Session'
)
async def refund_checkout_session(session_id: str, request: Optional[RefundCheckoutSessionRequest] = None):
	"""
	Executes a post-completion cancellation/refund on a finalized ACP session:
	1. Validates session is in 'completed' state with an active Razorpay Order.
	2. Bridges to Razorpay Refund API (client.payment.refund / create_refund).
	3. Transitions session to 'refunded' and records AuditAction.REFUND.
	4. Dispatches HMAC-signed 'checkout_session.refunded' webhook event.
	"""
	session = get_session_by_id(session_id)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f'Checkout session with id "{session_id}" was not found.'
		)

	if session.status == SessionStatus.REFUNDED:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail=f'Checkout session "{session_id}" has already been refunded with refund id "{session.payment_provider.refund_id}".'
		)

	if session.status != SessionStatus.COMPLETED:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Cannot refund session "{session_id}" in status "{session.status.value}". Only completed sessions can be refunded.'
		)

	refund_reason = request.reason if request and request.reason else 'Buyer requested post-completion refund'
	refund_amount = request.amount if request and request.amount else session.totals.total

	if refund_amount > session.totals.total:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Refund amount (₹{refund_amount}) cannot exceed original session total (₹{session.totals.total}).'
		)

	# Execute Razorpay refund via payment rail bridge
	try:
		refund_res = create_refund(
			order_id=session.payment_provider.razorpay_order_id or session.id,
			amount=refund_amount,
			session_id=session.id,
			reason=refund_reason
		)
	except Exception as exc:
		logger.error(f'Failed to execute Razorpay refund for session {session_id}: {exc}')
		raise HTTPException(
			status_code=status.HTTP_502_BAD_GATEWAY,
			detail=f'Payment rail refund failed: {str(exc)}'
		)

	now = datetime.now(timezone.utc)
	session.payment_provider.refund_id = refund_res.get('id')
	session.status = SessionStatus.REFUNDED
	session.updated_at = now

	save_session(session)

	record_audit_entry(
		session_id=session_id,
		action=AuditAction.REFUND,
		actor='buyer_agent_sim',
		reason=refund_reason,
		before_total=session.totals.total,
		after_total=0.0
	)

	dispatch_webhook_event('checkout_session.refunded', {
		'session_id': session.id,
		'status': 'refunded',
		'refund_id': session.payment_provider.refund_id,
		'amount_refunded': refund_amount,
		'reason': refund_reason
	})

	return session

