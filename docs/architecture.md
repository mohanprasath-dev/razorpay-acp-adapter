# Architecture & Protocol Design — AgentPay Bridge

> **ACP-compliant checkout adapter for autonomous AI buyer agents.**  
> *Payment rail: Razorpay Orders API.*

This document details the architectural layout, component interactions, and state transition machine of **AgentPay Bridge**.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph BuyerAgent["Autonomous Buyer Agent Ecosystem"]
        Agent[Autonomous Buyer Agent / Simulator]
    end

    subgraph AgentPayBridge["AgentPay Bridge (FastAPI Adapter)"]
        Discovery[Discovery Router\n/.well-known/agent.json\n/products]
        CheckoutRouter[Checkout Session Router\n/checkout_sessions/*]
        Guardrails[Deterministic Guardrail Engine\n- Max 50% discount\n- Max Rs 50,000 order\n- Max 10 units/SKU]
        Pricing[Authoritative Pricing Engine\n- Server catalog lookup\n- 18% GST tax calc]
        Idempotency[Idempotency Layer\n- Key cache & Firestore lock]
        InventoryMutex[Inventory Soft-Hold Mutex\n- 30-min TTL reservations\n- /internal/sweep_expired]
        AnomalyEngine[Anomaly Scoring Engine\n- Sliding-window heuristic\n- Velocity & cart deviations]
        RazorpayBridge[Razorpay Payment Rail Bridge\n- Order creation in paise\n- Post-completion refunds]
        WebhookService[Cryptographic Webhook Engine\n- Inbound HMAC validation\n- Outbound signed events & DLQ]
        AuditService[Audit Logging Service\n- Immutable event stream]
    end

    subgraph DataAndPayment["External Rails & Persistence"]
        Firestore[(Google Cloud Firestore\nImmutable Audit, Sessions & Keys)]
        RazorpayAPI[Razorpay API Gateway\nTest Mode Orders & Refunds]
    end

    subgraph Dashboard["Operator UI"]
        NextDashboard[Next.js 14 Operator Console\nReal-time 3D Telemetry & Audit Stream]
    end

    %% Flow connections
    Agent -->|1. Capabilities & Catalog Discovery| Discovery
    Agent -->|2. Create / Mutate / Complete Session| CheckoutRouter
    CheckoutRouter --> Idempotency
    CheckoutRouter --> Pricing
    CheckoutRouter --> InventoryMutex
    CheckoutRouter --> Guardrails
    Guardrails -->|On Violation| AuditService
    Guardrails -->|On Valid| RazorpayBridge
    RazorpayBridge -->|Create Order / Refund| RazorpayAPI
    RazorpayAPI -->|Signed Webhook Callbacks| WebhookService
    WebhookService --> AuditService
    AuditService --> Firestore
    NextDashboard -->|Fetch Sessions & Audit Stream| CheckoutRouter
    NextDashboard -->|Live Telemetry Poll| Firestore
```

---

## 2. Checkout Session Deterministic State Machine (FSM)

The checkout session implements a deterministic finite state machine (FSM) with atomic transitions:

```mermaid
stateDiagram-v2
    [*] --> created: POST /checkout_sessions (Valid, Partial Buyer/Address)
    [*] --> ready_for_payment: POST /checkout_sessions (Valid, Full Buyer + Address)
    [*] --> rejected: POST /checkout_sessions (Guardrail Breach or Stock Depleted)
    
    created --> updated: POST /checkout_sessions/{id} (Partial Info Mutation)
    created --> ready_for_payment: POST /checkout_sessions/{id} (Full Buyer + Address Added)
    created --> rejected: POST /checkout_sessions/{id} (Guardrail Breach or Stock Depleted)
    created --> cancelled: POST /checkout_sessions/{id}/cancel OR 30-Min TTL Sweeper
    created --> completed: POST /checkout_sessions/{id}/complete (Fallback)
    
    updated --> updated: POST /checkout_sessions/{id} (Partial Info Mutation)
    updated --> ready_for_payment: POST /checkout_sessions/{id} (Full Buyer + Address Added)
    updated --> rejected: POST /checkout_sessions/{id} (Guardrail Breach or Stock Depleted)
    updated --> cancelled: POST /checkout_sessions/{id}/cancel OR 30-Min TTL Sweeper
    updated --> completed: POST /checkout_sessions/{id}/complete (Fallback)

    ready_for_payment --> ready_for_payment: POST /checkout_sessions/{id} (Item/Discount Mutation)
    ready_for_payment --> rejected: POST /checkout_sessions/{id} (Guardrail Breach)
    ready_for_payment --> cancelled: POST /checkout_sessions/{id}/cancel OR 30-Min TTL Sweeper
    ready_for_payment --> completed: POST /checkout_sessions/{id}/complete (Atomic Order Bridge)

    completed --> refunded: Post-Completion Refund (/refund or Webhook)
    completed --> [*]: Terminal (Order Captured & Inventory Committed)
    rejected --> [*]: Terminal (Breach Logged in Audit Trail)
    cancelled --> [*]: Terminal (Stock Released by Sweeper or Agent)
    refunded --> [*]: Terminal (Paise Credited via Razorpay)
```

---

## 3. Core Component Breakdown

### A. Discovery Layer (`backend/routers/discovery.py`)
- **`GET /.well-known/agent.json`**: Implements machine-readable ACP capability feed disclosing supported versions (`v2026-04-17`), operations (`checkout_sessions`, `products`), settlement currency (`INR`), rate limit guidelines, and payment provider (`razorpay`).
- **`GET /products`**: Authoritative server-side SKU catalog containing pricing, descriptions, currency, and stock levels.

### B. Authoritative Pricing Engine (`backend/services/pricing.py`)
- **Server Price Invariance**: Completely ignores client-supplied `unit_price` fields in incoming payloads to prevent price tampering attacks by rogue or hallucinating agents.
- **Deterministic Math**: Calculates Subtotal from server catalog, applies validated discount amounts, computes 18% GST standard tax, and derives final authoritative `total`.

### C. Deterministic Guardrail Engine (`backend/services/guardrails.py`)
- **Max Discount Constraint**: Reject if discount exceeds 50% of subtotal.
- **Max Order Value Constraint**: Reject if total exceeds Rs 50,000 INR.
- **Max Quantity Constraint**: Reject if any line item quantity exceeds 10 units.
- **Explainability**: On breach, transitions session to `rejected` state with an explicit human-readable violation reason logged immutably.

### D. Inventory Soft-Hold Mutex & TTL Sweeper (`backend/services/inventory.py` & `backend/services/sweeper.py`)
- **Atomic Reservations**: Line items reserve available stock upon session creation/update.
- **30-Minute Soft-Hold TTL**: Sessions hold stock for up to 30 minutes.
- **Automated Sweeper**: `POST /internal/sweep_expired` scans inactive sessions, releases held stock back to available inventory, and transitions expired sessions to `cancelled`.

### E. Razorpay Payment Rail Bridge (`backend/services/razorpay_service.py`)
- On `POST /checkout_sessions/{id}/complete`, interacts with Razorpay Orders API (`client.order.create`).
- Converts amount to smallest currency subunit (paise: `amount * 100`) with exponential retry backoff.
- Attaches the resulting `order_id` (e.g. `order_RvXy123...`) to `session.payment_provider.razorpay_order_id`.
- Supports post-completion refunds via `client.payment.refund`.

### F. Cryptographic Webhook Engine (`backend/routers/webhooks.py` & `backend/services/webhook_service.py`)
- **Inbound Verification**: Validates incoming Razorpay payment capture/refund webhooks using `hmac.compare_digest` against `X-Razorpay-Signature`.
- **Outbound Dispatch**: Dispatches signed events (`checkout.completed`, `checkout.rejected`, `checkout.refunded`) to registered agent endpoints with `X-ACP-Signature` (HMAC-SHA256) and `X-ACP-Timestamp`.
- **Dead-Letter Queue (DLQ)**: Retries failed delivery 3 times with exponential backoff before persisting to `/webhooks/agent/dead_letter`.

### G. Immutable Audit Logging Layer (`backend/services/audit.py`)
- Records structured `AuditEntry` objects (`id`, `session_id`, `action`, `actor`, `reason`, `before_total`, `after_total`, `timestamp`).
- Persists synchronously to Google Cloud Firestore native collections.
