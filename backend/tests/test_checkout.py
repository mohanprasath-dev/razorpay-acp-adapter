import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import SessionStatus

client = TestClient(app)


def test_create_checkout_session_valid():
	payload = {
		'line_items': [
			{'product_id': 'prod_bolt_001', 'quantity': 2},
			{'product_id': 'prod_bolt_004', 'quantity': 1}
		],
		'buyer': {
			'name': 'Autonomous Buyer Agent',
			'email': 'buyer@agentic.ai',
			'phone': '+919988776655'
		},
		'fulfillment_address': {
			'line1': 'Level 4, AI Commerce Hub',
			'city': 'Bengaluru',
			'state': 'Karnataka',
			'postal_code': '560001',
			'country': 'IN'
		}
	}

	response = client.post('/checkout_sessions', json=payload)
	assert response.status_code == 201
	data = response.json()

	# Assert structure and status
	assert data['id'].startswith('cs_')
	assert data['status'] == 'created'
	assert len(data['line_items']) == 2
	assert data['buyer']['email'] == 'buyer@agentic.ai'

	# Expected totals calculation:
	# prod_bolt_001 (499.0 * 2) = 998.0
	# prod_bolt_004 (2499.0 * 1) = 2499.0
	# subtotal = 3497.0
	# tax (18%) = 629.46
	# total = 4126.46
	assert data['totals']['subtotal'] == 3497.0
	assert data['totals']['discount'] == 0.0
	assert data['totals']['tax'] == 629.46
	assert data['totals']['total'] == 4126.46
	assert data['totals']['currency'] == 'INR'

	# Payment provider metadata
	assert data['payment_provider']['provider'] == 'razorpay'
	assert data['payment_provider']['razorpay_order_id'] is None


def test_create_checkout_session_empty_line_items():
	payload = {
		'line_items': []
	}
	response = client.post('/checkout_sessions', json=payload)
	assert response.status_code in [400, 422]
	assert 'line_items' in str(response.json()).lower()


def test_create_checkout_session_ignores_client_price():
	# Client tries to pass unit_price of 1.0 for a 4999.0 product
	payload = {
		'line_items': [
			{'product_id': 'prod_bolt_002', 'quantity': 1, 'unit_price': 1.0}
		]
	}
	response = client.post('/checkout_sessions', json=payload)
	assert response.status_code == 201
	data = response.json()

	# Must use catalog unit price 4999.0, NOT 1.0
	assert data['line_items'][0]['unit_price'] == 4999.0
	assert data['totals']['subtotal'] == 4999.0
	assert data['totals']['tax'] == 899.82
	assert data['totals']['total'] == 5898.82


def test_create_checkout_session_idempotency():
	idempotency_key = f'idem_key_{uuid.uuid4().hex}'
	headers = {'Idempotency-Key': idempotency_key}
	payload = {
		'line_items': [
			{'product_id': 'prod_bolt_001', 'quantity': 1}
		]
	}

	# First call
	res1 = client.post('/checkout_sessions', json=payload, headers=headers)
	assert res1.status_code == 201
	session1 = res1.json()

	# Second call with identical idempotency key
	res2 = client.post('/checkout_sessions', json=payload, headers=headers)
	assert res2.status_code in [200, 201]
	session2 = res2.json()

	# Must return the exact same session
	assert session1['id'] == session2['id']
	assert session1['totals'] == session2['totals']


def test_get_checkout_session_success():
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']

	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.status_code == 200
	assert get_res.json()['id'] == session_id
	assert get_res.json()['status'] == 'created'


def test_get_nonexistent_session_returns_404():
	response = client.get('/checkout_sessions/cs_does_not_exist_999')
	assert response.status_code == 404
	assert 'not found' in response.json()['detail'].lower()


def test_update_checkout_session_recomputes_totals():
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	assert create_res.json()['totals']['subtotal'] == 499.0

	update_res = client.post(f'/checkout_sessions/{session_id}', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 3}]
	})
	assert update_res.status_code == 200
	updated_data = update_res.json()

	assert updated_data['status'] == 'updated'
	assert updated_data['totals']['subtotal'] == 1497.0
	assert updated_data['totals']['tax'] == 269.46
	assert updated_data['totals']['total'] == 1766.46

	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.status_code == 200
	assert get_res.json()['status'] == 'updated'
	assert get_res.json()['totals']['total'] == 1766.46


