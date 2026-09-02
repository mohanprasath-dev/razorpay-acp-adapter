# Build Plan — 10 Days / 240 Hours Max
24h/day budget, 2 focused tasks/day (~12h each). Each task = one Antigravity prompt file (see `/prompts`), matching your one-focused-prompt-per-task-area rule.

**Deadline reality check:** actual submission closes Sept 5. That's Day 3 of this plan. Day 3 checkpoint below is your real submission gate — it must stand alone. Days 4–10 are for panel-interview depth, done after submitting.

| Day | Task ID | Task | Deliverable | Verify |
|---|---|---|---|---|
| 1 | T1.1 | Repo scaffold — FastAPI backend, Next.js dashboard skeleton, Razorpay test keys wired, Firestore connected | Boots locally, `/health` returns 200 | `curl localhost:8000/health` |
| 1 | T1.2 | Pydantic data models for CheckoutSession, LineItem, Buyer, Address, AuditEntry per PRD §7 | Models importable, unit-testable | `pytest` on model validation |
| 2 | T2.1 | `GET /.well-known/agent.json` + `GET /products` | Both return valid JSON, no auth | curl both, check schema |
| 2 | T2.2 | Seed catalog (5 SKUs, reuse ARI/TaskDrift product data) | `/products` returns real data, not placeholders | Manual check against PRD |
| 3 | T3.1 | `POST /checkout_sessions` — create, compute totals, return authoritative cart | Returns 201 + correct totals | Test 3 cart combos |
| 3 | T3.2 | `POST /checkout_sessions/{id}` update + `GET /checkout_sessions/{id}` | Update reflects in totals; GET matches last state | **DAY 3 CHECKPOINT — this + T1–T3.1 is your minimum submittable MVP** |
| 4 | T4.1 | Razorpay Order creation bridge on `complete` | Real test-mode Razorpay order ID returned | Check Razorpay dashboard test order appears |
| 4 | T4.2 | `POST /checkout_sessions/{id}/complete` full flow | Session → `completed`, audit entry written | End-to-end curl sequence |
| 5 | T5.1 | `POST /checkout_sessions/{id}/cancel` | Session → `cancelled`, audit entry written | curl test |
| 5 | T5.2 | Guardrail rule engine + audit logging layer (Firestore) | Over-bound request → `rejected` with logged reason, not a crash | Trigger deliberate violation, inspect Firestore doc |
| 6 | T6.1 | Scripted buyer-agent simulator (Python) — walks create→update→complete | Runs headless, produces log of full flow | `python buyer_agent_sim.py` completes without error |
| 6 | T6.2 | End-to-end integration pass, fix bugs found by T6.1 | All 7 endpoints work in sequence, no manual patching | Full simulator run, zero manual intervention |
| 7 | T7.1 | Deliberate failure path — buyer-agent sim tries an over-bound action, adapter rejects gracefully, reuses your Razorpay retry/backoff pattern where relevant | Rejection logged with human-readable reason, demo-able live | Run simulator with a forced violation |
| 7 | T7.2 | Idempotency-Key handling on `POST /checkout_sessions` | Duplicate key = same session returned, not duplicate | Send same request twice, check no duplicate created |
| 8 | T8.1 | Next.js audit-trail dashboard — list sessions, statuses, rejected actions + reasons | Renders live Firestore data | Manual browse, confirm rejection reasons visible |
| 8 | T8.2 | Deploy backend (Cloud Run) + dashboard (Vercel) | Public URLs live | Hit both from outside your network |
| 9 | T9.1 | README, architecture diagram, run `/understand-app` → `docs/PROJECT_MAP.md` | Repo readable by a stranger in 10 min | Have someone else (or fresh Claude session) read it cold |
| 9 | T9.2 | Repo cleanup for public view, license, `.env.example`, final QA pass | Public repo, no secrets committed | `git log`, secret-scan the repo |
| 10 | T10.1 | 5-min pitch video script + recording | Video covers: problem, why ACP, architecture, live demo incl. the rejection case, what broke | Watch it back, cut anything over 5 min |
| 10 | T10.2 | Application form 12-answer draft, "what broke and how you got out" story (real, from T6/T7), final submission | Form submitted before Sept 5 deadline | Submitted confirmation |

## Model routing per your existing workflow
- Default: Gemini Flash for all task prompts
- Escalate to Claude Sonnet on any failure/bug loop past 2 attempts
- Claude Opus reserved for T3.1 (totals/guardrail logic — highest correctness risk) and T5.2 (rule engine) if Sonnet stalls
- Run `/code-review` workflow at end of Day 3, Day 7, and Day 9
- Run `webapp-testing` skill (Playwright) to verify the dashboard visually after T8.1

## Hard stop rule
If by end of Day 3 the MVP (T1–T3) isn't working end-to-end, cut T4's real Razorpay bridge and submit with a mocked payment completion instead — a working spec-compliant checkout lifecycle with a stubbed payment leg beats a broken real one. Disclose the stub honestly in the form.
