"""Tests for Checkpoint 2: Protocol Correctness.
Covers:
1. T12.1: Multi-turn cart negotiation (partial patches, removal with qty=0, authoritative recalculation, state preservation).
2. T12.2: Delegated payment method tokenization (stub service, token validation, attachment, completion prerequisite).
3. T12.3: Webhook retry with exponential backoff and dead-letter event logging.
"""
import pytest
from unittest.mock import patch, MagicMock
import urllib.error
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import AuditAction, SessionStatus
from backend.services.tokenization import generate_payment_token, validate_payment_token
from backend.services.webhook import (
	dispatch_webhook_event,
	get_dead_letter_events,
	clear_dead_letter_events_for_test
)
from backend.services.audit import get_session_audit_entries

client = TestClient(app)


def test_tokenization_service_unit():
	"""Unit tests for token generation and validation."""
	token = generate_payment_token()
	assert token.startswith('pm_tok_')
	assert validate_payment_token(token) is True

	# Test invalid tokens
	assert validate_payment_token('') is False
	assert validate_payment_token(None) is False
	assert validate_payment_token('invalid_token') is False
	assert validate_payment_token('pm_tok_') is False  # too short
	assert validate_payment_token('pm_tok_!@#$%') is False


def test_multi_turn_cart_negotiation_full_flow():
	"""
	T12.1: 4-step negotiation:
	Step 0: Create session with prod_bolt_001 (qty=1, ₹499)
	Step 1: Add new item prod_bolt_004 (qty=2, ₹2499 each -> subtotal ₹499 + ₹4998 = ₹5497)
	Step 2: Change quantity of prod_bolt_001 to 3 (subtotal ₹1497 + ₹4998 = ₹6495)
	Step 3: Remove prod_bolt_001 with quantity=0 (subtotal ₹4998)
	Step 4: Apply ₹200 discount (subtotal ₹4998, discount ₹200, taxable ₹4798 -> tax ₹863.64 -> total ₹5661.64)
	Assert each turn recomputes authoritative totals and logs before/after diffs in audit entries.
	"""
	# Step 0: Create session
	res0 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Negotiator Agent', 'email': 'negotiate@flow.ai'}
	})
	assert res0.status_code == 201
	sid = res0.json()['id']
	assert res0.json()['totals']['subtotal'] == 499.0
	assert res0.json()['totals']['total'] == 588.82

	# Step 1: Add prod_bolt_004 (qty=2)
	res1 = client.post(f'/checkout_sessions/{sid}', json={
		'line_items': [{'product_id': 'prod_bolt_004', 'quantity': 2}]
	})
	assert res1.status_code == 200
	session1 = res1.json()
	assert len(session1['line_items']) == 2
	assert session1['totals']['subtotal'] == 5497.0
	# Tax 18% on 5497 = 989.46 -> Total = 6486.46
	assert session1['totals']['total'] == 6486.46

	# Step 2: Change prod_bolt_001 quantity to 3
	res2 = client.post(f'/checkout_sessions/{sid}', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 3}]
	})
	assert res2.status_code == 200
	session2 = res2.json()
	assert session2['totals']['subtotal'] == 6495.0
	# Tax 18% on 6495 = 1169.10 -> Total = 7664.10
	assert session2['totals']['total'] == 7664.10

	# Step 3: Remove prod_bolt_001 with quantity=0
	res3 = client.post(f'/checkout_sessions/{sid}', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 0}]
	})
	assert res3.status_code == 200
	session3 = res3.json()
	assert len(session3['line_items']) == 1
	assert session3['line_items'][0]['product_id'] == 'prod_bolt_004'
	assert session3['line_items'][0]['quantity'] == 2
	assert session3['totals']['subtotal'] == 4998.0

	# Step 4: Apply discount ₹200
	res4 = client.post(f'/checkout_sessions/{sid}', json={
		'discount': 200.0
	})
	assert res4.status_code == 200
	session4 = res4.json()
	assert session4['totals']['subtotal'] == 4998.0
	assert session4['totals']['discount'] == 200.0
	# Taxable: 4798 * 0.18 = 863.64 -> Total = 5661.64
	assert session4['totals']['tax'] == 863.64
	assert session4['totals']['total'] == 5661.64

	# Verify audit entries diffs
	audits = get_session_audit_entries(sid)
	update_audits = [a for a in audits if a.action == AuditAction.UPDATE]
	assert len(update_audits) == 4
	for u in update_audits:
		assert u.before_total is not None
		assert u.after_total is not None


