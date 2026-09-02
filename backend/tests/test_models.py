import pytest
from pydantic import ValidationError
from backend.models import (
	Address,
	AuditAction,
	AuditEntry,
	Buyer,
	CheckoutSession,
	LineItem,
	PaymentProvider,
	SessionStatus,
	Totals,
)


def test_line_item_validation():
	# Valid line item
	item = LineItem(product_id='prod_001', quantity=2, unit_price=499.0)
	assert item.product_id == 'prod_001'
	assert item.quantity == 2
	assert item.unit_price == 499.0

	# Invalid quantity (0)
	with pytest.raises(ValidationError):
		LineItem(product_id='prod_001', quantity=0, unit_price=499.0)

	# Invalid quantity (negative)
	with pytest.raises(ValidationError):
		LineItem(product_id='prod_001', quantity=-1, unit_price=499.0)

	# Invalid unit price (negative)
	with pytest.raises(ValidationError):
		LineItem(product_id='prod_001', quantity=1, unit_price=-10.0)


def test_totals_validation():
	# Valid totals
	totals = Totals(subtotal=1000.0, discount=100.0, tax=162.0, total=1062.0, currency='inr')
	assert totals.currency == 'INR'
	assert totals.total == 1062.0

	# Invalid currency length / chars
	with pytest.raises(ValidationError):
		Totals(subtotal=100.0, total=100.0, currency='INVALID_CURRENCY')

	with pytest.raises(ValidationError):
		Totals(subtotal=100.0, total=100.0, currency='12')

	# Negative total
	with pytest.raises(ValidationError):
		Totals(subtotal=100.0, total=-50.0, currency='INR')


def test_audit_entry_reject_reason_validation():
	# Valid create action without reason
	entry_create = AuditEntry(
		id='audit_01',
		session_id='sess_01',
		action=AuditAction.CREATE,
		actor='buyer_agent_sim',
		before_total=None,
		after_total=1000.0
	)
	assert entry_create.action == AuditAction.CREATE
	assert entry_create.reason is None

	# Valid reject action with reason
	entry_reject = AuditEntry(
		id='audit_02',
		session_id='sess_01',
		action=AuditAction.REJECT,
		actor='buyer_agent_sim',
		reason='Discount of 60% exceeds merchant max bound (50%)',
		before_total=1000.0,
		after_total=1000.0
	)
	assert entry_reject.reason == 'Discount of 60% exceeds merchant max bound (50%)'

	# Invalid reject action with missing reason
	with pytest.raises(ValidationError):
		AuditEntry(
			id='audit_03',
			session_id='sess_01',
			action=AuditAction.REJECT,
			actor='buyer_agent_sim',
			reason=None
		)

	# Invalid reject action with empty reason string
	with pytest.raises(ValidationError):
		AuditEntry(
			id='audit_04',
			session_id='sess_01',
			action=AuditAction.REJECT,
			actor='buyer_agent_sim',
			reason='   '
		)


def test_checkout_session_model():
	session = CheckoutSession(
		id='sess_test_123',
		status=SessionStatus.CREATED,
		line_items=[
			LineItem(product_id='prod_01', quantity=1, unit_price=2500.0)
		],
		buyer=Buyer(name='Test Agent Buyer', email='agent@example.com', phone='+919876543210'),
		fulfillment_address=Address(
			line1='100 Tech Park',
			line2='Tower B, 4th Floor',
			city='Bengaluru',
			state='Karnataka',
			postal_code='560103',
			country='IN'
		),
		totals=Totals(subtotal=2500.0, discount=0.0, tax=450.0, total=2950.0, currency='INR'),
		payment_provider=PaymentProvider(provider='razorpay', razorpay_order_id=None)
	)

	assert session.id == 'sess_test_123'
	assert session.status == SessionStatus.CREATED
	assert len(session.line_items) == 1
	assert session.buyer.email == 'agent@example.com'
	assert session.totals.currency == 'INR'
	assert session.payment_provider.provider == 'razorpay'
