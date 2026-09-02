"""Catalog Seeding Script for Razorpay ACP Adapter.
Seeds 5 production-ready SKUs into Firestore (or local JSON cache if offline).
Idempotent: Running multiple times will upsert without creating duplicates.
"""
import os
import sys
import json
from typing import List, Dict, Any

# Ensure root workspace directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.db.firestore import get_firestore_client
from backend.models import Product

SEED_PRODUCTS: List[Dict[str, Any]] = [
	{
		'id': 'prod_bolt_001',
		'name': 'Autonomous Agent Run Credit (100k Tokens)',
		'price': 499.0,
		'currency': 'INR',
		'description': 'High-throughput inference credit package for AI agent execution workflows.'
	},
	{
		'id': 'prod_bolt_002',
		'name': 'TaskDrift Pro Website Audit & Optimization',
		'price': 4999.0,
		'currency': 'INR',
		'description': 'Comprehensive Lighthouse, SEO, and Three.js performance tuning package.'
	},
	{
		'id': 'prod_bolt_003',
		'name': 'Custom GLSL Shader & WebGL Experience Pack',
		'price': 9999.0,
		'currency': 'INR',
		'description': 'Production-ready custom procedural shaders, bloom filters, and particle system bundle.'
	},
	{
		'id': 'prod_bolt_004',
		'name': 'Razorpay Gateway Integration & Webhook Kit',
		'price': 2499.0,
		'currency': 'INR',
		'description': 'Enterprise payment rail bridge with backoff retry and idempotent order handlers.'
	},
	{
		'id': 'prod_bolt_005',
		'name': 'AI Commerce Agent Protocol Adapter License',
		'price': 14999.0,
		'currency': 'INR',
		'description': 'Full commercial deployment license for ACP-compliant bounded checkout adapter.'
	},
]


def seed_catalog(verbose: bool = True) -> int:
	"""
	Seeds products into Firestore collection 'products' using document ID = product.id.
	Also syncs to local JSON data store.
	Returns number of seeded products.
	"""
	# Validate through Pydantic models first
	validated_products = [Product(**p).model_dump() for p in SEED_PRODUCTS]

	# Sync to local JSON store
	data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
	os.makedirs(data_dir, exist_ok=True)
	json_path = os.path.join(data_dir, 'catalog.json')
	with open(json_path, 'w', encoding='utf-8') as f:
		json.dump(validated_products, f, indent=2)

	if verbose:
		print(f'[Seed] Local catalog synced to {json_path} ({len(validated_products)} SKUs).')

	# Upsert to Firestore if available
	db = get_firestore_client()
	if db is not None:
		try:
			batch = db.batch()
			products_ref = db.collection('products')
			for product in validated_products:
				doc_ref = products_ref.document(product['id'])
				batch.set(doc_ref, product, merge=True)
			batch.commit()
			if verbose:
				print(f'[Seed] Successfully committed {len(validated_products)} products to Firestore collection "products".')
		except Exception as e:
			if verbose:
				print(f'[Seed] Firestore write note: {e} (local JSON fallback active)')
	else:
		if verbose:
			print('[Seed] Running in offline/local mode: Using local catalog fallback.')

	return len(validated_products)


if __name__ == '__main__':
	count = seed_catalog(verbose=True)
	print(f'Catalog seeding complete: {count} SKUs active.')
