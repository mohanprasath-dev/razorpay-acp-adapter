# Razorpay ACP Adapter — Round 3 Protocol Depth Prompts (T16–T21)

Priority order: T16.1 and T17.1 first (highest judge-visibility gaps). Run pytest + buyer_agent_sim after each.

---

### T16.1 — Agent Authentication (API Key)
```json
{
  "task_id": "T16.1",
  "title": "API key authentication per agent",
  "context": "All checkout endpoints are currently unauthenticated. Any caller can create sessions under any identity string. Add per-agent API key auth so identity is cryptographically real, not just a self-reported email/actor field.",
  "requirements": [
    "New backend/services/auth.py: generate/validate API keys (format acp_agent_<hex>), store hashed (not plaintext) in Firestore keyed to an agent_id",
    "New endpoint POST /agents/register — issues a new API key for a named agent (open registration for hackathon demo purposes, documented as such)",
    "Require X-API-Key header on all mutation endpoints (create/update/complete/cancel/refund/payment_method); /products and /.well-known/agent.json stay public per ACP discovery spec",
    "Reject missing/invalid key with 401 structured error",
    "Wire authenticated agent_id into AuditEntry.actor and anomaly.py scoring (replace free-text actor field)",
    "buyer_agent_sim.py registers an agent first, then uses the key for all subsequent calls"
  ],
  "acceptance_criteria": [
    "New test: request without X-API-Key on POST /checkout_sessions returns 401",
    "New test: valid key succeeds, invalid key returns 401",
    "New test: anomaly scoring correctly keys off authenticated agent_id, not spoofable email string",
    "Existing tests updated to include valid key in fixtures"
  ]
}
```

### T16.2 — Inbound Webhook Signature Verification
```json
{
  "task_id": "T16.2",
  "title": "Verify inbound Razorpay webhook signatures",
  "context": "webhook.py signs and sends OUTBOUND events. If a Razorpay payment-status webhook endpoint exists or is added, inbound payloads from Razorpay must be signature-verified before trusted, mirroring what you already enforce outbound.",
  "requirements": [
    "New endpoint POST /webhooks/razorpay — receives Razorpay payment/order status callbacks",
    "Verify X-Razorpay-Signature header using Razorpay's documented HMAC-SHA256 scheme against RAZORPAY_KEY_SECRET (or dedicated webhook secret if configured)",
    "Reject unverified payloads with 400, log attempted-forgery events distinctly from normal rejections",
    "On verified 'payment.captured' event, cross-check against session.payment_provider.razorpay_order_id and update session state defensively (never trust webhook body over server truth alone — reconcile, don't overwrite blindly)"
  ],
  "acceptance_criteria": [
    "New test: valid signature payload processes and updates matching session",
    "New test: invalid/tampered signature rejected with 400, never touches session state",
    "New test: valid signature but unknown order_id is safely ignored/logged, not crashed"
  ]
}
```

### T17.1 — Session TTL / Expiry with Stock Release
```json
{
  "task_id": "T17.1",
  "title": "Session expiry with automatic inventory release",
  "context": "A created/updated session can sit indefinitely, potentially holding reserved stock forever if reservations are soft-held. Add explicit TTL so abandoned sessions don't starve inventory.",
  "requirements": [
    "Add expires_at field to CheckoutSession, default created_at + 30 minutes (configurable via SESSION_TTL_MINUTES env var)",
    "Background sweep (Cloud Scheduler-triggered endpoint POST /internal/sweep_expired, or in-process periodic task for local dev) transitions expired created/updated/ready_for_payment sessions to cancelled with reason=expired",
    "If inventory was reserved (soft-hold) on those line items, release it back to stock on expiry",
    "/complete on an expired session returns 409 with clear expired_session error, not a generic failure"
  ],
  "acceptance_criteria": [
    "New test: session past expires_at cannot be completed, returns 409",
    "New test: sweep endpoint transitions expired sessions to cancelled and audit-logs the expiry",
    "New test: stock reserved by an expired session is released and available to a new session"
  ]
}
```

### T18.1 — Line-Item Level Tax Granularity
```json
{
  "task_id": "T18.1",
  "title": "Per-line-item tax rates instead of flat session-level GST",
  "context": "pricing.py currently applies a single 18% GST across the whole session total. Real catalogs have mixed tax slabs (0%, 5%, 12%, 18%, 28% under GST) and some SKUs may be exempt.",
  "requirements": [
    "Add tax_rate field per product in catalog (default 18%, vary at least 2 of the 5 SKUs to different slabs for demo realism)",
    "Recalculate totals.tax as sum of (line_item.subtotal * line_item.tax_rate) rather than a single flat rate on session subtotal",
    "totals response includes a tax_breakdown array showing per-rate subtotal and tax amount, not just one number",
    "Discount allocation across line items must be proportional before tax, not applied post-tax (avoid double-discounting tax)"
  ],
  "acceptance_criteria": [
    "New test: cart with mixed tax-rate items produces correct total matching manual calculation",
    "New test: discount applied to mixed-rate cart allocates proportionally and taxes correctly",
    "PROJECT_MAP.md schema example updated to show tax_breakdown"
  ]
}
```

### T19.1 — Formal ACP JSON Schema Validation
```json
{
  "task_id": "T19.1",
  "title": "Validate all request/response payloads against published ACP JSON schema",
  "context": "Pydantic models are a reasonable-effort interpretation of the ACP spec but aren't proof of conformance. Validate directly against the official ACP JSON schema files to prove line-by-line fidelity.",
  "requirements": [
    "Source the official ACP v2026-04-17 JSON schema files (check the spec's GitHub/published schema registry; if unavailable, document that clearly rather than fabricating one)",
    "Add backend/validation/acp_schema_validator.py using jsonschema library to validate outgoing session/product responses against the schema at test time (not necessarily runtime, to avoid perf cost)",
    "New test suite test_schema_conformance.py validating a sample of real responses (create session, get session, products list) against schema",
    "Document any deliberate deviations from spec (e.g. added fields like anomaly flags) as documented extensions, not violations"
  ],
  "acceptance_criteria": [
    "If real ACP schema found: automated tests pass validation against it, cite the schema source in docs",
    "If no official machine-readable schema exists publicly: document this explicitly, do NOT fabricate a schema and claim conformance — instead write a manual field-by-field conformance table against the spec doc"
  ]
}
```

### T20.1 — Catalog Search & Filter
```json
{
  "task_id": "T20.1",
  "title": "Search and filter parameters on /products",
  "context": "GET /products currently returns a flat unfiltered list of 5 SKUs. Real agent shopping involves search/filter, not just browsing everything.",
  "requirements": [
    "Add query params to GET /products: q (name/description substring search), category, min_price, max_price, in_stock_only (bool)",
    "Add a category field to each product in the catalog seed if not already present",
    "Combine filters with AND logic; empty/no params returns full catalog unchanged (backward compatible)",
    "Update /.well-known/agent.json capability manifest to declare search/filter support"
  ],
  "acceptance_criteria": [
    "New test: q= substring match works case-insensitively",
    "New test: min_price/max_price range filter works correctly at boundaries",
    "New test: in_stock_only=true excludes zero-stock items",
    "Existing GET /products with no params still returns identical output to before (no regression)"
  ]
}
```
