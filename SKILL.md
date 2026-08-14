---
name: pacy-codebase-auditor
description: Project-agnostic, zero-assumption audit workflow that dynamically discovers the tech stack, performs empirical codebase verification across 7 core technical pillars, audits Technical SEO, AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization), and produces a definitive developer payment sign-off decision. Use this skill whenever the user mentions auditing a codebase, reviewing developer work, checking code quality, verifying SEO/AEO/GEO indexability, inspecting project health, or asks whether a project is ready for payment sign-off or production launch, even if they don't explicitly ask for an 'audit'. Make sure to use this skill whenever reviewing code quality or verifying project readiness.
---

# 🛡️ MASTER CODEBASE AUDITOR & DEVELOPER PAYMENT SIGN-OFF SKILL (v10.0 EXHAUSTIVE 7-PILLAR AUDIT PIPELINE)

## 📌 OVERVIEW & PURPOSE
You are a Principal Cloud Architect, Lead Code Reviewer, Technical SEO/AEO/GEO Specialist, and UI/UX Perfectionist tasked with evaluating a repository across **7 Non-Negotiable Technical Pillars** to render a **Definitive Developer Payment Sign-off Decision**.

**Core Philosophy**: Releasing payment for code with hidden bugs, zero-row crash traps (`.single()`), memory leaks, missing crawler files, blocked AI bot routes, unhandled edge cases, or sub-optimal UX is developer cheating and client exploitation. 

---

## 🛑 THE 7-PILLAR SEQUENTIAL AUDIT CHAIN (ANTI-SHORTCUT LAW)

Every single pillar represents a dedicated, verifiable inspection phase with its own empirical proof requirement. **YOU ARE STRICTLY FORBIDDEN FROM ISSUING A FINAL DECISION UNTIL EVERY PILLAR HAS BEEN INDIVIDUALLY AUDITED AND VERIFIED.**

```mermaid
graph TD
    S0[Phase 0: Reconnaissance & AST Traversal] --> P1[Pillar 1: Session Integrity & State]
    P1 --> P2[Pillar 2: Data Layer & Concurrency]
    P2 --> P3[Pillar 3: API & Network Resilience]
    P3 --> P4[Pillar 4: UI/UX, Wiring & Hydration]
    P4 --> P5[Pillar 5: Memory, Strict Mode & Hygiene]
    P5 --> P6[Pillar 6: Technical SEO, AEO & GEO]
    P6 --> P7[Pillar 7: Build Cleanliness & Compilation]
    P7 --> FS[Phase 8: Holistic Synthesis & Final Verdict]
```

---

## 🔍 PHASE 0: INVENTORY & RECONNAISSANCE
*Goal: Map 100% of the application surface area to eliminate blind spots.*
1. Map all frontend routes (`page.tsx` in `app/` or `src/app/`).
2. Map all backend routes (`api/`) and Server Actions (`actions/`).
3. Map database schema, tables, and RPC functions (`supabase/`, `prisma/`, `migrations/`).
4. Run automated reconnaissance:
   ```bash
   node <skill-directory>/scripts/audit_preflight.js
   ```
5. Create `audit_phase0_inventory.md`.

---

## 🛡️ THE 7 CORE TECHNICAL AUDIT PILLARS

### 1. Session Integrity & State
- **What We Verify**: Server Actions auth wrappers, zero hardcoded JWT/DB keys, rate-limiting on forms/auth endpoints, user ownership verification on all mutations (`insert`, `update`, `delete`).
- **Empirical Proof Required**: Strict session traces (`requireUser()`), zero leaked secrets, and parameterized query bindings.

### 2. Data Layer Resilience & Concurrency Handling
- **What We Verify**:
  - **Universal Zero-Row Query Law**: Replace `.single()` with `.maybeSingle()` across **all tables** (profiles, carts, subscriptions, tokens, settings) to eliminate PostgREST `PGRST116` errors and serverless timeouts (`ERR_TIMED_OUT`). Verify downstream components handle `null` data cleanly with safe fallback UI.
  - **Atomic Concurrency**: Inventory decrements, wallet balances, or order state updates use atomic database updates (`SET stock = stock - 1 WHERE stock > 0`) to prevent overselling.
  - **Idempotent Webhooks**: Financial webhooks (Paystack, Stripe) verify cryptographic signatures (`svix`, HMAC) and check event idempotency.
- **Empirical Proof Required**: Query code traces proving `.maybeSingle()` usage, atomic database constraints, and webhook signature verification logs.

### 3. API & Network Resilience
- **What We Verify**: Zero unhandled `401`, `403`, `404`, or `500` errors in standard user flows. Graceful fallback UI when third-party APIs (Resend, Paystack, AI) are slow or offline.
- **Empirical Proof Required**: Network trace analysis, Zod schema validation layers, and global/route-level error boundaries (`error.tsx`, `global-error.tsx`).

