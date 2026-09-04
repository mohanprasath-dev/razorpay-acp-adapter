"""Discovery and Catalog Router for Agentic Commerce Protocol (ACP)."""
from typing import List, Optional
from fastapi import APIRouter, Query
from backend.config import get_settings
from backend.models import Product

router = APIRouter(tags=['Discovery'])
settings = get_settings()

from backend.services.inventory import get_stock

# Default catalog SKUs (5 rich products with stock tracking, tax rates, and categories)
CATALOG: List[Product] = [
	Product(
		id='prod_bolt_001',
		name='Autonomous Agent Run Credit (100k Tokens)',
		price=499.0,
		currency='INR',
		description='High-throughput inference credit package for AI agent execution workflows.',
		stock=100,
		tax_rate=0.18,
		category='credits'
	),
	Product(
		id='prod_bolt_002',
		name='TaskDrift Pro Website Audit & Optimization',
		price=4999.0,
		currency='INR',
		description='Comprehensive Lighthouse, SEO, and Three.js performance tuning package.',
		stock=2,
		tax_rate=0.18,
		category='services'
	),
	Product(
		id='prod_bolt_003',
		name='Custom GLSL Shader & WebGL Experience Pack',
		price=9999.0,
		currency='INR',
		description='Production-ready custom procedural shaders, bloom filters, and particle system bundle.',
		stock=15,
		tax_rate=0.12,
		category='creative'
	),
	Product(
		id='prod_bolt_004',
		name='Razorpay Gateway Integration & Webhook Kit',
		price=2499.0,
		currency='INR',
		description='Enterprise payment rail bridge with backoff retry and idempotent order handlers.',
		stock=30,
		tax_rate=0.18,
		category='developer_tools'
	),
	Product(
		id='prod_bolt_005',
		name='AI Commerce Agent Protocol Adapter License',
		price=14999.0,
		currency='INR',
		description='Full commercial deployment license for ACP-compliant bounded checkout adapter.',
		stock=10,
		tax_rate=0.28,
		category='licenses'
	),
]


@router.get('/.well-known/agent.json', summary='ACP Agent Capability & Discovery Document')
async def get_agent_discovery():
	"""
	Returns the unauthenticated Agentic Commerce Protocol (ACP) discovery document
	specifying supported version, payment rails, search/filter capabilities, and available endpoints.
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
			'type': 'api_key_header',
			'header_name': 'X-API-Key',
			'registration_endpoint': '/agents/register',
			'session_management': 'idempotency_key_header'
		},
		'search_and_filter': {
			'supported': True,
			'query_parameters': ['q', 'category', 'min_price', 'max_price', 'in_stock_only']
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
			'agent_register': '/agents/register',
			'catalog': '/products',
			'checkout_sessions_create': '/checkout_sessions',
			'checkout_sessions_update': '/checkout_sessions/{id}',
			'checkout_sessions_get': '/checkout_sessions/{id}',
			'checkout_sessions_complete': '/checkout_sessions/{id}/complete',
			'checkout_sessions_cancel': '/checkout_sessions/{id}/cancel',
			'checkout_sessions_refund': '/checkout_sessions/{id}/refund',
			'internal_sweep_expired': '/internal/sweep_expired',
			'razorpay_webhook': '/webhooks/razorpay'
		},
		'guardrails': {
			'max_discount_percentage': 50,
			'max_order_value_inr': 50000,
			'max_quantity_per_item': 10
		}
	}


from backend.db.firestore import get_firestore_client

@router.get('/products', response_model=List[Product], summary='Public Product Catalog Feed')
async def get_products(
	q: Optional[str] = Query(default=None, description='Case-insensitive substring search across name and description'),
	category: Optional[str] = Query(default=None, description='Filter products by exact category'),
	min_price: Optional[float] = Query(default=None, ge=0.0, description='Minimum price boundary'),
	max_price: Optional[float] = Query(default=None, ge=0.0, description='Maximum price boundary'),
	in_stock_only: Optional[bool] = Query(default=False, description='If true, excludes items with 0 stock')
):
	"""
	Returns the unauthenticated product catalog available for buyer agents.
	Supports multi-parameter search and filtering (AND logic).
	Empty or missing parameters return the full catalog unmodified.
	Reflects live available stock.
	"""
	db = get_firestore_client()
	base_products = []
	if db is not None:
		try:
			docs = db.collection('products').stream()
			products = [Product(**doc.to_dict()) for doc in docs]
			if products:
				base_products = products
		except Exception:
			pass

	if not base_products:
		base_products = CATALOG

	# Enrich with live in-memory stock
	live_products = []
	for p in base_products:
		p_dict = p.model_dump()
		p_dict['stock'] = get_stock(p.id)
		live_products.append(Product(**p_dict))

	# Apply search and filters with AND logic
	filtered = []
	for p in live_products:
		if q:
			q_lower = q.strip().lower()
			if q_lower not in p.name.lower() and q_lower not in p.description.lower():
				continue
		if category:
			if not p.category or p.category.strip().lower() != category.strip().lower():
				continue
		if min_price is not None:
			if p.price < min_price:
				continue
		if max_price is not None:
			if p.price > max_price:
				continue
		if in_stock_only:
			if p.stock <= 0:
				continue
		filtered.append(p)

	return filtered
