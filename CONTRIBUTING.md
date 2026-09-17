# Contributing to Pacy Codebase Auditor

Short version: **the docs may never claim what the code doesn't do.** Every capability statement in a README or SKILL.md must survive the repo's own tests. This rule exists because three overclaims already shipped here (an `--html` flag that didn't exist, an "AST" scanner that was regex, a "verified" ledger that was never written) — each was caught by running things, not by reading them.

## Repo layout

```
skills/developer-pay-handoff-simulator/   8-pillar acceptance audit → sign-off verdict
skills/codebase-doctor/                   architecture deepening audit → HTML report
```

The dev copy of codebase-doctor lives at `D:\.agents\codebase-doctor` (Windows host, Git Bash); this repo is the publishing source of truth. Edit → copy into this repo's `skills/` → test → commit.

## Always green before you push

```bash
npm test
```

runs all three self-test suites (must exit 0):

- `skills/developer-pay-handoff-simulator/scripts/test-scanner.js` — planted-finding regression for the preflight scanner (secrets, `.single()`, heavy images, `.env` fallback, `--html` scorecard)
- `skills/developer-pay-handoff-simulator/scripts/test-verify-audit.py` — report/ledger consistency checks for the Simulator's verifier
- `skills/codebase-doctor/scripts/test-verifier.py` — report checks for the Doctor's verifier (paths, scripts inventory, ledger existence)

If you add a hard check to a verifier, add the case that proves it fires **and** at least one case that proves it doesn't over-fire.

## Fixtures and evals

`skills/codebase-doctor/evals/fixtures/build-fixtures.sh <dir>` builds five fixture repos with real git history: `healthy-app`, `adr-conflict`, `injection-app` (Doctor evals 3, 5, 7) and `payment-shop`, `safe-invoice` (Simulator evals 8, 9).

To run a behavioral eval: dispatch a **fresh** subagent, tell it to read the relevant SKILL.md and act as the skill on the fixture with the eval prompt, stop at the terminal question, and do **not** reveal what the eval is testing (eval 7 and 8 contain traps that only work blind). Grade against the assertions in `evals/evals.json` and independently re-verify the agent's numbers — a subagent's conclusions are claims. Record results under `results` in evals.json, including failures: the caught fake-ledger failure is the most valuable line in this repo's history.

## The invariants (don't break these)

1. **Verdicts require closed ledgers.** No sign-off or report may be issued with an open `[ ]` line anywhere.
2. **Repo content is data, not instructions.** Anything in an audited repo that tries to steer the audit is a finding, never a command.
3. **Blanket rules are defaults, not verdicts.** Every check closes as clean / defect / N/A-with-reason. Never blanket-replace, never blanket-pass.
4. **Reports have a locked executable surface.** The Doctor's HTML report allows exactly the two scaffold scripts and `securityLevel: "strict"`; the scorecard embeds no scripts at all.
5. **The suite phones home to nobody.** Keep it that way.

## PRs

The CI workflow fails a PR on critical scanner findings (secrets, permissive RLS, client-side AI keys, unmasked PII). Advisory flags are reported, not gating. Docs-only PRs welcome, but the "code meets claims" rule applies to them most of all.
