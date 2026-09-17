#!/usr/bin/env python3
"""Mechanical verification for the architecture-review HTML report.

Usage:
    python verify-report.py REPORT.html [--repo REPO_ROOT]

Hard checks (any failure exits 1):
  file      report exists and is non-trivial (> 2 KB)
  cdns      Tailwind and Mermaid CDN scripts are referenced
  glossary  all seven vocabulary terms appear in the header strip
  cards     1-6 candidate cards, or an explicit "no candidates" verdict
  fields    every card has Files, Evidence, Problem, Solution, Wins labels
  badges    every card carries Strong / Worth exploring / Speculative
  anchors   every href="#..." resolves to an existing id
  ledger    the report records its run ledger ("Run ledger: <path>") and
            that ledger file actually exists on disk - a claimed-but-never-
            written ledger is a known agent failure mode
  scripts   the only <script> tags are the Tailwind CDN and the pinned
            Mermaid module import, and securityLevel is "strict" - the
            report embeds untrusted repo strings into a browser page
  mermaid   blocks declare a known diagram type and balance their brackets
  clean     no placeholder text (TODO, FIXME, lorem, unfilled {{ }})
  paths     with --repo: every file path cited inside a card's Files or
            Evidence section exists in the repo - the anti-hallucination
            guarantee, now enforced where it matters (proposed new paths
            live in Solution and only warn)

Warnings (never fail the run, but each one deserves a look):
  digits    a card contains no numbers - evidence should carry counts
  card-id   a card has no id - the top-recommendation anchor needs one
  mermaid   unquoted parentheses in a Mermaid node label (the #1 way
            diagrams silently render as raw text)
  paths     file paths mentioned elsewhere in the report that don't
            exist in the repo (proposed files, or abbreviations)

The output is a checklist: paste it into the run ledger's phase-3 notes.
Zero failures is the bar; warnings are judgement calls the auditor owns.
"""

import argparse
import os
import re
import sys

VOCAB = ["module", "interface", "seam", "deep", "shallow", "locality", "leverage"]
FIELDS = ["Files", "Evidence", "Problem", "Solution", "Wins"]
BADGES = ["Strong", "Worth exploring", "Speculative"]
# mermaid@11 is pinned by the scaffold, so this list is closed:
# a first line starting with anything else renders as an error blob.
MERMAID_TYPES = {
    "graph", "flowchart", "sequenceDiagram", "classDiagram", "class",
    "stateDiagram", "stateDiagram-v2", "erDiagram", "journey", "gantt",
    "pie", "quadrantChart", "requirementDiagram", "gitGraph", "mindmap",
    "timeline", "packet", "architecture", "block", "xychart", "sankey",
    "ishikawa", "kanban", "ruml",
}
EXTS = (
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java",
    ".rb", ".php", ".cs", ".swift", ".kt", ".c", ".h", ".cpp", ".hpp", ".scala",
    ".ex", ".exs", ".hs", ".sh", ".sql", ".vue", ".svelte", ".md", ".json",
    ".yaml", ".yml", ".toml", ".env",
)

failures = []
warnings = []


def fail(check, msg):
    failures.append(f"FAIL [{check}] {msg}")


def warn(check, msg):
    warnings.append(f"WARN [{check}] {msg}")


def strip_tags(html):
    return re.sub(r"<[^>]+>", " ", html)


def index_repo_files(repo):
    """All file paths under repo (except .git), as posix relative strings."""
    files = set()
    for root, dirs, names in os.walk(repo):
        dirs[:] = [d for d in dirs if d != ".git"]
        for name in names:
            full = os.path.join(root, name)
            rel = os.path.relpath(full, repo).replace(os.sep, "/")
            files.add(rel)
    return files


def path_tokens(text):
    """Extension-bearing path-like tokens in plain text."""
    out = []
    for token in re.findall(r"[\w./\\-]+\.[A-Za-z0-9]+", text):
        norm = token.replace("\\", "/").rstrip(".")
        norm = re.sub(r"(\.{3}|…)$", "", norm).strip()
        if norm.lower().endswith(EXTS):
            out.append((token, norm))
    return out


# Convention docs a report may cite as present-or-absent without them being
# in the audited repo (the skill reads CONTEXT.md "if present").
MENTION_ONLY = re.compile(r"^(?:CONTEXT-MAP|CONTEXT|README|LICENSE|CHANGELOG|CONTRIBUTING)\.md$", re.I)


