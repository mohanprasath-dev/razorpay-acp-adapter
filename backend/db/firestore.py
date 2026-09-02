"""Firestore client module for checkout sessions and audit logs."""
from typing import Optional
from google.cloud import firestore
from backend.config import get_settings

_db_client: Optional[firestore.Client] = None


def get_firestore_client() -> Optional[firestore.Client]:
	"""
	Initializes and returns a Firestore client instance.
	Returns None if connection fails or in test/offline environments without credentials.
	"""
	global _db_client
	if _db_client is not None:
		return _db_client

	settings = get_settings()
	try:
		_db_client = firestore.Client(
			project=settings.FIRESTORE_PROJECT_ID,
			database=settings.FIRESTORE_DATABASE
		)
		return _db_client
	except Exception as e:
		# Graceful fallback for local tests without GCP authentication
		return None
