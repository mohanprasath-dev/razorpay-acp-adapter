from fastapi.testclient import TestClient
from backend.main import app
from backend.scripts.seed_catalog import seed_catalog, SEED_PRODUCTS

client = TestClient(app)


def test_seed_catalog_idempotency():
	# First run
	count1 = seed_catalog(verbose=False)
	assert count1 == 5

	# Second run (must be idempotent)
	count2 = seed_catalog(verbose=False)
	assert count2 == 5


def test_get_products_returns_seeded_skus():
	seed_catalog(verbose=False)
	response = client.get('/products')
	assert response.status_code == 200
	products = response.json()

	assert len(products) == len(SEED_PRODUCTS)
	expected_ids = {p['id'] for p in SEED_PRODUCTS}
	actual_ids = {p['id'] for p in products}
	assert actual_ids == expected_ids

	# Verify no placeholder strings exist
	for product in products:
		assert 'product 1' not in product['name'].lower()
		assert 'lorem ipsum' not in product['description'].lower()
		assert product['price'] > 0
		assert product['currency'] == 'INR'
