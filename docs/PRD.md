# PRD — Razorpay ACP Checkout Adapter
**Track:** 01 — AI Growth & Agentic Commerce (Razorpay AI Buildathon 2026)
**Builder:** Mohan Prasath, TaskDrift
**Deadline flag:** Buildathon submission closes **Sept 5, 2026** (3 days from today). This PRD is scoped as a 10-day/240h build. Days 1–3 = submission-ready MVP. Days 4–10 = depth for the panel interview round (post-submission, since shortlisting is rolling). Do not let Days 4–10 scope creep into blocking the Day-3 submission.

---

## 1. Problem

The brief asks for an agent that grows merchant revenue on Razorpay test-mode APIs, or makes a merchant transactable by an AI buyer end-to-end. Most entries will hand-roll a toy JSON checkout API and call it "agent-readable." That doesn't hold up if a panelist knows the actual open standard.

**Gap:** No Razorpay-backed implementation of the Agentic Commerce Protocol (ACP) — the OpenAI/Stripe/Meta-maintained open standard (Apache 2.0, spec version 2026-04-17) — exists publicly. Stripe, Adyen, Worldpay, Worldline all have reference payment handlers. Razorpay does not.

## 2. Goal

Build a **spec-compliant ACP checkout session lifecycle**, backed by Razorpay as the payment rail, that any ACP-aware buyer-agent could transact against. Demonstrate protocol fluency, not a toy demo.

## 3. Non-goals

- Not implementing real OAuth 2.0 delegated auth (stub it, disclose the stub)
- Not implementing a real ACP `delegate_payment` vault-token handshake (no Razorpay reference exists) — bridge to Razorpay Orders/Payment Links instead, disclosed clearly as the deliberate adaptation
- Not building a "smart" buyer-agent — a scripted simulator that calls your endpoints correctly is sufficient to prove the flow
- Not targeting production traffic, PCI compliance, or real card data at any point

## 4. Users

| User | Need |
|---|---|
| Buyer-agent (simulated) | Discover catalog, create/update a checkout session, complete purchase, handle rejection gracefully |
| Merchant (test persona) | Trusts the adapter to enforce bounds (max discount, max order value) and produce an audit trail |
| Judge / panelist | Needs to see: spec fidelity, explainability, bounded/gated money actions, one handled failure |

## 5. Scope — Functional Requirements

### 5.1 Discovery
- `GET /.well-known/agent.json` — capability doc: supported endpoints, spec version, auth method
- `GET /products` — catalog feed (5 SKUs minimum, reuse ARI/TaskDrift catalog data)

### 5.2 Checkout Session Lifecycle
- `POST /checkout_sessions` — create session from `line_items[]` + optional `buyer` + optional `fulfillment_address`. Returns authoritative cart: totals, tax, `payment_provider` block.
- `POST /checkout_sessions/{id}` — update session (change items/shipping/discount). Returns full refreshed cart state.
- `GET /checkout_sessions/{id}` — fetch current session state
- `POST /checkout_sessions/{id}/complete` — finalize. Triggers Razorpay order/payment-link creation, marks session `completed`, writes audit entry, fires webhook stub.
- `POST /checkout_sessions/{id}/cancel` — cancel an incomplete session

### 5.3 Guardrails (the "bounded and gated" requirement)
- Hard rule engine, not LLM-judged: max discount %, max single-order value, max quantity per line item
- Every rule check is logged with a human-readable reason (explainability)
- One deliberate failure path: buyer-agent requests a discount or amount beyond the bound → session enters `rejected` state with a logged, explained reason — **not** a silent 500 or a crash. This is your demo's "one failure handled gracefully."

### 5.4 Audit Trail
- Every state transition (`created` → `updated` → `completed`/`rejected`/`cancelled`) written to Firestore with: timestamp, actor (buyer-agent sim), action, before/after totals, and a plain-English reason if the action was blocked
- Dashboard (Next.js) to browse this trail — this is your visual proof for the demo, not just terminal logs

### 5.5 Payment Bridge (the disclosed adaptation)
- On `complete`, backend creates a Razorpay Order (test mode) scoped to the session total
- No real ACP vault-token redemption — pitch states explicitly: *"Architected so a compliant Razorpay payment handler can slot into the delegate_payment step once one exists; for this build, Razorpay Orders API stands in for that leg."*
- Reuse existing Razorpay retry/backoff logic from the Onboarding Agent codebase

## 6. Non-Functional Requirements

- Every money-touching endpoint must be idempotent (`Idempotency-Key` header honored on `POST /checkout_sessions`)
- No endpoint may silently swallow an error — every rejection returns a structured reason
- Backend: FastAPI (reuse Onboarding Agent patterns). Frontend: Next.js 14 dashboard (reuse TaskDrift stack)
- DB: Firestore (reuse Onboarding Agent setup) — one collection for sessions, one for audit log
- Deployed and publicly reachable (Cloud Run) before submission — a live demo URL beats a "run it locally" README

## 7. Data Model (core objects)

```
CheckoutSession {
  id: string
  status: "created" | "updated" | "ready_for_payment" | "completed" | "rejected" | "cancelled"
  line_items: [{ product_id, quantity, unit_price }]
  buyer: { name, email, phone } | null
  fulfillment_address: Address | null
  totals: { subtotal, discount, tax, total, currency }
  payment_provider: { provider: "razorpay", razorpay_order_id: string | null }
  created_at, updated_at: timestamp
}

AuditEntry {
  id: string
  session_id: string
  action: "create" | "update" | "complete" | "reject" | "cancel"
  actor: "buyer_agent_sim"
  reason: string        // required if action == "reject"
  before_total, after_total: number | null
  timestamp: timestamp
}
```

## 8. Success Metrics (mapped to the track's stated judging bar)

| Track bar | How this PRD satisfies it |
|---|---|
| "Every money action explainable, bounded and gated" | Rule engine + AuditEntry.reason on every transition |
| "Show the audit trail" | Dashboard reading from AuditEntry collection |
| "One failure handled gracefully" | Deliberate over-bound rejection path, demoed live |

## 9. Risks

| Risk | Mitigation |
|---|---|
| 3-day actual deadline vs 10-day plan | Days 1–3 must independently produce a submittable MVP; treat Day 4+ as stretch |
| ACP spec has no Razorpay handler — judges may see the payment bridge as "not real ACP" | Disclose the adaptation explicitly and confidently in the pitch — honesty scores better than an unexplained gap discovered live |
| Buyer-agent simulator behaving unpredictably on stage | Scripted, deterministic simulator — no live LLM calls during the demo's critical path |
| Solo build, no code review partner | Use Claude Sonnet/Opus escalation per your existing Antigravity workflow at every phase boundary |

## 10. Out of Scope / Future Work
- Real OAuth 2.0 delegated auth
- Real ACP delegate_payment vault token handshake once/if a Razorpay handler exists
- Multi-merchant support (this build = single test merchant)
