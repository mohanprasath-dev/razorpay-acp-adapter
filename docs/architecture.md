# Architecture & Protocol Design — AgentPay Bridge

> **ACP-compliant checkout adapter for autonomous AI buyer agents.**  
> *Payment rail: Razorpay Orders API.*

This document details the architectural layout, component interactions, deterministic finite state machine (FSM), and security boundaries of **AgentPay Bridge**.

---

## 1. High-Level System Architecture

![System Architecture Diagram](images/architecture-system.png)

```mermaid
flowchart TD
    subgraph BuyerAgent["Autonomous Buyer Agent Ecosystem"]
        Agent[Autonomous Buyer Agent / Simulator]
    end

    subgraph AgentPayBridge["AgentPay Bridge (FastAPI Adapter)"]
        Discovery[Discovery Router\n/.well-known/agent.json\n/products]
        CheckoutRouter[Checkout Session Router\n/checkout_sessions/*]
        Guardrails[Deterministic Guardrail Engine\n- Max 50% discount\n- Max Rs 50,000 order\n- Max 10 units/SKU]
        Pricing[Authoritative Pricing Engine\n- Server catalog lookup\n- GST tax slabs & pre-tax discounts]
        Idempotency[Idempotency & Concurrency Layer\n- Key deduplication cache\n- Thread-safe & Firestore locks]
        InventoryMutex[Inventory Soft-Hold Mutex\n- 30-min TTL reservations\n- /internal/sweep_expired]
        AnomalyEngine[Behavioral Anomaly Scoring Engine\n- Sliding-window velocity & spend\n- Rate limiter 120 req/min]
        RazorpayBridge[Razorpay Payment Rail Bridge\n- Order creation in paise\n- Post-completion refunds]
        WebhookService[Cryptographic Webhook Engine\n- Inbound HMAC validation\n- Outbound signed events & DLQ]
        AuditService[Audit Logging Service\n- Immutable event stream]
    end

    subgraph DataAndPayment["External Rails & Persistence"]
        Firestore[(Google Cloud Firestore\nSessions, Audit, Keys & DLQ)]
        RazorpayAPI[Razorpay API Gateway\nTest Mode Orders & Refunds]
    end

    subgraph Dashboard["Operator Console"]
        NextDashboard[Next.js 14 Operator Console\nReal-time 3D Telemetry & Audit Stream]
    end

    %% Flow connections
    Agent -->|1. Capabilities & Catalog Discovery| Discovery
    Agent -->|2. Create / Mutate / Complete Session| CheckoutRouter
    CheckoutRouter --> Idempotency
    CheckoutRouter --> Pricing
    CheckoutRouter --> InventoryMutex
    CheckoutRouter --> Guardrails
    CheckoutRouter --> AnomalyEngine
    Guardrails -->|On Breach / Reject| AuditService
    Guardrails -->|On Valid Intent| RazorpayBridge
    RazorpayBridge -->|Create Order / Refund| RazorpayAPI
    RazorpayAPI -->|Signed Inbound Webhooks| WebhookService
    WebhookService --> AuditService
    AuditService --> Firestore
    NextDashboard -->|Fetch Sessions, Audit Stream & Telemetry| CheckoutRouter
```

---

## 2. Checkout Session Deterministic State Machine (FSM)

![Checkout Session FSM](images/architecture-fsm.png)

The checkout session implements a deterministic finite state machine (FSM) with atomic transitions and explicit intermediate states:

```mermaid
stateDiagram-v2
    [*] --> created: POST /checkout_sessions (Valid, 30-Min Stock Soft-Hold Reserved)
    [*] --> rejected: POST /checkout_sessions (Guardrail Breach or Stock Depleted)
    
    created --> updated: POST /checkout_sessions/{id} (Partial Cart / Address Mutation)
    created --> ready_for_payment: POST /checkout_sessions/{id} /payment_method (Buyer, Address & Token Attached)
    created --> rejected: POST /checkout_sessions/{id} (Guardrail Breach or Stock Depleted)
    created --> cancelled: POST /checkout_sessions/{id}/cancel OR 30-Min TTL Sweeper
    created --> completed: POST /checkout_sessions/{id}/complete (Fallback / Immediate Execution)
    
    updated --> updated: POST /checkout_sessions/{id} (Cart / Address Mutation)
    updated --> ready_for_payment: POST /checkout_sessions/{id} /payment_method (Buyer, Address & Token Attached)
    updated --> rejected: POST /checkout_sessions/{id} (Guardrail Breach or Stock Depleted)
    updated --> cancelled: POST /checkout_sessions/{id}/cancel OR 30-Min TTL Sweeper
    updated --> completed: POST /checkout_sessions/{id}/complete (Fallback / Immediate Execution)

    ready_for_payment --> ready_for_payment: POST /checkout_sessions/{id} (Cart Mutation While Ready)
    ready_for_payment --> updated: POST /checkout_sessions/{id} (Buyer/Address Cleared or Modified)
    ready_for_payment --> rejected: POST /checkout_sessions/{id} (Guardrail Breach or Stock Depleted)
    ready_for_payment --> cancelled: POST /checkout_sessions/{id}/cancel OR 30-Min TTL Sweeper
    ready_for_payment --> completed: POST /checkout_sessions/{id}/complete (Atomic Razorpay Order Creation)

    completed --> refunded: Post-Completion Refund (/refund or Inbound Webhook)
    completed --> [*]: Terminal (Order Captured & Inventory Committed)
    rejected --> [*]: Terminal (Breach Logged in Immutable Audit Stream)
    cancelled --> [*]: Terminal (Stock Released by Sweeper or Agent)
    refunded --> [*]: Terminal (Paise Credited via Razorpay)
```

