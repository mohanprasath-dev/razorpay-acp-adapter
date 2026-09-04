"""Agent Authentication Service for Agentic Commerce Protocol (ACP).
Manages per-agent API key generation (format: acp_agent_<hex>), secure SHA-256
key hashing, Firestore and in-memory persistence, and X-API-Key validation.
"""
import hashlib
import logging
import secrets
import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from fastapi import Header, HTTPException, status
from backend.db.firestore import get_firestore_client

logger = logging.getLogger(__name__)

# Thread-safe in-memory stores for local/test environments
# _agents_by_id: agent_id -> agent_data
# _agents_by_hash: key_hash -> agent_id
_auth_lock = threading.Lock()
_agents_by_id: Dict[str, Dict] = {}
_agents_by_hash: Dict[str, str] = {}


def hash_api_key(raw_key: str) -> str:
	"""Computes cryptographic SHA-256 hash of raw API key for secure storage."""
	return hashlib.sha256(raw_key.strip().encode('utf-8')).hexdigest()


def reset_auth_for_test():
	"""Resets in-memory agent authentication store for test isolation."""
	with _auth_lock:
		_agents_by_id.clear()
		_agents_by_hash.clear()


def register_agent(name: str) -> Dict[str, str]:
	"""
	Registers a new agent and generates an API key.
	Key format: acp_agent_<32 hex chars> (128 bits of cryptographic randomness).
	Returns dict containing agent_id, raw api_key, name, and created_at ISO timestamp.
	Open registration for hackathon demo purposes (documented as such).
	"""
	agent_id = f'agent_{uuid.uuid4().hex[:16]}'
	raw_key = f'acp_agent_{secrets.token_hex(16)}'
	key_hash = hash_api_key(raw_key)
	now = datetime.now(timezone.utc).isoformat()

	agent_record = {
		'agent_id': agent_id,
		'name': name.strip() if name else 'Autonomous Buyer Agent',
		'key_hash': key_hash,
		'created_at': now,
	}

	with _auth_lock:
		_agents_by_id[agent_id] = agent_record
		_agents_by_hash[key_hash] = agent_id

	# Persist to Firestore if available
	db = get_firestore_client()
	if db is not None:
		try:
			db.collection('agents').document(agent_id).set({
				'agent_id': agent_id,
				'name': agent_record['name'],
				'key_hash': key_hash,
				'created_at': now,
			})
			db.collection('agent_key_hashes').document(key_hash).set({
				'agent_id': agent_id,
				'created_at': now,
			})
		except Exception as e:
			logger.debug(f'Firestore agent registration error: {e}')

	return {
		'agent_id': agent_id,
		'api_key': raw_key,
		'name': agent_record['name'],
		'created_at': now,
	}


def verify_api_key(api_key: Optional[str]) -> Optional[str]:
	"""
	Verifies raw API key against stored SHA-256 hashes.
	Returns authenticated agent_id if valid, or None if invalid/missing.
	"""
	if not api_key or not isinstance(api_key, str) or not api_key.startswith('acp_agent_'):
		return None

	key_hash = hash_api_key(api_key)

	with _auth_lock:
		if key_hash in _agents_by_hash:
			return _agents_by_hash[key_hash]

	# Check Firestore if client connected
	db = get_firestore_client()
	if db is not None:
		try:
			doc = db.collection('agent_key_hashes').document(key_hash).get()
			if doc.exists:
				data = doc.to_dict()
				agent_id = data.get('agent_id')
				if agent_id:
					with _auth_lock:
						_agents_by_hash[key_hash] = agent_id
					return agent_id
		except Exception as e:
			logger.debug(f'Firestore verify_api_key error: {e}')

	return None


async def get_authenticated_agent_id(
	x_api_key: Optional[str] = Header(default=None, alias='X-API-Key')
) -> str:
	"""
	FastAPI dependency enforcing X-API-Key authentication on mutation endpoints.
	Returns authenticated agent_id or raises HTTP 401 structured error.
	"""
	if not x_api_key:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail={
				'error': 'unauthorized',
				'message': 'Missing required X-API-Key header. Call POST /agents/register to obtain an API key.'
			}
		)

	agent_id = verify_api_key(x_api_key)
	if not agent_id:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail={
				'error': 'unauthorized',
				'message': 'Invalid X-API-Key header. Authentication failed.'
			}
		)

	return agent_id
