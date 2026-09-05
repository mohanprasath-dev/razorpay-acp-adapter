"""Automated Concurrency and Anomaly Detection Integration Tests for Checkpoint 3.
Covers:
1. T13.1: Multi-agent concurrency proof (race conditions, parallel idempotency, non-blocking updates).
2. T13.2: Anomaly scoring layer (burst sessions, repeated guardrail violations, hard rejection at score >= 90).
"""
import pytest
import time
import uuid
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import AuditAction, SessionStatus
from backend.scripts.concurrency_test import run_concurrency_suite
from backend.services.anomaly import (
	reset_anomaly_state_for_test,
	evaluate_anomaly_score,
	record_session_creation,
	record_guardrail_violation,
)
from backend.services.audit import get_session_audit_entries

client = TestClient(app)


def test_concurrency_suite_executes_cleanly():
	"""T13.1: Executes the multi-agent concurrency test suite and asserts full safety."""
	assert run_concurrency_suite() is True


def test_anomaly_scoring_unit_rules():
	"""T13.2: Unit tests for anomaly scoring calculations."""
	reset_anomaly_state_for_test()
	agent_id = 'test_agent_anomaly_unit@flow.ai'

	# 1. Baseline: 0 score
	score0, flags0, block0 = evaluate_anomaly_score(agent_id)
	assert score0 == 0
	assert block0 is False

	# 2. Add 5 rapid session creations
	for _ in range(5):
		record_session_creation(agent_id)

	score1, flags1, block1 = evaluate_anomaly_score(agent_id)
	assert score1 >= 40
	assert any('session creation' in f.lower() for f in flags1)

	# 3. Add 3 guardrail violations
	for _ in range(3):
		record_guardrail_violation(agent_id)

	score2, flags2, block2 = evaluate_anomaly_score(agent_id)
	assert score2 >= 90
	assert block2 is True


def test_burst_session_creation_flags_anomalous():
	"""
	T13.2: Creating 6 sessions rapidly for the same buyer email triggers
	is_anomalous=True and logs a flagged_anomalous AuditEntry.
	"""
	reset_anomaly_state_for_test()
	burst_email = f'burst_agent_{uuid.uuid4().hex[:8]}@buyer.internal'

	sessions = []
	for i in range(6):
		res = client.post('/checkout_sessions', json={
			'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
			'buyer': {'name': f'Burst Agent {i}', 'email': burst_email}
		})
		assert res.status_code == 201
		sessions.append(res.json())

	# The 6th session should have an elevated anomaly score and is_anomalous=True
	last_session = sessions[-1]
	assert last_session['anomaly_score'] >= 40

	# Create 2 more to push past the score >= 70 threshold
	for i in range(2):
		res_more = client.post('/checkout_sessions', json={
			'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
			'buyer': {'name': f'Burst Agent {i+6}', 'email': burst_email}
		})
		if res_more.status_code == 201:
			sessions.append(res_more.json())

	flagged_sessions = [s for s in sessions if s.get('is_anomalous') is True]
	assert len(flagged_sessions) >= 1

	# Verify AuditEntry for the flagged session
	flagged_sid = flagged_sessions[0]['id']
	audits = get_session_audit_entries(flagged_sid)
	actions = [a.action for a in audits]
	assert AuditAction.FLAGGED_ANOMALOUS in actions


def test_repeated_guardrail_violations_and_hard_block():
	"""
	T13.2: An agent repeatedly attempting illegal discounts/quantities receives
	elevated anomaly score and eventually hard rejection with anomaly_detected (score >= 90).
	"""
	reset_anomaly_state_for_test()
	attacker_email = f'attacker_{uuid.uuid4().hex[:8]}@badactor.ai'

	# Trigger 3 guardrail violations (excessive 80% discount)
	for _ in range(3):
		res = client.post('/checkout_sessions', json={
			'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
			'discount': 400.0,
			'buyer': {'name': 'Malicious Agent', 'email': attacker_email}
		})
		assert res.status_code == 400

	# Now perform extreme frequency creates to push anomaly score >= 90
	blocked = False
	for i in range(10):
		res = client.post('/checkout_sessions', json={
			'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
			'buyer': {'name': 'Malicious Agent', 'email': attacker_email}
		})
		if res.status_code == 400 and res.json().get('detail', {}).get('error') == 'anomaly_detected':
			blocked = True
			assert res.json()['detail']['anomaly_score'] >= 90
			break

	assert blocked is True


def test_normal_agent_traffic_not_flagged():
	"""T13.2: Normal agent interactions remain with score < 20 and is_anomalous=False."""
	reset_anomaly_state_for_test()
	normal_email = f'normal_agent_{uuid.uuid4().hex[:8]}@goodbuyer.ai'

	res = client.post('/checkout_sessions', json={
		'line_items': [{'product_id': 'prod_bolt_001', 'quantity': 1}],
		'buyer': {'name': 'Normal Agent', 'email': normal_email}
	})
	assert res.status_code == 201
	session = res.json()
	assert session['anomaly_score'] < 20
	assert session['is_anomalous'] is False
