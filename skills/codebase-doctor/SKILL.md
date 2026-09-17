---
name: codebase-doctor
description: Architecture audit for any codebase, expert or vibe-coded — scan for deepening opportunities (shallow modules, leaky seams, test-hostile interfaces), present them as a visual HTML report with evidence, then grill through the one you pick. Use for "audit my codebase", "architecture review", "where should I refactor?", "is my code a mess?"
metadata:
  version: 1.0.0
---

# Improve Codebase Architecture

Surface structural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability: a deep codebase is one where both a test suite and a coding agent can change behavior by touching one place.

The report's audience runs from staff engineer to first-time vibecoder. Write every finding so it reads in plain English first, with the vocabulary below adding precision on top — never as a gate.

## Scope

In scope: **structure** — module depth, seams, coupling, test surface, locality of changes.
Out of scope: security, dependency versions, performance, dead code, style. If the user asks for those, say what this audit covers and point them at the right tool (a linter, a dependency audit, a profiler) instead of stretching this report to cover it.

## Vocabulary

The audit and its report use a fixed vocabulary, defined here so the skill is self-contained. Use these terms exactly — don't drift into "component," "service," "API," or "boundary." Each word names one precise idea; the shared vocabulary is what makes the report's claims checkable and the follow-up conversation cheap. If a `/codebase-design` skill is installed, read it for the fuller treatment — this section is the working subset.

- **module** — a cohesive unit of code: a file, class, package, or function, whichever grouping makes the point.
- **interface** — what a caller must understand to use a module: name, parameters, return shape, errors, behavior. The whole contract, not just the type signature.
- **implementation** — the code behind the interface that callers never need to read.
- **deep / shallow** — a module is **deep** when its interface is small relative to the functionality it hides; **shallow** when the interface is nearly as complex as the implementation. Shallow modules add ceremony without hiding anything.
- **seam** — a place where one implementation can be swapped for another without touching callers (a database behind a repository, a clock behind an injected function).
- **adapter** — the concrete code that fills a seam (Postgres repo, in-memory repo, HTTP client, mock).
- **locality** — when a change to one idea lands in one place. Low locality means a single logical change scatters across files.
- **leverage** — value hidden behind an interface, divided by the interface's size. Deepening raises leverage: one small interface, N call sites served.

Three principles do the actual work:

- **The deletion test.** Suspect a module is shallow? Ask: if we deleted it and pushed its code into its callers, would complexity concentrate (it's earning its keep) or merely move (it's a shallow wrapper)? "Just moves" is the shallowness signal.
- **The interface is the test surface.** A module is testable exactly to the degree its interface lets a test drive it. If tests must reach into internals, mock half the app, or boot the world, the interface — not the test — is what's wrong.
- **One adapter is a hypothetical seam; two make it real.** Extracting a seam with a single implementation is speculation. The seam earns its complexity when the second adapter appears — usually the in-memory test double.

## Process

### 0. Run ledger — the run's durable memory

Long audits dilute attention. The skill's instructions are loaded once at the start; by the time you've read fifty files, the protocol has faded — and on a long enough run your context may be summarized mid-task, taking the plan with it. The ledger is the antidote: a single working file that holds what's done, what remains, and the run's key facts, so any moment of doubt is answered by re-reading one page instead of guessing.

Create it **before any exploration** — same temp dir and timestamp the report will use, `architecture-review-<timestamp>.ledger.md` — with this content:

```markdown
# Architecture audit ledger — <repo>, <date>
Report path: (fill in when written) · Current phase: 1-scope

## 1. Scope
- [ ] Direction taken or hot spots identified — list them in Notes
- [ ] CONTEXT.md / CONTEXT-MAP.md read, or noted absent
- [ ] ADRs in the touched area read, or noted absent
Notes:

## 2. Explore
- [ ] Friction questions run across all scoped areas, not just entry points
- [ ] Areas examined vs excluded recorded in Notes, with reasons
- [ ] Every candidate carries evidence (churn / surface / call sites / tests)
- [ ] Load-bearing numbers behind Strong badges verified firsthand, not just claimed by a subagent
- [ ] Honest verdict considered — is any of this actually fine as is?
Notes (candidates so far, one line of evidence each):

## 3. Report
- [ ] Written to temp dir, NOT the repo — path recorded above
- [ ] Report footer records `Run ledger: <absolute path>` — the verifier hard-fails if that file doesn't exist on disk
- [ ] Opened in browser, absolute path given to user
- [ ] Header has legend + plain-English glossary strip
- [ ] Every card: Files, Evidence, Problem, Solution, Wins, diagram, badge
- [ ] 3–6 cards — or an honest few/no-candidates verdict
- [ ] ADR conflicts marked with callouts, or confirmed none
- [ ] Top recommendation present, anchor link resolves
- [ ] Verifier passed: `scripts/verify-report.py --repo <root>`, failures fixed and re-run
- [ ] User asked: "Which of these would you like to explore?"
Notes:

## 4. Grill (after the user picks)
- [ ] Decision tree walked in order: constraints → seam → interface → tests → migration
- [ ] Interface designed twice — two candidates compared
- [ ] CONTEXT.md updated for new/sharpened terms, or nothing to record
- [ ] ADR offered for load-bearing rejections, or nothing to record
- [ ] Final block written: name, interface, what it hides, first migration step
Notes:
```

