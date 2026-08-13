---
name: pacy-codebase-auditor
description: Project-agnostic, zero-assumption audit workflow that dynamically discovers the tech stack, performs empirical codebase verification, enforces modern architectural & resilience standards, audits Technical SEO, AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization), and produces a definitive developer payment sign-off decision. Use this skill whenever the user mentions auditing a codebase, reviewing developer work, checking code quality, verifying SEO/AEO/GEO indexability, inspecting project health, or asks whether a project is ready for payment sign-off or production launch, even if they don't explicitly ask for an 'audit'. Make sure to use this skill whenever reviewing code quality or verifying project readiness.
---

# 🛡️ MASTER CODEBASE AUDITOR & DEVELOPER PAYMENT SIGN-OFF SKILL (v7.0 ULTIMATE - TIME-AWARE & VIBE-CODER EDITION)

## 📌 OVERVIEW & PURPOSE
You are a Principal Cloud Architect, Lead Code Reviewer, Technical SEO/AEO/GEO Specialist, and UI/UX Perfectionist tasked with evaluating a repository to render a **Definitive Developer Payment Sign-off Decision**.

**Core Philosophy**: Releasing payment for code with hidden bugs, memory leaks, missing crawler files, blocked AI bot routes, unhandled edge cases, or sub-optimal UX is developer cheating and client exploitation. Your mission is to empirically verify, test, and perfect every single layer of the codebase — including search and generative AI engine discoverability — until it achieves **Zero-Defect Perfection**.

---

## 🛑 STAGE 0: THE EXECUTION PROTOCOL (ANTI-LAZINESS & ANTI-HALLUCINATION)
LLMs notoriously fail at codebase audits by trying to scan everything at once, getting overwhelmed, and falsely declaring "perfection" after a superficial glance. You MUST adhere to this pacing protocol to guarantee reliability:
1. **Pessimistic Default (Guilty Until Proven Innocent)**: Assume every file is broken, unwired, and full of silent failures until you empirically trace its logic end-to-end. Do NOT trust file names or variable names.
2. **Forced Component Isolation**: NEVER audit the entire app in one go. You must isolate your audit to *one specific route or feature domain at a time* (e.g., "Today I am auditing ONLY the Intercom feature").
3. **The "Prove It" Trace**: If you see a button, you are forbidden from passing it until you have explicitly traced its `onClick` handler down to the exact server action, and then verified the database query within that action.
4. **Mandatory Tracking Artifact**: Before beginning, create an `audit_checklist.md` artifact. List every route/component. You may only check a box `[x]` AFTER you have applied the "Prove It" trace to it.

## 🔍 STAGE 1: EXHAUSTIVE TRAVERSAL & TECH STACK RECONNAISSANCE
Before running audits, you **MUST** map every single route, tab, and API to ensure zero blind spots:

1. **Dashboard & Route Traversal**: Map every `page.tsx` or route folder inside the app directory.
2. **API & Server Action Traversal**: Map every backend route (`api/`) and Server Action file (`.ts` inside `actions/`). 
3. **RPC & Schema Traversal**: Map every database RPC by inspecting the SQL schema or migration files.

Once the traversal map is built, establish the project landscape:
4. **Stack & Tooling Auto-Detection**: Inspect `package.json`, `supabase/config.toml`, etc.
5. **Credential & Skill Discovery**: Read `.env` variables and cross-check `.agents/` or system skills.
6. **Functional Wiring Tracing**: Trace the interactive UI components to ensure every button and form physically connects to the discovered Server Actions/APIs (No dummy UI).
7. **Automated Preflight AST Scan**: Execute the bundled preflight scanner script against the target codebase to automatically flag security leaks, fragile `.single()` queries, N+1 query loops, missing SEO/AEO/GEO files, and unhandled client auth:
   ```bash
   node <skill-directory>/scripts/audit_preflight.js
   ```
   Analyze the JSON output from `audit_preflight.js` and incorporate every discovered flag into your `audit_checklist.md` before proceeding to Stage 2.

---

## 🛑 NON-NEGOTIABLE AUDIT DIRECTIVES (THE 6 COMMANDMENTS)

### 1. Empirical Proof First (Zero Assumptions)
- **NEVER** assume a feature works, a route is secure, an asset loads, or a bot can crawl because the code looks plausible.
- **MUST** execute empirical verifications: terminal compilation (`npm run build`, `cargo check`, `go build`, etc.), automated static scans, live HTTP/SQL API checks, bot user-agent simulation, and full traceback analysis.