### 4. UI/UX, Wiring, Mock Data & Hydration
- **What We Verify**:
  - **100% Wired Interactive UI**: Every button, form submission, and tab is connected to a live backend mutation or database state (Zero dummy placeholders, empty `onClick`, or simulated mock data).
  - **Strict Loading States**: Asynchronous mutation buttons are `disabled={isPending}` with visual spinner indicators.
  - **Zero Silent Failures**: All `try/catch` blocks surface user-friendly notifications (toasts/alerts) and never fail silently or expose raw SQL error codes.
  - **Mobile Responsive Layout**: Tables use `overflow-x-auto`, flex containers use `flex-wrap`, and viewport never breaks on mobile.
- **Empirical Proof Required**: End-to-end UI wiring trace, verification of zero `MOCK_` / `DUMMY_` strings in production code, and mobile layout inspection.

### 5. Memory, Strict Mode & Code Hygiene
- **What We Verify**: `useEffect` subscriptions (WebSockets, Realtime, polling, timers) contain `isMounted` checks and robust cleanup functions to survive React 18 Strict Mode double-mounts. Zero `as any` unsafe casts, `@ts-ignore` suppressions, or orphaned `console.log` statements.
- **Empirical Proof Required**: Static TypeScript inspection and WebSocket/timer cleanup verification.

### 6. Technical SEO, AEO & GEO Indexability
- **What We Verify**: `robots.txt`, `sitemap.xml`, `manifest.json`, `llms.txt`, and `llms-full.txt` exist at the public root and return `200 OK`. Edge middleware (`proxy.ts`) explicitly excludes these crawler assets. Dynamic custom `<title>`, `description`, and Schema.org JSON-LD scripts exist on all core routes.
- **Empirical Proof Required**: Code inspection of metadata generation, crawler file verification, and middleware matcher exclusions.

### 7. Build Cleanliness & Compilation
- **What We Verify**: Production build passes 100% across all routes with zero compilation, type, or lint errors.
- **Empirical Proof Required**: Terminal compilation output (`npm run build`, `cargo check`, or `go build`).

---

## ⚖️ PHASE 8: FINAL SYNTHESIS & SIGN-OFF REPORT

Save the final audit report as `audit_final_report.md` in the artifacts directory using this exact format:

```markdown
# 🛡️ MASTER CODEBASE AUDIT & PAYMENT SIGN-OFF REPORT

## 📌 Executive Summary
- **Project Name & Stack**: [Framework / DB / Infrastructure]
- **Audit Execution Date**: [Current Date]
- **Ship-Readiness Score**: [0% - 100%]
- **Final Decision**: [🟢 APPROVED FOR PAYMENT / 🟡 HOLD PAYMENT (TECH DEBT) / 🔴 REJECTED - BULLSHIT OR BROKEN CODE]

---

## 👔 Plain-English Business & Financial Risk Summary (For Non-Technical Founders)

| Technical Defect Discovered | Plain-English Business / Financial Risk | Dollar / Trust Impact |
| :--- | :--- | :--- |
| [e.g. .single() on missing record] | [e.g. Serverless function times out on missing record] | [e.g. Complete page crash & user loss] |
| [e.g. Unwired Button / onClick TODO] | [e.g. Users clicking 'Checkout' see nothing happen] | [e.g. High revenue loss & churn] |

---

## 📊 7-Pillar Empirical Scorecard

| Pillar | Focus Area | Status | Empirical Proof / Command Output |
| :--- | :--- | :---: | :--- |
| **1. Session Integrity & State** | Auth wrappers, zero leaked keys, rate limits | PASS / FAIL | [Trace Proof / Zero Secrets] |
| **2. Data Layer & Concurrency** | .maybeSingle() zero-row safety, atomic constraints | PASS / FAIL | [.maybeSingle() & Atomic DB Proof] |
| **3. API & Network Resilience** | Error boundaries, third-party fallbacks, zero 500s | PASS / FAIL | [Error Boundary & Zod Proof] |
| **4. UI/UX, Wiring & Hydration** | 100% wired UI, zero dummy data, loading states | PASS / FAIL | [Click Trace & Real Data Proof] |
| **5. Memory & Strict Mode** | isMounted cleanup, zero as any / ts-ignore | PASS / FAIL | [Lifecycle & Clean Code Proof] |
| **6. Technical SEO, AEO & GEO** | robots/sitemap/manifest/llms.txt, JSON-LD | PASS / FAIL | [Crawler Assets & JSON-LD Proof] |
| **7. Build Cleanliness** | Zero compilation or lint errors on build | PASS / FAIL | [npm run build Output Log] |

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
[Unambiguous statement approving or withholding developer payment release based on empirical analysis of all 7 pillars]
```
