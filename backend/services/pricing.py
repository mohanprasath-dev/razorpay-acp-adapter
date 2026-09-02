"""Pricing and Totals Computation Service for ACP Checkout Sessions.
Enforces server-side authoritative pricing from catalog and accurate tax/total calculation.
"""
from typing import List, Tuple, Dict, Any
from fastapi import HTTPException
from backend.models import LineItem, Totals
from backend.routers.discovery import CATALOG

# 18% GST (Standard digital services & AI goods tax rate in India)
DEFAULT_TAX_RATE = 0.18


def get_catalog_map() -> Dict[str, Any]:
	"""Returns catalog indexed by product_id."""
	return {p.id: p for p in CATALOG}


def compute_authoritative_totals(
	raw_items: List[Dict[str, Any]],
	discount_amount: float = 0.0,
	tax_rate: float = DEFAULT_TAX_RATE,
	currency: str = 'INR'
) -> Tuple[List[LineItem], Totals]:
	"""
	Validates line items against server catalog, ignores any client-supplied unit_price,
	and calculates subtotal, discount, tax, and final total authoritatively.
	"""
	if not raw_items:
		raise HTTPException(status_code=400, detail='line_items array cannot be empty.')

	catalog_map = get_catalog_map()
	authoritative_items: List[LineItem] = []
	subtotal = 0.0

	for item_data in raw_items:
		prod_id = item_data.get('product_id')
		if not prod_id or prod_id not in catalog_map:
			raise HTTPException(
				status_code=400,
				detail=f'Invalid product_id: "{prod_id}". Product not found in merchant catalog.'
			)

		qty = item_data.get('quantity', 1)
		if not isinstance(qty, int) or qty <= 0:
			raise HTTPException(
				status_code=400,
				detail=f'Invalid quantity for product "{prod_id}". Quantity must be a positive integer.'
			)

		product = catalog_map[prod_id]
		# Authoritative price lookup from server catalog (ignores any client-passed price)
		unit_price = float(product.price)
		item_subtotal = unit_price * qty
		subtotal += item_subtotal

		authoritative_items.append(
			LineItem(
				product_id=prod_id,
				quantity=qty,
				unit_price=unit_price
			)
		)

	subtotal = round(subtotal, 2)
	discount = round(max(0.0, discount_amount), 2)
	taxable_amount = max(0.0, subtotal - discount)
	tax = round(taxable_amount * tax_rate, 2)
	total = round(taxable_amount + tax, 2)

	totals = Totals(
		subtotal=subtotal,
		discount=discount,
		tax=tax,
		total=total,
		currency=currency.upper()
	)

	return authoritative_items, totals
