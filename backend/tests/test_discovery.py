from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_agent_discovery_endpoint():
	# Unauthenticated request to /.well-known/agent.json
	response = client.get('/.well-known/agent.json')
	assert response.status_code == 200
	data = response.json()

	# Assert ACP Spec Fields
	assert data['spec_version'] == '2026-04-17'
	assert data['payment_provider'] == 'razorpay'
	assert 'merchant' in data
	assert data['merchant']['name'] == 'Razorpay ACP Merchant Store'
	assert 'endpoints' in data
	assert data['endpoints']['discovery'] == '/.well-known/agent.json'
	assert data['endpoints']['catalog'] == '/products'
	assert data['endpoints']['checkout_sessions_create'] == '/checkout_sessions'
	assert data['endpoints']['checkout_sessions_complete'] == '/checkout_sessions/{id}/complete'
	assert 'guardrails' in data
	assert data['guardrails']['max_discount_percentage'] == 50


def test_products_catalog_endpoint():
	# Unauthenticated request to /products
	response = client.get('/products')
	assert response.status_code == 200
	products = response.json()

	assert isinstance(products, list)
	assert len(products) == 5

	for prod in products:
		assert 'id' in prod and prod['id'].startswith('prod_')
		assert 'name' in prod and len(prod['name']) > 0
		assert 'price' in prod and prod['price'] > 0
		assert 'currency' in prod and prod['currency'] == 'INR'
		assert 'description' in prod and len(prod['description']) > 0
