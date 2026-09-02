# Architecture & Protocol Design — Razorpay ACP Adapter

This document details the architectural layout, component interactions, and state transition machine of the **Razorpay ACP (Agentic Commerce Protocol) Checkout Adapter**.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph BuyerAgent["Autonomous Buyer Agent Ecosystem"]
        Agent[Autonomous Buyer Agent / Simulator]
    end

    subgraph ACPAdapter["Razorpay ACP Adapter (FastAPI)"]
        Discovery[Discovery Router\n/.well-known/agent.json\n/products]
        CheckoutRouter[Checkout Session Router\n/checkout_sessions/*]
        Guardrails[Guardrail Rule Engine\n- Max 50% discount\n- Max ₹50,000 order\n- Max 10 units/SKU]
        Pricing[Authoritative Pricing Engine\n- Catalog price lookup\n- 18% GST tax calc]
        Idempotency[Idempotency Layer\n- Key cache & deduplication]
        RazorpayBridge[Razorpay Payment Rail Bridge\n- Order creation on complete]
        AuditService[Audit Logging Service\n- Immutable event stream]
    end

    subgraph DataAndPayment["External Rails & Persistence"]
        Firestore[(Google Cloud Firestore\nImmutable Audit & Sessions)]
        RazorpayAPI[Razorpay API Gateway\nTest Mode Orders]
    end

    subgraph Dashboard["Live Monitoring & Verification"]
        NextDashboard[Next.js 14 Audit Dashboard\nSession & Violation Inspector]
    end

    %% Flow connections
    Agent -->|1. Capabilities & Catalog Discovery| Discovery
    Agent -->|2. Create / Update / Complete Session| CheckoutRouter
    CheckoutRouter --> Idempotency
    CheckoutRouter --> Pricing
    CheckoutRouter --> Guardrails
    Guardrails -->|On Violation| AuditService
    Guardrails -->|On Valid| RazorpayBridge
    RazorpayBridge -->|Create Order| RazorpayAPI
    AuditService --> Firestore
    NextDashboard -->|Fetch Sessions & Audit Trail| CheckoutRouter
    NextDashboard -->|Read Live Stream| Firestore
```

---

## 2. Checkout Session State Machine

The checkout session implements a deterministic finite state machine (FSM):

```mermaid
stateDiagram-v2
    [*] --> created: POST /checkout_sessions (Passes Guardrails, Partial Info)
    [*] --> ready_for_payment: POST /checkout_sessions (Passes Guardrails, Full Buyer + Address)
    [*] --> rejected: POST /checkout_sessions (Fails Guardrails or Out of Stock)
    
    created --> updated: POST /checkout_sessions/{id} (Partial Info)
    created --> ready_for_payment: POST /checkout_sessions/{id} (Full Buyer + Address)
    created --> rejected: POST /checkout_sessions/{id} (Fails Guardrails or Out of Stock)
    created --> cancelled: POST /checkout_sessions/{id}/cancel
    created --> completed: POST /checkout_sessions/{id}/complete (Fallback)
    
    updated --> updated: POST /checkout_sessions/{id} (Partial Info)
    updated --> ready_for_payment: POST /checkout_sessions/{id} (Full Buyer + Address)
    updated --> rejected: POST /checkout_sessions/{id} (Fails Guardrails or Out of Stock)
    updated --> cancelled: POST /checkout_sessions/{id}/cancel
    updated --> completed: POST /checkout_sessions/{id}/complete (Fallback)

    ready_for_payment --> ready_for_payment: POST /checkout_sessions/{id} (Passes Guardrails)
    ready_for_payment --> rejected: POST /checkout_sessions/{id} (Fails Guardrails or Out of Stock)
    ready_for_payment --> cancelled: POST /checkout_sessions/{id}/cancel
    ready_for_payment --> completed: POST /checkout_sessions/{id}/complete (Atomic Stock Decrement & Razorpay Order)

    completed --> [*]: Terminal (Razorpay Order Attached & Stock Decremented)
    rejected --> [*]: Terminal (Violation or Out of Stock Logged in Audit)
    cancelled --> [*]: Terminal (Explicit Agent Cancellation)
```

---

## 3. Component Breakdown

### A. Discovery Layer (`backend/routers/discovery.py`)
- **`GET /.well-known/agent.json`**: Implements machine-readable ACP capability feed disclosing supported versions, operations (`checkout_sessions`, `products`), currency (`INR`), and payment providers (`razorpay`).
- **`GET /products`**: Authoritative server-side SKU catalog containing pricing, currency, descriptions, and stock status.

### B. Authoritative Pricing Engine (`backend/services/pricing.py`)
- **Server Price Invariance**: Completely ignores client-supplied `unit_price` fields in incoming payloads to prevent price manipulation attacks by rogue agents.
- **Deterministic Math**: Calculates Subtotal, applies validated discount, computes 18% GST standard tax, and computes final `total`.

### C. Guardrail Rule Engine (`backend/services/guardrails.py`)
- **Max Discount Constraint**: Reject if discount > 50% of subtotal.
- **Max Order Value Constraint**: Reject if total > ₹50,000 INR.
- **Max Quantity Constraint**: Reject if any line item quantity > 10 units.
- **State Preservation**: On violation, session is moved to `rejected` state with an explicit human-readable rejection reason logged to the audit log.

### D. Razorpay Payment Rail Bridge (`backend/services/razorpay_service.py`)
- On `POST /checkout_sessions/{id}/complete`, interacts with Razorpay Orders API (`client.order.create`).
- Converts amount to smallest currency subunit (paise: `amount * 100`).
- Attaches the resulting `order_id` (e.g. `order_RvXy123...`) to `session.payment_provider.razorpay_order_id` and dispatches an ACP outbound webhook stub.

### E. Immutable Audit Logging Layer (`backend/services/audit.py`)
- Records structured `AuditEntry` objects (`id`, `session_id`, `action`, `actor`, `reason`, `before_total`, `after_total`, `timestamp`).
- Persists synchronously to Google Cloud Firestore native collections.