---

## 3. Core Component Breakdown

### A. Discovery Layer (`backend/routers/discovery.py`)
- **`GET /.well-known/agent.json`**: Implements machine-readable ACP capability feed disclosing supported versions (`v2026-04-17`), operations (`checkout_sessions`, `products`), settlement currency (`INR`), rate limit guidelines, and payment provider (`razorpay`).
- **`GET /products`**: Authoritative server-side SKU catalog containing pricing, descriptions, currency, tax rates, categories, and live available stock.

### B. Authoritative Pricing Engine (`backend/services/pricing.py`)
- **Server Price Invariance**: Completely ignores client-supplied `unit_price` fields in incoming payloads to eliminate prompt injection, hallucination, or client price tampering.
- **Deterministic Math**: Calculates subtotal from server catalog, allocates discounts proportionally pre-tax across line items, applies item-specific GST tax slabs (12%, 18%, 28%, defaulting to 18%), and generates itemized `tax_breakdown` with authoritative `total`.

### C. Deterministic Guardrail Engine (`backend/services/guardrails.py`)
- **Max Discount Constraint**: Reject if discount exceeds 50% of subtotal.
- **Max Order Value Constraint**: Reject if order total exceeds Rs 50,000 INR.
- **Max Quantity Constraint**: Reject if any line item quantity exceeds 10 units.
- **Explainability**: On breach, transitions session to `rejected` state with an explicit human-readable violation reason logged immutably in the audit trail.

### D. Inventory Soft-Hold Mutex & TTL Sweeper (`backend/services/inventory.py` & `backend/routers/internal.py`)
- **Atomic Reservations**: Line items soft-hold available stock upon session creation/update using thread locks and Firestore transactions.
- **30-Minute Soft-Hold TTL**: Sessions hold stock for up to 30 minutes.
- **Automated Sweeper**: `POST /internal/sweep_expired` scans inactive sessions where `now > expires_at`, releases held stock back to available inventory, transitions expired sessions to `cancelled`, and records audit entries.

### E. Razorpay Payment Rail Bridge (`backend/services/razorpay_service.py`)
- On `POST /checkout_sessions/{id}/complete`, interacts with Razorpay Orders API (`client.order.create`).
- Converts amount to smallest currency subunit (paise: `int(round(amount * 100))`) with exponential retry backoff.
- Attaches the resulting `order_id` (e.g. `order_RvXy123...`) to `session.payment_provider.razorpay_order_id`.
- Supports post-completion refunds via `client.payment.refund` on `POST /checkout_sessions/{id}/refund`.

### F. Cryptographic Webhook Engine (`backend/routers/webhooks.py` & `backend/services/webhook.py`)
- **Inbound Verification**: Validates incoming Razorpay payment capture/refund webhooks using `hmac.compare_digest` against `X-Razorpay-Signature`.
- **Outbound Dispatch**: Dispatches signed events (`checkout_session.created`, `checkout_session.completed`, etc.) to registered agent endpoints with `X-ACP-Signature` (HMAC-SHA256) and `X-ACP-Timestamp`.
- **Dead-Letter Queue (DLQ)**: Retries failed delivery 3 times with exponential backoff before persisting to the `dead_letter_events` collection (inspectable via `GET /dead_letter_events`).

### G. Immutable Audit Logging Layer (`backend/services/audit.py`)
- Records structured `AuditEntry` objects (`id`, `session_id`, `action`, `actor`, `reason`, `before_total`, `after_total`, `timestamp`).
- Persists synchronously to Google Cloud Firestore native collections with in-memory thread-safe fallback.

### H. Behavioral Anomaly Scoring & Rate Limiting (`backend/services/anomaly.py` & `backend/services/rate_limiter.py`)
- **Sliding-Window Rate Limiter**: Enforces a 120 req/min cap per IP with standard `Retry-After` HTTP 429 headers.
- **Heuristic Anomaly Scoring**: Tracks 60s session velocity, 120s guardrail violation spikes, and spend burst patterns. Flags sessions with `is_anomalous = True` when score $\ge 70$, and hard-blocks abusive agents with HTTP 400 when score $\ge 90$.

### I. Idempotency & Concurrency Layer (`backend/routers/checkout.py`)
- Intercepts `Idempotency-Key` headers on session mutations, caching hashed keys to session IDs.
- Prevents duplicate order placement and double inventory reservations under rapid network retries.
