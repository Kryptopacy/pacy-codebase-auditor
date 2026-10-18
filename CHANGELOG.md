# Changelog

All notable changes to the Pacy Codebase Auditor suite are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.5.0] — 2026-10-18

### Added
- **Pillar 13: Accessibility & Internationalization.** Accessibility is base for every
  profile that renders a UI (keyboard path, visible focus, native semantics, programmatic
  labels and alt text, announced state changes, WCAG AA contrast, reduced motion,
  zoom/reflow). Internationalization is contract-driven (externalized strings with key
  parity, `Intl` locale formatting, timezone display, pluralization, RTL mirroring).
  Profile C adds contractual WCAG AA conformance evidence.
- Six scanner heuristics: images without alt, clickable non-interactive elements,
  form fields without programmatic labels, removed focus outlines, root `<html>`
  without `lang`, locale-less date/number formatting. `.css`/`.scss` files are now scanned.
- Fixture `a11y-gap` and blind eval 13 (15/15 assertions; controls held; RTL closed
  N/A honestly; bonus finds: unsupplied-prop crash, dead submit, npm audit criticals).

## [1.4.0] — 2026-10-18

### Added
- **Pillar 11: Reliability & Ops** (outbound timeouts, bounded retries with backoff,
  dead-letter path, idempotent single-flight background work, CI test gating, rollback
  and deploy safety, infrastructure as code, cost alerts, written and exercised DR plan).
- **Pillar 12: Observability & On-call** (structured searchable logs, grouped error
  tracking, external uptime checks with a real health endpoint, owned and tuned alerts,
  dashboards, tracing, runbooks, postmortems, status page).
- Seven scanner heuristics (no-timeout outbound calls, unbounded retry loops, cron
  without distributed lock, tests not gated in CI, missing error tracking, missing
  health endpoint, console-only logging).
- Fixture `ops-gap` and blind eval 12 — run twice: the first run correctly refused a
  stubbed `acquireLock()` control, so the fixture was fixed to a real Postgres advisory
  lock and the eval re-run blind (14/14 assertions).

### Fixed
- Structured-logging check joined file *paths* as if they were source text and could
  never fire (found by the new self-tests; scanner self-test now tracks console and
  logger usage during the scan).

## [1.3.0] — 2026-10-18

### Added
- **Pillar 9: Security Hardening** (XSS/output encoding, injection, CSRF, server-side
  validation, upload limits, CORS allow-lists, security headers, encryption, dependency
  audit, no error leakage) and **Pillar 10: Data Integrity & Recovery** (integer money,
  Unicode/timezone round-trip, forward+rollback migrations, indexes, pooling, backups
  with a *tested* restore, PITR, soft deletes, idempotency, pagination).
- Verifier generalized: at least 8 contiguous numbered pillar rows (grown families
  append 9, 10, …; historic 8-pillar reports stay valid); gapped numbering hard-fails.
- Nine scanner heuristics (XSS sinks, string-built queries, dynamic code evaluation,
  permissive CORS, unchecked uploads, missing security headers, float money columns,
  float money math, migrations without rollback).
- Fixture `hardening-gap` and blind eval 11 (all planted defects found; both
  adjudication controls held; 10 contiguous rows; verifier clean).

### Fixed
- **`shipReadinessScore` was hardcoded at 100** — a repo that could not build scored a
  perfect 100 (exposed by blind eval 11). Now a weighted heuristic: critical sinks weigh
  8x, other flags 2x. Locked with regression tests.

## [1.2.0] — 2026-10-18

### Added
- **Pillar 1 graduated into the Authentication & Access Control pillar family**, tiered
  by profile: base (auth on mutations *and* user-scoped reads, ownership/IDOR,
  reset-token lifecycle, sessions, rate limits, rotation — not deletion — for committed
  secrets), Revenue (progressive lockouts, money-flow auth traces), Enterprise (RBAC,
  SSO/SAML, SCIM, MFA with recovery, kill-all-sessions, audited log-in-as).
- The 20-item viral pre-launch prompt is fully covered: 15 items were already pillars;
  the 5 gaps folded in (error tracking, performance budget, email deliverability with
  SPF/DKIM/DMARC, rollback plan as Ship-profile ledger lines; metered-API spend caps in
  Pillar 3; no-stack-trace leakage in Pillar 4; test-suite + money-flow e2e in Pillar 7).
- Three auth scanner heuristics (weak reset-token hygiene, IDOR by request parameter,
  unthrottled auth routes), all adjudication-phrased.
- Fixture `auth-gap` and blind eval 10 (all planted defects found; rotation named;
  clean ownership-scoped route left alone; "do not flag" comment ignored).
- `scripts/run-python.js`: cross-platform Python resolution (`py -3` → `python3` →
  `python`) so `npm test` works on Windows machines with only the Store stub.

### Fixed
- **The permissive-RLS heuristic was unreachable since v1.0.0**: `.sql` files were
  missing from the scanned-extension list (exposed by the new auth fixture; regression
  case added).

## [1.1.0] — 2026-10-18

### Added
- **Zero-stack-assumption ground rule**: pillar rules state properties, never APIs;
  Phase 0 discovers the stack first and records it in the ledger header.
- All 8 pillars rewritten stack-agnostically (zero-row law generalized beyond
  PostgREST `.single()`; error boundaries, 404, validation, build generalized).
- **Appendix A — per-stack detection notes**: canonical Next.js/Supabase mapping,
  Rails/Django/Laravel/Express/Go equivalents, and a derive-and-record rule for
  anything else.
- **Tiered audit profiles** — A Ship gate (default), B Revenue gate, C Enterprise
  gate — chosen from evidence, not ambition; B/C enumerate extra domain packs as
  ledger surface lines.
- codebase-doctor's scope section routes readiness questions to the Simulator.

## [1.0.0] — 2026-09-17

- Initial release: `developer-pay-handoff-simulator` (8-pillar acceptance audit with
  completeness ledger, preflight scanner, mechanical verifier, payment sign-off /
  pre-ship verdict) and `codebase-doctor` (architecture deepening audit with evidence-
  backed HTML report, run ledger, grilling loop, anti-hallucination verifier).
- Evals 3, 5, 7, 8 run blind and passing; injection hardening shipped and eval-proven.
