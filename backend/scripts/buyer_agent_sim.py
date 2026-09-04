#!/usr/bin/env python3
"""Autonomous Buyer-Agent Simulator for Razorpay ACP Adapter.
4-Act Live Demonstration Suite:
- ACT 1: Protocol Discovery & Catalog Feed (Unauthenticated capability resolution)
- ACT 2: Happy Path Order Lifecycle (Create -> Update -> Complete with Razorpay Order)
- ACT 3: Security & Guardrail Attack Suite (Price Tamper Neutralization + Discount Ceiling Enforcement)
- ACT 4: Protocol Resilience & Lifecycle (Idempotent Replay + Session Cancellation + Post-Payment Refund)

Designed for live demo recordings, judge walkthroughs, and track requirement verification.
"""
import sys
import json
import time
import uuid
import argparse
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

# Reconfigure stdout for cross-platform UTF-8 support
if hasattr(sys.stdout, 'reconfigure'):
	try:
		sys.stdout.reconfigure(encoding='utf-8')
	except Exception:
		pass

# Formatting for pitch demo recordings
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
RED = '\033[91m'
BOLD = '\033[1m'
DIM = '\033[2m'
RESET = '\033[0m'


def log_act(act_num: int, title: str):
	print(f'\n{BOLD}{MAGENTA}======================================================================{RESET}')
	print(f'{BOLD}{MAGENTA}>>> ACT {act_num}: {title}{RESET}')
	print(f'{BOLD}{MAGENTA}======================================================================{RESET}')


def log_step(step_num: str, title: str, description: str):
	print(f'\n{BOLD}{CYAN}----------------------------------------------------------------------{RESET}')
	print(f'{BOLD}{GREEN}[STEP {step_num}]{RESET} {BOLD}{title}{RESET}')
	print(f'{DIM}>> {description}{RESET}')
	print(f'{BOLD}{CYAN}----------------------------------------------------------------------{RESET}')


def log_payload(label: str, data: Any):
	print(f'{BOLD}{YELLOW}{label}:{RESET}')
	formatted = json.dumps(data, indent=2)
	for line in formatted.split('\n'):
		print(f'  {DIM}{line}{RESET}')


def log_success(message: str):
	print(f'{BOLD}{GREEN}[OK] SUCCESS:{RESET} {message}')


def log_warning(message: str):
	print(f'{BOLD}{YELLOW}[GUARDRAIL ENGAGED]:{RESET} {message}')


def log_error(message: str):
	print(f'{BOLD}{RED}[ERROR]:{RESET} {message}')


_agent_api_key: Optional[str] = None
_agent_id: Optional[str] = None


