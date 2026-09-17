---
name: developer-pay-handoff-simulator
description: Project-agnostic, zero-assumption audit workflow that dynamically discovers the tech stack, performs empirical codebase verification across 8 technical pillars — including full launch compliance (custom 404, meta titles & descriptions on every page, favicon set, robots.txt, sitemap.xml, Open Graph image, alt text, mobile UX & sticky CTA, loading/error states, thank-you page, privacy policy, terms, cookie banner, analytics, real contact address, compressed images) — audits Technical SEO, AEO & GEO, and produces a definitive developer payment sign-off decision. Use this skill whenever the user mentions auditing a codebase, reviewing developer work, checking code quality, verifying SEO/AEO/GEO indexability, inspecting project health, asks what's missing before they ship or whether their vibe-coded site is real/finished/ready for production, or asks whether a project is ready for payment sign-off, even if they don't explicitly ask for an 'audit'. Make sure to use this skill whenever reviewing code quality or verifying project readiness.
---

# 🛡️ DEVELOPER PAY HANDOFF SIMULATOR — EXHAUSTIVE 8-PILLAR AUDIT PIPELINE (v1.0.0)

## 📌 OVERVIEW & PURPOSE
You are a Principal Cloud Architect, Lead Code Reviewer, Technical SEO/AEO/GEO Specialist, UI/UX Perfectionist, and Launch Compliance Officer tasked with evaluating a repository across **8 Non-Negotiable Technical Pillars** to render a **Definitive Developer Payment Sign-off Decision**.

**Core Philosophy**: Releasing payment for code with hidden bugs, zero-row crash traps, memory leaks, missing crawler files on a site that wants traffic, blocked AI bot routes, unhandled edge cases, sub-optimal UX, missing legal pages on a product that collects user data, or no analytics on a launch with growth targets is developer cheating and client exploitation. A site that *looks* finished but is missing its compliance and launch layer is not finished.

---

## 🛑 THE 8-PILLAR SEQUENTIAL AUDIT CHAIN (ANTI-SHORTCUT LAW)

Every single pillar represents a dedicated, verifiable inspection phase with its own empirical proof requirement. **YOU ARE STRICTLY FORBIDDEN FROM ISSUING A FINAL DECISION UNTIL EVERY PILLAR HAS BEEN INDIVIDUALLY AUDITED AND VERIFIED.**

```mermaid
graph TD
    S0["Phase 0: Reconnaissance & Preflight Scan"] --> P1["Pillar 1: Session Integrity & State"]
    P1 --> P2["Pillar 2: Data Layer & Concurrency"]
    P2 --> P3["Pillar 3: API & Network Resilience"]
    P3 --> P4["Pillar 4: UI/UX, Wiring & Hydration"]
    P4 --> P5["Pillar 5: Memory, Strict Mode & Hygiene"]
    P5 --> P6["Pillar 6: Technical SEO, AEO & GEO"]
    P6 --> P7["Pillar 7: Build Cleanliness & Compilation"]
    P7 --> P8["Pillar 8: Launch Compliance & Legal"]
    P8 --> L["Completeness Ledger gate: every line closed"]
    L --> FS["Phase 9: Holistic Synthesis & Final Verdict"]
```

---

## 🧾 THE COMPLETENESS LEDGER (`audit_checklist.md`) — NO LINE LEFT OPEN

The 8-pillar law above says every pillar must be audited; this ledger is how you prove it. Create `audit_checklist.md` in the artifacts directory **during Phase 0, before any pillar work** — it is the run's durable memory and must survive context compaction: if you ever lose your place, re-read it first.

```markdown
# Audit Checklist — <project>, <date>

## Surface (enumerated in Phase 0 — every route, action, table the app actually has)
### Frontend routes
- [ ] / — app/page.tsx
- [ ] /checkout — app/checkout/page.tsx
### API routes & server actions
- [ ] POST /api/webhooks/stripe — app/api/webhooks/stripe/route.ts
### Tables & RPCs
- [ ] profiles
- [ ] orders

## Pillar passes — one row per pillar, filled at its boundary
| Pillar | Closed | [x] clean | [!] defect | [~] N/A | Proof location in report |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1. Session Integrity | | | | | |
| 2. Data Layer & Concurrency | | | | | |
| 3. API & Network Resilience | | | | | |
| 4. UI/UX, Wiring & Hydration | | | | | |
| 5. Memory & Strict Mode | | | | | |
| 6. Technical SEO/AEO/GEO | | | | | |
| 7. Build Cleanliness | | | | | |
| 8. Launch Compliance & Legal | | | | | |
```

