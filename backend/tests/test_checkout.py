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


def test_get_checkout_session_success():
	# Create session first
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']

	# Fetch session
	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.status_code == 200
	assert get_res.json()['id'] == session_id
	assert get_res.json()['status'] == 'created'


def test_get_nonexistent_session_returns_404():
	response = client.get('/checkout_sessions/cs_does_not_exist_999')
	assert response.status_code == 404
	assert 'not found' in response.json()['detail'].lower()


def test_update_checkout_session_recomputes_totals():
	# 1. Create with 1 item of prod_bolt_001 (499.0)
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	assert create_res.json()['totals']['subtotal'] == 499.0

	# 2. Update to 3 items of prod_bolt_001 (499 * 3 = 1497.0)
	update_res = client.post(f'/checkout_sessions/{session_id}', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 3}]
	})
	assert update_res.status_code == 200
	updated_data = update_res.json()

	# Subtotal = 1497.0, Tax (18%) = 269.46, Total = 1766.46
	assert updated_data['status'] == 'updated'
	assert updated_data['totals']['subtotal'] == 1497.0
	assert updated_data['totals']['tax'] == 269.46
	assert updated_data['totals']['total'] == 1766.46

	# 3. GET immediately reflects the updated state, not stale
	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.status_code == 200
	assert get_res.json()['status'] == 'updated'
	assert get_res.json()['totals']['total'] == 1766.46
	assert len(get_res.json()['line_items']) == 1
	assert get_res.json()['line_items'][0]['quantity'] == 3


def test_full_mvp_lifecycle_checkpoint():
	"""
	Submission-readiness gate test:
	Walks Create -> Update -> Get sequence to guarantee complete end-to-end consistency.
	"""
	# Step A: Discovery
	agent_doc = client.get('/.well-known/agent.json').json()
	assert agent_doc['spec_version'] == '2026-04-17'
	assert agent_doc['payment_provider'] == 'razorpay'

	# Step B: Catalog Lookup
	catalog = client.get('/products').json()
	assert len(catalog) >= 5
	p1 = catalog[0]
	p2 = catalog[1]

	# Step C: Create Session with P1
	create_payload = {
		'line_items': [{'product_id': p1['id'], 'quantity': 2}],
		'buyer': {'name': 'AI Agent Test', 'email': 'agent@test.com'}
	}
	created = client.post('/checkout_sessions', json=create_payload).json()
	session_id = created['id']
	assert created['status'] == 'created'
	expected_p1_subtotal = round(p1['price'] * 2, 2)
	assert created['totals']['subtotal'] == expected_p1_subtotal

	# Step D: Update Session (add P2 and change address)
	update_payload = {
		'line_items': [
			{'product_id': p1['id'], 'quantity': 1},
			{'product_id': p2['id'], 'quantity': 1}
		],
		'fulfillment_address': {
			'line1': 'Tech Residency',
			'city': 'Bengaluru',
			'state': 'KA',
			'postal_code': '560001',
			'country': 'IN'
		}
	}
	updated = client.post(f'/checkout_sessions/{session_id}', json=update_payload).json()
	assert updated['status'] == 'updated'
	expected_subtotal = round(p1['price'] * 1 + p2['price'] * 1, 2)
	expected_tax = round(expected_subtotal * 0.18, 2)
	expected_total = round(expected_subtotal + expected_tax, 2)
	assert updated['totals']['subtotal'] == expected_subtotal
	assert updated['totals']['tax'] == expected_tax
	assert updated['totals']['total'] == expected_total
	assert updated['fulfillment_address']['city'] == 'Bengaluru'

	# Step E: Fetch and verify state consistency
	fetched = client.get(f'/checkout_sessions/{session_id}').json()
	assert fetched['id'] == session_id
	assert fetched['status'] == 'updated'
	assert fetched['totals']['total'] == expected_total
	assert len(fetched['line_items']) == 2
