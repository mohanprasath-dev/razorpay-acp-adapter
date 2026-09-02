from fastapi.testclient import TestClient
from backend.main import app
from backend.models import AuditAction, SessionStatus
from backend.services.audit import clear_audit_entries_for_test, get_all_audit_entries, get_session_audit_entries
from backend.services.guardrails import (
	MAX_DISCOUNT_PERCENTAGE,
	MAX_ORDER_VALUE_INR,
	MAX_QUANTITY_PER_ITEM,
	validate_guardrails,
)
from backend.services.pricing import compute_authoritative_totals

client = TestClient(app)


def test_guardrails_within_bounds_succeeds():
	clear_audit_entries_for_test()
	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 2}],  # 499 * 2 = 998.0
		'discount': 100.0  # 10% discount (< 50% max)
	}

	response = client.post('/checkout_sessions', json=payload)
	assert response.status_code == 201
	data = response.json()
	assert data['status'] == 'created'
	assert data['totals']['discount'] == 100.0

	# Verify exactly 1 audit entry written with action=create and reason=None
	audits = get_all_audit_entries()
	assert len(audits) == 1
	assert audits[0].action == AuditAction.CREATE
	assert audits[0].reason is None
	assert audits[0].session_id == data['id']


def test_guardrails_excessive_discount_rejected():
	clear_audit_entries_for_test()
	# Subtotal = 1000.0, requested discount = 600.0 (60% > 50% max)
	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 2}],  # 499 * 2 = 998.0
		'discount': 600.0  # ~60.1% discount
	}

	response = client.post('/checkout_sessions', json=payload)
	assert response.status_code == 400
	error_data = response.json()['detail']
	assert error_data['error'] == 'guardrail_violation'
	assert error_data['status'] == 'rejected'
	assert 'Requested discount' in error_data['reason']
	assert f'maximum allowed bound of {MAX_DISCOUNT_PERCENTAGE:.0f}%' in error_data['reason']

	# Verify session document in store was recorded as rejected
	session_id = error_data['session_id']
	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.status_code == 200
	assert get_res.json()['status'] == 'rejected'

	# Verify exactly 1 audit entry written with action=reject and human-readable reason
	session_audits = get_session_audit_entries(session_id)
	assert len(session_audits) == 1
	assert session_audits[0].action == AuditAction.REJECT
	assert session_audits[0].reason is not None
	assert 'maximum allowed bound' in session_audits[0].reason


def test_guardrails_excessive_quantity_rejected():
	clear_audit_entries_for_test()
	# Quantity = 15 (> 10 max quantity per item)
	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 15}]
	}

	response = client.post('/checkout_sessions', json=payload)
	assert response.status_code == 400
	error_data = response.json()['detail']
	assert error_data['error'] == 'guardrail_violation'
	assert 'exceeds maximum allowed bound of 10 units' in error_data['reason']

	session_id = error_data['session_id']
	session_audits = get_session_audit_entries(session_id)
	assert len(session_audits) == 1
	assert session_audits[0].action == AuditAction.REJECT
	assert 'exceeds maximum allowed bound of 10 units' in session_audits[0].reason


def test_guardrails_excessive_order_value_rejected():
	clear_audit_entries_for_test()
	# prod_bolt_005 (14,999.0) * 4 = ₹59,996 (> ₹50,000 max order value)
	payload = {
		'line_items': [{'product_id': 'prod_bolt_005', 'quantity': 4}]
	}

	response = client.post('/checkout_sessions', json=payload)
	assert response.status_code == 400
	error_data = response.json()['detail']
	assert error_data['error'] == 'guardrail_violation'
	assert 'exceeds maximum single-order bound of ₹50,000.00' in error_data['reason']

	session_id = error_data['session_id']
	session_audits = get_session_audit_entries(session_id)
	assert len(session_audits) == 1
	assert session_audits[0].action == AuditAction.REJECT
	assert '₹50,000.00' in session_audits[0].reason


def test_update_session_violating_guardrail_transitions_to_rejected():
	clear_audit_entries_for_test()
	# 1. Create valid session (499.0)
	create_res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	session_id = create_res.json()['id']
	assert create_res.json()['status'] == 'created'

	# 2. Update with excessive discount (400 on 499 = 80.1%)
	update_res = client.post(f'/checkout_sessions/{session_id}', json={
		'discount': 400.0
	})
	assert update_res.status_code == 400
	assert update_res.json()['detail']['status'] == 'rejected'

	# 3. GET reflects rejected state
	get_res = client.get(f'/checkout_sessions/{session_id}')
	assert get_res.status_code == 200
	assert get_res.json()['status'] == 'rejected'

	# Verify 2 audit entries total: 1 create + 1 reject
	session_audits = get_session_audit_entries(session_id)
	assert len(session_audits) == 2
	assert session_audits[0].action == AuditAction.CREATE
	assert session_audits[1].action == AuditAction.REJECT


def test_deterministic_guardrails_unit_direct():
	items, totals = compute_authoritative_totals(
		raw_items=[{'product_id': 'prod_bolt_001', 'quantity': 2}],
		discount_amount=0.0
	)
	passed, reason = validate_guardrails(line_items=items, totals=totals, discount_amount=0.0)
	assert passed is True
	assert reason is None
