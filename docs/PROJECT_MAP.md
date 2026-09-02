# PROJECT_MAP — Razorpay ACP Adapter
> Deep Technical Reference & Verification Guide for Track 01 (AI Growth & Agentic Commerce)

---

## 1. Executive Summary

- **Project**: Razorpay ACP Checkout Adapter
- **Protocol**: Agentic Commerce Protocol (ACP) Spec `v2026-04-17`
- **Track**: Track 01 — AI Growth & Agentic Commerce
- **Architecture**: Dual-layer architecture:
  - **Backend**: FastAPI REST API + Pydantic v2 + Razorpay Orders Bridge + Firestore
  - **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons (Live Audit Dashboard)
  - **Simulation**: Headless Autonomous Buyer-Agent Simulator (`buyer_agent_sim.py`)

---

## 2. Core Protocol Endpoints

| Method | Endpoint | Purpose | Spec Reference |
|---|---|---|---|
| `GET` | `/.well-known/agent.json` | ACP Capability Feed & Protocol Declaration | PRD §4 |
| `GET` | `/products` | Authoritative Product Catalog (5 SKUs) | PRD §4 |
| `POST` | `/checkout_sessions` | Create new session with authoritative totals | PRD §5 |
| `GET` | `/checkout_sessions/{id}` | Read current authoritative state | PRD §5 |
| `POST` | `/checkout_sessions/{id}` | Update line items, buyer, or discount | PRD §5 |
| `POST` | `/checkout_sessions/{id}/complete` | Bridge to Razorpay Orders API & finalize | PRD §5 |
| `POST` | `/checkout_sessions/{id}/cancel` | Cancel an in-flight checkout session | PRD §5 |
| `GET` | `/checkout_sessions` | List all active/historical sessions | Dashboard |
| `GET` | `/checkout_sessions/{id}/audit` | Fetch chronological audit trail for session | Dashboard |
| `GET` | `/audit_entries` | Global immutable audit stream | Dashboard |
| `GET` | `/health` | Liveness / readiness probe | Ops |

---

## 3. Database Schema & Data Models

All models are defined in [`backend/models.py`](../backend/models.py) using strict Pydantic v2 validation:

### `CheckoutSession`
```python
{
  "id": "cs_699564c73499",
  "status": "completed", # created | updated | ready_for_payment | completed | rejected | cancelled
  "line_items": [
    {
      "product_id": "prod_bolt_001",
      "quantity": 2,
      "unit_price": 499.0
    }
  ],
  "buyer": {
    "name": "Autonomous Buyer Agent",
    "email": "buyer@agentic.ai",
    "phone": "+919988776655"
  },
  "fulfillment_address": {
    "line1": "Level 4, AI Commerce Hub",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postal_code": "560001",
    "country": "IN"
  },
  "totals": {
    "subtotal": 998.0,
    "discount": 0.0,
    "tax": 179.64,
    "total": 1177.64,
    "currency": "INR"
  },
  "payment_provider": {
    "provider": "razorpay",
    "razorpay_order_id": "order_RvXyJcK183921"
  },
  "created_at": "2026-09-02T11:45:00Z",
  "updated_at": "2026-09-02T11:45:05Z"
}
```

### `AuditEntry`
```python
{
  "id": "audit_80a37e891b22",
  "session_id": "cs_699564c73499",
  "action": "reject", # create | update | complete | reject | cancel
  "actor": "buyer_agent_sim",
  "reason": "Max order value exceeded: ₹73,738.20 > ₹50,000.00",
  "before_total": 1177.64,
  "after_total": 73738.20,
  "timestamp": "2026-09-02T11:45:03Z"
}
```

---

## 4. Business Logic, Inventory & Security Guardrails

1. **Authoritative Pricing**: The backend strictly looks up prices in its internal product registry. Any client-sent `unit_price` in the payload is ignored.
2. **Stock-Tracked Inventory**: Real-time stock tracking per SKU. Pre-checkout quantity validation prevents over-ordering (`out_of_stock` rejection), and atomic inventory decrement is executed upon session completion.
3. **Deterministic Guardrails**:
   - `validate_max_discount`: Max discount capped at 50% of subtotal.
   - `validate_max_order_value`: Max single order value capped at ₹50,000 INR.
   - `validate_max_quantity`: Max line item quantity capped at 10 units.
