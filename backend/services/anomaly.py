"""Fraud & Anomaly Scoring Service for Agentic Commerce Protocol (ACP).
Monitors autonomous agent traffic patterns in a sliding time window:
1. Rapid-fire session creation velocity (>5/min)
2. Repeated guardrail violations (tampering/ceiling breach patterns)
3. Abnormal order velocity spikes

Scores sessions from 0 to 100:
- Score >= 70: Flagged as anomalous in session metadata & audit trail.
- Score >= 90: Hard rejection (HTTP 400 error="anomaly_detected").
"""
import time
import threading
from typing import Dict, List, Tuple, Optional

_lock = threading.Lock()

# Sliding window history per identifier (buyer email or client IP)
_session_creation_timestamps: Dict[str, List[float]] = {}
_violation_timestamps: Dict[str, List[float]] = {}
_spend_history: Dict[str, List[Tuple[float, float]]] = {}


def reset_anomaly_state_for_test():
	"""Resets in-memory tracking stores for test isolation."""
	with _lock:
		_session_creation_timestamps.clear()
		_violation_timestamps.clear()
		_spend_history.clear()


def record_session_creation(identifier: str):
	"""Records timestamp of session creation for an agent identifier."""
	if not identifier:
		return
	now = time.time()
	with _lock:
		if identifier not in _session_creation_timestamps:
			_session_creation_timestamps[identifier] = []
		_session_creation_timestamps[identifier].append(now)


def record_guardrail_violation(identifier: str):
	"""Records timestamp of a guardrail violation for an agent identifier."""
	if not identifier:
		return
	now = time.time()
	with _lock:
		if identifier not in _violation_timestamps:
			_violation_timestamps[identifier] = []
		_violation_timestamps[identifier].append(now)


def record_spend(identifier: str, amount: float):
	"""Records spend amount and timestamp."""
	if not identifier:
		return
	now = time.time()
	with _lock:
		if identifier not in _spend_history:
			_spend_history[identifier] = []
		_spend_history[identifier].append((now, amount))


def evaluate_anomaly_score(
	identifier: str,
	current_order_amount: float = 0.0,
	window_seconds: float = 60.0
) -> Tuple[int, List[str], bool]:
	"""
	Evaluates traffic anomalies for an agent identifier over a rolling window.
	Returns: (score: int, flags: List[str], should_block: bool)
	- score: 0 to 100
	- flags: List of human/agent-readable anomaly reasons
	- should_block: True if score >= 90 (triggers hard rejection)
	"""
	if not identifier:
		return 0, [], False

	now = time.time()
	cutoff = now - window_seconds
	flags = []
	score = 0

	with _lock:
		# 1. Clean and evaluate session creation frequency
		creations = [t for t in _session_creation_timestamps.get(identifier, []) if t >= cutoff]
		_session_creation_timestamps[identifier] = creations
		creation_count = len(creations)

		if creation_count >= 8:
			score += 95
			flags.append(f'Extreme session creation burst ({creation_count} sessions in {int(window_seconds)}s)')
		elif creation_count >= 6:
			score += 75
			flags.append(f'Rapid-fire session creation velocity ({creation_count} sessions in {int(window_seconds)}s)')
		elif creation_count >= 4:
			score += 40
			flags.append(f'High-frequency session creation ({creation_count} sessions in {int(window_seconds)}s)')
		elif creation_count >= 2:
			score += 10
			flags.append(f'Elevated session creation rate ({creation_count} sessions in {int(window_seconds)}s)')

		# 2. Clean and evaluate guardrail violations (longer 120s window)
		viol_cutoff = now - 120.0
		violations = [t for t in _violation_timestamps.get(identifier, []) if t >= viol_cutoff]
		_violation_timestamps[identifier] = violations
		viol_count = len(violations)

		if viol_count >= 3:
			score += 55
			flags.append(f'Severe repeated guardrail violations ({viol_count} breaches in 120s)')
		elif viol_count >= 1:
			score += 30
			flags.append(f'Recent guardrail violation detected ({viol_count} breach)')

		# 3. Clean and evaluate spend velocity
		spends = [(t, amt) for (t, amt) in _spend_history.get(identifier, []) if t >= cutoff]
		_spend_history[identifier] = spends
		cumulative_spend = sum(amt for _, amt in spends) + current_order_amount

		if cumulative_spend >= 80000.0:
			score += 35
			flags.append(f'High velocity spend velocity (₹{cumulative_spend:,.2f} in {int(window_seconds)}s)')
		elif current_order_amount >= 40000.0:
			score += 20
			flags.append(f'High value single transaction (₹{current_order_amount:,.2f})')

	score = min(100, max(0, score))
	should_block = score >= 90

	return score, flags, should_block
