"""Tests for T18.1: Line-Item Level Tax Granularity & Proportional Discounts."""
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_mixed_tax_rate_cart_calculation():
	"""
	Verifies that a cart with mixed tax-rate items computes line-item taxes accurately:
	- prod_bolt_001 (tokens): ₹499.0 @ 18% GST (Tax: ₹89.82)
	- prod_bolt_003 (creative shader pack): ₹9999.0 @ 12% GST (Tax: ₹1199.88)
	Subtotal = ₹10,498.00
	Expected Total Tax = ₹89.82 + ₹1199.88 = ₹1289.70
	Expected Total = ₹11,787.70
	"""
	payload = {
		'line_items': [
			{'product_id': 'prod_bolt_001', 'quantity': 1},
			{'product_id': 'prod_bolt_003', 'quantity': 1}
		]
	}
	res = client.post('/checkout_sessions', json=payload)
	assert res.status_code == 201
	data = res.json()

	totals = data['totals']
	assert totals['subtotal'] == 10498.0
	assert totals['discount'] == 0.0
	assert totals['tax'] == 1289.70
	assert totals['total'] == 11787.70

	# Verify tax_breakdown
	breakdown = totals['tax_breakdown']
	assert len(breakdown) == 2

	# 12% slab
	slab_12 = next(b for b in breakdown if abs(b['rate'] - 0.12) < 0.001)
	assert slab_12['subtotal'] == 9999.0
	assert slab_12['tax'] == 1199.88

	# 18% slab
	slab_18 = next(b for b in breakdown if abs(b['rate'] - 0.18) < 0.001)
	assert slab_18['subtotal'] == 499.0
	assert slab_18['tax'] == 89.82


def test_proportional_discount_allocation_across_mixed_tax_rates():
	"""
	Verifies that a discount applied to a mixed-rate cart is allocated proportionally
	across line items before tax calculation (avoiding post-tax double discounting):
	- prod_bolt_001: ₹499.00 (qty 2) = ₹998.00 @ 18%
	- prod_bolt_003: ₹9999.00 (qty 1) = ₹9999.00 @ 12%
	Subtotal = ₹10,997.00
	Discount = ₹1,000.00 (9.09% of cart)
	Item 1 discount = round(1000 * (998 / 10997), 2) = ₹90.75 -> Taxable: ₹907.25 @ 18% = ₹163.31
	Item 2 discount = round(1000 - 90.75, 2) = ₹909.25 -> Taxable: ₹9089.75 @ 12% = ₹1090.77
	Expected Total Tax = ₹163.31 + ₹1090.77 = ₹1254.08
	Expected Total = (10997 - 1000) + 1254.08 = ₹11,251.08
	"""
	payload = {
		'line_items': [
			{'product_id': 'prod_bolt_001', 'quantity': 2},
			{'product_id': 'prod_bolt_003', 'quantity': 1}
		],
		'discount': 1000.0
	}
	res = client.post('/checkout_sessions', json=payload)
	assert res.status_code == 201
	data = res.json()

	totals = data['totals']
	assert totals['subtotal'] == 10997.0
	assert totals['discount'] == 1000.0
	assert totals['tax'] == 1254.08
	assert totals['total'] == 11251.08

	breakdown = totals['tax_breakdown']
	assert len(breakdown) == 2

	slab_12 = next(b for b in breakdown if abs(b['rate'] - 0.12) < 0.001)
	assert slab_12['subtotal'] == 9089.75
	assert slab_12['tax'] == 1090.77

	slab_18 = next(b for b in breakdown if abs(b['rate'] - 0.18) < 0.001)
	assert slab_18['subtotal'] == 907.25
	assert slab_18['tax'] == 163.31


def test_varied_28_percent_slab_item():
	"""Verifies high-tier 28% luxury license SKU (prod_bolt_005)."""
	payload = {
		'line_items': [
			{'product_id': 'prod_bolt_005', 'quantity': 1}
		]
	}
	res = client.post('/checkout_sessions', json=payload)
	assert res.status_code == 201
	data = res.json()

	totals = data['totals']
	assert totals['subtotal'] == 14999.0
	# 14999 * 0.28 = 4199.72
	assert totals['tax'] == 4199.72
	assert totals['total'] == 19198.72

	breakdown = totals['tax_breakdown']
	assert len(breakdown) == 1
	assert breakdown[0]['rate'] == 0.28
	assert breakdown[0]['subtotal'] == 14999.0
	assert breakdown[0]['tax'] == 4199.72
