"""Outbound Webhook Delivery Service for Agentic Commerce Protocol (ACP).
Features:
1. Generates cryptographic HMAC-SHA256 signatures with timestamp anti-replay headers.
2. Dispatches real HTTP webhook callbacks with timeout and payload delivery.
3. Maintains in-memory delivery audit logs for inspection and test verification.
"""
import time
import json
import hmac
import hashlib
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List
from backend.config import get_settings

logger = logging.getLogger(__name__)

import uuid
from datetime import datetime, timezone
from backend.models import DeadLetterEvent
from backend.db.firestore import get_firestore_client

# In-memory stores
_dispatched_webhooks: List[Dict[str, Any]] = []
_dead_letter_events: List[DeadLetterEvent] = []


def clear_dead_letter_events_for_test():
	"""Clears dead letter events for testing."""
	global _dead_letter_events
	_dead_letter_events = []


def get_dead_letter_events() -> List[DeadLetterEvent]:
	"""Retrieves all dead letter events from memory and Firestore."""
	events_map: Dict[str, DeadLetterEvent] = {e.id: e for e in _dead_letter_events}
	db = get_firestore_client()
	if db is not None:
		try:
			docs = db.collection('dead_letter_events').stream()
			for doc in docs:
				dle = DeadLetterEvent(**doc.to_dict())
				events_map[dle.id] = dle
		except Exception as e:
			logger.debug(f'Firestore get_dead_letter_events: {e}')
	events = list(events_map.values())
	events.sort(key=lambda x: x.timestamp, reverse=True)
	return events


def save_dead_letter_event(event: DeadLetterEvent):
	"""Saves dead-letter event to in-memory store and Firestore."""
	_dead_letter_events.append(event)
	db = get_firestore_client()
	if db is not None:
		try:
			db.collection('dead_letter_events').document(event.id).set(event.model_dump(mode='json'))
		except Exception as e:
			logger.debug(f'Firestore save_dead_letter_event: {e}')


def generate_webhook_signature(payload_str: str, secret: str) -> str:
	"""Generates HMAC-SHA256 hex digest for outbound webhook payloads."""
	return hmac.new(
		secret.encode('utf-8'),
		payload_str.encode('utf-8'),
		hashlib.sha256
	).hexdigest()


def verify_webhook_signature(payload_str: str, signature: str, secret: str) -> bool:
	"""
	Constant-time signature verification to prevent timing side-channel attacks.
	Accepts signature in 'sha256=HEX' or raw 'HEX' format.
	"""
	clean_sig = signature.replace('sha256=', '') if signature.startswith('sha256=') else signature
	expected = generate_webhook_signature(payload_str, secret)
	return hmac.compare_digest(clean_sig, expected)


def dispatch_webhook_event(
	event_type: str,
	data: Dict[str, Any],
	target_url: Optional[str] = None,
	max_retries: int = 3,
	initial_backoff: float = 0.05
) -> Dict[str, Any]:
	"""
	Dispatches an ACP lifecycle event via HTTP POST to the configured webhook endpoint.
	Features:
	- Attaches HMAC-SHA256 signature in X-ACP-Signature header.
	- Retries transient failures up to max_retries with exponential backoff.
	- If all retries fail, writes a DeadLetterEvent record for dashboard visibility and auditing.
	"""
	settings = get_settings()
	endpoint = target_url or settings.WEBHOOK_TARGET_URL
	secret = settings.WEBHOOK_SECRET

	timestamp = str(int(time.time()))
	session_id = data.get('session_id') or data.get('id')
	payload = {
		'event': event_type,
		'spec_version': settings.ACP_SPEC_VERSION,
		'timestamp': timestamp,
		'data': data
	}

	payload_str = json.dumps(payload, sort_keys=True)
	signature_hex = generate_webhook_signature(payload_str, secret)
	signature_header = f'sha256={signature_hex}'

	delivery_record = {
		'event': event_type,
		'target_url': endpoint,
		'timestamp': timestamp,
		'signature': signature_header,
		'payload': payload,
		'attempts': 0,
		'status': 'delivered'
	}

	# If no external target URL is configured, record event and return (local/test mode)
	if not endpoint:
		delivery_record['attempts'] = 1
		logger.info(f'[ACP Webhook] Event "{event_type}" signed ({signature_header[:16]}...) [Local/Test Mode]')
		_dispatched_webhooks.append(delivery_record)
		return delivery_record

	# Dispatch real HTTP webhook with retry loop
	last_error = ''
	for attempt in range(1, max_retries + 1):
		delivery_record['attempts'] = attempt
		try:
			req = urllib.request.Request(
				url=endpoint,
				data=payload_str.encode('utf-8'),
				headers={
					'Content-Type': 'application/json',
					'User-Agent': 'Razorpay-ACP-Adapter-Webhook/1.0',
					'X-ACP-Signature': signature_header,
					'X-ACP-Timestamp': timestamp
				},
				method='POST'
			)
			with urllib.request.urlopen(req, timeout=1.0) as resp:
				status_code = resp.getcode()
				if 200 <= status_code < 300:
					delivery_record['status'] = 'delivered'
					delivery_record['status_code'] = status_code
					logger.info(f'[ACP Webhook] Dispatched "{event_type}" to {endpoint} (attempt {attempt}) -> HTTP {status_code}')
					_dispatched_webhooks.append(delivery_record)
					return delivery_record
				else:
					last_error = f'HTTP {status_code}'
		except urllib.error.HTTPError as err:
			last_error = f'HTTP {err.code}: {err.reason}'
		except Exception as exc:
			last_error = str(exc)

		logger.warning(f'[ACP Webhook] Delivery attempt {attempt}/{max_retries} failed for "{event_type}": {last_error}')
		if attempt < max_retries:
			time.sleep(initial_backoff * (2 ** (attempt - 1)))

	# All retries exhausted -> Create Dead-Letter Event
	delivery_record['status'] = 'failed'
	delivery_record['error'] = last_error

	dead_letter = DeadLetterEvent(
		id=f'dle_{uuid.uuid4().hex[:16]}',
		event_type=event_type,
		session_id=session_id,
		target_url=endpoint,
		last_error=last_error,
		attempts=max_retries,
		timestamp=datetime.now(timezone.utc)
	)
	save_dead_letter_event(dead_letter)
	logger.error(f'[ACP Webhook] Recorded DeadLetterEvent {dead_letter.id} for "{event_type}" after {max_retries} attempts.')

	_dispatched_webhooks.append(delivery_record)
	return delivery_record


def get_dispatched_webhooks() -> List[Dict[str, Any]]:
	"""Returns the list of dispatched webhook records."""
	return list(_dispatched_webhooks)
