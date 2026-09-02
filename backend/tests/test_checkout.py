import uuid
from fastapi.testclient import TestClient
from backend.main import app

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


def test_create_checkout_session_invalid_product():
	payload = {
		'line_items': [
			{'product_id': 'prod_non_existent', 'quantity': 1}
		]
	}
	response = client.post('/checkout_sessions', json=payload)
	assert response.status_code == 400
	assert 'Invalid product_id' in response.json()['detail']
