"""Sliding-Window Rate Limiting Service for Agentic Commerce Protocol (ACP) Adapter.

Architecture Note:
This is an in-memory sliding-window rate limiter tailored for single-instance edge adapter deployments and demo workloads.
For multi-replica horizontal scale-out in production, this service is designed to be backed by Redis / Cloud Memorystore.
"""
import time
import threading
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status
from backend.config import get_settings

# Thread-safe in-memory sliding window request store: client_id -> list of timestamps
_request_windows: Dict[str, List[float]] = {}
_rate_limit_lock = threading.Lock()


def is_rate_limited(
	client_id: str,
	max_requests: int = 120,
	window_seconds: int = 60
) -> Tuple[bool, int, int]:
	"""
	Evaluates whether a client has exceeded the sliding window limit.
	Returns (is_limited: bool, retry_after_seconds: int, remaining_requests: int).
	"""
	now = time.time()
	window_start = now - window_seconds

	with _rate_limit_lock:
		if client_id not in _request_windows:
			_request_windows[client_id] = []

		# Clean expired timestamps outside the current window
		timestamps = [t for t in _request_windows[client_id] if t > window_start]
		_request_windows[client_id] = timestamps

		if len(timestamps) >= max_requests:
			# Calculate when the oldest request in the window expires
			oldest = timestamps[0]
			retry_after = max(1, int(oldest + window_seconds - now))
			return True, retry_after, 0

		# Record this request
		timestamps.append(now)
		_request_windows[client_id] = timestamps
		remaining = max_requests - len(timestamps)
		return False, 0, remaining


async def rate_limit_dependency(request: Request):
	"""
	FastAPI Dependency to enforce per-client rate limits on sensitive ACP mutation endpoints.
	"""
	settings = get_settings()
	client_ip = request.client.host if request.client else '127.0.0.1'
	client_id = request.headers.get('X-Forwarded-For', client_ip).split(',')[0].strip()

	limited, retry_after, remaining = is_rate_limited(
		client_id=client_id,
		max_requests=settings.RATE_LIMIT_PER_MINUTE,
		window_seconds=60
	)

	if limited:
		raise HTTPException(
			status_code=status.HTTP_429_TOO_MANY_REQUESTS,
			detail={
				'error': 'rate_limit_exceeded',
				'message': f'Rate limit of {settings.RATE_LIMIT_PER_MINUTE} requests/minute exceeded for client.',
				'retry_after': retry_after
			},
			headers={'Retry-After': str(retry_after), 'X-RateLimit-Remaining': '0'}
		)


def reset_rate_limiter():
	"""Resets in-memory rate limiting windows (used in unit tests)."""
	with _rate_limit_lock:
		_request_windows.clear()
