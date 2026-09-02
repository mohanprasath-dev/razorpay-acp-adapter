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
	LineItem,
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
from backend.services.inventory import (
	validate_inventory_availability,
	decrement_inventory_atomic,
	get_stock,
)
from backend.services.tokenization import generate_payment_token, validate_payment_token
from backend.services.anomaly import (
	record_session_creation,
	record_guardrail_violation,
	record_spend,
	evaluate_anomaly_score,
)

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


class RawLineItemUpdateInput(BaseModel):
	product_id: str
	quantity: int = Field(default=1, ge=0, description='Quantity (0 removes item from cart)')
	unit_price: Optional[float] = None


class CreateCheckoutSessionRequest(BaseModel):
	line_items: List[RawLineItemInput] = Field(..., min_length=1, description='List of items to purchase')
	buyer: Optional[Buyer] = None
	fulfillment_address: Optional[Address] = None
	discount: Optional[float] = Field(default=0.0, ge=0.0)


class UpdateCheckoutSessionRequest(BaseModel):
	line_items: Optional[List[RawLineItemUpdateInput]] = Field(default=None, description='Updated or patched line items')
	buyer: Optional[Buyer] = None
	fulfillment_address: Optional[Address] = None
	discount: Optional[float] = Field(default=None, ge=0.0)


