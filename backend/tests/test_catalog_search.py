"""Tests for T20.1: Catalog Search & Filter Capabilities."""
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.inventory import set_stock

client = TestClient(app)


def test_products_no_params_returns_full_catalog_unmodified():
	"""GET /products without query parameters returns the full 5 SKUs (backward compatible)."""
	res = client.get('/products')
	assert res.status_code == 200
	products = res.json()
	assert len(products) == 5
	# Assert expected IDs
	ids = {p['id'] for p in products}
	assert 'prod_bolt_001' in ids
	assert 'prod_bolt_005' in ids


def test_search_q_substring_case_insensitive():
	"""q= query parameter filters by product name or description case-insensitively."""
	# Search by name substring
	res = client.get('/products?q=shader')
	assert res.status_code == 200
	products = res.json()
	assert len(products) == 1
	assert products[0]['id'] == 'prod_bolt_003'
	assert 'Custom GLSL Shader' in products[0]['name']

	# Search uppercase substring
	res_upper = client.get('/products?q=TOKEN')
	assert res_upper.status_code == 200
	products_upper = res_upper.json()
	assert len(products_upper) == 1
	assert products_upper[0]['id'] == 'prod_bolt_001'

	# Non-matching search
	res_empty = client.get('/products?q=nonexistent_phrase_xyz')
	assert res_empty.status_code == 200
	assert len(res_empty.json()) == 0


def test_category_filter():
	"""category= query parameter returns items matching the category."""
	res = client.get('/products?category=services')
	assert res.status_code == 200
	products = res.json()
	assert len(products) == 1
	assert products[0]['id'] == 'prod_bolt_002'
	assert products[0]['category'] == 'services'


def test_price_range_boundaries():
	"""min_price and max_price filter products inclusively at the exact boundaries."""
	# prod_bolt_001 is ₹499.0, prod_bolt_004 is ₹2499.0, prod_bolt_002 is ₹4999.0
	res = client.get('/products?min_price=499.0&max_price=2499.0')
	assert res.status_code == 200
	products = res.json()
	assert len(products) == 2
	ids = {p['id'] for p in products}
	assert 'prod_bolt_001' in ids
	assert 'prod_bolt_004' in ids

	# Exact single price match
	res_exact = client.get('/products?min_price=499.0&max_price=499.0')
	assert res_exact.status_code == 200
	assert len(res_exact.json()) == 1
	assert res_exact.json()[0]['id'] == 'prod_bolt_001'


def test_in_stock_only_excludes_zero_stock():
	"""in_stock_only=true excludes items whose available stock has depleted to 0."""
	# Deplete stock of prod_bolt_002 to 0
	set_stock('prod_bolt_002', 0)

	# Full listing still shows the item with stock 0
	res_all = client.get('/products')
	assert len(res_all.json()) == 5
	p2 = next(p for p in res_all.json() if p['id'] == 'prod_bolt_002')
	assert p2['stock'] == 0

	# Filtered listing excludes it
	res_in_stock = client.get('/products?in_stock_only=true')
	assert res_in_stock.status_code == 200
	in_stock_products = res_in_stock.json()
	assert len(in_stock_products) == 4
	assert not any(p['id'] == 'prod_bolt_002' for p in in_stock_products)


def test_discovery_manifest_advertises_search_support():
	"""/.well-known/agent.json capability document declares search_and_filter support."""
	res = client.get('/.well-known/agent.json')
	assert res.status_code == 200
	manifest = res.json()
	assert 'search_and_filter' in manifest
	assert manifest['search_and_filter']['supported'] is True
	assert 'q' in manifest['search_and_filter']['query_parameters']