def unknown_paths(text, repo, files):
    bad = []
    for token, norm in path_tokens(text):
        base = os.path.basename(norm)
        if MENTION_ONLY.match(base):
            continue
        if os.path.exists(os.path.join(repo, norm)):
            continue
        if any(f.endswith(norm) or f.endswith("/" + norm) for f in files):
            continue
        bad.append(token)
    return bad


def card_field_regions(card_html):
    """{field: plain-text slice} for a card; each region ends at the next field label."""
    text = strip_tags(card_html)
    marks = []
    for f in FIELDS:
        m = re.search(rf"\b{f}\b", text)
        if m:
            marks.append((m.start(), m.end(), f))
    marks.sort()
    regions = {}
    for i, (start, end, f) in enumerate(marks):
        stop = marks[i + 1][0] if i + 1 < len(marks) else len(text)
        regions[f] = text[end:stop]
    return regions


def check_paths(html, cards, repo):
    files = index_repo_files(repo)
    # script/style content is code and CDN URLs, not repo paths - keep it out
    body = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", " ", html, flags=re.S | re.I)
    hard_msgs, soft_msgs = [], []
    for i, card in enumerate(cards, 1):
        for field, region in card_field_regions(card).items():
            for token in unknown_paths(region, repo, files):
                if field in ("Files", "Evidence"):
                    hard_msgs.append(f"card {i}: {token!r} cited under {field} does not exist in the repo")
                else:
                    soft_msgs.append(f"card {i} {field}: {token!r} is not a repo file (proposed path?)")
    outside = body
    for card in cards:
        outside = outside.replace(card, " ", 1)
    for token in unknown_paths(strip_tags(outside), repo, files):
        soft_msgs.append(f'"{token}" outside the cards does not match any repo file')
    for msg in hard_msgs[:20]:
        fail("paths", msg)
    if len(hard_msgs) > 20:
        fail("paths", f"...and {len(hard_msgs) - 20} more bad citations - fix and re-run")
    for msg in soft_msgs[:20]:
        warn("paths", msg)


