# 5-Minute Pitch Video Script & Demo Guide
> **Track 01**: AI Growth & Agentic Commerce | **Project**: Razorpay ACP Checkout Adapter

---

## ⏱️ Video Structure & Timestamps (Target: < 5:00)

| Timestamp | Segment | Visual On-Screen | Key Talking Points |
|---|---|---|---|
| **0:00 – 0:45** | **The Problem & Why ACP** | Presenter / Problem slide | Autonomous agents need a standard protocol to buy things. Without an adapter, merchants face rogue price edits, unbounded financial exposure, and zero audit trails. ACP + Razorpay solves this. |
| **0:45 – 2:00** | **Architecture & State Machine** | [`docs/architecture.md`](architecture.md) Mermaid diagrams | Walkthrough of discovery (`/.well-known/agent.json`), authoritative pricing (client prices ignored), deterministic guardrails (50% max discount, ₹50k limit), and Razorpay Order bridge on completion. |
| **2:00 – 3:15** | **Live Demo: Happy Path** | Split Screen: Terminal running `buyer_agent_sim.py` + Live Next.js Dashboard | Run Act 1 & Act 2. Watch unauthenticated discovery, session create, update quantities, 18% GST tax calculation, and completion with Razorpay Order ID (`order_...`). Show live 2s polling flash on the dashboard. |
| **3:15 – 4:00** | **Live Demo: Security & Attack Suite** | Terminal + Dashboard detail view | Run Act 3: Attack 3A (Price Tamper attempt where client `unit_price: 1.0` is authoritatively overridden) and Attack 3B (75% discount breach rejected with human-readable explainability, followed by compliant recovery). |
| **4:00 – 4:45** | **What Broke & Protocol Depth** | Presenter / Code snippet | Real story: Idempotency race conditions & agent price tampering in early lifecycle. Highlight spec depth: HMAC-signed webhooks, sliding-window rate limiting, and post-completion refunds (`/refund`). |
| **4:45 – 5:00** | **Closing & Verification** | Dashboard + GitHub repo | Summary: 49/49 unit/integration tests, spec-compliant ACP v2026-04-17 adapter, live on Cloud Run + Vercel. Ready for real agentic commerce. |

---

## 🎙️ Verbatim Script

### [0:00 – 0:45] The Problem & Why ACP
> "Hi everyone, I'm Mohan Prasath from TaskDrift. Today, AI agents are transitioning from answering queries to executing real-world commercial transactions. But if an autonomous agent interacts with a traditional e-commerce API, merchants face huge risks: rogue or hallucinated price overrides, accidental high-volume purchasing, and zero explainability when things go wrong. Direct gateway APIs cannot be safely handed to untrusted LLMs without credentials leakage and financial exposure.
> 
> We built the **Razorpay ACP Checkout Adapter** — a spec-compliant implementation of the Agentic Commerce Protocol (v2026-04-17) backed by Razorpay. It allows any autonomous buyer agent to discover products, negotiate checkout sessions, and complete payments with strictly bounded, server-authoritative money actions."

### [0:45 – 2:00] Architecture Walkthrough
> "Let's look at the architecture.
> First, the adapter exposes a machine-readable capability feed at `/.well-known/agent.json` and a product feed at `/products`.
> When an agent initializes a checkout session with `POST /checkout_sessions`, our **Authoritative Pricing Engine** strictly ignores any client-supplied unit prices, looking up SKUs in our server catalog and applying 18% GST deterministically.
> 
> Before any state transition occurs, our **Deterministic Guardrail Engine** validates critical invariants:
> 1. Maximum discount is capped at 50%.
> 2. Maximum single order value is capped at ₹50,000.
> 3. Maximum quantity per line item is capped at 10 units.
> 4. `Idempotency-Key` headers are enforced and mapped in Firestore to prevent double charging.
> 5. Sliding-window rate limiting protects the adapter from aggressive agent polling.
> 
> When the agent sends `POST /checkout_sessions/{id}/complete`, the adapter bridges directly to Razorpay's Orders API in smallest currency subunits (paise), attaches the resulting `razorpay_order_id`, writes an immutable audit record to Firestore, and dispatches an HMAC-SHA256 signed webhook event."

### [2:00 – 3:15] Live Demo: Happy Path
> "Let's see it live in action.
> On the left, I have our autonomous buyer agent simulator. On the right, our live Next.js audit dashboard.
> When I trigger `python buyer_agent_sim.py`:
> 1. In Act 1, the agent discovers our TaskDrift SKUs.
> 2. In Act 2, it creates a session with `prod_bolt_001` and `prod_bolt_004`.
> 3. It updates the cart to add a promotional discount. Notice how the subtotal, 18% tax, and total are computed authoritatively on the server.
> 4. It completes the session. The adapter creates a real test-mode Razorpay order and returns status `completed`.
> In our dashboard, the new session appears instantly with a live flash highlight, showing the attached Razorpay order ID and chronological audit entries."

### [3:15 – 4:00] Live Demo: Security & Attack Suite (Act 3)
> "Now, what happens when a rogue or buggy agent tries to attack the payment rail?
> In Act 3, we simulate two distinct attacks:
> First, the agent tries **Price Tampering** — injecting a fake `unit_price: 1.0` on a ₹499 item. The adapter ignores the client value and evaluates ₹499.0 authoritatively.
> Next, the agent tries a **Discount Breach** — requesting a 75% discount. Instead of crashing, the adapter halts the transaction with HTTP 400 `guardrail_violation`, transitions to `rejected`, and returns a human-readable explainability reason: *'Requested discount (75.2%) exceeds maximum allowed bound of 50%'*.
> Clicking 'Inspect' on the dashboard shows the exact failure reason in bright red without state corruption."

### [4:00 – 4:45] What Broke & Protocol Depth (Act 4)
> "What broke during the build?
> During our initial simulator tests, we hit a subtle idempotency replay race condition where duplicate rapid-fire session creation requests caused duplicate records before the in-memory lock settled.
> We refactored the idempotency layer with thread-safe pre-checks and atomic Firestore key mappings (`/idempotency_keys/{key}`). In Act 4, you can see the simulator send identical idempotency keys with zero duplicate orders, followed by session cancellation and a post-completion Razorpay refund via `/refund`."

### [4:45 – 5:00] Closing
> "The repository is 100% open-source, fully tested with 49/49 passing unit tests, and ready to deploy to Cloud Run and Vercel. Thank you!"
