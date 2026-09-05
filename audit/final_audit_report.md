# Final Pre-Submission Audit Report: AgentPay Bridge

> **Target**: Razorpay ACP Checkout Adapter (`v2026-04-17`)  
> **Author**: Mohan Prasath  
> **Track**: Track 01 — AI Growth and Agentic Commerce  
> **Audit Date**: 2026-09-05  
> **Environment Tested**: Live Cloud Run Backend (`https://razorpay-acp-adapter-922729192321.asia-south1.run.app`) & Vercel Dashboard (`https://agentpay-bridge.vercel.app`)

---

## Executive Summary

| Total Checks | PASS | WARN | FAIL | [NEEDS INPUT] | Overall Status |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **20** | **20** | **0** | **0** | **0** | **READY FOR SUBMISSION & VIDEO FREEZE** |

Every check was independently validated by running real HTTP requests against the live production deployment and executing local verification scripts. No historical self-reported results were assumed.

---

## 1. Functional Correctness

### [PASS] 1.1 Run `buyer_agent_sim.py` Acts 1–4 Against Live Cloud Run Backend
* **Target Backend**: `https://razorpay-acp-adapter-922729192321.asia-south1.run.app`
* **Command**: `python buyer_agent_sim.py --base-url https://razorpay-acp-adapter-922729192321.asia-south1.run.app --pause 0.05`
* **Evidence**:
  ```text
  [STEP 1.0] Autonomous Agent Registration -> agent_1da13f2b429745fb registered
  [STEP 1.1] Fetch Agent Capability Document -> 200 OK (Spec v2026-04-17, Rail: razorpay)
  [STEP 1.2] Fetch Merchant Product Catalog -> 200 OK (5 SKUs returned)
  [STEP 2.1] Initialize ACP Checkout Session -> Created cs_9155dad0c73f449e
  [STEP 2.2] Mutate Cart, Address & Token -> Updated state ready_for_payment
  [STEP 2.3] Finalize Checkout & Bridge to Razorpay Orders API -> Completed!
             Razorpay Order ID: order_TYJzowssFuOdQq | Status: completed
  [STEP 3A]  ATTACK: Client-Side Price Tampering (unit_price: ₹1.0) ->
             NEUTRALIZED: Server ignored ₹1.0 and enforced catalog price ₹499.0
  [STEP 3B]  ATTACK: Discount Ceiling Breach (75.2% > 50%) ->
             REJECTED: HTTP 400 (Status: rejected)
  [STEP 3.2] Graceful Recovery -> Session cs_a3af39c8bcf04bdb -> order_TYJzpeHXYzIxFE
  [STEP 4A]  Idempotent Replay -> Duplicate request returned identical session cs_dca34896f2344776
  [STEP 4B]  Session Cancellation -> Transitioned to cancelled; re-cancellation returned HTTP 409 Conflict
  [STEP 4C]  Post-Payment Refund Bridge -> Session cs_2e0dca87f15f47c5 refunded!
             Razorpay Refund ID: rfrq_5ec34dd8be764d | Status: refunded
  ======================================================================
  [OK] ALL 4 ACTS EXECUTED SUCCESSFULLY WITH 0 UNHANDLED ERRORS
  ```

### [PASS] 1.2 Verify Dashboard on Vercel Reflects Live Session Data in Real Time
* **Live Dashboard**: `https://agentpay-bridge.vercel.app/dashboard`
* **Verification**:
  - Live backend queried via `GET /checkout_sessions`: 5 active sessions returned (`cs_9155dad0c73f449e`, `cs_04384f446f3843f5`, `cs_a3af39c8bcf04bdb`, `cs_dca34896f2344776`, `cs_2e0dca87f15f47c5`).
  - Vercel JS client bundle confirmed hardcoded with `https://razorpay-acp-adapter-922729192321.asia-south1.run.app`.
  - CORS Preflight test from `Origin: https://agentpay-bridge.vercel.app` returned HTTP 200 with `Access-Control-Allow-Origin: https://agentpay-bridge.vercel.app`.

### [PASS] 1.3 Check All Documented Endpoints in `architecture.md` Exist & Respond
* **Scripted Validation**: Tested all 15 endpoints against the live Cloud Run backend.
* **Evidence**:
  ```text
  GET  /health                         -> 200 OK
  GET  /.well-known/agent.json         -> 200 OK
  GET  /products                       -> 200 OK
  GET  /checkout_sessions              -> 200 OK
  GET  /checkout_sessions/{id}         -> 200 OK
  POST /checkout_sessions              -> 201 Created (with X-API-Key) / 401 Unauthorized (without)
  POST /checkout_sessions/{id}         -> 200 OK
  POST /checkout_sessions/{id}/complete-> 200 OK
  POST /checkout_sessions/{id}/cancel  -> 200 OK
  POST /checkout_sessions/{id}/refund  -> 200 OK
  GET  /checkout_sessions/{id}/audit   -> 200 OK (5 structured events returned)
  GET  /audit_entries                  -> 200 OK (19 global events returned)
  GET  /dead_letter_events             -> 200 OK
  POST /internal/sweep_expired         -> 200 OK (swept_count: 0, timestamp recorded)
  POST /webhooks/razorpay              -> 400 Bad Request (HMAC signature verification required)
  ```

