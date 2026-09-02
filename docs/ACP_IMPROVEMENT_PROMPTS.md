# Razorpay ACP Adapter — Improvement Build Prompts (T11–T20)

One JSON prompt per task, same format as T1.1–T10.2. Run in checkpoint order.
After each checkpoint: `pytest backend/tests -v` + `python buyer_agent_sim.py --scenario all` must pass before moving on.

---

## CHECKPOINT 1 — Foundation

### T11.1 — Real Inventory Decrement
```json
{
  "task_id": "T11.1",
  "title": "Stock-tracked catalog with real inventory decrement",
  "context": "Catalog in backend/services/pricing.py is currently static (5 SKUs, no stock tracking). Add a stock field per product and decrement it atomically on session completion.",
  "requirements": [
    "Add `stock: int` field to Product model in backend/models.py",
    "Seed each of the 5 SKUs with a stock value (mix of high and low, e.g. one SKU with stock=2 to enable easy out-of-stock testing)",
    "On POST /checkout_sessions and /checkout_sessions/{id} (create/update), validate requested quantity <= available stock; reject with guardrail_violation style 400 if insufficient",
    "On /complete, atomically decrement stock (use Firestore transaction to prevent race conditions)",
    "On /cancel or guardrail rejection, do NOT decrement stock (only decrement on confirmed complete)",
    "Add out_of_stock as a new AuditEntry action reason"
  ],
  "acceptance_criteria": [
    "New test: ordering more than available stock returns 400 with clear reason",
    "New test: two concurrent completes against a stock=1 item — one succeeds, one fails with out-of-stock (proves atomicity)",
    "Existing 49 tests still pass"
  ]
}
```

### T11.2 — Wire `ready_for_payment` FSM State
```json
{
  "task_id": "T11.2",
  "title": "Add missing ready_for_payment intermediate state to session FSM",
  "context": "CheckoutSession status enum already lists ready_for_payment but the state diagram and router logic skip straight from created/updated to completed. Wire it in properly per ACP spec intent: a session should be explicitly marked ready before payment delegation begins.",
  "requirements": [
    "Add explicit transition: updated -> ready_for_payment when all required fields (buyer, fulfillment_address, line_items) are present and guardrails pass",
    "POST /checkout_sessions/{id}/complete should only be callable from ready_for_payment (or created/updated as fallback for backward compat, but log a warning)",
    "Update docs/ARCHITECTURE.md state diagram to include this transition",
    "Update PROJECT_MAP.md FSM table"
  ],
  "acceptance_criteria": [
    "New test: session missing fulfillment_address stays in updated, not ready_for_payment",
    "New test: complete() from ready_for_payment succeeds normally",
    "Existing tests still pass"
  ]
}
```

---

## CHECKPOINT 2 — Protocol Correctness

### T12.1 — Multi-Turn Cart Negotiation
```json
{
  "task_id": "T12.1",
  "title": "Support multi-turn cart updates before completion",
  "context": "Currently sessions are typically created once then completed. ACP spec expects agents to negotiate carts over multiple update calls (add item, remove item, change quantity, apply/remove discount) before finalizing.",
  "requirements": [
    "Ensure POST /checkout_sessions/{id} supports partial line_item patches: add new line item, remove existing line item (qty=0 removes), change quantity, change/remove discount — all recalculating totals authoritatively each time",
    "Each update call must produce a new AuditEntry with before_total/after_total diff",
    "Guardrails re-validated on every single update, not just at complete time"
  ],
  "acceptance_criteria": [
    "New test: 4-step negotiation (add item -> remove item -> change qty -> apply discount) ends with correct final total",
    "New test: an update that would breach guardrails mid-negotiation is rejected without corrupting prior state",
    "buyer_agent_sim.py Act 2 extended to show at least 3 sequential updates before complete"
  ]
}
```

