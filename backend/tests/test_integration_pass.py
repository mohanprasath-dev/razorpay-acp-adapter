"""End-to-End Integration Suite across all 7 ACP Endpoints."""
import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import SessionStatus, AuditAction
from backend.services.audit import get_session_audit_entries

client = TestClient(app)


def test_integration_pass_multi_run_isolation():
	"""
	Executes multiple consecutive buyer agent flows to ensure zero leftover state issues
	and exact lifecycle compliance.
	"""
	# Flow 1: Full Create -> Update -> Complete
	create_res_1 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Buyer One', 'email': 'buyer1@flow.ai'}
	})
	assert create_res_1.status_code == 201
	sess1_id = create_res_1.json()['id']

	update_res_1 = client.post(f'/checkout_sessions/{sess1_id}', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 2}]
	})
	assert update_res_1.status_code == 200
	assert update_res_1.json()['totals']['subtotal'] == 998.0

	client.post(f'/checkout_sessions/{sess1_id}/payment_method', json={'token': 'pm_tok_test_integ_001'})
	complete_res_1 = client.post(f'/checkout_sessions/{sess1_id}/complete')
	assert complete_res_1.status_code == 200
	assert complete_res_1.json()['status'] == 'completed'
	assert complete_res_1.json()['payment_provider']['razorpay_order_id'] is not None

	# Verify Flow 1 Audit Trail
	audits_1 = get_session_audit_entries(sess1_id)
	assert len(audits_1) == 4
	assert [a.action for a in audits_1] == [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.ATTACH_PAYMENT_METHOD, AuditAction.COMPLETE]

	# Flow 2: Independent Create -> Cancel (Must not be affected by Flow 1)
	create_res_2 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_003', 'quantity': 1}],
		'buyer': {'name': 'Buyer Two', 'email': 'buyer2@flow.ai'}
	})
	assert create_res_2.status_code == 201
	sess2_id = create_res_2.json()['id']
	assert sess2_id != sess1_id

	cancel_res_2 = client.post(f'/checkout_sessions/{sess2_id}/cancel')
	assert cancel_res_2.status_code == 200
	assert cancel_res_2.json()['status'] == 'cancelled'

	# Verify Flow 2 Audit Trail
	audits_2 = get_session_audit_entries(sess2_id)
	assert len(audits_2) == 2
	assert [a.action for a in audits_2] == [AuditAction.CREATE, AuditAction.CANCEL]

	# Verify Flow 1 remained intact and completed
	get_sess1 = client.get(f'/checkout_sessions/{sess1_id}')
	assert get_sess1.status_code == 200
	assert get_sess1.json()['status'] == 'completed'

	# Verify Flow 2 remained intact and cancelled
	get_sess2 = client.get(f'/checkout_sessions/{sess2_id}')
	assert get_sess2.status_code == 200
	assert get_sess2.json()['status'] == 'cancelled'


def test_all_seven_endpoints_reachability():
	"""
	Verifies that all 7 required ACP endpoints respond with correct status codes and schema.
	"""
	# 1. GET /.well-known/agent.json
	res1 = client.get('/.well-known/agent.json')
	assert res1.status_code == 200
	assert res1.json()['spec_version'] == '2026-04-17'

	# 2. GET /products
	res2 = client.get('/products')
	assert res2.status_code == 200
	assert len(res2.json()) == 5

	# 3. POST /checkout_sessions (create)
	res3 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	assert res3.status_code == 201
	sid = res3.json()['id']

	# 4. GET /checkout_sessions/{id}
	res4 = client.get(f'/checkout_sessions/{sid}')
	assert res4.status_code == 200

	# 5. POST /checkout_sessions/{id} (update)
	res5 = client.post(f'/checkout_sessions/{sid}', json={
		'discount': 50.0
	})
	assert res5.status_code == 200

	# Attach payment method
	res_pm = client.post(f'/checkout_sessions/{sid}/payment_method', json={
		'token': 'pm_tok_test_integ_002'
	})
	assert res_pm.status_code == 200

	# 6. POST /checkout_sessions/{id}/complete
	res6 = client.post(f'/checkout_sessions/{sid}/complete')
	assert res6.status_code == 200

	# 7. POST /checkout_sessions/{id}/cancel on a fresh session
	fresh_sid = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	}).json()['id']
	res7 = client.post(f'/checkout_sessions/{fresh_sid}/cancel')
	assert res7.status_code == 200

	# 8. POST /checkout_sessions/{id}/refund on the completed session
	res8 = client.post(f'/checkout_sessions/{sid}/refund', json={'reason': 'Integration reachability test'})
	assert res8.status_code == 200
	assert res8.json()['status'] == 'refunded'

