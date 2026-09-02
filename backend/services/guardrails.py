"""Deterministic Guardrail Rule Engine for ACP Checkout Adapter.
Enforces hard mathematical bounds for agentic commerce without external network or LLM dependencies.
"""
from typing import List, Tuple, Optional
from backend.models import LineItem, Totals

# Hardcoded merchant bounds (configured for demo and test merchant personas)
MAX_DISCOUNT_PERCENTAGE: float = 50.0  # Max 50% discount on cart subtotal
MAX_ORDER_VALUE_INR: float = 50000.0   # Max single order total: ₹50,000 INR
MAX_QUANTITY_PER_ITEM: int = 10        # Max 10 units per individual line item


def validate_guardrails(
	line_items: List[LineItem],
	totals: Totals,
	discount_amount: float = 0.0
) -> Tuple[bool, Optional[str]]:
	"""
	Deterministically evaluates cart guardrails:
	1. Quantity per line item must not exceed MAX_QUANTITY_PER_ITEM.
	2. Discount percentage must not exceed MAX_DISCOUNT_PERCENTAGE of subtotal.
	3. Total order value must not exceed MAX_ORDER_VALUE_INR.

	Returns:
		(True, None) if all checks pass.
		(False, reason_string) if any bound is breached.
	"""
	# Rule 1: Max Quantity per Line Item
	for item in line_items:
		if item.quantity > MAX_QUANTITY_PER_ITEM:
			return (
				False,
				f'Line item quantity ({item.quantity}) for product "{item.product_id}" exceeds maximum allowed bound of {MAX_QUANTITY_PER_ITEM} units per item.'
			)

	# Rule 2: Max Discount Percentage
	if totals.subtotal > 0 and discount_amount > 0:
		discount_pct = (discount_amount / totals.subtotal) * 100.0
		if discount_pct > MAX_DISCOUNT_PERCENTAGE:
			return (
				False,
				f'Requested discount ({discount_pct:.1f}%) exceeds maximum allowed bound of {MAX_DISCOUNT_PERCENTAGE:.0f}% (subtotal: ₹{totals.subtotal:.2f}, discount: ₹{discount_amount:.2f}).'
			)

	# Rule 3: Max Single Order Value
	if totals.total > MAX_ORDER_VALUE_INR:
		return (
			False,
			f'Order total (₹{totals.total:,.2f}) exceeds maximum single-order bound of ₹{MAX_ORDER_VALUE_INR:,.2f}.'
		)

	return True, None