def test_complete_checkout_session_success():
	# 1. Create session
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_004', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	assert create_res.json()['payment_provider']['razorpay_order_id'] is None

	# 2. Complete session
	complete_res = client.post(f'/checkout_sessions/{session_id}/complete')
	assert complete_res.status_code == 200
	completed_session = complete_res.json()

	assert completed_session['status'] == 'completed'
	assert completed_session['payment_provider']['provider'] == 'razorpay'
	assert completed_session['payment_provider']['razorpay_order_id'] is not None
	assert completed_session['payment_provider']['razorpay_order_id'].startswith('order_')

	# 3. GET reflects completed state and order id
	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.status_code == 200
	assert get_res.json()['status'] == 'completed'
	assert get_res.json()['payment_provider']['razorpay_order_id'] == completed_session['payment_provider']['razorpay_order_id']


def test_complete_already_completed_session_fails():
	# Create and complete
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	client.post(f'/checkout_sessions/{session_id}/complete')

	# Second complete attempt must return 400
	repeat_res = client.post(f'/checkout_sessions/{session_id}/complete')
	assert repeat_res.status_code == 400
	assert 'already completed' in repeat_res.json()['detail'].lower()


def test_full_create_update_complete_flow():
	# 1. Create session with 1 unit
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Agent Charlie', 'email': 'charlie@agent.ai'}
	})
	session_id = create_res.json()['id']
	assert create_res.json()['status'] == 'created'

	# 2. Update session to 2 units
	update_res = client.post(f'/checkout_sessions/{session_id}', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 2}]
	})
	assert update_res.json()['status'] == 'updated'
	assert update_res.json()['totals']['subtotal'] == 998.0

	# 3. Complete session
	complete_res = client.post(f'/checkout_sessions/{session_id}/complete')
	assert complete_res.status_code == 200
	completed = complete_res.json()
	assert completed['status'] == 'completed'
	assert completed['payment_provider']['razorpay_order_id'] is not None
	assert completed['totals']['total'] == 1177.64


def test_cancel_checkout_session_success():
	# 1. Create session
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	assert create_res.json()['status'] == 'created'

	# 2. Cancel session
	cancel_res = client.post(f'/checkout_sessions/{session_id}/cancel')
	assert cancel_res.status_code == 200
	cancelled_session = cancel_res.json()
	assert cancelled_session['status'] == 'cancelled'

	# 3. GET reflects cancelled state
	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.status_code == 200
	assert get_res.json()['status'] == 'cancelled'


def test_cancel_completed_session_fails():
	# 1. Create and complete session
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	client.post(f'/checkout_sessions/{session_id}/complete')

	# 2. Attempt to cancel completed session must return 409
	cancel_res = client.post(f'/checkout_sessions/{session_id}/cancel')
	assert cancel_res.status_code == 409
	assert 'already completed' in cancel_res.json()['detail'].lower()


def test_cancel_already_cancelled_session_fails():
	# 1. Create and cancel
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	client.post(f'/checkout_sessions/{session_id}/cancel')

	# 2. Second cancel attempt must return 409
	repeat_res = client.post(f'/checkout_sessions/{session_id}/cancel')
	assert repeat_res.status_code == 409
	assert 'already cancelled' in repeat_res.json()['detail'].lower()


def test_list_checkout_sessions():
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']

	list_res = client.get('/checkout_sessions')
	assert list_res.status_code == 200
	sessions = list_res.json()
	assert isinstance(sessions, list)
	assert any(s['id'] == session_id for s in sessions)


def test_get_session_audit_trail_and_global_audit():
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	client.post(f'/checkout_sessions/{session_id}/cancel')

	# Session audit
	audit_res = client.get(f'/checkout_sessions/{session_id}/audit')
	assert audit_res.status_code == 200
	entries = audit_res.json()
	assert len(entries) >= 2
	actions = [e['action'] for e in entries]
	assert 'create' in actions
	assert 'cancel' in actions

	# Global audit
	global_res = client.get('/audit_entries')
	assert global_res.status_code == 200
	global_entries = global_res.json()
	assert any(e['session_id'] == session_id for e in global_entries)