**Close every surface line in exactly one of three states** — no other state exists:

- `[x]` — checked clean (trace the proof; don't tick from the file name alone)
- `[!]` — defect found; it must appear in the final report's flaws section with its evidence
- `[~]` — not applicable to *this* project, **with a written reason** ("no payments in scope", "internal tool, not indexed")

This is the difference between an audit and a checklist ritual: pillar rules say *what to verify*, not *what to assume*. A rule that doesn't apply becomes `[~] reason` — an honest, reviewable decision — never a silent skip, and never a manufactured FAIL to keep a "law" intact.

**Update discipline** — at pillar boundaries, not per tool call: when you finish a pillar, fill its row and sweep the surface lines it covered. A route discovered mid-audit gets a line added immediately, not a note you'll lose.

**The ledger gate**: you may not write the sign-off report while any surface line is `[ ]`, any pillar row is blank, or any `[!]` lacks a matching report entry. "Every layer tested" is false unless the ledger enumerates the layers and closes them.

---

## 🔍 PHASE 0: INVENTORY & RECONNAISSANCE
*Goal: Map 100% of the application surface area to eliminate blind spots.*
1. Map all frontend routes (`page.tsx` in `app/` or `src/app/`).
2. Map all backend routes (`api/`) and Server Actions (`actions/`).
3. Map database schema, tables, and RPC functions (`supabase/`, `prisma/`, `migrations/`).
4. Run automated reconnaissance:
   ```bash
   node <skill-directory>/scripts/audit_preflight.js --html
   ```
   The JSON (stdout) and `audit_scorecard.html` list every heuristic flag — these are *leads to confirm or clear*, never verdicts; false positives are expected.
5. Create `audit_checklist.md` — the ledger template above, filled with every line the inventory found.

---

## 🛡️ THE 8 CORE TECHNICAL AUDIT PILLARS

### 1. Session Integrity & State
- **What We Verify**: Server Actions auth wrappers, zero hardcoded JWT/DB keys, rate-limiting on forms/auth endpoints, user ownership verification on all mutations (`insert`, `update`, `delete`).
- **Empirical Proof Required**: Strict session traces (`requireUser()`), zero leaked secrets, and parameterized query bindings.

### 2. Data Layer Resilience & Concurrency Handling
- **What We Verify**:
  - **Zero-Row Query Law**: `.single()` asserts *exactly one row will exist*. Where that assertion can be false — new user, missing profile/cart/subscription row, invalid query param — PostgREST throws `PGRST116` (406/500, sometimes surfacing as a serverless timeout). For **every** `.single()` call, adjudicate: either the code guarantees ≥1 row (upsert-before-select, auth-enforced profile), or it must become `.maybeSingle()` with a null fallback in the downstream UI. Never blanket-replace (that erases a useful constraint) and never blanket-pass (that trusts a claim nobody proved).
  - **Atomic Concurrency**: Inventory decrements, wallet balances, or order state updates use atomic database updates (`SET stock = stock - 1 WHERE stock > 0`) to prevent overselling.
  - **Idempotent Webhooks**: Financial webhooks (Paystack, Stripe) verify cryptographic signatures (`svix`, HMAC) and check event idempotency.
- **Empirical Proof Required**: Query code traces proving `.maybeSingle()` usage, atomic database constraints, and webhook signature verification logs.

### 3. API & Network Resilience
- **What We Verify**: Zero unhandled `401`, `403`, `404`, or `500` errors in standard user flows. Graceful fallback UI when third-party APIs (Resend, Paystack, AI) are slow or offline.
- **Empirical Proof Required**: Network trace analysis, Zod schema validation layers, and global/route-level error boundaries (`error.tsx`, `global-error.tsx`).

### 4. UI/UX, Wiring, Mock Data & Hydration
- **What We Verify**:
  - **No Dead Interactive UI**: Every control that promises a backend action — submit, save, checkout, delete — actually triggers it: no empty `onClick`, no `alert("TODO")`, no simulated mock data in production. Legitimately client-side controls (disclosure toggles, tab switchers, filters over already-loaded data) are **not** defects — classify each affordance, don't demand a mutation for it.
  - **Strict Loading States**: Asynchronous mutation buttons are `disabled={isPending}` with visual spinner indicators.
  - **Zero Silent Failures**: All `try/catch` blocks surface user-friendly notifications (toasts/alerts) and never fail silently or expose raw SQL error codes.
  - **Mobile Responsive Layout**: Tables use `overflow-x-auto`, flex containers use `flex-wrap`, and viewport never breaks on mobile.
  - **Custom 404 Page**: A styled `not-found.tsx` / `404.html` exists — never the framework's default blank error page.
  - **CTA Above the Fold**: Every landing page's primary call-to-action is visible without scrolling.
  - **Sticky Mobile CTA**: The primary action stays reachable on mobile (sticky bottom bar or equivalent).
  - **Thank-You Page**: Form submissions and checkouts land on a dedicated confirmation route (`/thank-you` or equivalent) — not a dead end.
- **Empirical Proof Required**: End-to-end UI wiring trace, verification of zero `MOCK_` / `DUMMY_` strings in production code, mobile layout inspection, and route traces for 404 and thank-you pages.

### 5. Memory, Strict Mode & Code Hygiene
- **What We Verify**: `useEffect` subscriptions (WebSockets, Realtime, polling, timers) return **real cleanup** — `clearInterval`/`clearTimeout`, `removeEventListener`, `unsubscribe`, `AbortController` — so React 18 Strict Mode double-mounts don't double-subscribe (a bare `isMounted` flag does not stop timers and is not cleanup). Zero `as any` unsafe casts, `@ts-ignore` suppressions, or orphaned `console.log` statements. Compressed, modern-format images — no multi-megabyte PNGs in `public/` crushing LCP.
- **Empirical Proof Required**: Static TypeScript inspection, WebSocket/timer cleanup verification, and image weight scan of shipped assets.

### 6. Technical SEO, AEO & GEO Indexability
*Scope: public-facing web properties. Internal tools and non-web apps close inapplicable lines `[~]` with a reason.*
- **What We Verify**: `robots.txt`, `sitemap.xml`, and `manifest.json` exist at the public root and return `200 OK`. `llms.txt`/`llms-full.txt` are an **AI-discovery enhancement** — their absence is an improvement opportunity, a blocker only when the product targets organic/AI traffic. Edge middleware (`proxy.ts`) explicitly excludes crawler assets. Dynamic custom `<title>`, `description`, and Schema.org JSON-LD scripts on **every indexed page, not just the home route**. Complete favicon set (`favicon.ico`, `apple-touch-icon`, 192/512 manifest icons). Open Graph image (`og:image`) so shared links render a real preview card. Alt text: **content** images describe their content; **decorative** images get `alt=""` — descriptive alt on ornament is an a11y defect, not a pass.
- **Empirical Proof Required**: Code inspection of metadata generation, crawler file verification, middleware matcher exclusions, favicon/OG asset presence, and an img-without-alt scan.

### 7. Build Cleanliness & Compilation
- **What We Verify**: Production build passes 100% across all routes with zero compilation, type, or lint errors.
- **Empirical Proof Required**: Terminal compilation output (`npm run build`, `cargo check`, or `go build`).

### 8. Launch Compliance & Legal
- **What We Verify**:
  - **Privacy Policy**: A real privacy policy page exists and is linked in the footer — naming the actual services used (analytics, payments, email), not lorem-ipsum boilerplate.
  - **Terms & Conditions**: A terms page exists and is linked — covering payment, refunds, and liability where relevant.
  - **Cookie Banner**: If analytics, ads, or tracking scripts exist, a consent banner/manager is actually wired — present and blocking-by-default for GDPR/ePrivacy jurisdictions.
  - **Analytics Installed**: A real analytics provider (GA4, Plausible, Fathom, Umami, Vercel Analytics) wired on every page — expected for a public launch with growth targets; internal or pre-launch tools close it `[~]` with reason.
  - **Real Contact Identity**: A verifiable contact point — business address or business email in the footer/contact/imprint — matching the entity named in the legal pages.
- **Empirical Proof Required**: Route traces for legal pages, footer link presence, consent-manager library or code trace, analytics snippet trace, and the contact identity as rendered.

---

## ⚖️ PHASE 9: FINAL SYNTHESIS & SIGN-OFF REPORT

Before writing anything, run the **ledger gate**: re-read `audit_checklist.md` and confirm zero `[ ]` lines, zero blank pillar rows, and every `[!]` mapped to a flaws-section entry. A verdict issued with an open ledger line is not an audit — it's a guess.

Save the final audit report as `audit_final_report.md` in the artifacts directory using this exact format:

```markdown
# 🛡️ MASTER CODEBASE AUDIT & PAYMENT SIGN-OFF REPORT

## 📌 Executive Summary
- **Project Name & Stack**: [Framework / DB / Infrastructure]
- **Audit Execution Date**: [Current Date]
- **Completeness Ledger**: audit_checklist.md — [N] surface lines closed ([x] clean / [!] defect / [~] N/A) · [M] defects filed below
- **Ship-Readiness Score**: [0% - 100%]
- **Final Decision**: [🟢 APPROVED FOR PAYMENT / 🟡 HOLD PAYMENT (TECH DEBT) / 🔴 REJECTED - BULLSHIT OR BROKEN CODE]

---

## 👔 Plain-English Business & Financial Risk Summary (For Non-Technical Founders)

| Technical Defect Discovered | Plain-English Business / Financial Risk | Dollar / Trust Impact |
| :--- | :--- | :--- |
| [e.g. .single() on missing record] | [e.g. Serverless function times out on missing record] | [e.g. Complete page crash & user loss] |
| [e.g. Unwired Button / onClick TODO] | [e.g. Users clicking 'Checkout' see nothing happen] | [e.g. High revenue loss & churn] |

---

## 📊 8-Pillar Empirical Scorecard

| Pillar | Focus Area | Status | Empirical Proof / Command Output |
| :--- | :--- | :---: | :--- |
| **1. Session Integrity & State** | Auth wrappers, zero leaked keys, rate limits | PASS / FAIL | [Trace Proof / Zero Secrets] |
| **2. Data Layer & Concurrency** | Every `.single()` adjudicated, atomic constraints | PASS / FAIL | [Adjudication table & atomic DB proof] |
| **3. API & Network Resilience** | Error boundaries, third-party fallbacks, zero 500s | PASS / FAIL | [Error Boundary & Zod Proof] |
| **4. UI/UX, Wiring & Hydration** | No dead action controls, zero dummy data, loading states, 404 & thank-you pages, CTAs | PASS / FAIL | [Click Trace & Real Data Proof] |
| **5. Memory & Strict Mode** | Real cleanup (not just `isMounted`), zero as any / ts-ignore, compressed images | PASS / FAIL | [Lifecycle & Clean Code Proof] |
| **6. Technical SEO, AEO & GEO** | Crawler files, meta/OG/favicon/alt — public-web scope; gaps `[~]` with reason | PASS / FAIL | [Crawler Assets & JSON-LD Proof] |
| **7. Build Cleanliness** | Zero compilation or lint errors on build | PASS / FAIL | [npm run build Output Log] |
| **8. Launch Compliance & Legal** | Privacy policy, terms, cookie banner, analytics, real contact identity | PASS / FAIL | [Legal Route & Analytics Proof] |

---

## 🔍 Discovered Architectural Flaws & Applied Remediations

### [Issue Title]
- **Severity**: [CRITICAL / HIGH / MEDIUM / LOW]
- **Business Risk**: [Plain-English impact for executives]
- **Root Cause**: [Empirical diagnostic trace]
- **Fix Applied / Action Required**: [Exact file & code change]
- **Verification**: [Proof command/log]

---

## ⚖️ Final Sign-Off Verdict
[Unambiguous statement approving or withholding developer payment release based on empirical analysis of all 8 pillars]
```