### T12.2 — Payment Method Tokenization Stub
```json
{
  "task_id": "T12.2",
  "title": "Explicit delegated payment method tokenization layer",
  "context": "ACP spec v2026-04-17 delegate_payment expects a payment method token handoff before the merchant charges. Razorpay Orders API doesn't natively support this, so model the step explicitly as an adapter-level concept, then bridge to Razorpay underneath.",
  "requirements": [
    "New endpoint POST /checkout_sessions/{id}/payment_method — accepts a mock payment token (agent-supplied, adapter-generated format like pm_tok_<uuid>), stores it on session, transitions ready_for_payment only after this is set",
    "New service backend/services/tokenization.py — generates and validates token format, explicitly documented as a stub layer standing in for a real PCI-scope tokenization service",
    "/complete now requires a valid payment_method token attached before bridging to Razorpay",
    "Document clearly in PROJECT_MAP Q&A: 'this models the ACP delegate_payment token handoff; Razorpay itself does not require it, we simulate the step for spec fidelity'"
  ],
  "acceptance_criteria": [
    "New test: complete() without a payment_method token attached is rejected",
    "New test: valid token attaches and complete() proceeds normally to Razorpay bridge",
    "PROJECT_MAP.md Q&A updated with new Q5 explaining this design choice"
  ]
}
```

### T12.3 — Webhook Retry + Dead-Letter Log
```json
{
  "task_id": "T12.3",
  "title": "Webhook delivery retry with dead-letter logging",
  "context": "backend/services/webhook.py currently dispatches signed webhooks once. Add retry-on-failure and a dead-letter record for permanently undeliverable events.",
  "requirements": [
    "Retry failed webhook POSTs 3x with exponential backoff (reuse pattern from razorpay_service.py)",
    "After 3 failures, write a DeadLetterEvent record to Firestore (event_id, session_id, target_url, last_error, attempts, timestamp)",
    "New endpoint GET /dead_letter_events for dashboard visibility",
    "Dashboard: new small panel/tab listing dead-lettered webhook events"
  ],
  "acceptance_criteria": [
    "New test: webhook target returning 500 three times results in a DeadLetterEvent, not a silent drop",
    "New test: webhook succeeding on 2nd retry does NOT create a dead-letter record",
    "GET /dead_letter_events returns expected shape"
  ]
}
```

---

## CHECKPOINT 3 — Differentiators (depends on T11.1 inventory)

### T13.1 — Multi-Agent Concurrency Proof
```json
{
  "task_id": "T13.1",
  "title": "Concurrent multi-agent race condition test",
  "context": "Prove the adapter is safe under concurrent load from multiple autonomous agents hitting the same inventory and idempotency keys simultaneously.",
  "requirements": [
    "New script backend/scripts/concurrency_test.py — spawns N (default 10) simulated agents concurrently via asyncio/httpx, some targeting the same low-stock SKU, some replaying the same Idempotency-Key",
    "Assert: exactly one agent succeeds against a stock=1 item, rest get out_of_stock",
    "Assert: all replayed Idempotency-Key requests return the SAME session id, zero duplicate Razorpay orders created",
    "Log a summary table: agent_id, outcome, latency"
  ],
  "acceptance_criteria": [
    "Script runs standalone and prints pass/fail summary",
    "Included as a documented step in README under 'Concurrency Verification'",
    "Run once against live deployed URL and capture results in docs/CONCURRENCY_RESULTS.md"
  ]
}
```

### T13.2 — Fraud/Anomaly Scoring Layer
```json
{
  "task_id": "T13.2",
  "title": "Pre-guardrail anomaly scoring for suspicious agent behavior",
  "context": "Add a lightweight scoring layer that flags suspicious session-creation patterns BEFORE they even reach guardrail checks — catches abuse patterns guardrails alone wouldn't (e.g. rapid session churn from one actor).",
  "requirements": [
    "New backend/services/anomaly.py — tracks per-actor (buyer email or agent id) rolling window of: session creation rate, guardrail violation count, cancelled-session rate",
    "Score thresholds: e.g. >5 sessions/min from same actor, or >3 guardrail violations in 10min -> flag as anomalous",
    "Flagged sessions get an AuditEntry with action=flagged_anomalous but are NOT auto-blocked (score is advisory, logged for review) — document this as an intentional design choice, not auto-ban, to avoid false-positive lockouts",
    "Dashboard: anomaly flag badge on flagged sessions"
  ],
  "acceptance_criteria": [
    "New test: actor creating 6 sessions in under a minute gets flagged on the 6th",
    "New test: actor with 4 guardrail violations in a short window gets flagged",
    "Flagging does not block or alter normal session behavior — verified by test"
  ]
}
```

