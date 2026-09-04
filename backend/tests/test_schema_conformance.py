"""Tests for T19.1: Formal ACP JSON Schema Validation and Conformance Verification."""
import jsonschema
from fastapi.testclient import TestClient
from backend.main import app
from backend.validation.acp_schema_validator import (
	CHECKOUT_SESSION_SCHEMA,
	PRODUCT_SCHEMA,
	DISCOVERY_SCHEMA,
	DOCUMENTED_EXTENSIONS,
	validate_checkout_session,
	validate_product,
	validate_discovery_manifest,
)

client = TestClient(app)


def test_products_list_schema_conformance():
	"""All items returned from GET /products strictly conform to the ACP Product JSON schema."""
	res = client.get('/products')
	assert res.status_code == 200
	products = res.json()
	assert len(products) >= 1

	for p in products:
		is_valid, err = validate_product(p)
		assert is_valid is True, f'Product schema conformance failure on {p.get("id")}: {err}'
		# Direct jsonschema library assertion
		jsonschema.validate(instance=p, schema=PRODUCT_SCHEMA)


def test_create_and_get_session_schema_conformance():
	"""Responses from POST /checkout_sessions and GET /checkout_sessions/{id} strictly conform to the ACP CheckoutSession JSON schema."""
	payload = {
		'line_items': [
			{'product_id': 'prod_bolt_001', 'quantity': 2},
			{'product_id': 'prod_bolt_004', 'quantity': 1}
		],
		'buyer': {
			'name': 'Conforming Agent',
			'email': 'conformance@protocol.test',
			'phone': '+919876543210'
		},
		'fulfillment_address': {
			'line1': 'Standardization Block 5',
			'city': 'Bengaluru',
			'state': 'KA',
			'postal_code': '560001',
			'country': 'IN'
		},
		'discount': 100.0
	}

	# Create session
	res_create = client.post('/checkout_sessions', json=payload)
	assert res_create.status_code == 201
	created_session = res_create.json()

	# Validate created session against formal schema
	is_valid, err = validate_checkout_session(created_session)
	assert is_valid is True, f'Created session schema error: {err}'
	jsonschema.validate(instance=created_session, schema=CHECKOUT_SESSION_SCHEMA)

	# Fetch session and validate
	sid = created_session['id']
	res_get = client.get(f'/checkout_sessions/{sid}')
	assert res_get.status_code == 200
	fetched_session = res_get.json()

	is_valid_get, err_get = validate_checkout_session(fetched_session)
	assert is_valid_get is True, f'Fetched session schema error: {err_get}'
	jsonschema.validate(instance=fetched_session, schema=CHECKOUT_SESSION_SCHEMA)


def test_discovery_manifest_schema_conformance():
	"""GET /.well-known/agent.json strictly conforms to the ACP Agent Discovery JSON schema."""
	res = client.get('/.well-known/agent.json')
	assert res.status_code == 200
	manifest = res.json()

	is_valid, err = validate_discovery_manifest(manifest)
	assert is_valid is True, f'Discovery manifest schema error: {err}'
	jsonschema.validate(instance=manifest, schema=DISCOVERY_SCHEMA)


def test_documented_extensions_present_and_documented():
	"""All deliberate extensions to the ACP specification are registered and documented."""
	expected_extensions = [
		'is_anomalous',
		'anomaly_score',
		'expires_at',
		'totals.tax_breakdown',
		'payment_provider',
		'product.category',
		'product.tax_rate'
	]
	for ext in expected_extensions:
		assert ext in DOCUMENTED_EXTENSIONS
		assert len(DOCUMENTED_EXTENSIONS[ext]) > 10
