#!/usr/bin/env python3
"""Autonomous Buyer-Agent Simulator for Razorpay ACP Adapter.
Walks the standard ACP commerce lifecycle:
1. Discover Agent Capabilities (GET /.well-known/agent.json)
2. Browse Catalog (GET /products)
3. Create Checkout Session (POST /checkout_sessions)
4. Update Session Cart / Address (POST /checkout_sessions/{id})
5. Complete Session & Bridge to Razorpay Rail (POST /checkout_sessions/{id}/complete)

Deterministic, zero-LLM simulator designed for demo screen recordings and live verification.
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


def run_simulator(base_url: str, pause_seconds: float = 0.5):
	base_url = base_url.rstrip('/')
	print(f'{BOLD}{MAGENTA}')
	print("======================================================================")
	print("       RAZORPAY ACP CHECKOUT ADAPTER -- BUYER AGENT SIMULATOR         ")
	print("          Track 01: AI Growth & Agentic Commerce | TaskDrift          ")
	print("======================================================================")
	print(f'{RESET}{DIM}Target Rail API: {base_url}{RESET}')
	print(f'{DIM}Protocol Specification: ACP v2026-04-17 | Rail: Razorpay Test Mode{RESET}')

	# =========================================================================
	# STEP 1: Discovery
	# =========================================================================
	log_step(1, 'ACP Protocol Discovery', 'Querying unauthenticated well-known agent capability manifest')
	disc_url = f'{base_url}/.well-known/agent.json'
	res = http_request(disc_url, method='GET')
	if res['status_code'] != 200:
		log_error(f'Discovery failed with HTTP {res["status_code"]}: {res["data"]}')
		sys.exit(1)

	agent_doc = res['data']
	log_payload('Agent Capability Document', agent_doc)
	log_success(f'Discovered merchant "{agent_doc.get("merchant", {}).get("name")}" | Spec {agent_doc.get("spec_version")} | Rail: {agent_doc.get("payment_provider")}')
	time.sleep(pause_seconds)

	# =========================================================================
	# STEP 2: Catalog Lookup
	# =========================================================================
	log_step(2, 'Catalog Feed Retrieval', 'Fetching active merchant product catalog')
	cat_url = f'{base_url}/products'
	res = http_request(cat_url, method='GET')
	if res['status_code'] != 200:
		log_error(f'Catalog lookup failed with HTTP {res["status_code"]}: {res["data"]}')
		sys.exit(1)

	products = res['data']
	log_payload('Available SKUs in Feed', products)
	if not products or len(products) < 2:
		log_error('Insufficient products found in catalog.')
		sys.exit(1)

	selected_p1 = products[0]
	selected_p2 = products[3]  # Razorpay kit
	log_success(f'Catalog active with {len(products)} SKUs. Buyer agent selecting: "{selected_p1["name"]}" (Rs {selected_p1["price"]}) and "{selected_p2["name"]}" (Rs {selected_p2["price"]})')
	time.sleep(pause_seconds)

	# =========================================================================
	# STEP 3: Create Checkout Session
	# =========================================================================
	log_step(3, 'Create ACP Checkout Session', 'Submitting initial cart with line items, buyer info, and address')
	create_payload = {
		'line_items': [
			{'product_id': selected_p1['id'], 'quantity': 1}
		],
		'buyer': {
			'name': 'Aura Buyer Agent (Autonomous Node #42)',
			'email': 'aura.agent@taskdrift.internal',
			'phone': '+919876543210'
		},
		'fulfillment_address': {
			'line1': 'AI Innovation Center, Block 7',
			'city': 'Bengaluru',
			'state': 'Karnataka',
			'postal_code': '560103',
			'country': 'IN'
		}
	}
	log_payload('Outbound Session Request', create_payload)

	idem_key = f'idem_sim_{int(time.time())}'
	create_url = f'{base_url}/checkout_sessions'
	res = http_request(create_url, method='POST', data=create_payload, headers={'Idempotency-Key': idem_key})
	if res['status_code'] != 201:
		log_error(f'Session creation failed with HTTP {res["status_code"]}: {res["data"]}')
		sys.exit(1)

	session = res['data']
	session_id = session['id']
	log_payload('Authoritative Server Session', session)
	log_success(f'Session created: {session_id} | Status: {session["status"]} | Subtotal: Rs {session["totals"]["subtotal"]} | Tax (18% GST): Rs {session["totals"]["tax"]} | Total: Rs {session["totals"]["total"]}')
	time.sleep(pause_seconds)

	# =========================================================================
	# STEP 4: Update Session (Cart Modification)
	# =========================================================================
	log_step(4, 'Update Checkout Session', 'Adding second SKU and updating line items')
	update_payload = {
		'line_items': [
			{'product_id': selected_p1['id'], 'quantity': 2},
			{'product_id': selected_p2['id'], 'quantity': 1}
		],
		'discount': 100.0  # Safe within 50% discount bound
	}
	log_payload('Outbound Cart Update', update_payload)

	update_url = f'{base_url}/checkout_sessions/{session_id}'
	res = http_request(update_url, method='POST', data=update_payload)
	if res['status_code'] != 200:
		log_error(f'Session update failed with HTTP {res["status_code"]}: {res["data"]}')
		sys.exit(1)

	updated_session = res['data']
	log_payload('Refreshed Authoritative Session', updated_session)
	log_success(f'Session refreshed: {session_id} | Status: {updated_session["status"]} | New Total: Rs {updated_session["totals"]["total"]} (Discount Applied: Rs {updated_session["totals"]["discount"]})')
	time.sleep(pause_seconds)

	# =========================================================================
	# STEP 5: Complete Session & Bridge to Razorpay Rail
	# =========================================================================
	log_step(5, 'Complete Session & Bridge Payment', 'Finalizing checkout session and triggering Razorpay Order creation')
	complete_url = f'{base_url}/checkout_sessions/{session_id}/complete'
	res = http_request(complete_url, method='POST')
	if res['status_code'] != 200:
		log_error(f'Session completion failed with HTTP {res["status_code"]}: {res["data"]}')
		sys.exit(1)

	final_session = res['data']
	rzp_order_id = final_session.get('payment_provider', {}).get('razorpay_order_id')
	log_payload('Finalized Checkout State', final_session)
	log_success(f'Transaction Completed! Razorpay Order ID: {BOLD}{rzp_order_id}{RESET} | Status: {final_session["status"]} | Total Settled: Rs {final_session["totals"]["total"]}')

	print(f'\n{BOLD}{GREEN}======================================================================{RESET}')
	print(f'{BOLD}{GREEN}[OK] ACP CHECKOUT LIFECYCLE COMPLETED SUCCESSFULLY WITH 0 ERRORS{RESET}')
	print(f'{BOLD}{GREEN}======================================================================{RESET}\n')


def main():
	parser = argparse.ArgumentParser(description='Run Scripted Buyer-Agent Simulator for Razorpay ACP Adapter')
	parser.add_argument('--base-url', default='http://localhost:8000', help='Target ACP backend base URL')
	parser.add_argument('--pause', type=float, default=0.4, help='Pause between steps in seconds for recording clarity')
	args = parser.parse_args()

	run_simulator(base_url=args.base_url, pause_seconds=args.pause)


if __name__ == '__main__':
	main()