class AttachPaymentMethodRequest(BaseModel):
	token: Optional[str] = Field(default=None, description='ACP payment method token (e.g. pm_tok_<hex>)')


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
	3. Validates inventory availability and deterministic guardrail rules.
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
		is_guardrail_err = not passed

		# Check Inventory Availability if guardrails passed
		if passed:
			stock_ok, stock_reason = validate_inventory_availability(authoritative_items)
			if not stock_ok:
				passed = False
				reject_reason = stock_reason
				is_guardrail_err = False

		# Record and evaluate anomaly score
		identifier = (request.buyer.email if request.buyer and request.buyer.email else f'anon_{session_id}').strip().lower()
		record_session_creation(identifier)
		if not passed and is_guardrail_err:
			record_guardrail_violation(identifier)

		anomaly_score, anomaly_flags, should_block = evaluate_anomaly_score(identifier, current_order_amount=totals.total)

		if should_block:
			action_type = AuditAction.FLAGGED_ANOMALOUS
			reason_str = f'Unusual autonomous agent traffic pattern detected (Score {anomaly_score}/100: {", ".join(anomaly_flags)})'
			record_audit_entry(
				session_id=session_id,
				action=action_type,
				actor='buyer_agent_sim',
				reason=reason_str,
				before_total=None,
				after_total=totals.total
			)
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail={
					'error': 'anomaly_detected',
					'reason': 'Unusual autonomous agent traffic pattern detected',
					'anomaly_score': anomaly_score,
					'flags': anomaly_flags,
					'session_id': session_id
				}
			)

		initial_status = SessionStatus.CREATED if passed else SessionStatus.REJECTED
		is_flagged_anomalous = anomaly_score >= 70

		session = CheckoutSession(
			id=session_id,
			status=initial_status,
			line_items=authoritative_items,
			buyer=request.buyer,
			fulfillment_address=request.fulfillment_address,
			totals=totals,
			payment_provider=PaymentProvider(provider='razorpay', razorpay_order_id=None),
			payment_method_token=None,
			is_anomalous=is_flagged_anomalous,
			anomaly_score=anomaly_score,
			created_at=now,
			updated_at=now
		)

		# Save session
		save_session(session)

		# Store idempotency key mapping
		if idempotency_key:
			save_idempotency_mapping(idempotency_key, session_id)

		# Record audit log & dispatch webhooks
		if is_flagged_anomalous:
			record_audit_entry(
				session_id=session_id,
				action=AuditAction.FLAGGED_ANOMALOUS,
				actor='buyer_agent_sim',
				reason=f'Elevated anomaly score ({anomaly_score}/100): {", ".join(anomaly_flags)}',
				before_total=None,
				after_total=totals.total
			)

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
			action_type = AuditAction.REJECT if is_guardrail_err else AuditAction.OUT_OF_STOCK
			record_audit_entry(
				session_id=session_id,
				action=action_type,
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
					'error': 'guardrail_violation' if is_guardrail_err else 'out_of_stock',
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


def is_ready_for_payment(
	buyer: Optional[Buyer],
	fulfillment_address: Optional[Address],
	line_items: List[LineItem],
	payment_method_token: Optional[str] = None
) -> bool:
	"""
	A session is ready_for_payment when:
	1. Buyer info is present with valid name and email.
	2. Fulfillment address is present with non-empty line1, city, state, postal_code, country.
	3. Line items list is non-empty.
	4. Delegated payment method token is attached.
	"""
	if not buyer or not (buyer.name and buyer.name.strip()) or not (buyer.email and buyer.email.strip()):
		return False
	if not fulfillment_address:
		return False
	if not (
		fulfillment_address.line1 and fulfillment_address.line1.strip()
		and fulfillment_address.city and fulfillment_address.city.strip()
		and fulfillment_address.state and fulfillment_address.state.strip()
		and fulfillment_address.postal_code and fulfillment_address.postal_code.strip()
		and fulfillment_address.country and fulfillment_address.country.strip()
	):
		return False
	if not line_items:
		return False
	if not payment_method_token:
		return False
	return True


@router.post(
	'/{session_id}',
	response_model=CheckoutSession,
	dependencies=[Depends(rate_limit_dependency)],
	summary='Update Checkout Session'
)
async def update_checkout_session(session_id: str, request: UpdateCheckoutSessionRequest):
	"""
	Updates an existing checkout session with multi-turn cart negotiation support:
	- Supports partial line item patches: add item, change quantity, or remove item (quantity=0).
	- Supports applying, changing, or removing discounts (recalculating authoritative totals).
	- Re-validates inventory availability and guardrails on every turn.
	- Preserves session state on invalid negotiation proposals.
	"""
	session = get_session_by_id(session_id)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f'Checkout session with id "{session_id}" was not found.'
		)

	if session.status in [SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.REFUNDED]:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Cannot update session "{session_id}" in terminal state "{session.status.value}".'
		)

	before_total = session.totals.total

	# Handle multi-turn line item patches and discount updates
	new_discount = request.discount if request.discount is not None else session.totals.discount

	if request.line_items is not None:
		if len(request.line_items) == 0:
			raise HTTPException(status_code=400, detail='line_items array cannot be empty on update.')
		
		# Merge patch into current cart items map
		items_map: Dict[str, int] = {item.product_id: item.quantity for item in session.line_items}
		for item_patch in request.line_items:
			if item_patch.quantity == 0:
				items_map.pop(item_patch.product_id, None)
			else:
				items_map[item_patch.product_id] = item_patch.quantity
		
		if not items_map:
			raise HTTPException(status_code=400, detail='line_items cannot be empty. At least one product must remain in cart.')

		raw_items = [{'product_id': pid, 'quantity': q} for pid, q in items_map.items()]
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
		new_line_items = session.line_items
	else:
		new_line_items = session.line_items
		totals = session.totals

	# Evaluate Guardrails for update
	passed, reject_reason = validate_guardrails(
		line_items=new_line_items,
		totals=totals,
		discount_amount=new_discount
	)
	is_guardrail_err = not passed

	# Check Inventory Availability for update if guardrails passed
	if passed:
		stock_ok, stock_reason = validate_inventory_availability(new_line_items)
		if not stock_ok:
			passed = False
			reject_reason = stock_reason
			is_guardrail_err = False

	now = datetime.now(timezone.utc)
	new_buyer = request.buyer if request.buyer is not None else session.buyer
	new_address = request.fulfillment_address if request.fulfillment_address is not None else session.fulfillment_address

	if not passed:
		session.status = SessionStatus.REJECTED
		session.updated_at = now
		save_session(session)

		action_type = AuditAction.REJECT if is_guardrail_err else AuditAction.OUT_OF_STOCK
		record_audit_entry(
			session_id=session_id,
			action=action_type,
			actor='buyer_agent_sim',
			reason=reject_reason,
			before_total=before_total,
			after_total=totals.total
		)

		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail={
				'error': 'guardrail_violation' if is_guardrail_err else 'out_of_stock',
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
	session.status = SessionStatus.READY_FOR_PAYMENT if is_ready_for_payment(new_buyer, new_address, new_line_items, session.payment_method_token) else SessionStatus.UPDATED
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
	'/{session_id}/payment_method',
	response_model=CheckoutSession,
	dependencies=[Depends(rate_limit_dependency)],
	summary='Attach Delegated Payment Method Token'
)
async def attach_payment_method(session_id: str, request: Optional[AttachPaymentMethodRequest] = None):
	"""
	Attaches a delegated payment method token to the checkout session per ACP spec.
	Validates token format (pm_tok_...) or generates a stub token if not provided.
	Transitions session status to 'ready_for_payment' once buyer, address, items, and token are present.
	"""
	session = get_session_by_id(session_id)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f'Checkout session with id "{session_id}" was not found.'
		)

	if session.status in [SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.REFUNDED]:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Cannot attach payment method to session "{session_id}" in terminal state "{session.status.value}".'
		)

	token = request.token if request and request.token else generate_payment_token()
	if not validate_payment_token(token):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Invalid payment method token format: "{token}". Expected format "pm_tok_<identifier>".'
		)

	session.payment_method_token = token
	now = datetime.now(timezone.utc)
	session.updated_at = now

	if is_ready_for_payment(session.buyer, session.fulfillment_address, session.line_items, session.payment_method_token):
		session.status = SessionStatus.READY_FOR_PAYMENT

	save_session(session)

	record_audit_entry(
		session_id=session_id,
		action=AuditAction.ATTACH_PAYMENT_METHOD,
		actor='buyer_agent_sim',
		reason=f'Attached delegated payment token {token[:16]}...',
		before_total=session.totals.total,
		after_total=session.totals.total
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
	1. Validates active status and attached payment method token.
	2. Atomically decrements catalog inventory.
	3. Creates Razorpay Order scoped to total.
	4. Transitions session to 'completed'.
	5. Logs AuditEntry and dispatches signed HMAC webhook event.
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

	# Verify delegated payment method token is attached
	if not session.payment_method_token:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Cannot complete checkout session "{session_id}": missing delegated payment method token. Call POST /checkout_sessions/{session_id}/payment_method first.'
		)

	if session.status in [SessionStatus.CREATED, SessionStatus.UPDATED]:
		logger.warning(
			f'Session {session_id} completed directly from state "{session.status.value}" '
			'without explicit ready_for_payment transition.'
		)

	# Atomically decrement inventory
	decremented, decr_reason = decrement_inventory_atomic(session.line_items)
	if not decremented:
		session.status = SessionStatus.REJECTED
		session.updated_at = datetime.now(timezone.utc)
		save_session(session)

		record_audit_entry(
			session_id=session_id,
			action=AuditAction.OUT_OF_STOCK,
			actor='buyer_agent_sim',
			reason=decr_reason,
			before_total=session.totals.total,
			after_total=session.totals.total
		)

		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail={
				'error': 'out_of_stock',
				'reason': decr_reason,
				'session_id': session_id,
				'status': 'rejected'
			}
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