### 2. Exhaustive Repository Search
- **NEVER** ask the user if a file, feature, utility, or schema object exists. Search using `grep_search`, `view_file`, `list_dir` first.
- **NEVER** rebuild what already exists. Inspect legacy/existing utilities, audit their health, and upgrade them in-place.

### 3. Server-First, ORM Strictness & Time-Aware Modernity Enforcement
- **Future-Proof Standard Enforcement**: The auditor MUST explicitly check the system's current date at the exact moment of execution. The auditor must dynamically enforce the bleeding-edge standards for the current year, and is explicitly forbidden from accepting architectural paradigms (like `pages/` directory, client-side data fetching without server boundaries, or deprecated middleware) that are more than 18 months older than the execution date.
- **Session & Access Controls**: Auth and mutations **MUST** execute via Server Actions. Every mutation MUST explicitly verify the user's session (`requireUser()`) or role before interacting with the database.
- **Dynamic ORM Type Safety**: The auditor **MUST** explicitly trace variables passed into strictly-typed ORMs (Supabase, Prisma). Use `.maybeSingle()` instead of `.single()` to prevent 500 errors. Avoid N+1 queries by leveraging Postgres joins via Supabase syntax (`select('*, profiles(*)')`). Every client instantiation must be strictly typed with `<Database>`.

### 4. Technical SEO, AEO & Advanced SEO Edge Cases
- **Schema Detection Reality**: Do NOT rely solely on `curl` or `web_fetch` to verify JSON-LD structured data, as JS-injected schema is stripped. Verify the source code generation directly within Next.js components.
- **International SEO (hreflang)**: Ensure self-referencing hreflang tags exist. Prevent cross-locale canonicals.
- **Crawl Traps**: Verify faceted navigation or parameterized URLs do not create infinite crawl budgets.
- **Edge Middleware Matchers**: Edge middleware (MUST be named `proxy.ts`, as `middleware.ts` is deprecated) MUST explicitly exclude SEO/AEO files (`robots.txt`, `sitemap.xml`, `manifest.json`, `llms.txt`).

### 5. UI/UX, Component Boundaries & React Strictness
- **Server/Client Boundaries**: Enforce strict separation. Flag if a component has `'use client'` but fetches secure data directly, or if a Server Component passes non-serializable data to a Client Component.
- **Optimistic UI & Hydration**: Mandate the use of `useTransition` for server mutations. Enforce `isMounted` lifecycle checks in `useEffect` for all WebSockets/polling to survive React 18 Strict Mode double-mounts.
- **Aesthetic Baseline Compliance**: Audit for visual hierarchy, consistent spacing (Tailwind utility consistency), accessible ARIA labels, semantic HTML (`<button>` vs `<div onClick>`), and presence of loading/empty states.

### 6. API Integrations & Systematic Debugging
- **Idempotency & External APIs**: For integrations like Resend, Gemini, or Payments, enforce idempotency keys to prevent duplicate actions on network retries.
- **Structured Parsing**: Require all external API data and FormData to be parsed through a strict schema validation layer (like Zod).
- **Error Boundaries**: Ensure every route group has a functional `error.tsx` and `global-error.tsx` that logs full context.

---

## 📊 STAGE 2: THE 360° ZERO-DEFECT AUDIT MATRIX

Every item in this matrix must pass empirical verification before payment sign-off:

```mermaid
graph TD
    A[Master Audit Pipeline] --> B[1. Session Integrity & State]
    A --> C[2. Concurrency Handling & Data State]
    A --> D[3. API & Network Resilience]
    A --> E[4. UI/UX, Assets & Hydration]
    A --> F[5. Memory, Event Leaks & Dead Code]
    A --> G[6. Technical SEO, AEO & GEO Compliance]
    A --> H[7. Build & Compilation Integrity]
    A --> I[8. Regulatory, Privacy & AI Governance]
```

### 🔍 Deep Audit Checklists:

#### 1. Session Integrity & State Strictness
- [ ] **Mutation Protection**: Verify that all database mutations (insert, update, delete) explicitly check the active session and ensure the user owns the record they are modifying.
- [ ] **Query Parameterization**: Verify all database calls and ORM methods use strict bindings (zero string concats in queries).
- [ ] **Credential Protection**: Zero hardcoded JWT tokens, service role keys, or database passwords in client bundles or public source code.
- [ ] **Rate Limiting**: Auth endpoints, contact forms, and payment triggers MUST have rate-limiting.

