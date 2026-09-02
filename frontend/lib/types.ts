export type SessionStatus = 'created' | 'updated' | 'ready_for_payment' | 'completed' | 'refunded' | 'rejected' | 'cancelled';

export type AuditAction = 'create' | 'update' | 'complete' | 'refund' | 'reject' | 'cancel' | 'out_of_stock' | 'attach_payment_method';

export interface LineItem {
	product_id: string;
	quantity: number;
	unit_price: number;
}

export interface Buyer {
	name: string;
	email: string;
	phone?: string;
}

export interface Address {
	line1: string;
	line2?: string;
	city: string;
	state: string;
	postal_code: string;
	country: string;
}

export interface Totals {
	subtotal: number;
	discount: number;
	tax: number;
	total: number;
	currency: string;
}

export interface PaymentProvider {
	provider: string;
	razorpay_order_id?: string | null;
	refund_id?: string | null;
}

export interface CheckoutSession {
	id: string;
	status: SessionStatus;
	line_items: LineItem[];
	buyer?: Buyer | null;
	fulfillment_address?: Address | null;
	totals: Totals;
	payment_provider: PaymentProvider;
	payment_method_token?: string | null;
	created_at: string;
	updated_at: string;
}

export interface AuditEntry {
	id: string;
	session_id: string;
	action: AuditAction;
	actor: string;
	reason?: string | null;
	before_total?: number | null;
	after_total?: number | null;
	timestamp: string;
}

export interface DeadLetterEvent {
	id: string;
	event_type: string;
	session_id?: string | null;
	target_url: string;
	last_error: string;
	attempts: number;
	timestamp: string;
}
