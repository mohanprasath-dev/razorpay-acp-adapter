"""Unit & API tests for Sliding-Window Rate Limiter."""
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.rate_limiter import is_rate_limited, reset_rate_limiter

client = TestClient(app)


def test_is_rate_limited_unit_sliding_window():
	reset_rate_limiter()
	client_id = 'test_agent_node_1'

	# Window allows 3 requests in 10 seconds
	for i in range(3):
		limited, retry_after, remaining = is_rate_limited(client_id, max_requests=3, window_seconds=10)
		assert limited is False
		assert remaining == (2 - i)

	# 4th request must be limited
	limited, retry_after, remaining = is_rate_limited(client_id, max_requests=3, window_seconds=10)
	assert limited is True
	assert retry_after > 0
	assert remaining == 0


def test_rate_limit_http_429_enforcement():
	reset_rate_limiter()
	client_ip = '198.51.100.42'
	headers = {'X-Forwarded-For': client_ip}

	# Rapidly fire requests to trigger limiter with low artificial threshold or test limits
	# First normal request
	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	}, headers=headers)
	assert res.status_code in [201, 400]

	# Manually fill the window
	for _ in range(125):
		is_rate_limited(client_ip, max_requests=120, window_seconds=60)

	# Next HTTP request from this IP must be blocked with HTTP 429
	res_blocked = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	}, headers=headers)

	assert res_blocked.status_code == 429
	data = res_blocked.json()
	assert data['detail']['error'] == 'rate_limit_exceeded'
	assert 'Retry-After' in res_blocked.headers

	# Cleanup
	reset_rate_limiter()
