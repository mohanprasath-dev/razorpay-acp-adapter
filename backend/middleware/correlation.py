"""Correlation ID Middleware and Structured JSON Logging for ACP Adapter.
Extracts or generates an X-Correlation-Id header, attaches it to the request state,
sets the response header, and formats logs as structured JSON.
"""
import json
import logging
import time
import uuid
from contextvars import ContextVar
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Context variable to propagate correlation ID across async call stacks
correlation_id_ctx: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)


class JSONLogFormatter(logging.Formatter):
	"""Outputs log entries as structured JSON objects with timestamp, level, correlation_id, and message."""
	def format(self, record: logging.LogRecord) -> str:
		cid = correlation_id_ctx.get()
		log_entry = {
			'timestamp': self.formatTime(record, self.datefmt),
			'level': record.levelname,
			'logger': record.name,
			'correlation_id': cid,
			'message': record.getMessage(),
		}
		if record.exc_info:
			log_entry['exception'] = self.formatException(record.exc_info)
		return json.dumps(log_entry)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
	"""FastAPI / Starlette middleware for X-Correlation-Id tracking."""
	async def dispatch(self, request: Request, call_next) -> Response:
		# Extract from header or generate new UUID
		correlation_id = request.headers.get('X-Correlation-Id') or f'corr_{uuid.uuid4().hex[:16]}'
		token = correlation_id_ctx.set(correlation_id)
		request.state.correlation_id = correlation_id

		t0 = time.perf_counter()
		try:
			response: Response = await call_next(request)
		finally:
			correlation_id_ctx.reset(token)

		# Attach correlation ID to response headers
		response.headers['X-Correlation-Id'] = correlation_id
		return response