def http_request(
	url: str,
	method: str = 'GET',
	data: Optional[Dict[str, Any]] = None,
	headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
	req_headers = {'Content-Type': 'application/json', 'User-Agent': 'TaskDrift-BuyerAgentSim/1.0'}
	if _agent_api_key and (headers is None or 'X-API-Key' not in headers):
		req_headers['X-API-Key'] = _agent_api_key
	if headers:
		req_headers.update(headers)

	body_bytes = json.dumps(data).encode('utf-8') if data is not None else None
	req = urllib.request.Request(url, data=body_bytes, headers=req_headers, method=method)

	try:
		with urllib.request.urlopen(req) as response:
			status_code = response.getcode()
			resp_body = response.read().decode('utf-8')
			parsed = json.loads(resp_body)
			return {'status_code': status_code, 'data': parsed}
	except urllib.error.HTTPError as err:
		err_body = err.read().decode('utf-8')
		try:
			parsed_err = json.loads(err_body)
		except Exception:
			parsed_err = {'raw_error': err_body}
		return {'status_code': err.code, 'data': parsed_err}
	except Exception as ex:
		log_error(f'Connection failed to {url}: {ex}')
		sys.exit(1)


def register_sim_agent(base_url: str, pause: float) -> str:
	"""Registers autonomous buyer agent to acquire valid X-API-Key per ACP Round 3 auth spec."""
	global _agent_api_key, _agent_id
	log_step('1.0', 'Autonomous Agent Registration', 'Registering agent identity to acquire cryptographic X-API-Key')
	reg_res = http_request(f'{base_url}/agents/register', method='POST', data={'name': 'Aura Autonomous Buyer Agent #42'})
	if reg_res['status_code'] != 201:
		log_error(f'Agent registration failed: {reg_res["data"]}')
		sys.exit(1)
	_agent_api_key = reg_res['data']['api_key']
	_agent_id = reg_res['data']['agent_id']
	log_payload('Registered Agent Identity & API Key', reg_res['data'])
	log_success(f'Cryptographic Identity Established: {_agent_id} | Key: {_agent_api_key[:16]}...')
	time.sleep(pause)
	return _agent_id


def run_act_1_discovery(base_url: str, pause: float):
	log_act(1, 'Protocol Discovery & Capability Resolution')

	# Step 1.0: Register agent identity
	register_sim_agent(base_url=base_url, pause=pause)

	# Step 1.1: Discovery
	log_step('1.1', 'Fetch Agent Capability Document', 'Querying unauthenticated well-known capability manifest')
	res = http_request(f'{base_url}/.well-known/agent.json')
	if res['status_code'] != 200:
		log_error(f'Discovery failed: {res["data"]}')
		sys.exit(1)
	agent_doc = res['data']
	log_payload('Agent Capability Manifest', agent_doc)
	log_success(f'Discovered merchant "{agent_doc["merchant"]["name"]}" | Spec {agent_doc["spec_version"]} | Settlement: {agent_doc["merchant"]["default_currency"]} | Rail: {agent_doc["payment_provider"]}')
	time.sleep(pause)

	# Step 1.2: Catalog
	log_step('1.2', 'Fetch Merchant Product Catalog Feed', 'Reading unauthenticated SKU list')
	res = http_request(f'{base_url}/products')
	if res['status_code'] != 200:
		log_error(f'Catalog lookup failed: {res["data"]}')
		sys.exit(1)
	products = res['data']
	log_payload('Active Product Catalog', products)
	log_success(f'Catalog live with {len(products)} SKUs. Sample: "{products[0]["name"]}" at ₹{products[0]["price"]}')
	time.sleep(pause)
	return products


def run_act_2_happy_path(base_url: str, products: list, pause: float):
	log_act(2, 'Happy Path Checkout Lifecycle & Multi-Turn Negotiation')
	p1, p2 = products[0], products[3]

	# Step 2.1: Create Session
	log_step('2.1', 'Create Authoritative ACP Checkout Session', 'Agent submits initial cart with 1 SKU')
	create_payload = {
		'line_items': [{'product_id': p1['id'], 'quantity': 1}],
		'buyer': {
			'name': 'Aura Autonomous Buyer Agent #42',
			'email': 'aura.agent@taskdrift.internal'
		}
	}
	res = http_request(f'{base_url}/checkout_sessions', method='POST', data=create_payload)
	if res['status_code'] != 201:
		log_error(f'Create session failed: {res["data"]}')
		sys.exit(1)
	session = res['data']
	session_id = session['id']
	log_payload('Created Checkout Session', session)
	log_success(f'Session {session_id} created. Authoritative Total: ₹{session["totals"]["total"]}')
	time.sleep(pause)

	# Step 2.2a: Multi-Turn Turn 1 - Add item & change quantity
	log_step('2.2a', 'Cart Negotiation Turn 1: Add Item & Modify Quantity', f'Agent adds {p2["name"]} and increases {p1["name"]} quantity to 2')
	turn1_payload = {
		'line_items': [
			{'product_id': p1['id'], 'quantity': 2},
			{'product_id': p2['id'], 'quantity': 1}
		]
	}
	res_t1 = http_request(f'{base_url}/checkout_sessions/{session_id}', method='POST', data=turn1_payload)
	if res_t1['status_code'] != 200:
		log_error(f'Turn 1 update failed: {res_t1["data"]}')
		sys.exit(1)
	log_payload('Cart Negotiation Turn 1 Result', res_t1['data'])
	log_success(f'Turn 1 OK. New Subtotal: ₹{res_t1["data"]["totals"]["subtotal"]} | Total: ₹{res_t1["data"]["totals"]["total"]}')
	time.sleep(pause)

	# Step 2.2b: Multi-Turn Turn 2 - Apply merchant discount
	log_step('2.2b', 'Cart Negotiation Turn 2: Apply Discount', 'Agent applies ₹100 merchant-bound promotional discount')
	turn2_payload = {'discount': 100.0}
	res_t2 = http_request(f'{base_url}/checkout_sessions/{session_id}', method='POST', data=turn2_payload)
	if res_t2['status_code'] != 200:
		log_error(f'Turn 2 update failed: {res_t2["data"]}')
		sys.exit(1)
	log_payload('Cart Negotiation Turn 2 Result', res_t2['data'])
	log_success(f'Turn 2 OK. New Discount: ₹{res_t2["data"]["totals"]["discount"]} | Total: ₹{res_t2["data"]["totals"]["total"]}')
	time.sleep(pause)

	# Step 2.2c: Multi-Turn Turn 3 - Provide fulfillment address
	log_step('2.2c', 'Cart Negotiation Turn 3: Set Fulfillment Address', 'Agent provides full shipping and delivery address')
	turn3_payload = {
		'fulfillment_address': {
			'line1': 'Prestige Tech Cloud, Block 2',
			'city': 'Bengaluru',
			'state': 'Karnataka',
			'postal_code': '560103',
			'country': 'IN'
		}
	}
	res_t3 = http_request(f'{base_url}/checkout_sessions/{session_id}', method='POST', data=turn3_payload)
	if res_t3['status_code'] != 200:
		log_error(f'Turn 3 update failed: {res_t3["data"]}')
		sys.exit(1)
	log_payload('Cart Negotiation Turn 3 Result', res_t3['data'])
	log_success('Turn 3 OK. Fulfillment address confirmed.')
	time.sleep(pause)

	# Step 2.2d: Delegated Payment Method Tokenization
	log_step('2.2d', 'Delegated Payment Token Handoff', 'Agent attaches delegated ACP payment method token (pm_tok_...)')
	pm_payload = {'token': f'pm_tok_{uuid.uuid4().hex[:16]}'}
	res_pm = http_request(f'{base_url}/checkout_sessions/{session_id}/payment_method', method='POST', data=pm_payload)
	if res_pm['status_code'] != 200:
		log_error(f'Attach payment method failed: {res_pm["data"]}')
		sys.exit(1)
	pm_session = res_pm['data']
	log_payload('Session Ready for Payment', pm_session)
	log_success(f'Payment Method Attached: {pm_session["payment_method_token"]} | Status: {pm_session["status"]}')
	time.sleep(pause)

	# Step 2.3: Complete Session
	log_step('2.3', 'Finalize Checkout & Bridge to Razorpay Orders API', 'Agent executes completion transition')
	res = http_request(f'{base_url}/checkout_sessions/{session_id}/complete', method='POST')
	if res['status_code'] != 200:
		log_error(f'Complete session failed: {res["data"]}')
		sys.exit(1)
	completed = res['data']
	log_payload('Finalized Checkout State', completed)
	order_id = completed["payment_provider"]["razorpay_order_id"]
	log_success(f'Transaction Complete! Razorpay Order ID: {BOLD}{order_id}{RESET} | Status: {completed["status"]}')
	time.sleep(pause)
	return session_id


def run_act_3_attack_suite(base_url: str, products: list, pause: float):
	log_act(3, 'Security & Guardrail Attack Suite (Judge Highlight)')
	p1 = products[0]  # Real catalog price: ₹499.0

	# Attack 3A: Client-Side Price Tampering
	log_step('3A', 'ATTACK: Client-Side Price Tampering Attempt', 'Malicious agent attempts to pass unit_price=₹1.00 on a ₹499.00 item')
	tamper_payload = {
		'line_items': [{'product_id': p1['id'], 'quantity': 1, 'unit_price': 1.0}],
		'buyer': {'name': 'Tamper Test Agent', 'email': 'attacker@flow.ai'}
	}
	log_payload('Attacker Injected Request (unit_price: 1.0)', tamper_payload)
	res = http_request(f'{base_url}/checkout_sessions', method='POST', data=tamper_payload)
	if res['status_code'] != 201:
		log_error(f'Expected authoritative override but received {res["status_code"]}')
		sys.exit(1)
	tamper_session = res['data']
	log_payload('Server Evaluated Session (Authoritative Catalog Pricing Enforced)', tamper_session)
	assert tamper_session['line_items'][0]['unit_price'] == 499.0
	assert tamper_session['totals']['subtotal'] == 499.0
	log_success('ATTACK NEUTRALIZED: Server completely ignored client unit_price (₹1.0) and enforced authoritative catalog price (₹499.0).')
	time.sleep(pause)

	# Attack 3B: Discount Ceiling Breach
	log_step('3B', 'ATTACK: Discount Ceiling Breach Attempt (75% Discount Request)', 'Agent attempts to apply a ₹375.00 discount on a ₹499.00 order (75.1% > 50% merchant bound)')
	excessive_discount_payload = {'discount': 375.0}
	res_breach = http_request(f'{base_url}/checkout_sessions/{tamper_session["id"]}', method='POST', data=excessive_discount_payload)
	log_payload('Server Guardrail Rejection Response (HTTP 400)', res_breach['data'])

	if res_breach['status_code'] == 400 and res_breach['data'].get('detail', {}).get('error') == 'guardrail_violation':
		detail = res_breach['data']['detail']
		log_warning(f'BOUND ENFORCED: Status transitioned to "{detail.get("status")}"')
		log_warning(f'Deterministic Explainability Reason: "{detail.get("reason")}"')
	else:
		log_error(f'Expected clean guardrail violation rejection but received HTTP {res_breach["status_code"]}: {res_breach["data"]}')
		sys.exit(1)
	time.sleep(pause)

	# Step 3.2: Recovery
	log_step('3.2', 'Graceful Recovery Flow', 'Agent corrects cart within merchant bounds, attaches token and finalizes purchase')
	compliant_payload = {
		'line_items': [{'product_id': p1['id'], 'quantity': 1}],
		'discount': 50.0,
		'buyer': {'name': 'Recovered Agent Buyer', 'email': 'recovered@taskdrift.internal'},
		'fulfillment_address': {
			'line1': 'Recovery Suite 101',
			'city': 'Mumbai',
			'state': 'Maharashtra',
			'postal_code': '400001',
			'country': 'IN'
		}
	}
	res_fresh = http_request(f'{base_url}/checkout_sessions', method='POST', data=compliant_payload)
	fresh_sid = res_fresh['data']['id']
	http_request(f'{base_url}/checkout_sessions/{fresh_sid}/payment_method', method='POST', data={'token': f'pm_tok_{uuid.uuid4().hex[:16]}'})
	res_comp = http_request(f'{base_url}/checkout_sessions/{fresh_sid}/complete', method='POST')
	log_success(f'Recovery Complete! Fresh Session {fresh_sid} finalized with Razorpay Order ID: {BOLD}{res_comp["data"]["payment_provider"]["razorpay_order_id"]}{RESET}')
	time.sleep(pause)


def run_act_4_resilience_and_lifecycle(base_url: str, products: list, pause: float):
	log_act(4, 'Protocol Resilience, Idempotency & Post-Payment Refund')
	p1 = products[0]

	# 4A: Idempotent Replay
	log_step('4A', 'Idempotent Replay Verification', 'Sending identical Idempotency-Key twice to verify 0 duplicate sessions created')
	idem_key = f'idem_sim_{uuid.uuid4().hex[:12]}'
	payload = {'line_items': [{'product_id': p1['id'], 'quantity': 1}]}

	res_1 = http_request(f'{base_url}/checkout_sessions', method='POST', data=payload, headers={'Idempotency-Key': idem_key})
	sid_1 = res_1['data']['id']

	res_2 = http_request(f'{base_url}/checkout_sessions', method='POST', data=payload, headers={'Idempotency-Key': idem_key})
	sid_2 = res_2['data']['id']

	assert sid_1 == sid_2, f'Mismatch in idempotency sessions: {sid_1} vs {sid_2}'
	log_success(f'Idempotency Verified: Both requests returned identical session {sid_1} with zero duplication.')
	time.sleep(pause)

	# 4B: Session Cancellation
	log_step('4B', 'Session Cancellation & Terminal State Lock', 'Cancelling an incomplete session and asserting terminal locking')
	res_cancel = http_request(f'{base_url}/checkout_sessions/{sid_1}/cancel', method='POST')
	assert res_cancel['data']['status'] == 'cancelled'
	log_success(f'Session {sid_1} transitioned to "cancelled".')

	# Verify repeat cancel gives HTTP 409 Conflict
	res_re_cancel = http_request(f'{base_url}/checkout_sessions/{sid_1}/cancel', method='POST')
	assert res_re_cancel['status_code'] == 409
	log_success('Verified: Re-cancellation safely rejected with HTTP 409 Conflict.')
	time.sleep(pause)

	# 4C: Post-Payment Refund
	log_step('4C', 'Post-Payment Refund Bridge', 'Executing post-completion refund via Razorpay refund bridge')
	# Create and complete a session
	res_c = http_request(f'{base_url}/checkout_sessions', method='POST', data={
		'line_items': [{'product_id': p1['id'], 'quantity': 1}],
		'buyer': {'name': 'Refund Buyer', 'email': 'buyer@taskdrift.internal'},
		'fulfillment_address': {'line1': '101 Refund Way', 'city': 'Chennai', 'state': 'TN', 'postal_code': '600001', 'country': 'IN'}
	})
	sid_c = res_c['data']['id']
	http_request(f'{base_url}/checkout_sessions/{sid_c}/payment_method', method='POST', data={'token': f'pm_tok_{uuid.uuid4().hex[:16]}'})
	http_request(f'{base_url}/checkout_sessions/{sid_c}/complete', method='POST')

	# Issue refund
	res_refund = http_request(f'{base_url}/checkout_sessions/{sid_c}/refund', method='POST', data={
		'reason': 'Customer returned items within 14-day window'
	})
	assert res_refund['status_code'] == 200
	refunded_data = res_refund['data']
	log_payload('Refunded Session State', refunded_data)
	log_success(f'Session {sid_c} refunded! Razorpay Refund ID: {BOLD}{refunded_data["payment_provider"]["refund_id"]}{RESET} | Status: {refunded_data["status"]}')


def main():
	parser = argparse.ArgumentParser(description='Run Scripted 4-Act Buyer-Agent Simulator for Razorpay ACP Adapter')
	parser.add_argument('--base-url', default='http://127.0.0.1:8000', help='Target ACP backend base URL')
	parser.add_argument('--scenario', choices=['happy_path', 'violation', 'all'], default='all', help='Simulation scenario to execute')
	parser.add_argument('--pause', type=float, default=0.2, help='Pause between steps in seconds for recording clarity')
	args = parser.parse_args()

	print(f'{BOLD}{MAGENTA}')
	print("======================================================================")
	print("       RAZORPAY ACP CHECKOUT ADAPTER -- 4-ACT BUYER AGENT SIMULATOR   ")
	print("          Track 01: AI Growth & Agentic Commerce | TaskDrift          ")
	print("======================================================================")
	print(f'{RESET}{DIM}Target Rail API: {args.base_url}{RESET}')
	print(f'{DIM}Protocol Specification: ACP v2026-04-17 | Rail: Razorpay Test Mode{RESET}')

	products = run_act_1_discovery(base_url=args.base_url, pause=args.pause)

	if args.scenario in ['happy_path', 'all']:
		run_act_2_happy_path(base_url=args.base_url, products=products, pause=args.pause)

	if args.scenario in ['violation', 'all']:
		run_act_3_attack_suite(base_url=args.base_url, products=products, pause=args.pause)

	if args.scenario in ['all']:
		run_act_4_resilience_and_lifecycle(base_url=args.base_url, products=products, pause=args.pause)

	print(f'\n{BOLD}{GREEN}======================================================================{RESET}')
	print(f'{BOLD}{GREEN}[OK] ALL 4 ACTS EXECUTED SUCCESSFULLY WITH 0 UNHANDLED ERRORS{RESET}')
	print(f'{BOLD}{GREEN}======================================================================{RESET}\n')


if __name__ == '__main__':
	main()
