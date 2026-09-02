import uuid
import concurrent.futures
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.audit import clear_audit_entries_for_test, get_all_audit_entries, get_session_audit_entries

client = TestClient(app)


def test_rapid_sequential_idempotency():
	clear_audit_entries_for_test()
	idempotency_key = f'idem_seq_{uuid.uuid4().hex}'
	headers = {'Idempotency-Key': idempotency_key}
	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Idempotent Buyer', 'email': 'idem@test.com'}
	}

	# Send first request
	res1 = client.post('/checkout_sessions', json=payload, headers=headers)
	assert res1.status_code == 201
	session1 = res1.json()
	sess_id = session1['id']

	# Send duplicate request in rapid succession
	res2 = client.post('/checkout_sessions', json=payload, headers=headers)
	assert res2.status_code in [200, 201]
	session2 = res2.json()

	# Assert exact match
	assert session2['id'] == sess_id
	assert session2['totals'] == session1['totals']
	assert session2['created_at'] == session1['created_at']

	# Verify exactly 1 audit entry was recorded for the session
	session_audits = get_session_audit_entries(sess_id)
	assert len(session_audits) == 1


def test_different_idempotency_keys_create_distinct_sessions():
	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	}
	key1 = f'idem_distinct_{uuid.uuid4().hex}'
	key2 = f'idem_distinct_{uuid.uuid4().hex}'

	res1 = client.post('/checkout_sessions', json=payload, headers={'Idempotency-Key': key1})
	res2 = client.post('/checkout_sessions', json=payload, headers={'Idempotency-Key': key2})

	assert res1.status_code == 201
	assert res2.status_code == 201
	assert res1.json()['id'] != res2.json()['id']


def test_concurrent_idempotency_requests():
	clear_audit_entries_for_test()
	idempotency_key = f'idem_concurrent_{uuid.uuid4().hex}'
	payload = {
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 1}]
	}

	def send_request():
		return client.post(
			'/checkout_sessions',
			json=payload,
			headers={'Idempotency-Key': idempotency_key}
		)

	# Execute 4 parallel requests concurrently
	with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
		futures = [executor.submit(send_request) for _ in range(4)]
		results = [f.result() for f in futures]

	for res in results:
		assert res.status_code in [200, 201]

	session_ids = {r.json()['id'] for r in results}
	# All concurrent calls must resolve to the single identical session ID
	assert len(session_ids) == 1
	single_session_id = session_ids.pop()

	session_audits = get_session_audit_entries(single_session_id)
	assert len(session_audits) >= 1


def test_no_duplicate_razorpay_orders_on_repeat_complete():
	# 1. Create and complete session
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']

	complete_res1 = client.post(f'/checkout_sessions/{session_id}/complete')
	assert complete_res1.status_code == 200
	order_id_1 = complete_res1.json()['payment_provider']['razorpay_order_id']
	assert order_id_1 is not None

	# 2. Attempting to complete again returns 400 error and does not generate a new order
	complete_res2 = client.post(f'/checkout_sessions/{session_id}/complete')
	assert complete_res2.status_code == 400
	assert 'already completed' in complete_res2.json()['detail'].lower()

	# 3. State verification: Order ID remains unchanged
	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.json()['payment_provider']['razorpay_order_id'] == order_id_1