Work the protocol against it:

- **Update at phase boundaries, not per tool call** — this is a ledger, not a log. Tick the boxes and add a line of notes as each phase completes. During exploration (the longest phase) keep the areas-examined and candidate notes current.
- **Re-read the ledger before starting each new phase**, and again before claiming any phase — or the run — complete.
- **Tick a box only when the work is genuinely done.** If you can't tick it, do the work — never tick a box to close a run. If the user explicitly truncates the run ("skip the report, just tell me the top issue"), record that decision in Notes and deliver honestly-labelled partial output; don't silently downgrade the protocol.
- If your context is ever summarized mid-run, re-read the ledger first — it is the source of truth for where you are.

The run is **not** complete while any of these hold: the report was written inside the repo; any card lacks evidence; the glossary strip is missing; the user hasn't been asked which candidate to explore; interfaces were proposed or implementation started uninvited; the ledger's **phase 1–3** boxes are unticked with no recorded user decision to skip them. Phase-4 (grill) boxes only activate once the user picks a candidate — ending a run at "Which of these would you like to explore?" with phase 4 untouched is a legitimate stop, not a violation.

### 1. Scope — decide where to look before looking

Deepening pays off by making *future changes* easier, so weight the parts that are actively changing:

- If the user named a direction — a module, a subsystem, a pain point — take it and skip the inference below.
- Otherwise find the hot spots: walk back a stretch of the commit history and count which files and directories recur (e.g. `git log --format= --name-only -500 | sort | uniq -c | sort -rn | head -40`). Files that keep changing together are where friction compounds.
- No git history worth reading? Fall back to size outliers, entry points, and what the user has been fighting lately — ask one question, then explore.

Read the domain docs before exploring — they say what the code is *trying* to be:

- `CONTEXT.md` at the repo root (or `CONTEXT-MAP.md` in a multi-context repo, pointing at per-area `CONTEXT.md` files)
- ADRs in `docs/adr/` (and `src/*/docs/adr/` in multi-context repos) — decisions already made; this audit doesn't re-litigate them
- If they don't exist, proceed silently. Don't flag their absence — this skill creates them lazily, later, when there's something real to record.

Use the glossary's vocabulary when naming things: if `CONTEXT.md` defines "Order," talk about "the Order intake module," not "the FooBarHandler."

### 2. Explore — gather evidence, not opinions

If your environment has a read-only exploration subagent (e.g. an Explore agent), delegate the walk with a tight brief: the friction questions below, the vocabulary above, and the required output format — candidates with evidence (file paths, counts), the areas covered and skipped, and no proposed fixes. Otherwise explore directly. Either way this step's output is the same: **candidates with evidence attached**. If you did delegate, verify the load-bearing numbers yourself before they reach a Strong badge — recount the call sites or the churn with one quick command. A subagent's conclusion is a claim; the report should carry your numbers.

Record in the ledger which areas you examined and which you excluded, with reasons. "Audited src/, skipped migrations/" is coverage information, not paperwork — it's what stops a quarter of the codebase from being silently presented as the whole audit.

Explore organically — no rigid checklist — and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation? Run the deletion test on each suspect.
- Where have pure functions been extracted "for testability" while the real bugs hide in how they're wired together — no **locality**?
- Where do tightly-coupled modules leak across their **seams**? Where do imports run backwards or in cycles — a lower layer reaching up, two modules importing each other? A dependency arrow pointing the wrong way is a seam that was never drawn.
- Which modules are untested or hard to test *through their interface*? Do existing tests mock heavily, boot the world, or reach into internals?
- Where does the same handful of fields travel together through signature after signature? A parameter clump that never gets named is a missing data abstraction — name it and deepen it.
- Where do errors get caught, rewrapped, and rethrown at every layer? Each translation step is a shallow module telling on itself.
- Where does one concept have several implementations and several names? Duplicates and naming drift are the signature pathologies of AI-assisted codebases — and they break navigability twice over, because grep can't find what has four names.
- How many files would a newcomer — or a coding agent — have to open to answer one question about a concept? Five or more is evidence in itself.

Every candidate must carry **evidence** — numbers and file references a reader can verify:

- churn: "these 6 files changed together in 9 of the last 30 commits"
- surface: "18 exports, 31 parameters across the public surface; the implementation is 240 lines"
- call sites: "42 call sites, each passing the same 5-field config object"
- tests: "0 tests touch this module; the nearest ones mock 7 collaborators"

