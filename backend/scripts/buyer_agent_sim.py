#!/usr/bin/env python3
"""Autonomous Buyer-Agent Simulator for Razorpay ACP Adapter.
Supports two deterministic demo scenarios:
1. --scenario happy_path : Full Discovery -> Catalog -> Create -> Update -> Complete
2. --scenario violation  : Deliberate Guardrail Breach -> Structured Rejection -> Explainability -> Recovery -> Complete

Designed for live demo recordings and track requirement verification.
"""
import sys
import json
import time
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


def log_step(step_num: int, title: str, description: str):
	print(f'\n{BOLD}{CYAN}======================================================================{RESET}')
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


def http_request(
	url: str,
	method: str = 'GET',
	data: Optional[Dict[str, Any]] = None,
	headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
	req_headers = {'Content-Type': 'application/json', 'User-Agent': 'TaskDrift-BuyerAgentSim/1.0'}
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


def run_happy_path(base_url: str, pause_seconds: float = 0.4):
	print(f'\n{BOLD}{CYAN}>>> RUNNING SCENARIO: HAPPY PATH (Full ACP Lifecycle){RESET}')

	# STEP 1: Discovery
	log_step(1, 'ACP Protocol Discovery', 'Querying unauthenticated well-known capability manifest')
	res = http_request(f'{base_url}/.well-known/agent.json')
	if res['status_code'] != 200:
		log_error(f'Discovery failed: {res["data"]}')
		sys.exit(1)
	log_payload('Agent Capability Document', res['data'])
	log_success(f'Discovered merchant "{res["data"]["merchant"]["name"]}" | Spec {res["data"]["spec_version"]} | Rail: {res["data"]["payment_provider"]}')
	time.sleep(pause_seconds)

	# STEP 2: Catalog Lookup
	log_step(2, 'Catalog Feed Retrieval', 'Fetching active merchant product catalog')
	res = http_request(f'{base_url}/products')
	if res['status_code'] != 200:
		log_error(f'Catalog lookup failed: {res["data"]}')
		sys.exit(1)
	products = res['data']
	log_payload('Catalog Feed', products)
	p1, p2 = products[0], products[3]
	log_success(f'Catalog active with {len(products)} SKUs. Selecting: "{p1["name"]}" (Rs {p1["price"]}) & "{p2["name"]}" (Rs {p2["price"]})')
	time.sleep(pause_seconds)

	# STEP 3: Create Session
	log_step(3, 'Create ACP Checkout Session', 'Submitting initial cart')
	create_payload = {
		'line_items': [{'product_id': p1['id'], 'quantity': 1}],
		'buyer': {
			'name': 'Aura Buyer Agent (Autonomous Node #42)',
			'email': 'aura.agent@taskdrift.internal'
		}
	}
	res = http_request(f'{base_url}/checkout_sessions', method='POST', data=create_payload)
	if res['status_code'] != 201:
		log_error(f'Create session failed: {res["data"]}')
		sys.exit(1)
	session = res['data']
	session_id = session['id']
	log_payload('Authoritative Session', session)
	log_success(f'Session created: {session_id} | Total: Rs {session["totals"]["total"]}')
	time.sleep(pause_seconds)

	# STEP 4: Update Session
	log_step(4, 'Update Checkout Session', 'Updating cart line items and applying discount')
	update_payload = {
		'line_items': [
			{'product_id': p1['id'], 'quantity': 2},
			{'product_id': p2['id'], 'quantity': 1}
		],
		'discount': 100.0
	}
	res = http_request(f'{base_url}/checkout_sessions/{session_id}', method='POST', data=update_payload)
	if res['status_code'] != 200:
		log_error(f'Update session failed: {res["data"]}')
		sys.exit(1)
	updated = res['data']
	log_payload('Refreshed Session', updated)
	log_success(f'Session updated: {session_id} | Refreshed Total: Rs {updated["totals"]["total"]}')
	time.sleep(pause_seconds)

	# STEP 5: Complete Session
	log_step(5, 'Complete Session & Bridge to Razorpay', 'Finalizing checkout session and triggering Razorpay Order creation')
	res = http_request(f'{base_url}/checkout_sessions/{session_id}/complete', method='POST')
	if res['status_code'] != 200:
		log_error(f'Complete session failed: {res["data"]}')
		sys.exit(1)
	completed = res['data']
	log_payload('Finalized Checkout State', completed)
	log_success(f'Transaction Completed! Razorpay Order ID: {BOLD}{completed["payment_provider"]["razorpay_order_id"]}{RESET} | Status: {completed["status"]}')


def run_violation_scenario(base_url: str, pause_seconds: float = 0.4):
	print(f'\n{BOLD}{MAGENTA}>>> RUNNING SCENARIO: DELIBERATE GUARDRAIL BREACH & EXPLAINABILITY DEMO{RESET}')

	# STEP 1: Discovery
	log_step(1, 'ACP Protocol & Guardrail Discovery', 'Reading merchant bounds from agent capability manifest')
	res = http_request(f'{base_url}/.well-known/agent.json')
	agent_doc = res['data']
	guardrails = agent_doc.get('guardrails', {})
	log_payload('Merchant Guardrails Configuration', guardrails)
	log_success(f'Merchant Bounds: Max Discount = {guardrails.get("max_discount_percentage")}%, Max Order = Rs {guardrails.get("max_order_value_inr")}, Max Qty = {guardrails.get("max_quantity_per_item")}')
	time.sleep(pause_seconds)

	# STEP 2: Create Session
	log_step(2, 'Create Valid Checkout Session', 'Buyer agent initiates a valid session with 1 unit of product')
	res = http_request(f'{base_url}/products')
	products = res['data']
	p1 = products[0]  # Rs 499.0

	create_payload = {
		'line_items': [{'product_id': p1['id'], 'quantity': 1}],
		'buyer': {'name': 'Simulator Agent (Audit Persona)', 'email': 'sim.audit@taskdrift.internal'}
	}
	res = http_request(f'{base_url}/checkout_sessions', method='POST', data=create_payload)
	session_id = res['data']['id']
	log_payload('Active Session', res['data'])
	log_success(f'Session {session_id} active. Subtotal: Rs {res["data"]["totals"]["subtotal"]}')
	time.sleep(pause_seconds)

	# STEP 3: Deliberate Guardrail Violation (Over-bound discount)
	log_step(3, 'Trigger Deliberate Violation', 'Buyer agent requests a 70% discount (Rs 350 on Rs 499), exceeding the 50% merchant limit')
	excessive_discount_payload = {
		'discount': 350.0  # ~70.1% discount > 50% max bound
	}
	log_payload('Excessive Discount Request', excessive_discount_payload)

	res = http_request(f'{base_url}/checkout_sessions/{session_id}', method='POST', data=excessive_discount_payload)
	log_payload('Server Guardrail Response (HTTP 400)', res['data'])

	if res['status_code'] == 400 and res['data'].get('detail', {}).get('error') == 'guardrail_violation':
		detail = res['data']['detail']
		log_warning(f'BOUND ENFORCED! Session transitioned to status: "{detail.get("status")}"')
		log_warning(f'Human-Readable Explainability Reason: "{detail.get("reason")}"')
	else:
		log_error(f'Expected clean guardrail violation rejection but received HTTP {res["status_code"]}: {res["data"]}')
		sys.exit(1)
	time.sleep(pause_seconds)

	# STEP 4: Inspect Firestore State & Audit Log
	log_step(4, 'Audit Trail Verification', 'Verifying session status in database and confirming rejection explanation')
	res = http_request(f'{base_url}/checkout_sessions/{session_id}')
	log_payload('Persisted Rejected Session State', res['data'])
	assert res['data']['status'] == 'rejected'
	log_success('Verified: Session is safely locked in "rejected" state without crashes or silent errors.')
	time.sleep(pause_seconds)

	# STEP 5: Graceful Recovery & Completion
	log_step(5, 'Graceful Recovery Flow', 'Buyer agent initiates a fresh, compliant session within merchant bounds and finalizes purchase')
	compliant_payload = {
		'line_items': [{'product_id': p1['id'], 'quantity': 1}],
		'discount': 50.0,  # ~10% discount (Well within 50% bound)
		'buyer': {'name': 'Recovered Agent Buyer', 'email': 'recovered@taskdrift.internal'}
	}
	res_fresh = http_request(f'{base_url}/checkout_sessions', method='POST', data=compliant_payload)
	fresh_session_id = res_fresh['data']['id']
	log_success(f'Fresh compliant session created: {fresh_session_id} | Total: Rs {res_fresh["data"]["totals"]["total"]}')

	# Complete fresh session
	res_complete = http_request(f'{base_url}/checkout_sessions/{fresh_session_id}/complete', method='POST')
	if res_complete['status_code'] == 200:
		log_success(f'Recovery Complete! Razorpay Order ID: {BOLD}{res_complete["data"]["payment_provider"]["razorpay_order_id"]}{RESET}')
	else:
		log_error(f'Recovery completion failed: {res_complete["data"]}')
		sys.exit(1)


def main():
	parser = argparse.ArgumentParser(description='Run Scripted Buyer-Agent Simulator for Razorpay ACP Adapter')
	parser.add_argument('--base-url', default='http://localhost:8000', help='Target ACP backend base URL')
	parser.add_argument('--scenario', choices=['happy_path', 'violation', 'all'], default='happy_path', help='Simulation scenario to execute')
	parser.add_argument('--pause', type=float, default=0.3, help='Pause between steps in seconds for recording clarity')
	args = parser.parse_args()

	print(f'{BOLD}{MAGENTA}')
	print("======================================================================")
	print("       RAZORPAY ACP CHECKOUT ADAPTER -- BUYER AGENT SIMULATOR         ")
	print("          Track 01: AI Growth & Agentic Commerce | TaskDrift          ")
	print("======================================================================")
	print(f'{RESET}{DIM}Target Rail API: {args.base_url}{RESET}')
	print(f'{DIM}Protocol Specification: ACP v2026-04-17 | Rail: Razorpay Test Mode{RESET}')

	if args.scenario in ['happy_path', 'all']:
		run_happy_path(base_url=args.base_url, pause_seconds=args.pause)

	if args.scenario in ['violation', 'all']:
		run_violation_scenario(base_url=args.base_url, pause_seconds=args.pause)

	print(f'\n{BOLD}{GREEN}======================================================================{RESET}')
	print(f'{BOLD}{GREEN}[OK] ALL SIMULATED SCENARIOS EXECUTED SUCCESSFULLY WITH 0 UNHANDLED ERRORS{RESET}')
	print(f'{BOLD}{GREEN}======================================================================{RESET}\n')


if __name__ == '__main__':
	main()