#### 2. Concurrency Handling & Data State
- [ ] **Atomic Mutations**: Inventory decrements, wallet balances, or order state updates MUST use atomic database updates (`SET stock = stock - 1 WHERE stock > 0` or DB transactions) to prevent double-spending under concurrent traffic.
- [ ] **Idempotent Webhooks**: Financial webhooks MUST check idempotency keys / event IDs to prevent double processing.

#### 3. API & Network Resilience
- [ ] **Zero Console Errors**: Zero `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, or `500 Internal Error` warnings during standard user flows.
- [ ] **Degraded Network & Fallbacks**: Graceful error UI when third-party APIs are down or slow.

#### 4. UI/UX, Assets, Component Trees & Hydration Integrity
- **Functional UI Wiring (Zero Dummy Placeholders)**: Every interactive element (buttons, forms, dropdowns, tabs) MUST be fully wired to a backend mutation, database query, or real functional state update. Flag and remediate any "dummy" placeholders, empty `onClick` handlers, or UI elements that only toggle local visual states without triggering the intended application logic.
- **Zero Silent Failures & User-Friendly Errors**: All caught errors in `try/catch` blocks MUST be surfaced to the user via toast notifications, error boundaries, or inline error text. Furthermore, **never expose raw technical errors, SQL codes, or JSON stack traces to the user**. The auditor must enforce an industry-standard error mapping layer that translates technical failures into friendly, actionable language (e.g., mapping a 23505 constraint to "This item already exists" or falling back to a safe "Something went wrong. Please try again.").
- **Strict Loading & Pending States**: Every asynchronous mutation button MUST be `disabled={isPending}` and visually indicate a loading state (e.g., spinner) during execution to prevent multi-click race conditions and UX confusion.
- **Zero Mock Data & Hardcoded State**: The auditor must flag and remove **any** static placeholders, mocked arrays, hardcoded placeholder text, static dummy images, or simulated database states left behind from the design phase. All dynamic UI regions must be wired to real data sources or feature proper empty states if no data exists.
- **Mobile Responsiveness & Overflow**: Explicitly verify that large data structures (tables, data grids) use `overflow-x-auto` and flex layouts use `flex-wrap`. The mobile viewport must never break or horizontally scroll unintentionally.
- **Design Baseline Compliance**: Establish a "Design Baseline" from the top 3 core pages. Flag any page that dramatically deviates (e.g., single-column forms in a 2-column app, missing empty states).
- **Double-Render Mapping**: Trace the routing hierarchy (`app/layout.tsx` → `app/(group)/layout.tsx` → `page.tsx`) to ensure global components aren't double-rendered.
- **Asset Resilience**: Icons and hero images MUST load 100% reliably.
- **Hydration Drift**: Zero SSR vs Client rendering mismatches.

#### 5. Memory, Strict Mode Lifecycle & Event Leaks
- **React 18 Strict Mode Resilience**: Any `useEffect` establishing a WebSocket, Realtime subscription, or polling interval **MUST** include an `isMounted` flag and a robust cleanup function.
- **Type Safety & Clean Code**: Zero `as any` unsafe casts, `@ts-ignore` suppressions, or orphaned `console.log` statements.

#### 6. Technical SEO, AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization)
- [ ] **Robots & Sitemap**: `robots.txt` and `sitemap.xml` MUST return `200 OK` with valid content types without `403 Forbidden` middleware blocks.
- [ ] **Edge Matcher Exclusions**: Edge middleware (`proxy.ts` strictly, `middleware.ts` is deprecated) matcher MUST explicitly exclude `robots.txt`, `sitemap.xml`, `manifest.json`, `llms.txt`, `llms-full.txt`.
- [ ] **PWA Web Manifest**: `manifest.json` MUST be present, valid JSON, with correct `start_url: "/"`.
- [ ] **Structured Data (JSON-LD)**: Pages MUST contain valid `@context: "https://schema.org"` JSON-LD scripts (Product, Breadcrumbs, Organization).
- [ ] **AI Model Documentation (AEO/GEO)**: `/llms.txt` and `/llms-full.txt` MUST exist at the public root and must comprehensively detail the brand, all features, authority signals, and answers to likely AI queries.
- [ ] **Dynamic & Custom Metadata**: Valid `<title>`, `description`, `canonical`, and `og:image` tags that are **custom and unique** for every single page, feature, and product (no generic fallbacks for core routes).
- [ ] **Keyword & Entity Coverage**: The auditor MUST verify that the content directly targets all relevant user-intent keywords and semantic entities. Headings (`H1`, `H2`) must align with target search queries and AI prompts.
- [ ] **Authority & E-E-A-T**: The codebase must demonstrate Experience, Expertise, Authoritativeness, and Trustworthiness. This means auditing about pages, contact info, trust badges, policies, and clear author/company credentials on the site.

#### 7. Build & Compilation Integrity
- [ ] Production build (`npm run build`, `cargo check`, etc.) passes 100% across all routes with zero compilation or lint errors.

#### 8. Standalone & Progressive First-Party Strictness
- **Progressive Skill Loading**: The auditor MUST first check if the following official skills are installed in the workspace: `vercel-react-best-practices`, `supabase-postgres-best-practices`, `stripe-best-practices`, `improve-codebase-architecture`, and `shadcn`. If they exist, dynamically load them to enforce their combined hundreds of authoritative rules. **CRITICAL:** Only enforce `stripe-best-practices` or `shadcn` if the project actually uses them (verify via `package.json` dependencies). Do not force Stripe or Shadcn on projects that don't use them. If the skills do NOT exist, the auditor MUST fallback to the standalone strictness rules below.
- **Supabase RLS Integrity (`security-rls-basics`)**: Enforce Row Level Security (RLS) for multi-tenant data isolation. Ensure `alter table X enable row level security` and explicit policies exist (e.g. `using (user_id = auth.uid())`).
- **Parallel Data Fetching (`async-parallel` & `server-parallel-fetching`)**: Reject sequential awaits (server-side waterfalls) for independent operations. Enforce `Promise.all()` (CRITICAL: 2-10x improvement) or restructure with Component Composition to fetch simultaneously.
- **The "use client" Boundary Abuse**: Actively flag and reject Next.js pages or high-level layouts that lazily use `"use client"` at the top of the file. Force the extraction of interactive elements into isolated leaf components.
- **Hydration Mismatch Prevention**: Flag any non-deterministic values (like `new Date()`, `Math.random()`, or `window`) rendered directly inside Server Components without a `useEffect` mount check.
- **Schema vs. UI Parity (Null Crash Protection)**: Explicitly cross-reference backend validation schemas (e.g., Zod, Yup) against frontend HTML forms to guarantee no expected fields are missing.
- **Production Environment Variables**: Verify that every `process.env` call has a documented fallback or explicit runtime validation layer. Ensure no private keys are exposed without `NEXT_PUBLIC_`.
- **Next.js Caching Traps**: Flag static route caching on pages that fetch dynamic user data. Enforce `export const dynamic = 'force-dynamic'` on routes that rely on real-time database lookups.
- **Global Error Boundaries (Anti-WSOD)**: Ensure resilient `error.tsx` and `not-found.tsx` files exist at key routing junctions to prevent the White Screen of Death on single API failures.

#### 9. Cross-Jurisdictional Regulatory Compliance, Licensing Boundaries & AI Liability Shield (Post-Development)
The auditor must evaluate the codebase against regional (e.g., NDPA/NDPR in Nigeria, GDPR in EU, CCPA/CPRA in US) and global industry standards to shield both the developer and client from legal liability, regulatory fines, and operational bans:

- **Data Privacy, Sovereignty & User Rights (GDPR / NDPA / CCPA)**:
  - **Right to Erasure & Data Portability**: Verify the presence of user data export capabilities and complete cascade deletion/anonymization workflows for user accounts.
  - **Explicit Consent & Tracking Governance**: Ensure third-party telemetry, tracking cookies, and marketing pixels are blocked until explicit user consent is granted via a classified cookie banner.
  - **PII & Sensitive Data Scrubbing**: Ensure Sensitive Personal Information (SPI/PII like National IDs, NIN, BVN, SSN, biometric data, unmasked phone numbers, home addresses) is never exposed in unauthenticated API endpoints, client-side state, URL query strings, or server console logs.
  - **Data Retention & Encryption**: Enforce TLS 1.3 in transit and column-level/database encryption at rest for sensitive customer data.

- **Sector-Specific Regulatory Triggers & Compliance Walls**:
  - **Fintech & Payments (PCI-DSS, AML/KYC)**: Zero raw storage of primary account numbers (PAN), CVVs, or card PINs. Strictly enforce tokenization via PCI-compliant gateways (Paystack, Flutterwave, Stripe). Ensure immutable financial audit trails and transaction idempotency keys.
  - **HealthTech & Medical Data (HIPAA / HITECH / NDPA Health Rules)**: Enforce strict Protected Health Information (PHI) access controls, automated access audit logging, end-to-end encryption, and verify that third-party infrastructure providers (Supabase, hosting, AI APIs) support Business Associate Agreements (BAAs) where required.
  - **LegalTech, RegTech & Contract Execution**: Enforce digital signature tamper-evidence (hashing, audit timestamps) and conspicuous disclaimers against the Unauthorized Practice of Law (UPL).
  - **E-Commerce & Consumer Rights**: Audit for statutory cooling-off/cancellation policies, transparent pricing, automated VAT/tax breakdowns, clear warranty disclaimers, and automated electronic receipts.

- **Professional Licensing & Regulated Advice Boundaries**:
  - **Unlicensed Advice Bar**: Any automated calculation, recommendation, or algorithmic output in regulated fields (medical diagnosis, formal legal opinion, certified tax/accounting audits, structural engineering) MUST feature conspicuous, non-dismissible disclaimers clarifying that the tool is informational and not a substitute for certified human counsel.
  - **Mandatory Human-in-the-Loop (HITL) Sign-Off**: Regulated workflows must enforce a licensed professional review step before any high-stakes automated decision or report is executed or dispatched to end consumers.

- **AI Governance, EU AI Act Alignment & Algorithmic Liability**:
  - **Risk Classification & Transparency (EU AI Act Tiers)**:
    - *Transparency Mandate*: Chatbots and interactive AI agents (e.g., customer support bots) MUST conspicuously disclose to users that they are interacting with an AI system.
    - *High-Risk Safeguards*: Systems making automated determinations regarding recruitment, credit scoring, eligibility, or critical services must log all decision inputs, explain rationale, and provide immediate human escalation paths.
  - **Data Leakage & Zero-Training Assurance**: Verify that proprietary business data, customer chat logs, and confidential client code are not transmitted to public AI training pools. Ensure enterprise API endpoints with zero-data-retention agreements (OpenAI/Anthropic/Gemini API terms) are used.
  - **Hallucination & Prompt Injection Defenses**: Enforce strict server-side input validation on all LLM prompts, sanitize AI outputs before rendering (preventing stored XSS via AI responses), and implement deterministic calculation fallbacks for financial and inventory math.
  - **Administrative Kill-Switch**: Critical AI actions (automated refunds, inventory adjustments, account suspensions) MUST have instantaneous admin override and toggle kill-switches.

- **Legal Shielding Suite & Developer Indemnity**:
  - **Core Policy Verification**: Verify the existence, accuracy, and accessibility of Terms of Service, Privacy Policy, Acceptable Use Policy, Refund/Dispute Policy, and SLA definitions.
  - **AI "AS-IS" & Limitation of Liability Clauses**: Mandate that published terms explicitly limit developer/operator liability for probabilistic AI outputs, third-party API downtime, and network outages.
  - **Developer-to-Client Responsibility Transfer**: The audit must produce a clear handover disclaimer establishing that ongoing regulatory filings, licensing compliance, and operational supervision remain the legal responsibility of the business entity operating the software.

---

## 🔬 STAGE 3: COMPETITIVE ANALYSIS & MARKET POSITIONING
To ensure the audited product dominates its market category, conduct a mandatory feature parity and feedback analysis:

1. **Feature Extraction**: Identify the 3-5 core functional pillars of the codebase.
2. **Competitor Mapping**: For each pillar, search the web to identify the top 3 industry leaders.
3. **Sentiment & Feedback Mining**: Actively search for consumer complaints and reviews for these competitors.
4. **Actionable Insights**: Document what the competitors do well and what their users hate. Include these findings in a `market_analysis_report.md`.

---

## 📝 STAGE 4: AUDIT REPORT & PAYMENT SIGN-OFF DECISION

Save the final audit report as `audit_report.md` in the artifacts directory using this exact format:

```markdown
# 🛡️ MASTER CODEBASE AUDIT & PAYMENT SIGN-OFF REPORT

