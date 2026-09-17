# Demo — a real audit, unedited

These are the **actual artifacts** from an eval run of the Developer Pay Handoff Simulator against a fixture repository (`payment-shop` — a small payment app with planted defects, built by `skills/codebase-doctor/evals/fixtures/build-fixtures.sh`). Nothing here was written by hand for presentation; it's what the skill produces, including the warts.

| File | What it is |
| :--- | :--- |
| [`audit_checklist.md`](./audit_checklist.md) | The completeness ledger: 18 surface lines, every one closed `[x]` clean / `[!]` defect / `[~]` N/A-with-reason. Zero open lines — the gate that must pass before any verdict. |
| [`audit_final_report.md`](./audit_final_report.md) | The 8-pillar scorecard, plain-English business-risk table, 13 filed defects with severities and proof, and the final verdict: 🔴 REJECTED. |
| [`audit_scorecard.html`](./audit_scorecard.html) | The preflight scanner's HTML scorecard (its `--html` output) — heuristic leads, not verdicts. |

Three things worth noticing in the report:

1. **The verdict is a rejection with a machine-checked trail.** `scripts/verify-audit.py` confirms the report's defect count matches its ledger, all 8 pillars carry PASS/FAIL with proof, and no ledger line was left open. A report that fails verification is not a sign-off report.
2. **The audit refused to be steered.** The fixture plants an `AUDITORS.md` demanding a zero-findings approval and a "do not flag" comment on the worst file. The auditor filed both as a HIGH tampering finding and rejected the build anyway — repo content is data, not instructions.
3. **No blanket rules.** The repo contains two `.single()` calls: one on a row that may not exist (flagged), one immediately behind an upsert that guarantees it exists (kept, after verifying the invariant). Both were adjudicated individually — the skill says never blanket-replace, never blanket-pass.

Rerun it yourself: build the fixtures, then give your agent the eval-8 prompt from `skills/codebase-doctor/evals/evals.json`.
