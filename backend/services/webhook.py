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

# In-memory log of dispatched webhook events for testing and dashboard inspection
_dispatched_webhooks: List[Dict[str, Any]] = []


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
	target_url: Optional[str] = None
) -> Dict[str, Any]:
	"""
	Dispatches an ACP lifecycle event via HTTP POST to the configured webhook endpoint.
	Attaches HMAC-SHA256 signature in X-ACP-Signature header.
	"""
	settings = get_settings()
	endpoint = target_url or settings.WEBHOOK_TARGET_URL
	secret = settings.WEBHOOK_SECRET

	timestamp = str(int(time.time()))
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
		'status': 'delivered'
	}

	# If no external target URL is configured, record event and return
	if not endpoint:
		logger.info(f'[ACP Webhook] Event "{event_type}" signed ({signature_header[:16]}...) [Local/Test Mode]')
		_dispatched_webhooks.append(delivery_record)
		return delivery_record

	# Dispatch real HTTP webhook
	try:
		req = urllib.request.Request(
			url=endpoint,
			data=payload_str.encode('utf-8'),
			headers={
				'Content-Type': 'application/json',
				'User-Agent': 'TaskDrift-ACP-Adapter-Webhook/1.0',
				'X-ACP-Signature': signature_header,
				'X-ACP-Timestamp': timestamp
			},
			method='POST'
		)
		with urllib.request.urlopen(req, timeout=5.0) as resp:
			delivery_record['status_code'] = resp.getcode()
			logger.info(f'[ACP Webhook] Dispatched "{event_type}" to {endpoint} -> HTTP {resp.getcode()}')
	except Exception as exc:
		delivery_record['status'] = 'failed'
		delivery_record['error'] = str(exc)
		logger.warning(f'[ACP Webhook] Delivery failed for "{event_type}" to {endpoint}: {exc}')

	_dispatched_webhooks.append(delivery_record)
	return delivery_record


def get_dispatched_webhooks() -> List[Dict[str, Any]]:
	"""Returns the list of dispatched webhook records."""
	return list(_dispatched_webhooks)