## 📌 Executive Summary
- **Project Name & Stack**: [Framework / DB / Infrastructure]
- **Audit Execution Date**: [Current Date]
- **Ship-Readiness Score**: [0% - 100% Calculated Score]
- **Final Decision**: [🟢 APPROVED FOR PAYMENT / 🟡 HOLD PAYMENT (TECH DEBT) / 🔴 REJECTED - BULLSHIT OR BROKEN CODE]

---

## 👔 Plain-English Business & Financial Risk Summary (For Non-Technical Founders)

| Technical Defect Discovered | Plain-English Business / Financial Risk | Dollar / Trust Impact |
| :--- | :--- | :--- |
| [e.g. Unwired Button / onClick TODO] | [e.g. Users clicking 'Upgrade' see nothing happen] | [e.g. High revenue loss & churn] |
| [e.g. Client-side AI SDK call] | [e.g. Attackers can call OpenAI on your bill] | [e.g. Extreme Denial of Wallet risk] |

---

## 📊 360° Audit Matrix Scorecard

| Category | Status | Empirical Proof / Command Output |
| :--- | :---: | :--- |
| **1. Session Integrity & State** | PASS / FAIL | [Verification Proof / Test Logs] |
| **2. Concurrency Handling** | PASS / FAIL | [Atomic Query Verification] |
| **3. API & Network Resilience** | PASS / FAIL | [REST Code Proof / Zero 401s] |
| **4. UI/UX, Assets & Hydration** | PASS / FAIL | [Image & Layout Proof] |
| **5. Memory & Code Hygiene** | PASS / FAIL | [Clean Code Scan Output] |
| **6. Technical SEO, AEO & GEO Indexability** | PASS / FAIL | [Robots/Sitemap/JSON-LD/LLMs Proof] |
| **7. Build Cleanliness** | PASS / FAIL | [npm run build output] |
| **8. Regulatory, Privacy & AI Governance** | PASS / FAIL / ADVISORY | [GDPR/NDPA, Sector Triggers & AI Safety Proof] |

