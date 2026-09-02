"""Pytest configuration and global fixtures for ACP Adapter test suite."""
import pytest
from backend.services.anomaly import reset_anomaly_state_for_test
from backend.services.webhook import clear_dead_letter_events_for_test
from backend.services.inventory import reset_stock_for_test


@pytest.fixture(autouse=True)
def clean_test_isolation_environment():
	"""Resets in-memory anomaly tracker, dead-letter queue, and catalog inventory stock before each test."""
	reset_anomaly_state_for_test()
	clear_dead_letter_events_for_test()
	reset_stock_for_test()
	yield
	reset_anomaly_state_for_test()
	clear_dead_letter_events_for_test()
	reset_stock_for_test()

