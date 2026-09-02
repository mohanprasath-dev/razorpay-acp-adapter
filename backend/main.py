"""FastAPI Application Entry Point for Razorpay ACP Adapter."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.routers import discovery, checkout

settings = get_settings()

app = FastAPI(
	title='Razorpay ACP Checkout Adapter',
	description='Spec-compliant Agentic Commerce Protocol (ACP) checkout adapter backed by Razorpay',
	version=settings.ACP_SPEC_VERSION,
)

# Setup CORS for Frontend dashboard
app.add_middleware(
	CORSMiddleware,
	allow_origins=['*'],
	allow_credentials=True,
	allow_methods=['*'],
	allow_headers=['*'],
)

# Include Routers
app.include_router(discovery.router)
app.include_router(checkout.router)


from typing import List
from backend.models import AuditEntry
from backend.services.audit import get_all_audit_entries

@app.get('/health', tags=['Health'])
async def health_check():
	"""Health check endpoint to verify backend status."""
	return {'status': 'ok'}


@app.get('/audit_entries', response_model=List[AuditEntry], tags=['Audit'])
async def get_global_audit_trail():
	"""Global immutable audit trail across all checkout sessions."""
	return get_all_audit_entries()


if __name__ == '__main__':
	import uvicorn
	uvicorn.run('backend.main:app', host=settings.HOST, port=settings.PORT, reload=True)
