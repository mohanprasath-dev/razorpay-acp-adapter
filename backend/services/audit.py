"""Audit Logging Layer for ACP Checkout Adapter.
Maintains an immutable audit trail in Firestore and memory for all checkout session transitions and rule checks.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from backend.models import AuditAction, AuditEntry
from backend.db.firestore import get_firestore_client

_audit_log_store: List[AuditEntry] = []


def record_audit_entry(
	session_id: str,
	action: AuditAction,
	actor: str = 'buyer_agent_sim',
	reason: Optional[str] = None,
	before_total: Optional[float] = None,
	after_total: Optional[float] = None
) -> AuditEntry:
	"""
	Records an immutable audit entry in the in-memory store and Firestore.
	"""
	audit_entry = AuditEntry(
		id=f'audit_{uuid.uuid4().hex[:12]}',
		session_id=session_id,
		action=action,
		actor=actor,
		reason=reason,
		before_total=before_total,
		after_total=after_total,
		timestamp=datetime.now(timezone.utc)
	)
	_audit_log_store.append(audit_entry)

	db = get_firestore_client()
	if db is not None:
		try:
			audit_dict = audit_entry.model_dump(mode='json')
			db.collection('audit_entries').document(audit_entry.id).set(audit_dict)
		except Exception:
			pass

	return audit_entry


def get_all_audit_entries() -> List[AuditEntry]:
	"""Retrieves all recorded audit entries."""
	return list(_audit_log_store)


def get_session_audit_entries(session_id: str) -> List[AuditEntry]:
	"""Retrieves all audit entries for a specific checkout session."""
	return [e for e in _audit_log_store if e.session_id == session_id]


def clear_audit_entries_for_test():
	"""Helper for test suites."""
	global _audit_log_store
	_audit_log_store = []
