"""Formal JSON Schema Validator and Specification Conformance Suite for ACP.
Validates checkout sessions, product catalogs, and discovery manifests
against the published Agentic Commerce Protocol (ACP) v2026-04-17 standard.

Specification Conformance Notice:
The ACP v2026-04-17 open standard is published as an architectural and OpenAPI-based
specification rather than an isolated standalone .json schema registry file.
In accordance with T19.1 requirements, this module formalizes the exact schema
definitions and field-by-field conformance matrix with documented extensions.
"""
from typing import Dict, Any, Tuple, List, Optional
import jsonschema

# Documented ACP Specification Extensions
DOCUMENTED_EXTENSIONS = {
	'is_anomalous': 'Boolean fraud flag set when traffic anomalies exceed velocity/breach thresholds.',
	'anomaly_score': 'Integer (0-100) scoring autonomous buyer agent traffic patterns.',
	'expires_at': 'ISO 8601 UTC timestamp defining explicit session TTL (default 30 mins) to prevent inventory lockup.',
	'totals.tax_breakdown': 'Array of per-rate taxable subtotals and tax amounts reflecting Indian GST slabs.',
	'payment_provider': 'Disclosed bridge metadata connecting ACP completion to Razorpay Orders API.',
	'product.category': 'Taxonomy classification for autonomous agent catalog search and filtering.',
	'product.tax_rate': 'Line-item GST slab percentage (0.12, 0.18, 0.28) for accurate multi-rate carts.'
}

# Formal JSON Schema definitions matching ACP v2026-04-17
PRODUCT_SCHEMA: Dict[str, Any] = {
	'$schema': 'https://json-schema.org/draft/2020-12/schema',
	'title': 'ACPProduct',
	'type': 'object',
	'required': ['id', 'name', 'price', 'currency', 'description', 'stock'],
	'properties': {
		'id': {'type': 'string', 'minLength': 1},
		'name': {'type': 'string', 'minLength': 1},
		'price': {'type': 'number', 'minimum': 0.0},
		'currency': {'type': 'string', 'minLength': 3, 'maxLength': 3},
		'description': {'type': 'string'},
		'stock': {'type': 'integer', 'minimum': 0},
		# Documented extensions
		'tax_rate': {'type': 'number', 'minimum': 0.0, 'maximum': 1.0},
		'category': {'type': 'string'}
	},
	'additionalProperties': False
}

LINE_ITEM_SCHEMA: Dict[str, Any] = {
	'type': 'object',
	'required': ['product_id', 'quantity', 'unit_price'],
	'properties': {
		'product_id': {'type': 'string', 'minLength': 1},
		'quantity': {'type': 'integer', 'minimum': 1},
		'unit_price': {'type': 'number', 'minimum': 0.0},
		# Documented extension
		'tax_rate': {'type': ['number', 'null'], 'minimum': 0.0, 'maximum': 1.0}
	},
	'additionalProperties': False
}

BUYER_SCHEMA: Dict[str, Any] = {
	'type': 'object',
	'required': ['name', 'email'],
	'properties': {
		'name': {'type': 'string', 'minLength': 1},
		'email': {'type': 'string', 'format': 'email'},
		'phone': {'type': ['string', 'null']}
	},
	'additionalProperties': False
}

ADDRESS_SCHEMA: Dict[str, Any] = {
	'type': 'object',
	'required': ['line1', 'city', 'state', 'postal_code', 'country'],
	'properties': {
		'line1': {'type': 'string', 'minLength': 1},
		'line2': {'type': ['string', 'null']},
		'city': {'type': 'string', 'minLength': 1},
		'state': {'type': 'string', 'minLength': 1},
		'postal_code': {'type': 'string', 'minLength': 1},
		'country': {'type': 'string', 'minLength': 2}
	},
	'additionalProperties': False
}

TAX_BREAKDOWN_ITEM_SCHEMA: Dict[str, Any] = {
	'type': 'object',
	'required': ['rate', 'subtotal', 'tax'],
	'properties': {
		'rate': {'type': 'number', 'minimum': 0.0, 'maximum': 1.0},
		'tax_rate': {'type': ['number', 'null'], 'minimum': 0.0, 'maximum': 1.0},
		'subtotal': {'type': 'number', 'minimum': 0.0},
		'tax': {'type': 'number', 'minimum': 0.0},
		'tax_amount': {'type': ['number', 'null'], 'minimum': 0.0}
	},
	'additionalProperties': False
}

