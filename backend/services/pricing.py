"""Pricing and Totals Computation Service for ACP Checkout Sessions.
Enforces server-side authoritative pricing from catalog, line-item level tax rates,
proportional pre-tax discount allocation, and granular tax breakdown.
"""
from typing import List, Tuple, Dict, Any
from fastapi import HTTPException
from backend.models import LineItem, Totals, TaxBreakdownItem
from backend.routers.discovery import CATALOG

# 18% GST default fallback
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
	and calculates subtotal, proportional pre-tax discount allocation, line-item taxes,
	tax_breakdown array, and final total.
	"""
	if not raw_items:
		raise HTTPException(status_code=400, detail='line_items array cannot be empty.')

	catalog_map = get_catalog_map()
	authoritative_items: List[LineItem] = []
	item_subtotals: List[float] = []
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
		unit_price = float(product.price)
		item_tax_rate = float(getattr(product, 'tax_rate', tax_rate))
		item_sub = round(unit_price * qty, 2)
		subtotal += item_sub
		item_subtotals.append(item_sub)

		authoritative_items.append(
			LineItem(
				product_id=prod_id,
				quantity=qty,
				unit_price=unit_price,
				tax_rate=item_tax_rate
			)
		)

	subtotal = round(subtotal, 2)
	total_discount = round(min(subtotal, max(0.0, discount_amount)), 2)

	# Proportional pre-tax discount allocation across line items
	allocated_discounts: List[float] = []
	if subtotal > 0 and total_discount > 0:
		running_disc = 0.0
		for i, item_sub in enumerate(item_subtotals):
			if i == len(item_subtotals) - 1:
				item_disc = round(total_discount - running_disc, 2)
			else:
				item_disc = round(total_discount * (item_sub / subtotal), 2)
				running_disc += item_disc
			allocated_discounts.append(item_disc)
	else:
		allocated_discounts = [0.0] * len(authoritative_items)

	# Calculate tax per line item and group into tax breakdown
	breakdown_by_rate: Dict[float, Dict[str, float]] = {}
	total_tax = 0.0

	for item, item_sub, item_disc in zip(authoritative_items, item_subtotals, allocated_discounts):
		rate = item.tax_rate if item.tax_rate is not None else tax_rate
		taxable_amt = max(0.0, round(item_sub - item_disc, 2))
		item_tax = round(taxable_amt * rate, 2)
		total_tax += item_tax

		if rate not in breakdown_by_rate:
			breakdown_by_rate[rate] = {'subtotal': 0.0, 'tax': 0.0}
		breakdown_by_rate[rate]['subtotal'] = round(breakdown_by_rate[rate]['subtotal'] + taxable_amt, 2)
		breakdown_by_rate[rate]['tax'] = round(breakdown_by_rate[rate]['tax'] + item_tax, 2)

	total_tax = round(total_tax, 2)
	net_subtotal = round(max(0.0, subtotal - total_discount), 2)
	final_total = round(net_subtotal + total_tax, 2)

	# Format tax breakdown list sorted by tax rate
	tax_breakdown = [
		TaxBreakdownItem(
			rate=rate,
			tax_rate=rate,
			subtotal=data['subtotal'],
			tax=data['tax'],
			tax_amount=data['tax']
		)
		for rate, data in sorted(breakdown_by_rate.items())
	]

	totals = Totals(
		subtotal=subtotal,
		discount=total_discount,
		tax=total_tax,
		total=final_total,
		currency=currency.upper(),
		tax_breakdown=tax_breakdown
	)

	return authoritative_items, totals
