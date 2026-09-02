from unittest.mock import MagicMock, patch
import pytest
from backend.services.razorpay_service import convert_to_paise, create_order


def test_convert_to_paise_exact_precision():
	# Standard amounts
	assert convert_to_paise(100.0) == 10000
	assert convert_to_paise(499.0) == 49900

	# Fractional floating amounts prone to IEEE 754 precision issues
	assert convert_to_paise(1177.64) == 117764
	assert convert_to_paise(5898.82) == 589882
	assert convert_to_paise(99.99) == 9999
	assert convert_to_paise(0.01) == 1


def test_create_order_basic():
	order = create_order(
		amount=3497.50,
		currency='INR',
		session_id='cs_test_session_123'
	)

	assert 'id' in order and order['id'].startswith('order_')
	assert order['amount'] == 349750
	assert order['currency'] == 'INR'
	assert order['receipt'] == 'cs_test_session_123'
	assert order['status'] == 'created'


def test_create_order_amount_mismatch_impossible():
	test_cases = [10.0, 499.0, 1177.64, 4999.0, 9999.99]
	for amt in test_cases:
		order = create_order(amount=amt, currency='INR', session_id='cs_check_amt')
		assert order['amount'] == int(round(amt * 100))
		assert order['amount'] / 100 == amt


def test_create_order_retry_backoff_transient_failure():
	mock_client = MagicMock()
	# First attempt fails with transient exception, second succeeds
	mock_client.order.create.side_effect = [
		Exception('503 Service Unavailable (Transient gateway timeout)'),
		{
			'id': 'order_rzp_live_test_789',
			'amount': 250000,
			'currency': 'INR',
			'receipt': 'cs_retry_test',
			'status': 'created'
		}
	]

	with patch('backend.services.razorpay_service.get_settings') as mock_settings, \
		 patch('backend.services.razorpay_service.get_razorpay_client', return_value=mock_client), \
		 patch('backend.services.razorpay_service.time.sleep') as mock_sleep:

		mock_settings.return_value.RAZORPAY_KEY_ID = 'rzp_test_real_key'
		mock_settings.return_value.RAZORPAY_KEY_SECRET = 'real_secret'

		order = create_order(
			amount=2500.0,
			currency='INR',
			session_id='cs_retry_test',
			max_retries=3,
			base_delay=0.1
		)

		assert order['id'] == 'order_rzp_live_test_789'
		assert mock_client.order.create.call_count == 2
		assert mock_sleep.call_count == 1


def test_create_order_permanent_failure_raises():
	mock_client = MagicMock()
	mock_client.order.create.side_effect = Exception('Permanent network failure')

	with patch('backend.services.razorpay_service.get_settings') as mock_settings, \
		 patch('backend.services.razorpay_service.get_razorpay_client', return_value=mock_client), \
		 patch('backend.services.razorpay_service.time.sleep'):

		mock_settings.return_value.RAZORPAY_KEY_ID = 'rzp_test_real_key'
		mock_settings.return_value.RAZORPAY_KEY_SECRET = 'real_secret'

		with pytest.raises(RuntimeError) as exc_info:
			create_order(
				amount=100.0,
				currency='INR',
				session_id='cs_perm_fail',
				max_retries=3,
				base_delay=0.01
			)
		assert 'Failed to create Razorpay Order' in str(exc_info.value)
		assert mock_client.order.create.call_count == 3
