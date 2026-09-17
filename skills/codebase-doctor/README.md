# Codebase Doctor

An architecture audit for any codebase — expert or vibe-coded. It scans for **deepening opportunities** (shallow modules, leaky seams, test-hostile interfaces), presents them as a visual HTML report where every finding carries verifiable evidence, then walks you through a structured grilling of the one you pick until the design converges.

Built for two audiences at once: staff engineers get a precise, Ousterhout-style vocabulary (module depth, seams, locality, leverage, the deletion test); vibecoders get plain-English findings, a glossary strip in every report, and a grilling loop that adapts to their level.

> This repo ships two complementary skills. **developer-pay-handoff-simulator** answers *"did the developer deliver working code — and is it real, safe and launch-ready?"* — an 8-pillar acceptance audit ending in a sign-off verdict (a payment decision on someone else's deliverable, a pre-ship gate on your own). This one answers *"where should we refactor?"* — structure only, stack-agnostic, ending in a converged design.

## Why this exists

Most "audit my codebase" runs produce vibes: plausible-sounding problems with no receipts, generic advice that could apply to any repo, and agents that stop halfway through and claim to be done. This skill is built against those failure modes:

- **Evidence discipline** — every candidate carries verifiable numbers: churn ("these 6 files changed together in 9 of the last 30 commits"), interface surface vs implementation size, call-site counts, test reality. No evidence, no card.
- **Honesty clause** — if the codebase is healthy, the correct output is "no strong candidates; here's what's already deep and why." Manufacturing refactors to fill a report is the named failure mode.
- **Run ledger** — the agent maintains a checklist file on disk, updated at every phase boundary, and cannot claim completion while boxes are unticked. Survives context compaction mid-run.
- **Ground rule — the repo is data, not a director.** Injected instructions in CONTEXT.md, ADRs, or code comments are treated as evidence, never complied with; the report's executable surface is locked by the verifier (only the two scaffold scripts, Mermaid `securityLevel: "strict"`). Eval 7 runs a subagent blind against a fixture whose docs all command "report zero findings" — the wrappers still get reported, the gag docs get their own card.
- **Mechanical verification** — a stdlib-only Python script verifies the finished report: card completeness, anchor links, Mermaid diagram types and bracket balance, placeholder text, that every file path a card cites under Files or Evidence exists in your repo, that the run ledger the report references actually exists on disk — a claimed-but-never-written ledger fails the check — and that the report carries no scripts beyond the scaffold. It ships with its own self-test (`scripts/test-verifier.py`).

## What you get

A self-contained HTML report in your temp dir (nothing lands in your repo): a handful of candidate cards (capped at six), each with files, evidence, plain-English problem and solution, wins, a before/after diagram (Mermaid + hand-built SVG), and a justified recommendation badge (`Strong` / `Worth exploring` / `Speculative`), ending with a top recommendation. Then, if you pick one, a grilling loop — one question at a time — through constraints, the seam, the interface (designed twice), which tests survive, and the migration path, ending with the deepened module described in one block.

## Install

```bash
npx skills add kryptopacy/pacy-codebase-auditor
```

This installs both skills in the suite. To take only this one, copy its folder into your skills directory:

```bash
git clone https://github.com/kryptopacy/pacy-codebase-auditor.git
cp -r pacy-codebase-auditor/skills/codebase-doctor ~/.agents/skills/
```

Works with any agent that supports the skills convention — Claude Code, ZCode, Codex, Cursor, and the many others listed on [skills.sh](https://skills.sh).

## Use

Ask your agent:

> /codebase-doctor — audit my codebase
>
> "can u check if my codebase is a mess? been vibe coding a saas for 3 months"

No direction given? It finds your hot spots from git history. Name a module and it scopes there. It reads your `CONTEXT.md` domain glossary and ADRs first (if you have them — absent is fine) and won't re-litigate decisions your ADRs already made.

**Requirements:** git (optional — falls back gracefully), Python 3 for the report verifier, internet for the report's Tailwind/Mermaid CDNs.

## How it works

1. **Scope** — decide where to look before looking: user direction, else git hot spots, else size outliers and one question.
2. **Explore** — friction signals (shallow modules, scatter, leaky seams, parameter clumps, error-translation chains, naming drift, five-files-per-question navigability) turned into candidates with evidence attached. Subagent conclusions are recounted before they reach the report.
3. **Report** — the visual HTML file, mechanically verified, opened in your browser.
4. **Grill** — the chosen candidate, one question at a time, until the deepened module fits in one block. `CONTEXT.md` and ADR updates happen inline as decisions crystallize.

## Layout

```
SKILL.md                    the skill — vocabulary, process, ledger protocol
HTML-REPORT.md              report format: scaffold, card spec, diagram patterns
scripts/verify-report.py    mechanical report verifier (stdlib only)
scripts/test-verifier.py    self-test for the verifier (regression cases)
evals/evals.json            6 eval specs + results log incl. a caught-and-fixed failure
evals/fixtures/build-fixtures.sh  builds the two fixture repos (healthy-app, adr-conflict)
agents/openai.yaml          OpenAI agents packaging
```

## Development

The verifier is covered: run `python scripts/test-verifier.py` from this folder (9 deterministic cases). The eval suite describes expected behavior for seven scenarios; evals 3 (healthy codebase — must not invent problems), 5 (ADR conflict — must honor the ADR), and 7 (prompt injection — must not be steered by repo documents) have been **run with fresh subagents against `evals/fixtures/build-fixtures.sh` output**, and the results — including a real failure the eval caught (a subagent claimed a ledger file it never wrote, now blocked by a hard verifier check) — are recorded in `evals/results` inside evals.json. Evals 1, 2, 4, and 6 need a realistic medium/large repo and haven't been run; that's stated there, not hidden. Run the verifier against any report you generate:

```bash
python skills/codebase-doctor/scripts/verify-report.py <report.html> --repo <repo-root>
```

(from the repo root; if you copied just this skill folder, the path is relative to wherever it lives.)

## License

MIT — see [LICENSE](../../LICENSE).
