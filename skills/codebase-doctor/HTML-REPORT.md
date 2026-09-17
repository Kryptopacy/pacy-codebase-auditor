# HTML Report Format

The architectural review is rendered as a single self-contained HTML file in the OS temp directory. Tailwind and Mermaid both come from CDNs (so the report needs internet to render styled — if the environment is likely offline, say so when handing over the path). Mermaid handles graph-shaped diagrams reliably; hand-built divs and inline SVG handle the more editorial visuals (mass diagrams, cross-sections). Mix the two — don't lean on Mermaid for everything, it'll start to look generic.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review — {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* small custom layer for things Tailwind doesn't cover cleanly:
         dashed seam lines, hand-drawn-feeling arrow heads, etc. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
      <footer class="text-xs text-slate-500">Run ledger: /absolute/path/to/architecture-review-&lt;timestamp&gt;.ledger.md</footer>
    </main>
  </body>
</html>
```

## Header

Repo name, date, and two compact strips:

- **Legend** — solid box = module, dashed line = seam, red arrow = leakage, thick dark box = deep module.
- **Glossary strip** — one line per term (module, interface, deep/shallow, seam, adapter, locality, leverage), each in a few plain words. A reader who has never heard the word "seam" should be able to read every card without leaving the page. No introduction paragraph — straight into the candidates.

Give every candidate card an `id` (e.g. `id="candidate-order-intake"`) so the top-recommendation anchor link works.

## Candidate card

The diagrams carry the weight. Prose is sparse, plain, and uses the glossary terms without ceremony — but **plain English comes first**: every Problem and Solution line must be understandable by a reader who skipped the glossary; the vocabulary sharpens the claim, it doesn't gate it.

Each candidate is one `<article>`:

- **Title** — short, names the deepening (e.g. "Collapse the Order intake pipeline").
- **Badge row** — recommendation strength (`Strong` = emerald, `Worth exploring` = amber, `Speculative` = slate), plus a tag for the dependency category (`in-process`, `local-substitutable`, `ports & adapters`, `mock`). Badge text must meet contrast on its background — emerald-700 on emerald-100, not emerald-500 on white.
- **Files** — monospaced list, `font-mono text-sm`. Real paths from the repo, exactly as they appear — never invented or prettied-up names.
- **Evidence** — the receipts, 1–3 bullets, each a number or reference a reader could verify: churn counts, interface surface vs implementation size, call-site counts, test coverage reality. A card with no evidence doesn't ship; it's a hunch, and hunches belong in the conversation, not the report.
- **Before / After diagram** — the centrepiece. Two columns, side by side. See patterns below.
- **Problem** — one sentence. What hurts.
- **Solution** — one sentence. What changes.
- **Wins** — bullets, ≤6 words each. e.g. "Tests hit one interface", "Pricing logic stops leaking", "Delete 4 shallow wrappers".
- **ADR callout** (if applicable) — one line in an amber-tinted box.

No paragraphs of explanation. If the diagram needs a paragraph to be understood, redraw the diagram.

## Diagram patterns

Pick the pattern that fits the candidate. Mix them. Don't make every diagram look the same — variety is part of the point.

### Mermaid graph (the workhorse for dependencies / call flow)

Use a Mermaid `flowchart` or `graph` when the point is "X calls Y calls Z, and look at the mess." Wrap it in a Tailwind-styled card so it doesn't feel parachuted in. Style with classDef to colour leakage edges red and the deep module dark. Sequence diagrams work well for "before: 6 round-trips; after: 1."

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

**Mermaid gotchas** — the number-one way these reports break is a diagram that silently renders as raw text:

- Node labels containing punctuation (`(`, `)`, `,`, `:`) must be quoted: `A["calculatePrice(order, tax)"]` — unquoted parentheses break the parser.
- Keep diagrams under ~15 nodes; more than that and Mermaid's auto-layout turns to mush. If the graph is bigger, the diagram is making a different point than you think — crop to the subgraph that matters.
- No HTML inside Mermaid labels; plain text only.
- If a hand-built diagram would communicate the same thing, prefer the hand-built one — Mermaid is for when the *shape of the graph* is the point.

### Hand-built boxes-and-arrows (when Mermaid's layout fights you)

Modules as `<div>`s with borders and labels. Arrows as inline SVG `<line>` or `<path>` elements positioned absolutely over a relative container. Reach for this when you want the "after" diagram to feel like one thick-bordered deep module with greyed-out internals — Mermaid won't render that with the right weight.

### Cross-section (good for layered shallowness)

Stack horizontal bands (`h-12 border-l-4`) to show layers a call passes through. Before: 6 thin layers each doing nothing. After: 1 thick band labelled with the consolidated responsibility.

### Mass diagram (good for "interface as wide as implementation")

Two rectangles per module — one for interface surface area, one for implementation. Before: interface rectangle is nearly as tall as the implementation rectangle (shallow). After: interface rectangle is short, implementation rectangle is tall (deep).

### Call-graph collapse

Before: a tree of function calls rendered as nested boxes. After: the same tree collapsed into one box, with the now-internal calls shown faded inside it.

## Style guidance

- Lean editorial, not corporate-dashboard. Generous whitespace. Serif optional for headings (`font-serif` works well with stone/slate).
- Colour sparingly: pick **one** accent (emerald or indigo) and lock it for the whole report, plus red for leakage and amber for warnings. No gradient-heavy "AI landing page" look, no purple-on-purple, no glow effects.
- No emoji decoration, no decorative numbering eyebrows ("01 / CANDIDATES"), no filler badges. The report's authority comes from evidence, not ornament.
- Every number in a diagram or card comes from the codebase — churn counts, call sites, file sizes. Never invent plausible-looking figures.
- Keep diagrams ~320px tall so before/after sits comfortably side by side without scrolling.
- Use `text-xs uppercase tracking-wider` for module labels inside diagrams — they should read as schematic, not as UI.
- The only scripts are the Tailwind CDN and the Mermaid ESM import. The report is otherwise static — no app code, no interactivity beyond Mermaid's own rendering.

## Top recommendation section

One larger card. Candidate name, one sentence on why, anchor link to its card. That's it.

## Before handing over

Run the verifier: `python <skill-dir>/scripts/verify-report.py <report-path> --repo <repo-root>`. It mechanically checks the report — size, CDN references, glossary strip, card fields and badges, anchor links, Mermaid diagram types and bracket balance, placeholder text, and (with `--repo`) that every file path cited in a card's **Files or Evidence** actually exists in the repo — hallucinated citations fail the run; proposed new paths in Solution warn. Fix what it flags and re-run until the hard checks pass; warnings are judgement calls the auditor owns. Then do the one pass the script can't: eyeball that each diagram actually communicates its candidate. Then tick the phase-3 boxes in the run ledger — an unticked box means the work isn't done, not that the box is wrong.

## Tone

Plain English, concise — but the architectural nouns and verbs come straight from the vocabulary (module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality). Concision is not an excuse to drift.

**Use exactly:** module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality.

**Never substitute:** component, service, unit (for module) · API, signature (for interface) · boundary (for seam) · layer, wrapper (for module, when you mean module).

**Phrasings that fit the style:**

- "Order intake module is shallow — interface nearly matches the implementation."
- "Pricing leaks across the seam."
- "Deepen: one interface, one place to test."
- "Two adapters justify the seam: HTTP in prod, in-memory in tests."

**Wins bullets** name the gain in glossary terms: *"locality: bugs concentrate in one module"*, *"leverage: one interface, N call sites"*, *"interface shrinks; implementation absorbs the wrappers"*. Don't write *"easier to maintain"* or *"cleaner code"* — those terms aren't in the glossary and don't earn their place.

No hedging, no throat-clearing, no "it's worth noting that…". If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it. If a term isn't in the vocabulary, reach for one that is before inventing a new one.
