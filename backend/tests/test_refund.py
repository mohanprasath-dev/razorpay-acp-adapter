"""Unit & Integration tests for POST /checkout_sessions/{id}/refund endpoint."""
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import SessionStatus, AuditAction
from backend.services.audit import get_session_audit_entries
from backend.services.razorpay_service import create_refund

client = TestClient(app)


def test_refund_completed_session_success():
	# 1. Create and complete a checkout session
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Refund Test Buyer', 'email': 'buyer@refund.ai'}
	})
	assert create_res.status_code == 201
	sid = create_res.json()['id']

	client.post(f'/checkout_sessions/{sid}/payment_method', json={'token': 'pm_tok_test_refund_001'})
	complete_res = client.post(f'/checkout_sessions/{sid}/complete')
	assert complete_res.status_code == 200
	assert complete_res.json()['status'] == 'completed'
	order_id = complete_res.json()['payment_provider']['razorpay_order_id']

	# 2. Issue Refund
	refund_res = client.post(f'/checkout_sessions/{sid}/refund', json={
		'reason': 'Customer requested cancellation post-payment',
		'amount': 588.82
	})
	assert refund_res.status_code == 200
	data = refund_res.json()
	assert data['status'] == 'refunded'
	assert data['payment_provider']['refund_id'] is not None
	assert data['payment_provider']['refund_id'].startswith('rfrq_')

	# 3. Verify Audit Trail
	audits = get_session_audit_entries(sid)
	actions = [a.action for a in audits]
	assert AuditAction.REFUND in actions
	refund_audit = [a for a in audits if a.action == AuditAction.REFUND][0]
	assert refund_audit.reason == 'Customer requested cancellation post-payment'
	assert refund_audit.after_total == 0.0


def test_refund_duplicate_fails():
	# Create and complete
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	sid = create_res.json()['id']
	client.post(f'/checkout_sessions/{sid}/payment_method', json={'token': 'pm_tok_test_refund_002'})
	client.post(f'/checkout_sessions/{sid}/complete')

	# First refund succeeds
	res1 = client.post(f'/checkout_sessions/{sid}/refund', json={'reason': 'Initial refund'})
	assert res1.status_code == 200

	# Second refund must fail with 409 Conflict
	res2 = client.post(f'/checkout_sessions/{sid}/refund', json={'reason': 'Repeat refund'})
	assert res2.status_code == 409


def test_refund_incomplete_session_fails():
	# Create session without completing
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	sid = create_res.json()['id']

	# Refund must fail because session is in 'created' state
	res = client.post(f'/checkout_sessions/{sid}/refund')
	assert res.status_code == 400
	assert 'Cannot refund session' in res.json()['detail']


def test_razorpay_refund_bridge_live_mock():
	mock_client = MagicMock()
	mock_client.order.payments.return_value = {
		'items': [{'id': 'pay_live_test_123', 'amount': 10000}]
	}
	mock_client.payment.refund.return_value = {
		'id': 'rfnd_live_mock_555',
		'entity': 'refund',
		'amount': 10000,
		'status': 'processed'
	}

	with patch('backend.services.razorpay_service.get_settings') as mock_settings, \
		 patch('backend.services.razorpay_service.get_razorpay_client', return_value=mock_client):

		mock_settings.return_value.RAZORPAY_KEY_ID = 'rzp_test_live_key'
		mock_settings.return_value.RAZORPAY_KEY_SECRET = 'live_secret'

		refund_res = create_refund(
			order_id='order_123',
			amount=100.0,
			session_id='cs_refund_test',
			reason='Live SDK Refund Test'
		)

		assert refund_res['id'] == 'rfnd_live_mock_555'
		assert mock_client.order.payments.call_count == 1
		assert mock_client.payment.refund.call_count == 1