---

## CHECKPOINT 4 — Infra Maturity

### T14.1 — Structured Logging + Correlation IDs
```json
{
  "task_id": "T14.1",
  "title": "Structured JSON logging with correlation IDs across the full request chain",
  "context": "Add traceability: a single correlation_id should thread through session creation -> guardrail check -> webhook dispatch -> Razorpay call, visible in logs.",
  "requirements": [
    "Middleware generates/propagates X-Correlation-Id header per request (accept incoming, generate if absent)",
    "All log statements (structlog or Python logging with JSON formatter) include correlation_id, session_id, action",
    "Pass correlation_id through to webhook payload and Razorpay order notes field",
    "Document log format in docs/OBSERVABILITY.md"
  ],
  "acceptance_criteria": [
    "New test: a single session lifecycle (create->update->complete) produces logs all sharing one correlation_id",
    "Correlation id visible in Razorpay order notes and webhook payload for the same session"
  ]
}
```

### T14.2 — Versioned OpenAPI Spec
```json
{
  "task_id": "T14.2",
  "title": "Auto-published OpenAPI spec versioned against ACP spec version",
  "context": "FastAPI generates OpenAPI automatically but it needs explicit versioning tied to ACP_SPEC_VERSION and to be committed/published, not just served at runtime.",
  "requirements": [
    "Set FastAPI app version = ACP_SPEC_VERSION from config",
    "Add script backend/scripts/export_openapi.py that dumps openapi.json to docs/openapi.json on demand",
    "Commit the generated docs/openapi.json to repo, add a Makefile/npm-script target to regenerate it",
    "Link it from README"
  ],
  "acceptance_criteria": [
    "docs/openapi.json exists and validates against OpenAPI 3.1 schema",
    "App version field matches ACP_SPEC_VERSION exactly"
  ]
}
```

### T14.3 — Load Test + Real p99 Numbers
```json
{
  "task_id": "T14.3",
  "title": "Load test against local instance, capture real latency numbers",
  "context": "Run against LOCAL uvicorn only (not live Cloud Run/Firestore) to avoid burning GCP free tier. Use k6 or Locust (both free/OSS).",
  "requirements": [
    "Write a k6 or Locust script simulating 50-500 concurrent virtual agents hitting /checkout_sessions create+update+complete over 60s against http://localhost:8000",
    "Capture p50/p95/p99 latency, error rate, throughput (req/s)",
    "Save raw results + summary to docs/LOAD_TEST_RESULTS.md with exact command used to reproduce"
  ],
  "acceptance_criteria": [
    "docs/LOAD_TEST_RESULTS.md contains real numbers (not estimated/fabricated) with timestamp and machine specs noted",
    "Zero unhandled 500 errors under target load, or explicitly documented as a known limit with the breaking point noted"
  ]
}
```

---

## Buffer — Final Verification

```json
{
  "task_id": "T15.1",
  "title": "Fresh clone boot test + full live re-verification",
  "requirements": [
    "Delete local repo, fresh git clone into a new directory",
    "Copy .env.example -> .env, fill only with real credentials, no other edits",
    "Boot backend + frontend from scratch following README exactly as written, no tribal knowledge shortcuts",
    "Run full pytest suite, buyer_agent_sim.py --scenario all, and concurrency_test.py against the fresh boot",
    "Re-run buyer_agent_sim.py against the LIVE deployed Cloud Run + Vercel URLs one final time"
  ],
  "acceptance_criteria": [
    "A stranger following only README.md can get the project running with zero undocumented steps",
    "All test suites pass on fresh clone",
    "Live deployed simulation run completes with 0 unhandled errors"
  ]
}
```
