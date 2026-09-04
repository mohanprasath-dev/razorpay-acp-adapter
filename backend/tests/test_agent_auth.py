"""Tests for T16.1: Per-Agent API Key Authentication & Anomaly Linkage."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth import register_agent
from backend.services.anomaly import evaluate_anomaly_score

client = TestClient(app)


def test_agent_registration_issues_valid_key():
	"""POST /agents/register issues a unique agent_id and acp_agent_<hex> API key."""
	res = client.post('/agents/register', json={'name': 'Agent Autonomous Unit 7'})
	assert res.status_code == 201
	data = res.json()
	assert data['agent_id'].startswith('agent_')
	assert data['api_key'].startswith('acp_agent_')
	assert data['name'] == 'Agent Autonomous Unit 7'
	assert 'created_at' in data


def test_checkout_session_missing_api_key_returns_401():
	"""POST /checkout_sessions without X-API-Key must return HTTP 401 Unauthorized."""
	unauth_client = TestClient(app)
	unauth_client.skip_default_auth = True  # bypass fixture auto-auth

	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	}
	res = unauth_client.post('/checkout_sessions', json=payload)
	assert res.status_code == 401
	err = res.json()
	assert err['detail']['error'] == 'unauthorized'
	assert 'Missing required X-API-Key' in err['detail']['message']


def test_checkout_session_invalid_api_key_returns_401():
	"""POST /checkout_sessions with an unrecognized or corrupted X-API-Key returns HTTP 401."""
	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}]
	}
	res = client.post(
		'/checkout_sessions',
		json=payload,
		headers={'X-API-Key': 'acp_agent_fake_or_unregistered_key_12345678'}
	)
	assert res.status_code == 401
	err = res.json()
	assert err['detail']['error'] == 'unauthorized'
	assert 'Invalid X-API-Key' in err['detail']['message']


def test_checkout_session_valid_key_records_authenticated_agent_in_audit_trail():
	"""Valid key authenticates caller and sets AuditEntry.actor to the cryptographic agent_id."""
	agent = register_agent(name='Audited Autonomous Agent')
	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Spoof Attempt', 'email': 'spoofed.actor@hacker.corp'}
	}
	res = client.post(
		'/checkout_sessions',
		json=payload,
		headers={'X-API-Key': agent['api_key']}
	)
	assert res.status_code == 201
	sid = res.json()['id']

	# Fetch session audit trail
	audit_res = client.get(f'/checkout_sessions/{sid}/audit')
	assert audit_res.status_code == 200
	entries = audit_res.json()
	assert len(entries) >= 1
	# The actor must be the cryptographic agent_id, NOT the spoofed email or hardcoded string
	assert entries[0]['actor'] == agent['agent_id']


def test_anomaly_scoring_keys_off_authenticated_agent_id():
	"""Anomaly scoring isolates traffic by cryptographic agent_id, preventing spoofing via buyer email."""
	agent_a = register_agent(name='Targeted Agent A')
	agent_b = register_agent(name='Targeted Agent B')

	# Both agents submit the identical buyer email
	shared_email = 'shared.spoof@example.com'
	payload = {
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Shared Email Buyer', 'email': shared_email}
	}

	# Agent A creates 5 sessions in rapid succession
	for _ in range(5):
		res = client.post('/checkout_sessions', json=payload, headers={'X-API-Key': agent_a['api_key']})
		assert res.status_code == 201

	# Agent A's score should be elevated
	score_a, flags_a, _ = evaluate_anomaly_score(agent_a['agent_id'])
	assert score_a >= 40
	assert any('session creation' in f.lower() for f in flags_a)

	# Agent B has sent 0 sessions, so their score should be 0 despite using the identical buyer email
	score_b, flags_b, _ = evaluate_anomaly_score(agent_b['agent_id'])
	assert score_b == 0
	assert len(flags_b) == 0
