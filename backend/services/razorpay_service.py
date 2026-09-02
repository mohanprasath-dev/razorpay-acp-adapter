"""Razorpay Order Creation Service for ACP Checkout Adapter.
Bridges ACP session completion to Razorpay test-mode Orders API with exponential backoff and retry.
"""
import time
import uuid
import logging
from typing import Dict, Any, Optional
from backend.services.razorpay_client import get_razorpay_client
from backend.config import get_settings

logger = logging.getLogger(__name__)


def convert_to_paise(amount: float) -> int:
	"""
	Converts major currency units to smallest sub-unit (paise for INR).
	Guarantees exact integer conversion without floating-point precision loss.
	"""
	return int(round(float(amount) * 100))


def create_order(
	amount: float,
	currency: str,
	session_id: str,
	notes: Optional[Dict[str, str]] = None,
	max_retries: int = 3,
	base_delay: float = 0.5
) -> Dict[str, Any]:
	"""
	Creates a Razorpay test-mode Order scoped to the exact ACP checkout session total.
	Reuses TaskDrift enterprise retry and backoff mechanism for payment rail resilience.
	"""
	if amount <= 0:
		raise ValueError(f'Order amount must be positive. Received: {amount}')

	amount_in_paise = convert_to_paise(amount)
	currency_code = currency.upper()

	order_payload = {
		'amount': amount_in_paise,
		'currency': currency_code,
		'receipt': session_id,
		'notes': notes or {
			'session_id': session_id,
			'source': 'taskdrift_acp_adapter',
			'protocol': 'ACP_2026-04-17'
		}
	}

	settings = get_settings()
	# Check if placeholder test credentials are used in local offline test
	if settings.RAZORPAY_KEY_ID in ['rzp_test_placeholder', '', 'placeholder']:
		return {
			'id': f'order_test_{uuid.uuid4().hex[:14]}',
			'entity': 'order',
			'amount': amount_in_paise,
			'amount_paid': 0,
			'amount_due': amount_in_paise,
			'currency': currency_code,
			'receipt': session_id,
			'status': 'created',
			'attempts': 0,
			'notes': order_payload['notes'],
			'created_at': int(time.time())
		}

	client = get_razorpay_client()
	attempt = 0
	last_exception = None

	while attempt < max_retries:
		attempt += 1
		try:
			order = client.order.create(data=order_payload)
			return order
		except Exception as exc:
			last_exception = exc
			logger.warning(
				f'[Razorpay Service] Order creation attempt {attempt}/{max_retries} failed for session {session_id}: {exc}'
			)
			if attempt < max_retries:
				sleep_time = base_delay * (2 ** (attempt - 1))
				time.sleep(sleep_time)

	# If all retries fail, raise clear error
	raise RuntimeError(
		f'Failed to create Razorpay Order for session {session_id} after {max_retries} attempts. Reason: {last_exception}'
	)
