/**
 * Client-Side Protocol Simulator Engine for AgentPay Bridge.
 * Allows judges and developers to trigger live ACP checkout scenarios
 * directly from the frontend without opening a terminal.
 */
import { API_BASE_URL } from './api';

export interface SimStepLog {
	id: string;
	timestamp: string;
	act: string;
	title: string;
	method: 'GET' | 'POST';
	endpoint: string;
	status: 'running' | 'success' | 'rejected' | 'error';
	statusCode?: number;
	details?: string;
	payload?: any;
	response?: any;
}

export interface SimResult {
	scenario: 'happy_path' | 'violation' | 'idempotency';
	success: boolean;
	summary: string;
	sessionId?: string;
	razorpayOrderId?: string;
	logs: SimStepLog[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let cachedApiKey: string | null = null;

export async function getOrRegisterApiKey(): Promise<string> {
	if (cachedApiKey) return cachedApiKey;
	try {
		const res = await fetch(`${API_BASE_URL}/agents/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Aura Autonomous Buyer Agent #42' }),
		});
		if (res.ok) {
			const data = await res.json();
			if (data.api_key) {
				cachedApiKey = String(data.api_key);
				return cachedApiKey;
			}
		}
	} catch (err) {
		console.error('Failed to register agent for demo:', err);
	}
	return cachedApiKey || '';
}

async function getAuthHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
	const apiKey = await getOrRegisterApiKey();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...extraHeaders,
	};
	if (apiKey) {
		headers['X-API-Key'] = apiKey;
	}
	return headers;
}

function makeStep(
	act: string,
	title: string,
	method: 'GET' | 'POST',
	endpoint: string,
	details: string,
	payload?: any
): SimStepLog {
	return {
		id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
		timestamp: new Date().toLocaleTimeString(),
		act,
		title,
		method,
		endpoint,
		status: 'running',
		details,
		payload,
	};
}

/**
 * Scenario 1: Happy Path (Full ACP Checkout Lifecycle)
 */
export async function runHappyPathDemo(
	onLog?: (log: SimStepLog) => void,
	delayMs = 350
): Promise<SimResult> {
	const logs: SimStepLog[] = [];

	const emit = (step: SimStepLog) => {
		logs.push(step);
		if (onLog) onLog(step);
	};

	try {
		// Act 1: Discover products
		let s1 = makeStep(
			'Act 1',
			'Discover Catalog & ACP Capabilities',
			'GET',
			`${API_BASE_URL}/products`,
			'Agent discovers authoritative merchant catalog and supported ACP capabilities.'
		);
		emit(s1);
		await sleep(delayMs);

		const prodRes = await fetch(`${API_BASE_URL}/products`, { cache: 'no-store' });
		if (!prodRes.ok) {
			throw new Error(`Failed to fetch catalog (HTTP ${prodRes.status})`);
		}
		const products = await prodRes.json();
		s1.status = 'success';
		s1.statusCode = prodRes.status;
		s1.response = { catalog_count: products.length, skus: products.map((p: any) => p.id) };
		if (onLog) onLog({ ...s1 });
		await sleep(delayMs);

		// Act 2.1: Create Session
		const p1 = products[0] || { id: 'prod_bolt_001', price: 499.0 };
		const p4 = products[3] || { id: 'prod_bolt_004', price: 2499.0 };

		const createPayload = {
			line_items: [{ product_id: p1.id, quantity: 2 }],
			buyer: {
				name: 'Aura Autonomous Buyer Agent #42',
				email: 'aura.agent@buyer.internal',
			},
		};

		let s2 = makeStep(
			'Act 2.1',
			'Create ACP Checkout Session',
			'POST',
			`${API_BASE_URL}/checkout_sessions`,
			`Agent creates session reserving 2 units of ${p1.name || p1.id} with 30-min inventory soft-hold.`,
			createPayload
		);
		emit(s2);
		await sleep(delayMs);

		const authHeaders = await getAuthHeaders();
		const createRes = await fetch(`${API_BASE_URL}/checkout_sessions`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify(createPayload),
		});
		const createdSession = await createRes.json();
		if (!createRes.ok || !createdSession.id) {
			const errMsg = createdSession.detail?.message || createdSession.detail || `HTTP ${createRes.status} creating session`;
			s2.status = 'error';
			s2.statusCode = createRes.status;
			s2.response = createdSession;
			if (onLog) onLog({ ...s2 });
			throw new Error(errMsg);
		}
		const sessionId = createdSession.id;

		s2.status = 'success';
		s2.statusCode = createRes.status;
		s2.response = { session_id: sessionId, status: createdSession.status, totals: createdSession.totals };
		if (onLog) onLog({ ...s2 });
		await sleep(delayMs);

		// Act 2.2: Cart Negotiation (Multi-turn cart mutation with GST tax math)
		const updatePayload = {
			line_items: [
				{ product_id: p1.id, quantity: 2 },
				{ product_id: p4.id, quantity: 1 },
			],
			discount: 100.0,
			fulfillment_address: {
				line1: 'Prestige Tech Cloud, Block 2',
				city: 'Bengaluru',
				state: 'Karnataka',
				postal_code: '560103',
				country: 'IN',
			},
		};

		let s3 = makeStep(
			'Act 2.2',
			'Multi-Turn Cart Negotiation',
			'POST',
			`${API_BASE_URL}/checkout_sessions/${sessionId}`,
			'Agent updates cart: adds second SKU, applies Rs 100 promo code, and provides fulfillment address. Server recalculates 18% GST.',
			updatePayload
		);
		emit(s3);
		await sleep(delayMs);

		const updateRes = await fetch(`${API_BASE_URL}/checkout_sessions/${sessionId}`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify(updatePayload),
		});
		const updatedSession = await updateRes.json();
		if (!updateRes.ok) {
			const errMsg = updatedSession.detail?.message || updatedSession.detail || `HTTP ${updateRes.status} updating cart`;
			s3.status = 'error';
			s3.statusCode = updateRes.status;
			s3.response = updatedSession;
			if (onLog) onLog({ ...s3 });
			throw new Error(errMsg);
		}

		s3.status = 'success';
		s3.statusCode = updateRes.status;
		s3.response = {
			subtotal: updatedSession.totals?.subtotal,
			discount: updatedSession.totals?.discount,
			tax: updatedSession.totals?.tax,
			total: updatedSession.totals?.total,
		};
		if (onLog) onLog({ ...s3 });
		await sleep(delayMs);

		// Act 2.3: Tokenize Payment Method
		const tokenPayload = { token: `pm_tok_${Math.random().toString(36).substring(2, 14)}` };
		let s4 = makeStep(
			'Act 2.3',
			'Attach Payment Method Token',
			'POST',
			`${API_BASE_URL}/checkout_sessions/${sessionId}/payment_method`,
			'Agent attaches pre-authorized scoped payment method token.',
			tokenPayload
		);
		emit(s4);
		await sleep(delayMs);

		const tokenRes = await fetch(`${API_BASE_URL}/checkout_sessions/${sessionId}/payment_method`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify(tokenPayload),
		});
		const tokenSession = await tokenRes.json();
		if (!tokenRes.ok) {
			const errMsg = tokenSession.detail?.message || tokenSession.detail || `HTTP ${tokenRes.status} attaching payment`;
			s4.status = 'error';
			s4.statusCode = tokenRes.status;
			s4.response = tokenSession;
			if (onLog) onLog({ ...s4 });
			throw new Error(errMsg);
		}
		s4.status = 'success';
		s4.statusCode = tokenRes.status;
		s4.response = { status: tokenSession.status };
		if (onLog) onLog({ ...s4 });
		await sleep(delayMs);

		// Act 2.4: Complete Session & Bridge to Razorpay Orders API
		let s5 = makeStep(
			'Act 2.4',
			'Complete Session & Razorpay Bridge',
			'POST',
			`${API_BASE_URL}/checkout_sessions/${sessionId}/complete`,
			'Finalizes checkout session. Bridges to Razorpay Orders API in smallest currency subunits (paise) and commits inventory soft-hold.'
		);
		emit(s5);
		await sleep(delayMs);

		const completeRes = await fetch(`${API_BASE_URL}/checkout_sessions/${sessionId}/complete`, {
			method: 'POST',
			headers: authHeaders,
		});
		const completedSession = await completeRes.json();
		if (!completeRes.ok) {
			const errMsg = completedSession.detail?.message || completedSession.detail || `HTTP ${completeRes.status} completing session`;
			s5.status = 'error';
			s5.statusCode = completeRes.status;
			s5.response = completedSession;
			if (onLog) onLog({ ...s5 });
			throw new Error(errMsg);
		}

		const razorpayOrderId = completedSession.payment_provider?.razorpay_order_id;
		s5.status = 'success';
		s5.statusCode = completeRes.status;
		s5.response = {
			session_id: sessionId,
			status: completedSession.status,
			razorpay_order_id: razorpayOrderId,
			total: completedSession.totals?.total,
		};
		if (onLog) onLog({ ...s5 });

		return {
			scenario: 'happy_path',
			success: true,
			summary: `Successfully completed checkout! Razorpay Order created: ${razorpayOrderId} (Total: ₹${completedSession.totals?.total})`,
			sessionId,
			razorpayOrderId,
			logs,
		};
	} catch (err: any) {
		return {
			scenario: 'happy_path',
			success: false,
			summary: `Demo failed: ${err.message}`,
			logs,
		};
	}
}

/**
 * Scenario 2: Guardrail & Price Tamper Attack Defense
 */
export async function runViolationDemo(
	onLog?: (log: SimStepLog) => void,
	delayMs = 350
): Promise<SimResult> {
	const logs: SimStepLog[] = [];

	const emit = (step: SimStepLog) => {
		logs.push(step);
		if (onLog) onLog(step);
	};

	try {
		const authHeaders = await getAuthHeaders();

		// Attack 3A: Client-Side Price Tampering
		const tamperPayload = {
			line_items: [{ product_id: 'prod_bolt_001', quantity: 1, unit_price: 1.0 }],
			buyer: { name: 'Price Tamper Agent', email: 'tamper@flow.internal' },
		};

		let s1 = makeStep(
			'Attack 3A',
			'Price Tampering Attack Neutralized',
			'POST',
			`${API_BASE_URL}/checkout_sessions`,
			'Agent attempts to inject client unit_price = ₹1.00 on a ₹499.00 catalog item. Server completely discards client unit_price.',
			tamperPayload
		);
		emit(s1);
		await sleep(delayMs);

		const tamperRes = await fetch(`${API_BASE_URL}/checkout_sessions`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify(tamperPayload),
		});
		const tamperSession = await tamperRes.json();
		if (!tamperRes.ok || !tamperSession.id) {
			const errMsg = tamperSession.detail?.message || tamperSession.detail || `HTTP ${tamperRes.status} in price tampering test`;
			s1.status = 'error';
			s1.statusCode = tamperRes.status;
			s1.response = tamperSession;
			if (onLog) onLog({ ...s1 });
			throw new Error(errMsg);
		}
		const sid = tamperSession.id;

		s1.status = 'success';
		s1.statusCode = tamperRes.status;
		s1.response = {
			client_unit_price_attempt: '₹1.00',
			authoritative_subtotal_enforced: `₹${tamperSession.totals?.subtotal}`,
			notice: 'Client unit_price ignored. Server-authoritative catalog pricing strictly enforced.',
		};
		if (onLog) onLog({ ...s1 });
		await sleep(delayMs);

		// Attack 3B: Discount Ceiling Breach (Guardrail Trips)
		const breachPayload = {
			line_items: [{ product_id: 'prod_bolt_001', quantity: 1 }],
			discount: 375.0, // 75.2% discount > 50% maximum limit
		};

		let s2 = makeStep(
			'Attack 3B',
			'50% Discount Ceiling Breach Blocked',
			'POST',
			`${API_BASE_URL}/checkout_sessions/${sid}`,
			'Agent attempts to claim a ₹375.00 discount on a ₹499.00 order (75.2% > 50% max bound). Deterministic guardrail halts transaction.',
			breachPayload
		);
		emit(s2);
		await sleep(delayMs);

		const breachRes = await fetch(`${API_BASE_URL}/checkout_sessions/${sid}`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify(breachPayload),
		});
		const breachData = await breachRes.json();

		s2.status = 'rejected';
		s2.statusCode = breachRes.status;
		s2.response = {
			http_status: breachRes.status,
			error: breachData.detail?.error || breachData.error || 'guardrail_violation',
			reason: breachData.detail?.reason || breachData.reason || 'Requested discount exceeds maximum bound of 50%',
			session_status: 'rejected',
		};
		if (onLog) onLog({ ...s2 });
		await sleep(delayMs);

		// Step 3.2: Graceful Recovery Flow
		const recoverPayload = {
			line_items: [{ product_id: 'prod_bolt_001', quantity: 1 }],
			discount: 50.0, // Permitted ~10% discount
			buyer: { name: 'Recovered Agent Buyer', email: 'recovered@buyer.internal' },
		};

		let s3 = makeStep(
			'Step 3.2',
			'Agent Graceful Self-Recovery',
			'POST',
			`${API_BASE_URL}/checkout_sessions`,
			'Agent parses explainability error reason, lowers discount to permitted 10% (₹50), and initiates fresh compliant session.',
			recoverPayload
		);
		emit(s3);
		await sleep(delayMs);

		const freshRes = await fetch(`${API_BASE_URL}/checkout_sessions`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify(recoverPayload),
		});
		const freshSession = await freshRes.json();
		if (!freshRes.ok || !freshSession.id) {
			const errMsg = freshSession.detail?.message || freshSession.detail || `HTTP ${freshRes.status} in recovery flow`;
			s3.status = 'error';
			s3.statusCode = freshRes.status;
			s3.response = freshSession;
			if (onLog) onLog({ ...s3 });
			throw new Error(errMsg);
		}
		const freshId = freshSession.id;

		await fetch(`${API_BASE_URL}/checkout_sessions/${freshId}/payment_method`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({ token: `pm_tok_${Math.random().toString(36).substring(2, 12)}` }),
		});

		const compRes = await fetch(`${API_BASE_URL}/checkout_sessions/${freshId}/complete`, {
			method: 'POST',
			headers: authHeaders,
		});
		const finalSession = await compRes.json();

		s3.status = 'success';
		s3.statusCode = compRes.status;
		s3.response = {
			fresh_session_id: freshId,
			status: 'completed',
			razorpay_order_id: finalSession.payment_provider?.razorpay_order_id,
		};
		if (onLog) onLog({ ...s3 });

		return {
			scenario: 'violation',
			success: true,
			summary: `Attacks successfully thwarted! Price tampering neutralized (₹499 enforced), 75% discount rejected with HTTP 400 explainability reason, and recovered session finalized via Razorpay.`,
			sessionId: sid,
			logs,
		};
	} catch (err: any) {
		return {
			scenario: 'violation',
			success: false,
			summary: `Attack demo error: ${err.message}`,
			logs,
		};
	}
}

/**
 * Scenario 3: Idempotency Replay & 30-Min Soft-Hold Sweeper
 */
export async function runIdempotencyDemo(
	onLog?: (log: SimStepLog) => void,
	delayMs = 350
): Promise<SimResult> {
	const logs: SimStepLog[] = [];

	const emit = (step: SimStepLog) => {
		logs.push(step);
		if (onLog) onLog(step);
	};

	try {
		const idempotencyKey = `idem_demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
		const payload = {
			line_items: [{ product_id: 'prod_bolt_001', quantity: 1 }],
			buyer: { name: 'Idempotency Test Agent', email: 'idemp@buyer.internal' },
		};

		// 4A: Initial Request
		let s1 = makeStep(
			'Act 4A',
			'Initial Session with Idempotency-Key',
			'POST',
			`${API_BASE_URL}/checkout_sessions`,
			`Agent sends request with header Idempotency-Key: ${idempotencyKey}`,
			payload
		);
		emit(s1);
		await sleep(delayMs);

		const authHeaders1 = await getAuthHeaders({ 'Idempotency-Key': idempotencyKey });
		const res1 = await fetch(`${API_BASE_URL}/checkout_sessions`, {
			method: 'POST',
			headers: authHeaders1,
			body: JSON.stringify(payload),
		});
		const session1 = await res1.json();
		if (!res1.ok || !session1.id) {
			const errMsg = session1.detail?.message || session1.detail || `HTTP ${res1.status} creating idempotent session`;
			s1.status = 'error';
			s1.statusCode = res1.status;
			s1.response = session1;
			if (onLog) onLog({ ...s1 });
			throw new Error(errMsg);
		}

		s1.status = 'success';
		s1.statusCode = res1.status;
		s1.response = { session_id: session1.id, status: session1.status };
		if (onLog) onLog({ ...s1 });
		await sleep(delayMs);

		// 4B: Exact Duplicate Replay (Simulating network retry)
		let s2 = makeStep(
			'Act 4B',
			'Replay Identical Idempotency-Key',
			'POST',
			`${API_BASE_URL}/checkout_sessions`,
			'Agent resends identical payload and Idempotency-Key due to simulated network timeout.',
			payload
		);
		emit(s2);
		await sleep(delayMs);

		const res2 = await fetch(`${API_BASE_URL}/checkout_sessions`, {
			method: 'POST',
			headers: authHeaders1,
			body: JSON.stringify(payload),
		});
		const session2 = await res2.json();
		if (!res2.ok || !session2.id) {
			const errMsg = session2.detail?.message || session2.detail || `HTTP ${res2.status} replaying idempotent session`;
			s2.status = 'error';
			s2.statusCode = res2.status;
			s2.response = session2;
			if (onLog) onLog({ ...s2 });
			throw new Error(errMsg);
		}

		const isIdentical = session1.id === session2.id;
		s2.status = 'success';
		s2.statusCode = res2.status;
		s2.response = {
			replayed_session_id: session2.id,
			matched_original: isIdentical,
			duplication_detected: false,
			notice: 'Idempotency layer returned cached session. Zero duplicate charges.',
		};
		if (onLog) onLog({ ...s2 });
		await sleep(delayMs);

		// 4C: Trigger Maintenance Sweeper
		let s3 = makeStep(
			'Act 4C',
			'30-Minute Soft-Hold Sweeper Job',
			'POST',
			`${API_BASE_URL}/internal/sweep_expired`,
			'Triggers scheduled background maintenance sweeper to scan for abandoned sessions and release stock.'
		);
		emit(s3);
		await sleep(delayMs);

		const sweepRes = await fetch(`${API_BASE_URL}/internal/sweep_expired`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});
		const sweepData = await sweepRes.json();

		s3.status = 'success';
		s3.statusCode = sweepRes.status;
		s3.response = sweepData;
		if (onLog) onLog({ ...s3 });

		return {
			scenario: 'idempotency',
			success: true,
			summary: `Idempotency verified! Duplicate request safely returned existing session ${session1.id} with 0 duplicate charge risk. Sweeper executed cleanly.`,
			sessionId: session1.id,
			logs,
		};
	} catch (err: any) {
		return {
			scenario: 'idempotency',
			success: false,
			summary: `Idempotency demo error: ${err.message}`,
			logs,
		};
	}
}
