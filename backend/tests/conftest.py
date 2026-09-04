"""Pytest configuration and global fixtures for ACP Adapter test suite."""
import pytest
from starlette.testclient import TestClient
from backend.services.anomaly import reset_anomaly_state_for_test
from backend.services.webhook import clear_dead_letter_events_for_test
from backend.services.inventory import reset_stock_for_test
from backend.services.auth import reset_auth_for_test, register_agent
from backend.services.rate_limiter import reset_rate_limiter

_CURRENT_TEST_KEY = None
_CURRENT_AGENT_ID = None

_orig_request = TestClient.request


def _patched_test_client_request(self, method, url, *args, **kwargs):
	headers = kwargs.get('headers')
	if headers is None:
		headers = {}
		kwargs['headers'] = headers
	if isinstance(headers, dict) and 'X-API-Key' not in headers and not getattr(self, 'skip_default_auth', False):
		if _CURRENT_TEST_KEY:
			headers['X-API-Key'] = _CURRENT_TEST_KEY
	return _orig_request(self, method, url, *args, **kwargs)


TestClient.request = _patched_test_client_request


def get_current_test_key() -> str:
	"""Helper for tests needing access to the currently active test API key."""
	return _CURRENT_TEST_KEY or ''


def get_current_test_agent_id() -> str:
	"""Helper for tests needing access to the currently active test agent ID."""
	return _CURRENT_AGENT_ID or ''


@pytest.fixture(autouse=True)
def clean_test_isolation_environment():
	"""Resets in-memory anomaly tracker, dead-letter queue, catalog inventory stock, agent auth, and rate limiter before each test."""
	global _CURRENT_TEST_KEY, _CURRENT_AGENT_ID
	reset_anomaly_state_for_test()
	clear_dead_letter_events_for_test()
	reset_stock_for_test()
	reset_auth_for_test()
	reset_rate_limiter()

	reg = register_agent(name='Pytest Default Test Agent')
	_CURRENT_TEST_KEY = reg['api_key']
	_CURRENT_AGENT_ID = reg['agent_id']

	yield

	reset_anomaly_state_for_test()
	clear_dead_letter_events_for_test()
	reset_stock_for_test()
	reset_auth_for_test()
	reset_rate_limiter()