def test_negotiation_breach_guardrail_does_not_corrupt_prior_state():
	"""
	T12.1: An update proposing a breach of guardrails mid-negotiation is rejected
	without corrupting or wiping out the prior valid cart state.
	"""
	# Create initial valid session
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'discount': 50.0
	})
	assert res.status_code == 201
	sid = res.json()['id']
	initial_total = res.json()['totals']['total']

	# Attempt to breach discount bound: 80% discount on ₹499 item (₹400 discount > 50% max bound)
	breach_res = client.post(f'/checkout_sessions/{sid}', json={
		'discount': 400.0
	})
	assert breach_res.status_code == 400
	assert breach_res.json()['detail']['error'] == 'guardrail_violation'

	# Verify prior session data remains unmodified
	get_res = client.get(f'/checkout_sessions/{sid}')
	assert get_res.status_code == 200
	assert get_res.json()['totals']['total'] == initial_total
	assert get_res.json()['totals']['discount'] == 50.0

	# Subsequent valid update succeeds
	valid_update = client.post(f'/checkout_sessions/{sid}', json={
		'discount': 100.0
	})
	assert valid_update.status_code == 200
	assert valid_update.json()['totals']['discount'] == 100.0


def test_payment_method_tokenization_flow():
	"""
	T12.2: Payment method tokenization endpoint and complete requirement:
	1. Complete without token fails with 400.
	2. Invalid token format fails with 400.
	3. Valid token attaches and complete proceeds to Razorpay bridge.
	"""
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Token Test Buyer', 'email': 'token@test.ai'},
		'fulfillment_address': {
			'line1': '100 Silicon Way',
			'city': 'Bengaluru',
			'state': 'KA',
			'postal_code': '560001',
			'country': 'IN'
		}
	})
	assert res.status_code == 201
	sid = res.json()['id']

	# 1. Complete without payment method token must fail
	comp_fail = client.post(f'/checkout_sessions/{sid}/complete')
	assert comp_fail.status_code == 400
	assert 'missing delegated payment method token' in comp_fail.json()['detail'].lower()

	# 2. Invalid token format fails
	bad_token_res = client.post(f'/checkout_sessions/{sid}/payment_method', json={
		'token': 'not_a_valid_token'
	})
	assert bad_token_res.status_code == 400
	assert 'invalid payment method token format' in bad_token_res.json()['detail'].lower()

	# 3. Valid token attaches and transitions to ready_for_payment
	valid_token_res = client.post(f'/checkout_sessions/{sid}/payment_method', json={
		'token': 'pm_tok_test_valid_12345'
	})
	assert valid_token_res.status_code == 200
	assert valid_token_res.json()['payment_method_token'] == 'pm_tok_test_valid_12345'
	assert valid_token_res.json()['status'] == 'ready_for_payment'

	# 4. Complete proceeds normally to Razorpay bridge
	comp_ok = client.post(f'/checkout_sessions/{sid}/complete')
	assert comp_ok.status_code == 200
	assert comp_ok.json()['status'] == 'completed'
	assert comp_ok.json()['payment_provider']['razorpay_order_id'] is not None


def test_webhook_retry_and_dead_letter_logging():
	"""
	T12.3: Webhook target failing 3 times results in a DeadLetterEvent record,
	and GET /dead_letter_events returns the dead-lettered event.
	"""
	clear_dead_letter_events_for_test()

	with patch('urllib.request.urlopen', side_effect=urllib.error.HTTPError(
		url='http://mock.failing.webhook/acp',
		code=500,
		msg='Internal Server Error',
		hdrs={},
		fp=None
	)):
		record = dispatch_webhook_event(
			event_type='checkout_session.completed',
			data={'session_id': 'cs_test_dl_001'},
			target_url='http://mock.failing.webhook/acp',
			max_retries=3,
			initial_backoff=0.01
		)
		assert record['status'] == 'failed'
		assert record['attempts'] == 3

	# Verify DeadLetterEvent was created
	dead_letters = get_dead_letter_events()
	assert len(dead_letters) >= 1
	matching = [dl for dl in dead_letters if dl.session_id == 'cs_test_dl_001']
	assert len(matching) == 1
	assert matching[0].attempts == 3
	assert '500' in matching[0].last_error

	# Check GET /dead_letter_events API endpoint
	api_res = client.get('/dead_letter_events')
	assert api_res.status_code == 200
	items = api_res.json()
	assert any(item['session_id'] == 'cs_test_dl_001' for item in items)


def test_webhook_success_on_retry_does_not_dead_letter():
	"""
	T12.3: Webhook that succeeds on retry 2 does NOT create a dead-letter record.
	"""
	clear_dead_letter_events_for_test()

	mock_resp = MagicMock()
	mock_resp.getcode.return_value = 200
	mock_resp.__enter__.return_value = mock_resp

	# First call fails with 503, second call succeeds with 200
	with patch('urllib.request.urlopen', side_effect=[
		urllib.error.HTTPError(url='http://mock.retry.webhook/acp', code=503, msg='Service Unavailable', hdrs={}, fp=None),
		mock_resp
	]):
		record = dispatch_webhook_event(
			event_type='checkout_session.completed',
			data={'session_id': 'cs_test_retry_ok_001'},
			target_url='http://mock.retry.webhook/acp',
			max_retries=3,
			initial_backoff=0.01
		)
		assert record['status'] == 'delivered'
		assert record['attempts'] == 2

	# Verify NO DeadLetterEvent was created
	dead_letters = get_dead_letter_events()
	matching = [dl for dl in dead_letters if dl.session_id == 'cs_test_retry_ok_001']
	assert len(matching) == 0