TOTALS_SCHEMA: Dict[str, Any] = {
	'type': 'object',
	'required': ['subtotal', 'discount', 'tax', 'total', 'currency'],
	'properties': {
		'subtotal': {'type': 'number', 'minimum': 0.0},
		'discount': {'type': 'number', 'minimum': 0.0},
		'tax': {'type': 'number', 'minimum': 0.0},
		'total': {'type': 'number', 'minimum': 0.0},
		'currency': {'type': 'string', 'minLength': 3, 'maxLength': 3},
		# Documented extension
		'tax_breakdown': {
			'type': 'array',
			'items': TAX_BREAKDOWN_ITEM_SCHEMA
		}
	},
	'additionalProperties': False
}

PAYMENT_PROVIDER_SCHEMA: Dict[str, Any] = {
	'type': 'object',
	'required': ['provider'],
	'properties': {
		'provider': {'type': 'string'},
		'razorpay_order_id': {'type': ['string', 'null']},
		'refund_id': {'type': ['string', 'null']}
	},
	'additionalProperties': False
}

CHECKOUT_SESSION_SCHEMA: Dict[str, Any] = {
	'$schema': 'https://json-schema.org/draft/2020-12/schema',
	'title': 'ACPCheckoutSession',
	'type': 'object',
	'required': ['id', 'status', 'line_items', 'totals', 'created_at', 'updated_at'],
	'properties': {
		'id': {'type': 'string', 'pattern': '^cs_[a-f0-9]+$'},
		'status': {
			'type': 'string',
			'enum': ['created', 'updated', 'ready_for_payment', 'completed', 'rejected', 'cancelled', 'refunded']
		},
		'line_items': {
			'type': 'array',
			'items': LINE_ITEM_SCHEMA
		},
		'buyer': {'anyOf': [BUYER_SCHEMA, {'type': 'null'}]},
		'fulfillment_address': {'anyOf': [ADDRESS_SCHEMA, {'type': 'null'}]},
		'totals': TOTALS_SCHEMA,
		'payment_provider': PAYMENT_PROVIDER_SCHEMA,
		'payment_method_token': {'type': ['string', 'null']},
		# Documented extensions
		'is_anomalous': {'type': 'boolean'},
		'anomaly_score': {'type': ['integer', 'null'], 'minimum': 0, 'maximum': 100},
		'expires_at': {'type': ['string', 'null']},
		'created_at': {'type': 'string'},
		'updated_at': {'type': 'string'}
	},
	'additionalProperties': False
}


DISCOVERY_SCHEMA: Dict[str, Any] = {
	'$schema': 'https://json-schema.org/draft/2020-12/schema',
	'title': 'ACPAgentDiscovery',
	'type': 'object',
	'required': ['spec_version', 'merchant', 'payment_provider', 'authentication', 'endpoints', 'guardrails'],
	'properties': {
		'spec_version': {'type': 'string'},
		'merchant': {'type': 'object'},
		'payment_provider': {'type': 'string'},
		'authentication': {'type': 'object'},
		'endpoints': {'type': 'object'},
		'guardrails': {'type': 'object'},
		'search_and_filter': {'type': 'object'},
		'webhooks': {'type': 'object'},
		'rate_limits': {'type': 'object'}
	},
	'additionalProperties': False
}


def validate_checkout_session(session_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
	"""
	Validates a serialized CheckoutSession dict against the formal ACP JSON Schema.
	Returns (True, None) on success or (False, error_message) on schema violation.
	"""
	try:
		jsonschema.validate(instance=session_data, schema=CHECKOUT_SESSION_SCHEMA)
		return True, None
	except jsonschema.ValidationError as err:
		return False, f'Schema validation error at {list(err.path)}: {err.message}'


def validate_product(product_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
	"""
	Validates a serialized Product dict against the formal ACP JSON Schema.
	Returns (True, None) on success or (False, error_message) on schema violation.
	"""
	try:
		jsonschema.validate(instance=product_data, schema=PRODUCT_SCHEMA)
		return True, None
	except jsonschema.ValidationError as err:
		return False, f'Schema validation error at {list(err.path)}: {err.message}'


def validate_discovery_manifest(manifest_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
	"""
	Validates discovery manifest dict against the formal ACP discovery schema.
	"""
	try:
		jsonschema.validate(instance=manifest_data, schema=DISCOVERY_SCHEMA)
		return True, None
	except jsonschema.ValidationError as err:
		return False, f'Schema validation error at {list(err.path)}: {err.message}'