Cheap commands that turn hunches into evidence (adapt to the language; `rg` → `grep -rn` if unavailable):

```bash
git log --format= --name-only -500 | sort | uniq -c | sort -rn | head -40   # churn / hot spots
rg -c "processOrder" src/                                                    # call sites
wc -l src/orders/*.ts | sort -rn | head                                      # size outliers
ls src/orders/*test* 2>/dev/null | wc -l                                     # test presence in the area
```

A candidate with no evidence is a hunch — downgrade it or drop it. **If nothing earns a card, say so.** "No strong candidates; here's what's already deep and why" is a successful audit — manufacturing refactor proposals to fill a quota is the failure mode. Cap the report at **three to six candidates**; fewer, better-argued cards beat a wall of maybes.

### 3. Report — a visual HTML file the user reads, not a log

Write a single self-contained HTML file **outside the repo** — nothing this skill runs should dirty the working tree:

- Resolve the temp dir for your platform: `$TMPDIR` → `$TEMP`/`$TMP` → `/tmp` on Unix; `%TEMP%` or `%TMP%` on Windows. In Git Bash on Windows, `cygpath -w <path>` converts a POSIX path to a Windows one when opening.
- Name it `architecture-review-<timestamp>.html` so each run gets a fresh file.
- Open it in the user's browser — `xdg-open` (Linux), `open` (macOS), `start` or `cmd /c start` (Windows) — and tell them the absolute path.

Follow [HTML-REPORT.md](HTML-REPORT.md) for the scaffold, card layout, diagram patterns, and tone. The essentials:

- Each candidate is a card: **Files, Evidence, Problem, Solution, Wins, before/after diagram, recommendation badge** (`Strong` / `Worth exploring` / `Speculative`).
- A badge is earned by evidence: `Strong` needs demonstrated, recurring pain; `Speculative` is for "the shape would be nicer." Don't dress aesthetics up as urgency.
- The header carries a one-line-per-term glossary strip so a reader who has never heard the word "seam" can still read every card. Domain terms come from `CONTEXT.md`; architecture terms from the vocabulary above.
- **ADR conflicts**: if a candidate contradicts an existing ADR, surface it only when the friction is real enough to warrant revisiting the ADR, and mark it clearly (an amber callout: *"contradicts ADR-0007 — but worth reopening because…"*).
- End with a **Top recommendation** — which card you'd tackle first, and why.

Do NOT propose interfaces yet — this step is diagnosis. After writing the file, verify it mechanically: run `python <skill-dir>/scripts/verify-report.py <report-path> --repo <repo-root>` (the skill's base directory is shown when it loads). The verifier checks structure, glossary completeness, card fields, badges, anchor links, Mermaid diagram types and bracket balance, placeholder text, and — with `--repo` — it **fails the run** if any file path cited in a card's Files or Evidence section doesn't exist in the repo (the anti-hallucination guarantee); proposed new paths in Solution and elsewhere warn instead. Fix what it flags, re-run until the hard checks pass, and own the warnings (a warning you can't justify is a finding). Then tick the phase-3 boxes in the ledger and ask the user: **"Which of these would you like to explore?"**

### 4. Grill the chosen candidate

The user picks a card; now converge on an actual design. If a grilling skill is installed (`/grilling`, `/grill-with-docs`), run it with the protocol below; otherwise run the protocol inline:

- **One question at a time.** Wait for the answer before the next. A grilling is a conversation, not a survey.
- Adapt to the user: if they answer in trade-offs, go deeper; if they're unsure, propose a default and explain it in plain English. Never bluff past a question they can't answer — that's the moment to lay out the trade-off.
- Walk the decision tree in order:
  1. **Constraints** — what can't change? Public API, schema, deadlines, other teams' callers.
  2. **The seam** — what sits behind it after the deepening? Which collaborators become internal?
  3. **The interface** — design it twice: sketch at least two candidate interfaces before settling, and compare them on interface size, what they hide, what the tests would look like, and how each handles failure — the deeper interface often defines errors out of existence (eliminates the exceptional case) instead of exposing it.
  4. **Tests** — which existing tests survive unchanged, which get simpler, which get deleted? If a test still has to mock five things, the interface is still wrong.
  5. **Migration** — can it land incrementally, or is it a rewrite? What's the smallest first step that delivers value?

Record decisions as they crystallize — docs are a side effect of the conversation, not a chore after it:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term. Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term mid-conversation?** Update `CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR: *"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"* Only when a future explorer would actually need it — skip ephemeral reasons ("not worth it right now") and self-evident ones.

Finish when the deepened module is described in one block — its name, interface, what it hides, and the first migration step. Tick the phase-4 boxes, offer to write that up (issue, ADR, or implementation plan), and stop; don't start implementing uninvited.
