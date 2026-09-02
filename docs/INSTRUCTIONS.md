# How To Use This Package

## Files
- `PRD.md` — what you're building and why, read once before Day 1
- `BUILD_PLAN.md` — day-by-day, task-by-task schedule with verification steps
- `prompts/day0X_TX_X.json` — 20 files, one per task, drop straight into Antigravity

## Daily loop
1. Open the day's prompt file(s) in `prompts/`
2. Feed the JSON content as your Antigravity prompt — it already has context, objective, in/out scope, and acceptance criteria baked in
3. Default model: Gemini Flash. Two tasks (`T3.1`, `T5.2`) are pre-flagged `claude-opus` — highest correctness risk (totals math, guardrail rule engine). Escalate to Sonnet on any 2+ failure loop regardless of what's flagged.
4. Do not move to the next task until the current task's `acceptance_criteria` all pass. Don't take "build passing" as done — verify live, per your own rule.
5. One prompt per task. Don't bundle T-day's two tasks into a single prompt even if related.

## Checkpoints — do not skip
- **End of Day 3:** hard MVP gate. Run the manual check in `T3.2`'s acceptance criteria. If it fails, use the Day-3 fallback in `BUILD_PLAN.md` (stub the payment leg) rather than pushing the deadline.
- **End of Day 7:** run `/code-review` workflow across everything built so far.
- **End of Day 9:** run `/understand-app` (post-completion only, per your standing rule) to generate `docs/PROJECT_MAP.md`.
- **Day 9, before wrapping:** run the `work-review` skill against the whole build for a final gaps check.

## Reality check on the deadline
Actual buildathon submission closes **Sept 5** — that's Day 3 of this 10-day plan. This package is intentionally over-scoped:
- **Days 1–3 must produce something submittable on their own.** If Razorpay's real order-creation bridge (Day 4) isn't done by Day 3, submit with T3's checkout lifecycle working and a clearly-disclosed stubbed payment completion rather than delay.
- **Days 4–10 exist for the panel interview round**, which happens after rolling shortlisting — i.e., after you've already submitted. Treat this as "keep building after you hit send," not "don't submit until Day 10."

## Things I won't fabricate for you
- I have not verified Razorpay has zero official ACP handler beyond what's publicly documented as of this search — if you find one during the build, that changes T4.1/T4.2 scope, tell me.
- The "what broke" story in T10.2 must come from something that actually happens during your build (T6.2 or T7.1 are the likely sources) — I can help you write it once it happens, I won't invent one now.
- Any numbers in your pitch video or form answers (response times, accuracy, etc.) must come from what you actually measure — don't let Antigravity's generated copy insert placeholder metrics that look real.

## If you get stuck
Come back with: which task ID, what the Antigravity output was, and what acceptance criterion failed. I'll help debug against the spec, not just re-prompt blindly.