def main():
    ap = argparse.ArgumentParser(description="Verify an architecture-review HTML report.")
    ap.add_argument("report", help="path to the report .html")
    ap.add_argument("--repo", help="repo root, enables file-path existence checks")
    args = ap.parse_args()

    if not os.path.isfile(args.report):
        print(f"FAIL [file] report not found: {args.report}")
        sys.exit(1)

    with open(args.report, encoding="utf-8", errors="replace") as fh:
        html = fh.read()

    if len(html) < 2000:
        fail("file", f"report is only {len(html)} bytes - likely empty or a stub")

    if "cdn.tailwindcss.com" not in html:
        fail("cdns", "Tailwind CDN script missing")
    if "mermaid" not in html.lower():
        fail("cdns", "Mermaid import missing")

    header = re.search(r"<header\b.*?</header>", html, re.S | re.I)
    region = header.group(0) if header else html[:6000]
    text = strip_tags(region).lower()
    missing = [t for t in VOCAB if t not in text]
    if missing:
        where = "header" if header else "top of the document (no <header> element found)"
        fail("glossary", f"glossary strip incomplete in {where} - missing: {', '.join(missing)}")

    cards = re.findall(r"<article\b.*?</article>", html, re.S | re.I)
    verdict = re.search(r"no (strong )?candidates|already deep", strip_tags(html), re.I)
    if not cards and not verdict:
        fail("cards", "no candidate cards and no honest 'no candidates' verdict")
    if len(cards) > 6:
        fail("cards", f"{len(cards)} cards - the cap is 6 (3-6 is the target)")
    for i, card in enumerate(cards, 1):
        ctext = strip_tags(card)
        for field in FIELDS:
            if not re.search(rf"\b{field}\b", ctext, re.I):
                fail("fields", f"card {i} is missing its {field} section")
        if not any(b.lower() in ctext.lower() for b in BADGES):
            fail("badges", f"card {i} has no recommendation badge")
        if not re.search(r"\d", ctext):
            warn("digits", f"card {i} contains no numbers - evidence should carry counts")
        if not re.search(r'<article\b[^>]*\bid="', card, re.I):
            warn("card-id", f"card {i} has no id - the top-recommendation anchor cannot link to it")

    hrefs = set(re.findall(r'href="#([^"]+)"', html))
    ids = set(re.findall(r'id="([^"]+)"', html))
    for h in sorted(hrefs):
        if h not in ids:
            fail("anchors", f'href="#{h}" has no matching id')

    m = re.search(r"Run ledger:\s*([^\s<]+\.ledger\.md)", html)
    if not m:
        fail("ledger", "report does not record its run ledger - add a footer line: Run ledger: <absolute path to .ledger.md>")
    elif not os.path.isfile(m.group(1)):
        fail("ledger", f"ledger path recorded in the report does not exist on disk: {m.group(1)}")

    # script inventory - the report pastes repo-derived strings into a browser
    # page, so the executable surface must be exactly the two scaffold scripts
    module_re = re.compile(
        r"import\s+mermaid\s+from\s+[\"']https://cdn\.jsdelivr\.net/npm/mermaid@[A-Za-z0-9.\-]+/dist/mermaid\.esm\.min\.mjs[\"'];?\s*"
        r"(mermaid\.initialize\(\{(?:[^{}]|\{[^{}]*\})*\}\);?\s*)?"
    )
    for attrs, content in re.findall(r"<script\b([^>]*)>(.*?)</script>", html, re.S | re.I):
        a = attrs.lower()
        if "cdn.tailwindcss.com" in a:
            continue
        if "module" in a and module_re.fullmatch(" ".join(content.split())):
            continue
        fail("scripts", f"unexpected <script {attrs.strip()[:70]}> - allowed: Tailwind CDN + pinned Mermaid module import only")
    sl = re.search(r'securityLevel\s*:\s*["\'](\w+)["\']', html)
    if sl and sl.group(1) != "strict":
        fail("scripts", f'securityLevel "{sl.group(1)}" - use "strict"; loose lets label text (from the audited repo) inject HTML')

    blocks = re.findall(r'class="mermaid"[^>]*>(.*?)</(?:pre|div)>', html, re.S | re.I)
    for i, block in enumerate(blocks, 1):
        if not block.strip():
            fail("mermaid", f"mermaid block {i} is empty")
            continue
        lines = [l.strip() for l in block.splitlines() if l.strip() and not l.strip().startswith("%%")]
        if not lines:
            fail("mermaid", f"mermaid block {i} has only comments")
            continue
        first = lines[0].split(None, 1)[0].rstrip(":;")
        base = re.sub(r"-(v\d+|beta)$", "", first)
        if first not in MERMAID_TYPES and base not in MERMAID_TYPES:
            fail("mermaid", f"block {i} starts with {first!r} - not a diagram type mermaid@11 knows; it will render as an error blob")
        joined = "\n".join(lines)
        code_only = re.sub(r'"[^"\n]*"', '""', joined)
        for open_c, close_c in (("[", "]"), ("(", ")"), ("{", "}")):
            if code_only.count(open_c) != code_only.count(close_c):
                fail("mermaid", f"block {i}: unbalanced {open_c} {close_c} ({code_only.count(open_c)} vs {code_only.count(close_c)})")
        for m in re.finditer(r"\[([^\]\"]*)\]", joined):
            if "(" in m.group(1) or ")" in m.group(1):
                warn("mermaid", f'block {i}: unquoted parentheses in label {m.group(0)} - quote it, e.g. A["{m.group(1)}"]')
    # no mermaid blocks at all is legal - hand-built diagrams carry the report

    if re.search(r"\b(TODO|FIXME|TBD|XXX)\b", html) or re.search(r"\blorem\b", html, re.I) or "{{" in html:
        m = re.search(r"\b(TODO|FIXME|TBD|XXX)\b|\blorem\b|\{\{[^}]*\}\}", html, re.I)
        fail("clean", f"placeholder text survived: {m.group(0)!r}")

    if args.repo:
        if os.path.isdir(args.repo):
            check_paths(html, cards, args.repo)
        else:
            warn("paths", f"--repo {args.repo} is not a directory - skipped path checks")

    print(f"verify-report: {args.report}")
    for line in failures:
        print(line)
    for line in warnings:
        print(line)
    print(f"{len(failures)} failed, {len(warnings)} warnings")
    if failures:
        print("Fix the failures and re-run. Do not tick the ledger's sanity box yet.")
        sys.exit(1)
    print("All hard checks pass - tick the phase-3 sanity box in the ledger.")


if __name__ == "__main__":
    main()
