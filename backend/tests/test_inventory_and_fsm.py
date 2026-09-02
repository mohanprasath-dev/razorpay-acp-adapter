"""Tests for real inventory tracking, atomic stock decrement, and ready_for_payment FSM state (T11.1 & T11.2)."""
import pytest
import threading
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.inventory import reset_inventory, get_stock, set_stock

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_inventory():
	"""Reset inventory before each test."""
	reset_inventory({
		'prod_bolt_001': 100,
		'prod_bolt_002': 2,   # Stock = 2 for out-of-stock testing (price ₹4999, 3 units = ₹14997 < ₹50k limit)
		'prod_bolt_003': 15,
		'prod_bolt_004': 30,
		'prod_bolt_005': 10,
	})


def test_order_more_than_available_stock_returns_400():
	"""Ordering more than available stock (e.g. qty 3 when stock is 2) must be rejected with HTTP 400."""
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 3}]
	})
	assert res.status_code == 400
	data = res.json()
	assert data['detail']['error'] in ['out_of_stock', 'guardrail_violation']
	assert 'Insufficient stock' in data['detail']['reason']


def test_update_session_exceeding_stock_rejected():
	"""Updating session to exceed available stock must reject and transition session to rejected."""
	# Create valid session with 1 unit of prod_bolt_002 (stock=2)
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 1}]
	})
	assert res.status_code == 201
	sid = res.json()['id']

	# Update to 3 units (stock=2, order value ₹14,997 < ₹50,000 bound)
	res_update = client.post(f'/checkout_sessions/{sid}', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 3}]
	})
	assert res_update.status_code == 400
	assert 'Insufficient stock' in res_update.json()['detail']['reason']


def test_concurrent_completes_against_stock_one_item():
	"""Two concurrent completes against a stock=1 item — exactly one succeeds, one fails with out-of-stock."""
	set_stock('prod_bolt_002', 1)

	# Create two distinct sessions, each wanting 1 unit of prod_bolt_002
	res1 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 1}],
		'buyer': {'name': 'Agent One', 'email': 'one@agents.ai'}
	})
	assert res1.status_code == 201
	sid1 = res1.json()['id']

	res2 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 1}],
		'buyer': {'name': 'Agent Two', 'email': 'two@agents.ai'}
	})
	assert res2.status_code == 201
	sid2 = res2.json()['id']

	client.post(f'/checkout_sessions/{sid1}/payment_method', json={'token': 'pm_tok_test_inv_001'})
	client.post(f'/checkout_sessions/{sid2}/payment_method', json={'token': 'pm_tok_test_inv_002'})

	results = []

	def complete_session(sid):
		res = client.post(f'/checkout_sessions/{sid}/complete')
		results.append((sid, res.status_code, res.json()))

	t1 = threading.Thread(target=complete_session, args=(sid1,))
	t2 = threading.Thread(target=complete_session, args=(sid2,))

	t1.start()
	t2.start()
	t1.join()
	t2.join()

	status_codes = [r[1] for r in results]
	assert 200 in status_codes
	assert 400 in status_codes
	assert get_stock('prod_bolt_002') == 0


def test_cancel_or_reject_does_not_decrement_stock():
	"""Cancelling or rejecting a session must NOT decrement stock."""
	initial_stock = get_stock('prod_bolt_002')
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 1}]
	})
	assert res.status_code == 201
	sid = res.json()['id']

	# Stock should not be decremented upon create
	assert get_stock('prod_bolt_002') == initial_stock

	# Cancel session
	res_cancel = client.post(f'/checkout_sessions/{sid}/cancel')
	assert res_cancel.status_code == 200
	assert get_stock('prod_bolt_002') == initial_stock


def test_session_missing_fulfillment_address_stays_in_updated():
	"""Session missing fulfillment_address stays in created or updated, not ready_for_payment."""
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Test Buyer', 'email': 'buyer@example.com'}
	})
	assert res.status_code == 201
	session = res.json()
	assert session['status'] == 'created'
	sid = session['id']

	# Update line items without adding address
	res_update = client.post(f'/checkout_sessions/{sid}', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 2}]
	})
	assert res_update.status_code == 200
	assert res_update.json()['status'] == 'updated'


def test_session_with_full_details_transitions_to_ready_for_payment_and_completes():
	"""When all required fields are present on update, session transitions to ready_for_payment, and complete succeeds."""
	# 1. Create session with line items
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	assert res.status_code == 201
	session = res.json()
	assert session['status'] == 'created'
	sid = session['id']

	# 2. Update session with buyer and fulfillment_address
	update_payload = {
		'buyer': {
			'name': 'Agent Buyer',
			'email': 'agent@taskdrift.com',
			'phone': '+919876543210'
		},
		'fulfillment_address': {
			'line1': 'Tech Park 4B',
			'city': 'Bengaluru',
			'state': 'Karnataka',
			'postal_code': '560001',
			'country': 'IN'
		}
	}
	res_update = client.post(f'/checkout_sessions/{sid}', json=update_payload)
	assert res_update.status_code == 200

	# 3. Attach payment method token -> transitions to ready_for_payment
	res_pm = client.post(f'/checkout_sessions/{sid}/payment_method', json={
		'token': 'pm_tok_test_fsm_ready_001'
	})
	assert res_pm.status_code == 200
	updated_session = res_pm.json()
	assert updated_session['status'] == 'ready_for_payment'

	# 4. Complete from ready_for_payment
	initial_stock = get_stock('prod_bolt_001')
	res_complete = client.post(f'/checkout_sessions/{sid}/complete')
	assert res_complete.status_code == 200
	completed = res_complete.json()
	assert completed['status'] == 'completed'
	assert completed['payment_provider']['razorpay_order_id'] is not None
	# Verify stock decremented
	assert get_stock('prod_bolt_001') == initial_stock - 1
