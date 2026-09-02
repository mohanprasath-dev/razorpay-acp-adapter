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
	REFUNDED = 'refunded'
	REJECTED = 'rejected'
	CANCELLED = 'cancelled'


class AuditAction(str, Enum):
	CREATE = 'create'
	UPDATE = 'update'
	COMPLETE = 'complete'
	REFUND = 'refund'
	REJECT = 'reject'
	CANCEL = 'cancel'
	OUT_OF_STOCK = 'out_of_stock'
	ATTACH_PAYMENT_METHOD = 'attach_payment_method'
	FLAGGED_ANOMALOUS = 'flagged_anomalous'


class LineItem(BaseModel):
	product_id: str
	quantity: int = Field(gt=0, description='Quantity must be greater than zero')
	unit_price: float = Field(ge=0.0, description='Unit price must be non-negative')


class Product(BaseModel):
	id: str
	name: str
	price: float = Field(ge=0.0, description='Price must be non-negative')
	currency: str = Field(default='INR', min_length=3, max_length=3)
	description: str
	stock: int = Field(default=100, ge=0, description='Available inventory stock quantity')


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
	refund_id: Optional[str] = None


class CheckoutSession(BaseModel):
	id: str
	status: SessionStatus
	line_items: List[LineItem] = Field(default_factory=list)
	buyer: Optional[Buyer] = None
	fulfillment_address: Optional[Address] = None
	totals: Totals
	payment_provider: PaymentProvider = Field(default_factory=PaymentProvider)
	payment_method_token: Optional[str] = None
	is_anomalous: bool = False
	anomaly_score: Optional[int] = 0
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
		if self.action in [AuditAction.REJECT, AuditAction.OUT_OF_STOCK, AuditAction.FLAGGED_ANOMALOUS]:
			if not self.reason or not self.reason.strip():
				raise ValueError('Reason is required when action is "reject", "out_of_stock", or "flagged_anomalous"')
		return self


class DeadLetterEvent(BaseModel):
	id: str
	event_type: str
	session_id: Optional[str] = None
	target_url: str
	last_error: str
	attempts: int = 3
	timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

