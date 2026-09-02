"""Razorpay Client initialization service."""
from typing import Optional
import razorpay
from backend.config import get_settings

_razorpay_client: Optional[razorpay.Client] = None


def get_razorpay_client() -> razorpay.Client:
	"""
	Initializes and returns the Razorpay client using test-mode credentials from config.
	"""
	global _razorpay_client
	if _razorpay_client is not None:
		return _razorpay_client

	settings = get_settings()
	_razorpay_client = razorpay.Client(
		auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
	)
	return _razorpay_client
