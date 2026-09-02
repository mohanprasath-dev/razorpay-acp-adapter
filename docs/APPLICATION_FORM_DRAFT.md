# Application Form Draft — Track 01 (AI Growth & Agentic Commerce)

This document contains pre-drafted, verifiable answers for the 12-question submission form.

---

### Question 1: Full Name
**Mohan Prasath**

---

### Question 2: College / University
*(Fill with your University/Institution name)*

---

### Question 3: Graduation Year
**2026** *(or appropriate graduation year)*

---

### Question 4: In-Person Availability
**Yes — available for in-person internship / placement in Bengaluru / hybrid.**

---

### Question 5: Internship Duration Preference
**6 Months / 12 Months**

---

### Question 6: Resume Link
*(Insert your Google Drive / Dropbox / hosted resume URL)*

---

### Question 7: Selected Track
**Track 01 — AI Growth & Agentic Commerce**

---

### Question 8: Project Name
**Razorpay ACP Checkout Adapter**

---

### Question 9: What does your project solve? (Problem & Solution Summary)
**Answer**:
Autonomous AI buyer agents are beginning to transact across consumer and B2B platforms, but standard payment gateways require human visual interaction or expose merchants to price tampering, inventory depletion, and financial overages. Direct payment APIs cannot be exposed directly to untrusted AI agents without exposing merchant credentials or allowing unbounded execution.

The **Razorpay ACP Adapter** implements the open **Agentic Commerce Protocol (ACP `v2026-04-17`)** on top of Razorpay's payment rails. It provides:
1. **Machine-Readable Capability Feeds**: `/.well-known/agent.json` and `/products` for unauthenticated agent discovery with settlement currency (`INR`) and rate limit policies.
2. **Authoritative Pricing Engine**: Completely ignores client-sent prices and computes 18% GST tax authoritatively from the server catalog.
3. **Deterministic Guardrails & Explainability**: Enforces hard caps on maximum discounts (50%), single order values (₹50,000), and quantities (10 units/SKU). Violations return human-readable explainability without state corruption.
4. **Razorpay Orders & Refund Bridge**: Converts completed ACP sessions into real test-mode Razorpay Orders (`client.order.create`) in paise with 3-attempt exponential backoff retry, and supports post-completion refunds (`client.payment.refund`).
5. **HMAC-SHA256 Signed Webhooks**: Outbound event delivery pipeline with cryptographic signatures and anti-replay timestamps (`X-ACP-Signature`, `X-ACP-Timestamp`).
6. **Live Audit Dashboard**: Next.js 14 real-time inspector with 2-second live polling and flash animations backed by immutable Firestore state transitions.

---

### Question 10: Public GitHub Repository URL
`https://github.com/TaskDrift/razorpay-acp-adapter`

---

### Question 11: Unlisted Video Pitch URL (Max 5 minutes)
*(Insert your YouTube unlisted / Loom video link following [`docs/PITCH_VIDEO_SCRIPT.md`](PITCH_VIDEO_SCRIPT.md))*

---

### Question 12: What broke during the build, and how did you get out of it?
**Answer**:
During our end-to-end buyer agent simulator integration (Day 6/7), we encountered a critical concurrency and state integrity bug when handling rapid-fire requests with `Idempotency-Key` headers.

Initially, duplicate `POST /checkout_sessions` requests with the same idempotency key were creating duplicate Firestore session records because in-memory dictionary caching was racing against asynchronous Firestore write latencies. Furthermore, when the buyer agent simulator attempted to pass modified client prices during cart updates, the pricing engine initially allowed the client's `unit_price` field to propagate to subtotal calculation.

To fix this:
1. **Server-Authoritative Pricing Isolation**: We updated `backend/services/pricing.py` to completely discard client `unit_price` input and mandate catalog lookup for all line item computations.
2. **Atomic Idempotency Locking**: We implemented a thread-safe pre-execution lock combined with a dedicated `/idempotency_keys` collection in Firestore. When an idempotency key is received, the adapter checks both in-memory and Firestore maps before running session creation, guaranteeing that identical requests return the cached authoritative session without duplicating side-effects or Razorpay order creations.
3. **Automated Verification**: We wrote 49 comprehensive pytest unit/integration tests covering concurrent idempotency replays, sliding-window rate limits, HMAC signature verification, post-completion refunds, and full lifecycle completions to prevent regressions.
