"""Discovery and Catalog Router for Agentic Commerce Protocol (ACP)."""
from typing import List
from fastapi import APIRouter
from backend.config import get_settings
from backend.models import Product

router = APIRouter(tags=['Discovery'])
settings = get_settings()

# Default catalog SKUs (5 rich products)
CATALOG: List[Product] = [
	Product(
		id='prod_bolt_001',
		name='Autonomous Agent Run Credit (100k Tokens)',
		price=499.0,
		currency='INR',
		description='High-throughput inference credit package for AI agent execution workflows.'
	),
	Product(
		id='prod_bolt_002',
		name='TaskDrift Pro Website Audit & Optimization',
		price=4999.0,
		currency='INR',
		description='Comprehensive Lighthouse, SEO, and Three.js performance tuning package.'
	),
	Product(
		id='prod_bolt_003',
		name='Custom GLSL Shader & WebGL Experience Pack',
		price=9999.0,
		currency='INR',
		description='Production-ready custom procedural shaders, bloom filters, and particle system bundle.'
	),
	Product(
		id='prod_bolt_004',
		name='Razorpay Gateway Integration & Webhook Kit',
		price=2499.0,
		currency='INR',
		description='Enterprise payment rail bridge with backoff retry and idempotent order handlers.'
	),
	Product(
		id='prod_bolt_005',
		name='AI Commerce Agent Protocol Adapter License',
		price=14999.0,
		currency='INR',
		description='Full commercial deployment license for ACP-compliant bounded checkout adapter.'
	),
]


@router.get('/.well-known/agent.json', summary='ACP Agent Capability & Discovery Document')
async def get_agent_discovery():
	"""
	Returns the unauthenticated Agentic Commerce Protocol (ACP) discovery document
	specifying supported version, payment rails, and available endpoints.
	"""
	return {
		'spec_version': settings.ACP_SPEC_VERSION,
		'merchant': {
			'name': settings.MERCHANT_NAME,
			'country': 'IN',
			'default_currency': 'INR',
			'supported_currencies': ['INR']
		},
		'payment_provider': 'razorpay',
		'authentication': {
			'type': 'none_for_discovery',
			'session_management': 'idempotency_key_header'
		},
		'webhooks': {
			'supported': True,
			'signature_scheme': 'HMAC-SHA256',
			'signature_header': 'X-ACP-Signature',
			'timestamp_header': 'X-ACP-Timestamp'
		},
		'rate_limits': {
			'requests_per_minute': settings.RATE_LIMIT_PER_MINUTE,
			'strategy': 'sliding_window'
		},
		'endpoints': {
			'discovery': '/.well-known/agent.json',
			'catalog': '/products',
			'checkout_sessions_create': '/checkout_sessions',
			'checkout_sessions_update': '/checkout_sessions/{id}',
			'checkout_sessions_get': '/checkout_sessions/{id}',
			'checkout_sessions_complete': '/checkout_sessions/{id}/complete',
			'checkout_sessions_cancel': '/checkout_sessions/{id}/cancel',
			'checkout_sessions_refund': '/checkout_sessions/{id}/refund'
		},
		'guardrails': {
			'max_discount_percentage': 50,
			'max_order_value_inr': 50000,
			'max_quantity_per_item': 10
		}
	}


from backend.db.firestore import get_firestore_client

@router.get('/products', response_model=List[Product], summary='Public Product Catalog Feed')
async def get_products():
	"""
	Returns the unauthenticated product catalog available for buyer agents.
	Fetches from Firestore if available, otherwise falls back to the seeded in-memory/disk catalog.
	"""
	db = get_firestore_client()
	if db is not None:
		try:
			docs = db.collection('products').stream()
			products = [Product(**doc.to_dict()) for doc in docs]
			if products:
				return products
		except Exception:
			pass

	return CATALOG
