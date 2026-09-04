"""Tests for T16.2: Inbound Razorpay Webhook Signature Verification and Defensive Reconciliation."""
import hmac
import hashlib
import json
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import get_settings
from backend.models import SessionStatus, PaymentProvider
from backend.routers.checkout import get_session_by_id, save_session

client = TestClient(app)
settings = get_settings()


def generate_test_signature(body_bytes: bytes, secret: str = None) -> str:
	"""Generates valid HMAC-SHA256 hex signature for test payloads."""
	sec = secret or settings.RAZORPAY_KEY_SECRET
	return hmac.new(sec.encode('utf-8'), body_bytes, hashlib.sha256).hexdigest()


def test_inbound_webhook_valid_signature_processes_and_updates_session():
	"""Valid signature with payment.captured event reconciles and completes matching session."""
	# 1. Create a session
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	assert res.status_code == 201
	session = get_session_by_id(res.json()['id'])
	assert session is not None

	fake_order_id = 'order_test_inbound_001'
	session.payment_provider = PaymentProvider(provider='razorpay', razorpay_order_id=fake_order_id)
	save_session(session)

	# 2. Build verified webhook payload
	total_paise = int(round(session.totals.total * 100))
	payload_dict = {
		'entity': 'event',
		'event': 'payment.captured',
		'payload': {
			'payment': {
				'entity': {
					'id': 'pay_test_001',
					'order_id': fake_order_id,
					'amount': total_paise,
					'currency': 'INR',
					'status': 'captured'
				}
			}
		}
	}
	body_bytes = json.dumps(payload_dict).encode('utf-8')
	valid_sig = generate_test_signature(body_bytes)

	# 3. Post to /webhooks/razorpay
	resp = client.post(
		'/webhooks/razorpay',
		content=body_bytes,
		headers={'X-Razorpay-Signature': valid_sig, 'Content-Type': 'application/json'}
	)
	assert resp.status_code == 200
	data = resp.json()
	assert data['status'] == 'reconciled'
	assert data['session_id'] == session.id

	# 4. Verify session transitioned to completed
	refreshed = get_session_by_id(session.id)
	assert refreshed.status == SessionStatus.COMPLETED

	# 5. Verify audit trail logged completion with actor razorpay_webhook
	audit_res = client.get(f'/checkout_sessions/{session.id}/audit')
	entries = audit_res.json()
	webhook_entries = [e for e in entries if e['actor'] == 'razorpay_webhook']
	assert len(webhook_entries) == 1
	assert webhook_entries[0]['action'] == 'complete'


def test_inbound_webhook_invalid_signature_rejected_with_400():
	"""Tampered or invalid signature is rejected with HTTP 400 and never modifies session state."""
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	sid = res.json()['id']
	initial_status = res.json()['status']

	payload_dict = {
		'entity': 'event',
		'event': 'payment.captured',
		'payload': {
			'payment': {
				'entity': {
					'id': 'pay_tampered_001',
					'order_id': 'order_fake',
					'amount': 58882,
					'currency': 'INR'
				}
			}
		}
	}
	body_bytes = json.dumps(payload_dict).encode('utf-8')
	invalid_sig = 'deadbeef0000111122223333444455556666777788889999aaaabbbbccccdddd'

	resp = client.post(
		'/webhooks/razorpay',
		content=body_bytes,
		headers={'X-Razorpay-Signature': invalid_sig, 'Content-Type': 'application/json'}
	)
	assert resp.status_code == 400
	err = resp.json()
	assert err['detail']['error'] == 'invalid_signature'

	# Verify session status never changed
	current_session = get_session_by_id(sid)
	assert current_session.status.value == initial_status


def test_inbound_webhook_valid_signature_unknown_order_safely_ignored():
	"""Valid signature with unknown order_id is safely ignored and logged without crashing."""
	payload_dict = {
		'entity': 'event',
		'event': 'payment.captured',
		'payload': {
			'payment': {
				'entity': {
					'id': 'pay_unknown_001',
					'order_id': 'order_nonexistent_xyz999',
					'amount': 10000,
					'currency': 'INR'
				}
			}
		}
	}
	body_bytes = json.dumps(payload_dict).encode('utf-8')
	valid_sig = generate_test_signature(body_bytes)

	resp = client.post(
		'/webhooks/razorpay',
		content=body_bytes,
		headers={'X-Razorpay-Signature': valid_sig, 'Content-Type': 'application/json'}
	)
	assert resp.status_code == 200
	data = resp.json()
	assert data['status'] == 'ignored'
	assert 'order_nonexistent_xyz999' in data['reason']