### [PASS] 1.4 Run Full Test Suite as-is (Exact Pass Count)
* **Command**: `pytest --tb=short` in `backend`
* **Evidence**:
  ```text
  platform win32 -- Python 3.14.3, pytest-9.1.1
  collected 91 items
  tests\test_agent_auth.py .....                                           [  5%]
  tests\test_catalog_search.py ......                                      [ 12%]
  tests\test_checkout.py ...............                                   [ 28%]
  tests\test_concurrency_and_anomaly.py .....                              [ 34%]
  tests\test_discovery.py ..                                               [ 36%]
  tests\test_guardrails.py ......                                          [ 42%]
  tests\test_health.py .                                                   [ 43%]
  tests\test_idempotency.py ....                                           [ 48%]
  tests\test_inbound_webhook.py ...                                        [ 51%]
  tests\test_integration_pass.py ..                                        [ 53%]
  tests\test_inventory_and_fsm.py ......                                   [ 60%]
  tests\test_line_item_tax.py ...                                          [ 63%]
  tests\test_models.py ....                                                [ 68%]
  tests\test_negotiation_and_tokenization.py ......                        [ 74%]
  tests\test_rate_limiter.py ..                                            [ 76%]
  tests\test_razorpay_service.py .....                                     [ 82%]
  tests\test_refund.py ....                                                [ 86%]
  tests\test_schema_conformance.py ....                                    [ 91%]
  tests\test_seed_catalog.py ..                                            [ 93%]
  tests\test_session_expiry.py ....                                        [ 97%]
  tests\test_webhook.py ..                                                 [100%]
  ============================= 91 passed in 35.03s =============================
  ```
* **Exact Pass Count**: **91 / 91 passed (100%)**.

---

## 2. Security Audit

### [PASS] 2.1 Confirm Client-Supplied `unit_price` is Always Ignored Server-Side
* **Test**: Dispatched `POST /checkout_sessions` with line item `unit_price: 0.01` for SKU `prod_bolt_001` (catalog price: ₹499.00).
* **Evidence**:
  ```text
  Submitted client unit_price: 0.01
  Server enforced unit_price: 499.0
  Server authoritative subtotal: 499.0
  PASS: Client unit_price was completely ignored server-side.
  ```

### [PASS] 2.2 Server-Side Enforcement of Guardrail Ceilings
* **Test**: Dispatched three distinct malicious payloads directly to the Cloud Run API:
  1. **Discount Cap**: Requested ₹300 discount on ₹499 order (60.1% > 50%).
  2. **Order Cap**: Requested 10 units of ₹2,499 SKU + 10 units of ₹4,999 SKU (total ₹221,475 > ₹50,000).
  3. **Quantity Cap**: Requested 11 units of SKU `prod_bolt_001` (11 > 10).
* **Evidence**:
  ```json
  {
    "discount_cap": "PASS: HTTP 400 - {\"detail\":{\"error\":\"guardrail_violation\",\"reason\":\"Requested discount (60.1%) exceeds maximum allowed bound of 50% (subtotal: ₹499.00, discount: ₹300.00).\",\"session_id\":\"cs_95d23543672c4762\",\"status\":\"rejected\"}}",
    "order_cap": "PASS: HTTP 400 - {\"detail\":{\"error\":\"guardrail_violation\",\"reason\":\"Order total (₹221,475.40) exceeds maximum single-order bound of ₹50,000.00.\",\"session_id\":\"cs_ac98ae1ebcf64bfc\",\"status\":\"rejected\"}}",
    "quantity_cap": "PASS: HTTP 400 - {\"detail\":{\"error\":\"guardrail_violation\",\"reason\":\"Line item quantity (11) for product \\\"prod_bolt_001\\\" exceeds maximum allowed bound of 10 units per item.\",\"session_id\":\"cs_3bb3e0edd4f54882\",\"status\":\"rejected\"}}"
  }
  ```

### [PASS] 2.3 Idempotency-Key Duplicate Replay Under High Concurrency
* **Test**: Dispatched 10 parallel threads simultaneously with identical header `Idempotency-Key: test-idem-21ed0aafc599` against Cloud Run.
* **Evidence**:
  ```json
  {
    "idempotency_key": "test-idem-21ed0aafc599",
    "total_requests": 10,
    "http_statuses": [201],
    "distinct_session_ids_created": ["cs_f701383dfd9a4725"],
    "is_strictly_idempotent": true
  }
  ```
  Zero duplicate sessions were created; all 10 concurrent requests received the cached session ID.

