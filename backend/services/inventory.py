"""Inventory and Stock Tracking Service for Razorpay ACP Adapter.
Manages authoritative SKU stock levels, pre-checkout availability checks,
and atomic inventory decrement on session completion.
"""
import logging
import threading
from typing import Dict, List, Optional, Tuple
from backend.db.firestore import get_firestore_client
from backend.models import LineItem

logger = logging.getLogger(__name__)

# Initial default stock levels for the 5 seeded SKUs
DEFAULT_INITIAL_STOCK: Dict[str, int] = {
	'prod_bolt_001': 100,
	'prod_bolt_002': 2,   # Low stock SKU for easy out-of-stock testing (stock=2)
	'prod_bolt_003': 15,
	'prod_bolt_004': 30,
	'prod_bolt_005': 10,
}

# Thread-safe in-memory stock storage & soft-hold session reservations
_stock_lock = threading.Lock()
_stock_store: Dict[str, int] = dict(DEFAULT_INITIAL_STOCK)
_reserved_sessions: Dict[str, Dict[str, int]] = {}


def reset_inventory(custom_stock: Optional[Dict[str, int]] = None):
	"""Resets in-memory stock to default seed values or custom values and clears reservations."""
	global _stock_store, _reserved_sessions
	with _stock_lock:
		_stock_store = dict(custom_stock if custom_stock is not None else DEFAULT_INITIAL_STOCK)
		_reserved_sessions.clear()


reset_stock_for_test = reset_inventory


def reserve_session_inventory(session_id: str, line_items: List[LineItem]) -> Tuple[bool, Optional[str]]:
	"""
	Atomically soft-holds / reserves inventory for an active session.
	Decrements available stock and records reservation under session_id.
	Returns (True, None) if reserved, or (False, reason) if insufficient stock.
	"""
	with _stock_lock:
		# Check availability for all items first
		for item in line_items:
			current = _stock_store.get(item.product_id, 0)
			if item.quantity > current:
				return False, (
					f'Insufficient stock for product "{item.product_id}": '
					f'requested {item.quantity} units, but only {current} available.'
				)
		# Decrement from stock store into session reservation
		allocations = _reserved_sessions.get(session_id, {})
		for item in line_items:
			_stock_store[item.product_id] -= item.quantity
			allocations[item.product_id] = allocations.get(item.product_id, 0) + item.quantity
		_reserved_sessions[session_id] = allocations
		return True, None


def release_session_inventory(session_id: str) -> bool:
	"""
	Releases soft-held inventory back to available stock upon session cancellation or expiry.
	Returns True if inventory was held and released, False otherwise.
	"""
	with _stock_lock:
		if session_id in _reserved_sessions:
			allocations = _reserved_sessions.pop(session_id)
			for prod_id, qty in allocations.items():
				_stock_store[prod_id] = _stock_store.get(prod_id, 0) + qty
			return True
		return False


def commit_session_inventory(session_id: str) -> bool:
	"""
	Finalizes reserved inventory on session completion so it is not returned.
	Returns True if reservation was present and committed.
	"""
	with _stock_lock:
		if session_id in _reserved_sessions:
			_reserved_sessions.pop(session_id)
			return True
		return False


def has_reserved_inventory(session_id: str) -> bool:
	"""Checks whether an active session holds soft-reserved stock."""
	with _stock_lock:
		return session_id in _reserved_sessions



def get_stock(product_id: str) -> int:
	"""Retrieves the current available stock for a product."""
	db = get_firestore_client()
	if db is not None:
		try:
			doc = db.collection('products').document(product_id).get()
			if doc.exists:
				data = doc.to_dict()
				if 'stock' in data:
					return int(data['stock'])
		except Exception as e:
			logger.debug(f'Firestore get_stock fallback to in-memory: {e}')

	with _stock_lock:
		return _stock_store.get(product_id, 0)


def set_stock(product_id: str, stock: int):
	"""Sets the available stock for a product."""
	with _stock_lock:
		_stock_store[product_id] = max(0, stock)
	db = get_firestore_client()
	if db is not None:
		try:
			db.collection('products').document(product_id).set({'stock': max(0, stock)}, merge=True)
		except Exception as e:
			logger.debug(f'Firestore set_stock error: {e}')


def validate_inventory_availability(line_items: List[LineItem]) -> Tuple[bool, Optional[str]]:
	"""
	Validates that each line item requested has sufficient stock available.
	Returns (True, None) if sufficient, or (False, reason) if out of stock.
	"""
	for item in line_items:
		available = get_stock(item.product_id)
		if item.quantity > available:
			reason = (
				f'Insufficient stock for product "{item.product_id}": '
				f'requested {item.quantity} units, but only {available} available.'
			)
			return False, reason
	return True, None


class InsufficientStockError(Exception):
	"""Raised when inventory stock is insufficient for an atomic operation."""
	pass


def decrement_inventory_atomic(line_items: List[LineItem]) -> Tuple[bool, Optional[str]]:
	"""
	Atomically decrements stock for all line items in the session.
	Uses Firestore transaction if connected and operational, or thread-safe in-memory locking.
	Returns (True, None) on success, or (False, reason) if stock was insufficient.
	"""
	db = get_firestore_client()
	if db is not None:
		try:
			from google.cloud import firestore

			transaction = db.transaction()

			@firestore.transactional
			def _atomic_decrement(txn):
				products_ref = db.collection('products')
				# Read phase
				for item in line_items:
					doc_ref = products_ref.document(item.product_id)
					snapshot = doc_ref.get(transaction=txn)
					doc_data = snapshot.to_dict() if snapshot.exists else None
					current_stock = doc_data.get('stock') if doc_data and 'stock' in doc_data else _stock_store.get(item.product_id, 0)
					if current_stock < item.quantity:
						raise InsufficientStockError(
							f'Insufficient stock for product "{item.product_id}": '
							f'available {current_stock}, requested {item.quantity}'
						)

				# Write phase
				for item in line_items:
					doc_ref = products_ref.document(item.product_id)
					snapshot = doc_ref.get(transaction=txn)
					doc_data = snapshot.to_dict() if snapshot.exists else None
					current_stock = doc_data.get('stock') if doc_data and 'stock' in doc_data else _stock_store.get(item.product_id, 0)
					new_stock = current_stock - item.quantity
					txn.set(doc_ref, {'stock': new_stock}, merge=True)
					with _stock_lock:
						_stock_store[item.product_id] = new_stock

			_atomic_decrement(transaction)
			return True, None
		except InsufficientStockError as ise:
			return False, str(ise)
		except Exception as ex:
			logger.warning(f'Firestore transaction unavailable, using thread-safe in-memory decrement: {ex}')

	# Thread-safe in-memory atomic locking
	with _stock_lock:
		# Check all items first
		for item in line_items:
			current = _stock_store.get(item.product_id, 0)
			if item.quantity > current:
				return False, (
					f'Insufficient stock for product "{item.product_id}": '
					f'requested {item.quantity} units, but only {current} available.'
				)
		# Decrement all items
		for item in line_items:
			_stock_store[item.product_id] -= item.quantity
		return True, None
