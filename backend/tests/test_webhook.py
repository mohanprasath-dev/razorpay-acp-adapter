"""Unit & Integration tests for outbound HMAC-SHA256 Webhook service."""
import hmac
import hashlib
import json
from backend.services.webhook import (
	generate_webhook_signature,
	verify_webhook_signature,
	dispatch_webhook_event,
	get_dispatched_webhooks
)


def test_hmac_signature_generation_and_verification():
	secret = 'test_secret_key_12345'
	payload_str = '{"data":{"session_id":"cs_test_123"},"event":"checkout_session.completed"}'

	signature = generate_webhook_signature(payload_str, secret)

	# Verify manually against hashlib
	manual_expected = hmac.new(
		secret.encode('utf-8'),
		payload_str.encode('utf-8'),
		hashlib.sha256
	).hexdigest()

	assert signature == manual_expected
	assert verify_webhook_signature(payload_str, signature, secret) is True
	assert verify_webhook_signature(payload_str, f'sha256={signature}', secret) is True
	assert verify_webhook_signature(payload_str, 'tampered_signature_hex', secret) is False
	assert verify_webhook_signature('{"tampered":true}', signature, secret) is False


def test_dispatch_webhook_event_local_mode():
	event_data = {
		'session_id': 'cs_test_hook_999',
		'status': 'completed',
		'total': 588.82
	}
	record = dispatch_webhook_event('checkout_session.completed', event_data)

	assert record['status'] == 'delivered'
	assert record['event'] == 'checkout_session.completed'
	assert record['signature'].startswith('sha256=')
	assert record['payload']['data']['session_id'] == 'cs_test_hook_999'

	# Check presence in global history
	history = get_dispatched_webhooks()
	assert len(history) >= 1
	assert history[-1]['payload']['data']['session_id'] == 'cs_test_hook_999'