4. **Idempotency Protection**: `Idempotency-Key` header cached in-memory and in Firestore. Replayed requests return the existing session without duplicating side-effects.
5. **Session FSM Lifecycle**:
   - `created`: Session initialized with initial line items (missing full buyer/address).
   - `updated`: Cart mutated with updated items/discounts (missing full buyer/address).
   - `ready_for_payment`: Full buyer details, valid shipping address, and validated items attached. Ready for payment rail delegation.
   - `completed`: Terminal state with atomic stock decrement and Razorpay Order ID attached.
   - `rejected`: Terminal state when guardrails or inventory stock checks fail.
   - `cancelled`: Terminal state upon explicit cancellation.
   - `refunded`: Terminal state following post-payment refund bridge execution.
6. **Audit Trail Immutability**: Every lifecycle action (including rejected violations and out-of-stock events) records an immutable `AuditEntry` with before/after totals and rejection reasoning.

---

## 5. Razorpay Payment Rail Bridge

When an autonomous agent invokes `POST /checkout_sessions/{session_id}/complete`:
1. The adapter checks that the session is in an active state (`ready_for_payment` preferred, `created` or `updated` backward-compatible fallback).
2. Atomically decrements catalog inventory for all line items.
3. Calculates exact payable amount in paise (`round(total * 100)`).
4. Calls Razorpay API `client.order.create(amount=paise, currency="INR", notes={"session_id": session.id})`.
5. Transitions session status to `completed` and attaches `razorpay_order_id`.
6. Emits an outbound webhook event.

---

## 6. Pre-Answered Technical Q&A (Cold Defense)

### Q1: Why build an adapter instead of directly calling Razorpay APIs?
> **Answer**: Autonomous AI agents operate on standardized open protocols (like ACP) rather than bespoke gateway SDKs. The adapter translates high-level agentic commerce intents (`create session`, `update cart`, `complete checkout`) into secure, authoritative, and bounded Razorpay order rails while enforcing business guardrails that the agent cannot tamper with.

### Q2: How do you prevent an agent from hallucinating prices or discounts?
> **Answer**: The server completely ignores any `unit_price` provided by the agent. The server loads products directly from the authoritative catalog and calculates 18% GST tax and subtotal authoritatively. Discounts are evaluated against hard guardrail limits (max 50%).

### Q3: What happens when an agent breaches a guardrail?
> **Answer**: The request is safely rejected with HTTP 400 and a structured JSON violation response (`{"error": "guardrail_violation", "reason": "..."}`). The session transitions to `rejected`, and an immutable `AuditEntry` is written to Firestore recording the exact constraint breached.

### Q4: How does idempotency work?
> **Answer**: Clients supply an `Idempotency-Key` header on session creation. The adapter maps this key to the generated session ID in memory and Firestore with thread-safe locking. Subsequent requests with the same key immediately return the original session.

### Q5: Why require a delegated payment method token (`POST /checkout_sessions/{id}/payment_method`) before completion?
> **Answer**: This models the Agentic Commerce Protocol (ACP) delegated payment token handoff layer (`pm_tok_<identifier>`). In real-world agent commerce, the autonomous agent never handles raw payment credentials directly; it hands off a PCI-compliant tokenized payment method. While the Razorpay Order creation API itself operates server-side, simulating this token attachment step enforces full ACP protocol fidelity and FSM verification before bridging to the financial payment rail.

### Q6: How does the adapter handle webhook dispatch failures and network partitions?
> **Answer**: Outbound ACP lifecycle webhooks implement automatic exponential backoff retries (3 attempts). If the subscriber endpoint fails across all retries, the event is not dropped silently; it is persisted to an immutable `DeadLetterEvent` store (accessible via `GET /dead_letter_events` and visible in the audit dashboard) containing failure diagnostics and attempt counts for developer replay and monitoring.

