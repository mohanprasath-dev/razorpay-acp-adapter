"""Tests for T17.1: Session TTL / Expiry with Stock Release."""
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.main import app
from backend.routers.checkout import get_session_by_id, save_session
from backend.services.inventory import (
	get_stock,
	set_stock,
	reserve_session_inventory,
	has_reserved_inventory,
)
from backend.models import LineItem

client = TestClient(app)


def test_session_has_default_expires_at():
	"""New session must have expires_at set roughly 30 minutes after created_at."""
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	})
	assert res.status_code == 201
	data = res.json()
	assert data['expires_at'] is not None

	created_at = datetime.fromisoformat(data['created_at'])
	expires_at = datetime.fromisoformat(data['expires_at'])
	diff_minutes = (expires_at - created_at).total_seconds() / 60.0
	assert 29.0 <= diff_minutes <= 31.0


def test_complete_expired_session_returns_409_conflict():
	"""Attempting to complete a session past expires_at returns 409 with expired_session error."""
	# 1. Create session
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Expiry Buyer', 'email': 'buyer@expire.test'},
		'fulfillment_address': {
			'line1': '123 Timeout Lane',
			'city': 'Bengaluru',
			'state': 'KA',
			'postal_code': '560001',
			'country': 'IN'
		}
	})
	assert res.status_code == 201
	sid = res.json()['id']

	# Attach payment method
	client.post(f'/checkout_sessions/{sid}/payment_method', json={'token': 'pm_tok_expiry_001'})

	# Force session to be expired in the past
	session = get_session_by_id(sid)
	assert session is not None
	past_time = datetime.now(timezone.utc) - timedelta(minutes=5)
	session.expires_at = past_time
	save_session(session)

	# 2. Attempt /complete -> must return 409 Conflict
	comp_res = client.post(f'/checkout_sessions/{sid}/complete')
	assert comp_res.status_code == 409
	err = comp_res.json()
	assert err['detail']['error'] == 'expired_session'
	assert err['detail']['status'] == 'cancelled'

	# Verify session status is now cancelled
	refreshed = client.get(f'/checkout_sessions/{sid}').json()
	assert refreshed['status'] == 'cancelled'


def test_internal_sweep_expired_endpoint():
	"""POST /internal/sweep_expired cancels expired active sessions and writes audit entry."""
	# Create 2 sessions
	res1 = client.post('/checkout_sessions', json={'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]})
	res2 = client.post('/checkout_sessions', json={'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]})
	sid1 = res1.json()['id']
	sid2 = res2.json()['id']

	# Manually expire sid1, keep sid2 active in future
	s1 = get_session_by_id(sid1)
	assert s1 is not None
	s1.expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
	save_session(s1)

	# Trigger background sweep
	sweep_res = client.post('/internal/sweep_expired')
	assert sweep_res.status_code == 200
	sweep_data = sweep_res.json()
	assert sid1 in sweep_data['expired_session_ids']
	assert sid2 not in sweep_data['expired_session_ids']

	# Verify sid1 is now cancelled
	assert client.get(f'/checkout_sessions/{sid1}').json()['status'] == 'cancelled'
	# Verify sid2 is still created
	assert client.get(f'/checkout_sessions/{sid2}').json()['status'] == 'created'

	# Verify audit entry for sid1 contains action cancel with reason expired
	audit_res = client.get(f'/checkout_sessions/{sid1}/audit')
	entries = audit_res.json()
	cancel_entries = [e for e in entries if e['action'] == 'cancel' and e['reason'] == 'expired']
	assert len(cancel_entries) >= 1
	assert cancel_entries[0]['actor'] == 'system_sweep'


def test_expired_session_releases_reserved_stock():
	"""Stock reserved by a session is automatically released on expiry sweep, making it available to a new session."""
	# Set stock of low-stock item to exactly 1
	set_stock('prod_bolt_002', 1)
	assert get_stock('prod_bolt_002') == 1

	# Create session 1
	res1 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 1}]
	})
	sid1 = res1.json()['id']

	# Soft-reserve the unit for session 1
	items = [LineItem(product_id='prod_bolt_002', quantity=1, unit_price=4999.0)]
	reserved_ok, _ = reserve_session_inventory(sid1, items)
	assert reserved_ok is True
	assert has_reserved_inventory(sid1) is True
	# Stock is now held (0 available)
	assert get_stock('prod_bolt_002') == 0

	# Session 2 tries to order -> rejected due to out of stock
	res2 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 1}]
	})
	assert res2.status_code == 400
	assert res2.json()['detail']['error'] == 'out_of_stock'

	# Session 1 expires
	s1 = get_session_by_id(sid1)
	assert s1 is not None
	s1.expires_at = datetime.now(timezone.utc) - timedelta(minutes=15)
	save_session(s1)

	# Trigger sweep
	sweep_res = client.post('/internal/sweep_expired')
	assert sid1 in sweep_res.json()['expired_session_ids']

	# Stock must now be released back to 1!
	assert get_stock('prod_bolt_002') == 1

	# Session 3 can now successfully purchase the released stock!
	res3 = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_002', 'quantity': 1}]
	})
	assert res3.status_code == 201
	assert res3.json()['status'] == 'created'
