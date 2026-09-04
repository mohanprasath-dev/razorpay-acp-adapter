"""Inbound Webhook Router for Razorpay Payment & Order Callbacks (ACP)."""
import hmac
import hashlib
import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, Header, Request, HTTPException, status
from backend.config import get_settings
from backend.models import SessionStatus, AuditAction
from backend.routers.checkout import get_all_sessions, save_session
from backend.services.inventory import (
	decrement_inventory_atomic,
	commit_session_inventory,
	has_reserved_inventory,
)
from backend.services.audit import record_audit_entry

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/webhooks', tags=['Inbound Webhooks'])


def verify_razorpay_signature(raw_body: bytes, signature: str, secret: str) -> bool:
	"""
	Verifies Razorpay inbound webhook signature using HMAC-SHA256 with constant-time comparison.
	Razorpay signs the exact raw request payload bytes with the secret.
	"""
	if not signature or not secret:
		return False
	clean_sig = signature.strip()
	expected = hmac.new(
		secret.encode('utf-8'),
		raw_body,
		hashlib.sha256
	).hexdigest()
	return hmac.compare_digest(clean_sig, expected)


@router.post('/razorpay', summary='Inbound Razorpay Webhook Receiver')
async def handle_razorpay_webhook(
	request: Request,
	x_razorpay_signature: str = Header(default=None, alias='X-Razorpay-Signature')
) -> Dict[str, Any]:
	"""
	Receives, cryptographically verifies, and defensively reconciles inbound Razorpay webhooks:
	1. Verifies X-Razorpay-Signature header against RAZORPAY_KEY_SECRET using HMAC-SHA256.
	2. Immediately rejects forgery attempts with HTTP 400 and distinct security warning logging.
	3. Extracts payment/order events and reconciles against server-authoritative checkout session truth.
	4. Defensively validates currency and payment amount (paise to INR).
	5. Unknown order IDs are safely logged and returned without crashing.
	"""
	settings = get_settings()
	raw_body = await request.body()
	secret = settings.RAZORPAY_KEY_SECRET

	client_ip = request.client.host if request.client else 'unknown'

	# Verify cryptographic HMAC signature
	if not x_razorpay_signature or not verify_razorpay_signature(raw_body, x_razorpay_signature, secret):
		logger.warning(
			f'[SECURITY ATTEMPTED FORGERY] Inbound Razorpay webhook signature verification FAILED '
			f'from IP {client_ip}. Signature: "{x_razorpay_signature}"'
		)
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail={
				'error': 'invalid_signature',
				'message': 'Inbound Razorpay HMAC-SHA256 signature verification failed.'
			}
		)

	# Parse JSON payload
	try:
		payload = json.loads(raw_body.decode('utf-8'))
	except Exception as exc:
		logger.error(f'Failed to parse valid-signed Razorpay webhook JSON: {exc}')
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail={'error': 'invalid_json', 'message': 'Malformed JSON body.'}
		)

	event = payload.get('event', '')
	logger.info(f'[Razorpay Inbound Webhook] Verified event "{event}" received from {client_ip}')

	# Process payment.captured or order.paid
	if event in ['payment.captured', 'order.paid']:
		payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
		order_entity = payload.get('payload', {}).get('order', {}).get('entity', {})

		order_id = payment_entity.get('order_id') or order_entity.get('id')
		if not order_id:
			logger.warning('[Razorpay Inbound Webhook] No order_id present in payment entity.')
			return {'status': 'ignored', 'reason': 'missing_order_id'}

		# Cross-check against all sessions to locate matching session
		matching_session = None
		for s in get_all_sessions():
			if s.payment_provider and s.payment_provider.razorpay_order_id == order_id:
				matching_session = s
				break

		if not matching_session:
			logger.warning(
				f'[Razorpay Inbound Webhook] Verified signature but unknown order_id "{order_id}". '
				'Safely ignored to avoid server error.'
			)
			return {'status': 'ignored', 'reason': f'Unknown order_id: {order_id}'}

		# Defensive reconciliation: verify amount and currency match server truth
		if payment_entity:
			inbound_currency = payment_entity.get('currency', '').upper()
			inbound_amount_paise = payment_entity.get('amount', 0)
			inbound_amount_rupees = round(inbound_amount_paise / 100.0, 2)

			if inbound_currency and inbound_currency != matching_session.totals.currency:
				logger.error(
					f'[Defensive Reconcile Reject] Currency mismatch: webhook {inbound_currency} '
					f'vs session {matching_session.totals.currency}'
				)
				return {'status': 'rejected', 'reason': 'currency_mismatch'}

			if abs(inbound_amount_rupees - matching_session.totals.total) > 0.01:
				logger.error(
					f'[Defensive Reconcile Reject] Amount mismatch: webhook ₹{inbound_amount_rupees} '
					f'vs session ₹{matching_session.totals.total}'
				)
				return {'status': 'rejected', 'reason': 'amount_mismatch'}

		# If session is already completed, return idempotent success
		if matching_session.status == SessionStatus.COMPLETED:
			return {
				'status': 'already_completed',
				'session_id': matching_session.id,
				'order_id': order_id
			}

		# Transition state to completed and update inventory
		if has_reserved_inventory(matching_session.id):
			commit_session_inventory(matching_session.id)
		else:
			decrement_inventory_atomic(matching_session.line_items)

		matching_session.status = SessionStatus.COMPLETED
		save_session(matching_session)

		record_audit_entry(
			session_id=matching_session.id,
			action=AuditAction.COMPLETE,
			actor='razorpay_webhook',
			reason=f'Reconciled via verified inbound webhook event "{event}" for order "{order_id}"',
			before_total=matching_session.totals.total,
			after_total=matching_session.totals.total
		)

		logger.info(f'[Razorpay Inbound Webhook] Session {matching_session.id} reconciled to completed.')
		return {
			'status': 'reconciled',
			'session_id': matching_session.id,
			'order_id': order_id
		}

	return {'status': 'acknowledged', 'event': event}
