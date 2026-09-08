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
  mermaid   every mermaid block is non-empty (syntax lint is a warning)
  clean     no placeholder text (TODO, FIXME, lorem, unfilled {{ }})

Warnings (never fail the run, but each one deserves a look):
  digits    a card contains no numbers - evidence should carry counts
  card-id   a card has no id - the top-recommendation anchor needs one
  mermaid   unquoted parentheses in a Mermaid node label (the #1 way
            diagrams silently render as raw text)
  paths     with --repo: file paths mentioned in the report that don't
            exist in the repo (hallucinated, or abbreviated in the report)

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


def check_paths(html, repo):
    files = index_repo_files(repo)
    # script/style content is code and CDN URLs, not repo paths - keep it out
    body = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", " ", html, flags=re.S | re.I)
    tokens = set(re.findall(r"[\w./\\-]+\.[A-Za-z0-9]+", strip_tags(body)))
    unknown = []
    for token in sorted(tokens):
        norm = token.replace("\\", "/").rstrip(".")
        norm = re.sub(r"(\.{3}|…)$", "", norm).strip()
        if not norm.lower().endswith(EXTS):
            continue
        if os.path.exists(os.path.join(repo, norm)):
            continue
        if any(f.endswith(norm) or f.endswith("/" + norm) for f in files):
            continue
        unknown.append(token)
    for token in unknown[:20]:
        warn("paths", f'"{token}" does not match any file in the repo - hallucinated, or abbreviated?')


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

    blocks = re.findall(r'class="mermaid"[^>]*>(.*?)</(?:pre|div)>', html, re.S | re.I)
    for i, block in enumerate(blocks, 1):
        if not block.strip():
            fail("mermaid", f"mermaid block {i} is empty")
            continue
        for m in re.finditer(r"\[([^\]\"]*)\]", block):
            if "(" in m.group(1) or ")" in m.group(1):
                warn("mermaid", f'block {i}: unquoted parentheses in label {m.group(0)} - quote it, e.g. A["{m.group(1)}"]')
    # no mermaid blocks at all is legal - hand-built diagrams carry the report

    if re.search(r"\b(TODO|FIXME|TBD|XXX)\b", html) or re.search(r"\blorem\b", html, re.I) or "{{" in html:
        m = re.search(r"\b(TODO|FIXME|TBD|XXX)\b|\blorem\b|\{\{[^}]*\}\}", html, re.I)
        fail("clean", f"placeholder text survived: {m.group(0)!r}")

    if args.repo:
        if os.path.isdir(args.repo):
            check_paths(html, args.repo)
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