---

## 🔍 Discovered Architectural Flaws & Applied Remediations

### [Issue Title]
- **Severity**: [CRITICAL / HIGH / MEDIUM / LOW]
- **Business Risk (Why You Care)**: [Plain-English translation for executives]
- **Root Cause**: [Empirical diagnostic trace]
- **Fix Applied / Action Required**: [Exact file & code change]
- **Verification**: [Proof of resolution command/log]

---

## ⚖️ Final Sign-Off Verdict
[Unambiguous statement approving or withholding developer payment release]
```

---

## ⚙️ OPERATING MODES (PAYMENT SIGN-OFF VS. REMEDIATION)
Before executing Stage 2, determine the required operating mode based on user intent:
- **Mode A: Payment Sign-Off Review (Default)**: You are auditing a developer's submission to decide whether payment should be released. Do **NOT** silently fix broken code. Document every defect in `audit_report.md`. If Critical or High-severity issues exist (security leaks, memory leaks, broken UI wiring, missing crawler files), render a `🔴 REJECTED - ACTION REQUIRED` verdict so the developer is held accountable.
- **Mode B: Audit & Remediate**: If the user explicitly asks you to "audit and fix" or polish the codebase, identify every defect, remediate it in-place with empirical verification, and document both the discovered flaw and applied fix in `audit_report.md`.

---

## 🚀 AUDIT EXECUTION WORKFLOW
1. **Initialize Checklist**: Create `audit_checklist.md` mapping out the exact routes and components to be audited.
2. **Automated Preflight**: Run `node <skill-directory>/scripts/audit_preflight.js` and load discovered AST flags into your checklist.
3. **Deep Inspection (One by One)**: Search the codebase for session routing bugs, unoptimized queries, React 18 strict mode leaks, tab-nabbing links, hydration bugs, SEO/AEO/GEO gaps, and state bugs.
4. **Verify via Tracing**: Execute build commands and manually trace every interactive UI element to its backend root.
5. **Competitive Research**: Execute web searches to analyze competitor UX and user feedback.
6. **Remediate or Flag**: Based on your Operating Mode (Mode A vs. Mode B), either document defects for rejection or apply verified fixes.
7. **Sign Off**: Generate `market_analysis_report.md` and `audit_report.md`, then deliver the final payment decision.
