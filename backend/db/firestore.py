"""Firestore client module for checkout sessions and audit logs."""
import os
from typing import Optional
from google.cloud import firestore
from backend.config import get_settings

_db_client: Optional[firestore.Client] = None


def get_firestore_client() -> Optional[firestore.Client]:
	"""
	Initializes and returns a Firestore client instance.
	1. If GOOGLE_APPLICATION_CREDENTIALS points to a valid JSON file, loads credentials explicitly.
	2. Otherwise uses Google Cloud ADC (Application Default Credentials / Cloud Run IAM).
	3. Returns None gracefully in offline/mock test environments.
	"""
	global _db_client
	if _db_client is not None:
		return _db_client

	settings = get_settings()
	try:
		creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS or os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '')
		if creds_path:
			# Check multiple possible relative and absolute paths
			candidates = [
				creds_path,
				os.path.abspath(creds_path),
				os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), creds_path),
				os.path.join(os.path.dirname(os.path.dirname(__file__)), creds_path),
			]
			resolved = None
			for candidate in candidates:
				if os.path.isfile(candidate):
					resolved = os.path.abspath(candidate)
					break

			if resolved:
				os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = resolved
				_db_client = firestore.Client.from_service_account_json(
					json_credentials_path=resolved,
					database=settings.FIRESTORE_DATABASE
				)
				return _db_client

		_db_client = firestore.Client(
			project=settings.FIRESTORE_PROJECT_ID,
			database=settings.FIRESTORE_DATABASE
		)
		return _db_client
	except Exception as e:
		# Graceful fallback for local tests without GCP authentication
		return None
