"""Core Pydantic data models for Razorpay ACP Adapter matching PRD §7."""
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class SessionStatus(str, Enum):
	CREATED = 'created'
	UPDATED = 'updated'
	READY_FOR_PAYMENT = 'ready_for_payment'
	COMPLETED = 'completed'
	REJECTED = 'rejected'
	CANCELLED = 'cancelled'


class AuditAction(str, Enum):
	CREATE = 'create'
	UPDATE = 'update'
	COMPLETE = 'complete'
	REJECT = 'reject'
	CANCEL = 'cancel'


class LineItem(BaseModel):
	product_id: str
	quantity: int = Field(gt=0, description='Quantity must be greater than zero')
	unit_price: float = Field(ge=0.0, description='Unit price must be non-negative')


class Buyer(BaseModel):
	name: str
	email: str
	phone: Optional[str] = None


class Address(BaseModel):
	line1: str
	line2: Optional[str] = None
	city: str
	state: str
	postal_code: str
	country: str


class Totals(BaseModel):
	subtotal: float = Field(ge=0.0, description='Subtotal must be non-negative')
	discount: float = Field(default=0.0, ge=0.0, description='Discount must be non-negative')
	tax: float = Field(default=0.0, ge=0.0, description='Tax must be non-negative')
	total: float = Field(ge=0.0, description='Total must be non-negative')
	currency: str = Field(min_length=3, max_length=3, description='ISO 4217 3-letter currency code')

	@field_validator('currency')
	@classmethod
	def validate_currency_iso(cls, v: str) -> str:
		upper = v.upper()
		if not upper.isalpha() or len(upper) != 3:
			raise ValueError('Currency must be a 3-letter ISO code')
		return upper


class PaymentProvider(BaseModel):
	provider: str = 'razorpay'
	razorpay_order_id: Optional[str] = None


class CheckoutSession(BaseModel):
	id: str
	status: SessionStatus
	line_items: List[LineItem] = Field(default_factory=list)
	buyer: Optional[Buyer] = None
	fulfillment_address: Optional[Address] = None
	totals: Totals
	payment_provider: PaymentProvider = Field(default_factory=PaymentProvider)
	created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
	updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditEntry(BaseModel):
	id: str
	session_id: str
	action: AuditAction
	actor: str = 'buyer_agent_sim'
	reason: Optional[str] = None
	before_total: Optional[float] = None
	after_total: Optional[float] = None
	timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

	@model_validator(mode='after')
	def validate_reject_reason(self) -> 'AuditEntry':
		if self.action == AuditAction.REJECT:
			if not self.reason or not self.reason.strip():
				raise ValueError('Reason is required when action is "reject"')
		return self
