"""Internal Operations Router for Scheduled Background Jobs (ACP)."""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter
from backend.models import SessionStatus, AuditAction
from backend.routers.checkout import get_all_sessions, save_session
from backend.services.inventory import release_session_inventory
from backend.services.audit import record_audit_entry
from backend.services.webhook import dispatch_webhook_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/internal', tags=['Internal Tasks'])


@router.post('/sweep_expired', summary='Sweep Expired Checkout Sessions')
async def sweep_expired_sessions() -> Dict[str, Any]:
	"""
	Background maintenance job (invoked periodically or via Cloud Scheduler):
	1. Scans active sessions (status in created, updated, ready_for_payment).
	2. Identifies sessions where datetime.now(utc) > session.expires_at.
	3. Transitions status to 'cancelled' with reason 'expired'.
	4. Automatically releases any soft-held inventory back to available stock.
	5. Appends immutable AuditEntry and dispatches signed webhook event.
	"""
	now = datetime.now(timezone.utc)
	active_statuses = {SessionStatus.CREATED, SessionStatus.UPDATED, SessionStatus.READY_FOR_PAYMENT}
	all_sessions = get_all_sessions()
	expired_session_ids: List[str] = []

	for session in all_sessions:
		if session.status in active_statuses and session.expires_at is not None:
			if now > session.expires_at:
				session.status = SessionStatus.CANCELLED
				session.updated_at = now
				save_session(session)

				# Release any soft-held inventory
				released = release_session_inventory(session.id)

				record_audit_entry(
					session_id=session.id,
					action=AuditAction.CANCEL,
					actor='system_sweep',
					reason='expired',
					before_total=session.totals.total,
					after_total=session.totals.total
				)

				dispatch_webhook_event('checkout_session.cancelled', {
					'session_id': session.id,
					'status': 'cancelled',
					'reason': 'expired',
					'inventory_released': released,
				})

				expired_session_ids.append(session.id)
				logger.info(f'[ACP Expiry Sweep] Cancelled expired session {session.id} (Inventory released: {released})')

	return {
		'swept_count': len(expired_session_ids),
		'expired_session_ids': expired_session_ids,
		'timestamp': now.isoformat()
	}
