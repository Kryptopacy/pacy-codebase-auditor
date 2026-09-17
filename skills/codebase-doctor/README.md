# Codebase Doctor

An architecture audit for any codebase — expert or vibe-coded. It scans for **deepening opportunities** (shallow modules, leaky seams, test-hostile interfaces), presents them as a visual HTML report where every finding carries verifiable evidence, then walks you through a structured grilling of the one you pick until the design converges.

Built for two audiences at once: staff engineers get a precise, Ousterhout-style vocabulary (module depth, seams, locality, leverage, the deletion test); vibecoders get plain-English findings, a glossary strip in every report, and a grilling loop that adapts to their level.

> This repo ships two complementary skills. **developer-pay-handoff-simulator** answers *"did the developer deliver working code — and is it real, safe and launch-ready?"* — an 8-pillar acceptance audit ending in a payment sign-off verdict. This one answers *"where should we refactor?"* — structure only, stack-agnostic, ending in a converged design.

## Why this exists

Most "audit my codebase" runs produce vibes: plausible-sounding problems with no receipts, generic advice that could apply to any repo, and agents that stop halfway through and claim to be done. This skill is built against those failure modes:

- **Evidence discipline** — every candidate carries verifiable numbers: churn ("these 6 files changed together in 9 of the last 30 commits"), interface surface vs implementation size, call-site counts, test reality. No evidence, no card.
- **Honesty clause** — if the codebase is healthy, the correct output is "no strong candidates; here's what's already deep and why." Manufacturing refactors to fill a report is the named failure mode.
- **Run ledger** — the agent maintains a checklist file on disk, updated at every phase boundary, and cannot claim completion while boxes are unticked. Survives context compaction mid-run.
- **Mechanical verification** — a stdlib-only script verifies the finished report: card completeness, anchor links, Mermaid syntax lints, placeholder text, and — the anti-hallucination check — that every file path the report mentions actually exists in your repo.

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
evals/evals.json            6 eval prompts incl. anti-fabrication and premature-completion cases
agents/openai.yaml          OpenAI agents packaging
```

## Development

The eval suite describes expected behavior for six scenarios — vibecoder casual, engineer-scoped, healthy codebase (must not invent problems), non-git folder, ADR conflict, and large repo (must not stop halfway). Two evals need fixture repos. Run the verifier against any report you generate:

```bash
python skills/codebase-doctor/scripts/verify-report.py <report.html> --repo <repo-root>
```

(from the repo root; if you copied just this skill folder, the path is relative to wherever it lives.)

## License

MIT — see [LICENSE](../../LICENSE).
