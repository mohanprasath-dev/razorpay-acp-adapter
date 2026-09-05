"""FastAPI Application Entry Point for AgentPay Bridge."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.routers import discovery, checkout, auth, internal, webhooks

settings = get_settings()

app = FastAPI(
	title='AgentPay Bridge',
	description='ACP-compliant checkout adapter for autonomous AI buyer agents (Payment rail: Razorpay Orders API)',
	version=settings.ACP_SPEC_VERSION,
)

import os
from backend.middleware.correlation import CorrelationIdMiddleware

# Mount Correlation ID middleware first so all downstream handlers & CORS have correlation headers
app.add_middleware(CorrelationIdMiddleware)

# Resolve CORS allowed origins from ALLOWED_ORIGINS env var, defaulting to production Vercel and local dev origins
raw_origins = os.getenv('ALLOWED_ORIGINS', '').strip() or getattr(settings, 'ALLOWED_ORIGINS', '').strip()
if raw_origins:
	allowed_origins = [origin.strip() for origin in raw_origins.split(',') if origin.strip()]
else:
	allowed_origins = [
		'https://agentpay-bridge.vercel.app',
		'http://localhost:3000',
	]

# Setup CORS for Frontend dashboard
app.add_middleware(
	CORSMiddleware,
	allow_origins=allowed_origins,
	allow_credentials=True,
	allow_methods=['*'],
	allow_headers=['*'],
	expose_headers=['X-Correlation-Id'],
)

# Include Routers
app.include_router(discovery.router)
app.include_router(checkout.router)
app.include_router(auth.router)
app.include_router(internal.router)
app.include_router(webhooks.router)


from typing import List
from backend.models import AuditEntry, DeadLetterEvent
from backend.services.audit import get_all_audit_entries
from backend.services.webhook import get_dead_letter_events

@app.get('/health', tags=['Health'])
async def health_check():
	"""Health check endpoint to verify backend status."""
	return {'status': 'ok'}


@app.get('/audit_entries', response_model=List[AuditEntry], tags=['Audit'])
async def get_global_audit_trail():
	"""Global immutable audit trail across all checkout sessions."""
	return get_all_audit_entries()


@app.get('/dead_letter_events', response_model=List[DeadLetterEvent], tags=['Webhooks'])
async def get_all_dead_letter_events():
	"""Lists all dead-lettered webhook dispatch events that failed after max retry attempts."""
	return get_dead_letter_events()


if __name__ == '__main__':
	import uvicorn
	uvicorn.run('backend.main:app', host=settings.HOST, port=settings.PORT, reload=True)