### [PASS] 2.4 Webhook HMAC-SHA256 Signature Validation
* **Test**: Dispatched `POST /webhooks/razorpay` without signature, then with tampered signature `deadbeefbadsignature1234567890`.
* **Evidence**:
  - Missing signature: `HTTP 400 ({"detail":{"error":"invalid_signature","message":"Inbound Razorpay HMAC-SHA256 signature verification failed."}})`
  - Tampered signature: `HTTP 400 ({"detail":{"error":"invalid_signature","message":"Inbound Razorpay HMAC-SHA256 signature verification failed."}})`

### [PASS] 2.5 Secret Exposure Audit
* **Git Tracked Files**: Only `.env.example` is committed. No `.env`, `.env.local`, or credential files are tracked.
* **Hardcoded Credentials**: Grep for `rzp_live_`, `rzp_test_[a-zA-Z0-9]{14,}`, and `BEGIN PRIVATE KEY` returned zero live secrets.
* **Client Bundles**: Inspected Vercel production bundles; only public `NEXT_PUBLIC_BACKEND_URL` is included.

### [PASS] 2.6 CORS Configuration Scoped to Explicit Allowlist
* **Code Reference**: [`backend/main.py:21-38`](backend/main.py#L21-L38)
* **Implementation**: Reads comma-separated origins from `ALLOWED_ORIGINS` env var, with fallback defaults to `https://agentpay-bridge.vercel.app` and `http://localhost:3000`. Preserves `allow_credentials=True`.
* **Evidence**:
  - Preflight from `https://agentpay-bridge.vercel.app` $\rightarrow$ `HTTP 200`, `Access-Control-Allow-Origin: https://agentpay-bridge.vercel.app`, `Access-Control-Allow-Credentials: true`.
  - Preflight from `http://localhost:3000` $\rightarrow$ `HTTP 200`, `Access-Control-Allow-Origin: http://localhost:3000`.
  - Preflight from unauthorized origin `https://evil.example.com` $\rightarrow$ `HTTP 400`, `Access-Control-Allow-Origin: None` (Rejected).
  - Dynamic parsing from `ALLOWED_ORIGINS="https://custom.agent.domain, https://partner.agent.domain"` verified with test client.

### [PASS] 2.7 Endpoint Authentication Enforcement
* **Test**: Dispatched unauthenticated `POST /checkout_sessions`.
* **Evidence**: Rejected with `HTTP 401 Unauthorized`.
* **Specification Compliance**: Per ACP `v2026-04-17`, discovery endpoints (`GET /.well-known/agent.json`, `GET /products`) are unauthenticated; state-mutating session endpoints strictly require cryptographic `X-API-Key`.

### [PASS] 2.8 SSRF & Injection Vulnerability Check
* **SSRF**: Outbound webhook dispatch targets are hardcoded to `settings.WEBHOOK_TARGET_URL`. No client payload can supply an arbitrary target URL.
* **SQL Injection**: Storage uses Google Cloud Firestore (NoSQL Document Store) with Pydantic typed models.
* **Command Injection**: No `os.system` or subprocess calls exist in runtime request handlers.

---

## 3. Data Integrity

### [PASS] 3.1 Immutable Append-Only Audit Records
* **Code Reference**: [`backend/services/audit.py`](backend/services/audit.py#L13-L45)
* **Evidence**:
  - `record_audit_entry()` generates unique `audit_{uuid}` IDs and writes append-only documents to Firestore `audit_entries`.
  - Zero update or delete operations exist in the audit service module.
  - Live query to `/audit_entries` returned 19 historical chronological records including state mutations and guardrail breach reasons.

### [PASS] 3.2 30-Minute Inventory Soft-Hold TTL Sweeper
* **Test Suite**: `pytest -v tests/test_session_expiry.py` (4/4 passed).
* **Live Endpoint**: `POST /internal/sweep_expired` responded with HTTP 200 OK.
* **Mechanism**: Sessions inactive beyond `expires_at` are transitioned to `cancelled` and stock reservations are restored to available inventory.

### [PASS] 3.3 Post-Payment Refund Flow
* **Test**: `pytest -v tests/test_refund.py` (4/4 passed).
* **Live Test**: Session `cs_2e0dca87f15f47c5` completed and refunded via `POST /checkout_sessions/{id}/refund`. Live response confirmed Razorpay refund ID `rfrq_5ec34dd8be764d` and status transitioned to `refunded`.

---

## 4. Branding Cleanup Verification

### [PASS] 4.1 Zero Agency Branding References Across Codebase
* **Check**: Git grep scan for legacy agency branding across all files
* **Result**: Exit code 1 (0 matches across all tracked files).
* **Regex Scan**: Full workspace search for agency identifiers returned 0 results.

### [PASS] 4.2 Visual UI & Footer Branding
* **Landing Page & Dashboard**: Inspected header, hero, sandbox, FSM diagrams, and footer.
* **Footer Reference**: `Built by Mohan Prasath` ([`frontend/components/Footer.tsx:98`](frontend/components/Footer.tsx#L98)). Zero agency branding, logos, or references exist.

### [PASS] 4.3 Metadata & Commit Author Cleanliness
* **`frontend/package.json`**: `"author": "Mohan Prasath"`
* **Git Commit History**: Recent commits confirmed authored by `Mohan <mohanprasath210607@gmail.com>`.

---

## 5. Submission Readiness

### [PASS] 5.1 Public Repository Access Without Login
* **URL**: `https://github.com/mohanprasath-dev/razorpay-acp-adapter`
* **Test**: `curl -sI https://github.com/mohanprasath-dev/razorpay-acp-adapter` returned `HTTP/2 200`. Publicly accessible.

### [PASS] 5.2 Clear Setup Instructions
* **README**: Contains quick links to live production deployment (`https://agentpay-bridge.vercel.app/`), step-by-step local backend setup, dashboard setup, simulator run commands, and protocol API reference table.

### [PASS] 5.3 Documentation Links Integrity
* **Verification**: All markdown links in `README.md`, `docs/architecture.md`, and `docs/DEPLOYMENT.md` were checked.
* **Image Assets**: Confirmed `docs/images/architecture-system.png` and `docs/images/architecture-fsm.png` exist and load correctly.

### [PASS] 5.4 Live Deployment Reachability
* **Cloud Run Backend**: `https://razorpay-acp-adapter-922729192321.asia-south1.run.app/health` -> HTTP 200 `{"status":"ok"}`.
* **Vercel Web App**: `https://agentpay-bridge.vercel.app/` -> HTTP 200.
* **Vercel Dashboard**: `https://agentpay-bridge.vercel.app/dashboard` -> HTTP 200.

### [PASS] 5.5 Code Cleanliness (TODO / FIXME / Debug Statements)
* **Search**: `git grep -inE "(TODO|FIXME)"` -> 0 matches.
* **Search**: `git grep -in "console.log" -- "frontend/*"` -> 0 matches.

---

## 6. Judge Guide Feature Implementation

To ensure judges landing cold on the live dashboard can test the system in under 60 seconds without reading external docs, the **Judge & Evaluator Testing Guide** has been built directly into the dashboard.

### Component Architecture
* **File**: [`frontend/components/JudgeGuideCard.tsx`](frontend/components/JudgeGuideCard.tsx)
* **Integration**: Mounted prominently in [`frontend/app/dashboard/page.tsx`](frontend/app/dashboard/page.tsx#L348) above the metrics row.

### What the Guide Provides to Judges
1. **Plain-English Summary**: Explains what AgentPay Bridge does in 2 sentences (ACP checkout safety adapter translating agent intents to Razorpay orders while enforcing 50% discount caps and 30-min holds).
2. **Option A (Zero Terminal)**: Directs the judge to the 1-click test suite action bar directly above the guide (**▶ Happy Path**, **🛡 Test Attack**, **⚡ Test Idempotency**).
3. **Option B (Terminal Simulator Command)**: Provides the copy-ready command with the live Cloud Run backend URL pre-filled:
   ```bash
   python buyer_agent_sim.py --base-url https://razorpay-acp-adapter-922729192321.asia-south1.run.app
   ```
4. **Act-by-Act Guide**:
   - **Act 1 (Discovery)**: Explains capability discovery and catalog resolution.
   - **Act 2 (Happy Path)**: Explains full checkout; tells the judge to look for a green `completed` row with a Razorpay Order ID.
   - **Act 3 (Attack Suite)**: Explains the ₹1 tampering and 75% discount attack; explicitly reassures the judge that **"rejected" is correct defense behavior, not a bug**.
   - **Act 4 (Resilience & Refund)**: Explains idempotency, session cancellation, and Razorpay refund.
5. **No-Simulator Fallback**: Explains that the dashboard auto-refreshes every 2 seconds with real metrics, and judges can click any session row to inspect the itemized GST math and immutable Firestore audit trail.
6. **User Experience**: Includes a 1-click **Copy Command** button, a collapsible toggle, and zero agency branding.

---

## Conclusion & Freeze Status
AgentPay Bridge has passed all functional correctness, security guardrail, data integrity, branding cleanup, and submission readiness audits. The codebase is verified, stable, and ready to be frozen for pitch video recording.
