"""FastAPI Application Entry Point for Razorpay ACP Adapter."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings

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


@app.get('/health', tags=['Health'])
async def health_check():
	"""Health check endpoint to verify backend status."""
	return {'status': 'ok'}


if __name__ == '__main__':
	import uvicorn
	uvicorn.run('backend.main:app', host=settings.HOST, port=settings.PORT, reload=True)
