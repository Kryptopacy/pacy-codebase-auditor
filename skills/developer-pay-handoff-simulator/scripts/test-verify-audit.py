#!/usr/bin/env python3
"""Self-test for verify-audit.py — deterministic regression coverage.

Builds sample audit reports and ledgers in a temp dir and asserts exit codes:

  1. good report + consistent ledger        -> exit 0
  2. missing final verdict                  -> exit 1
  3. only 7 pillar rows                     -> exit 1
  4. ledger still has an open [ ] line      -> exit 1
  5. ledger [!] count != report's count     -> exit 1
  6. [~] N/A line with no reason            -> exit 1
  7. report without ledger citation         -> exit 1

Usage: python test-verify-audit.py
"""

import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
VERIFIER = os.path.join(HERE, "verify-audit.py")

PILLARS = "\n".join(
    f"| **{i}. Pillar {i}** | focus | {'PASS' if i != 8 else 'FAIL'} | proof |"
    for i in range(1, 9)
)


def report(verdict=True, ledger_line=True):
    parts = [
        "# 🛡️ MASTER CODEBASE AUDIT & PAYMENT SIGN-OFF REPORT",
        "## 📌 Executive Summary",
        "- **Ship-Readiness Score**: 62%",
    ]
    if ledger_line:
        parts.append("- **Completeness Ledger**: audit_checklist.md — 9 surface lines closed "
                     "(6 clean / 2 defect / 1 N/A) · 2 defects filed below")
    parts += [
        "## 👔 Plain-English Business & Financial Risk Summary",
        "| Defect | Risk | Impact |\n| :--- | :--- | :--- |\n| x | y | z |",
        "## 📊 8-Pillar Empirical Scorecard",
        PILLARS,
        "## 🔍 Discovered Architectural Flaws & Applied Remediations",
        "### Unsigned webhook\n- **Severity**: CRITICAL",
        "## ⚖️ Final Sign-Off Verdict",
    ]
    if verdict:
        parts.append("🔴 REJECTED - BULLSHIT OR BROKEN CODE")
    return "\n".join(parts) + "\n"


LEDGER_GOOD = """# Audit Checklist
## Surface
- [x] / — app/page.tsx
- [x] /checkout — app/checkout/page.tsx
- [x] POST /api/webhooks/stripe
- [x] profiles
- [x] orders
- [x] inventory
- [!] POST /api/webhooks/paystack — unsigned webhook
- [!] stock decrement — non-atomic read-modify-write
- [~] llms.txt — reason: CLI tool, no AI-crawl surface
"""


def run(path, ledger=None):
    cmd = [sys.executable, VERIFIER, path]
    if ledger:
        cmd += ["--ledger", ledger]
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        good_ledger = os.path.join(tmp, "audit_checklist.md")
        with open(good_ledger, "w", encoding="utf-8") as fh:
            fh.write(LEDGER_GOOD)

        ledgers = {
            "good": LEDGER_GOOD,
            "open-line": LEDGER_GOOD + "- [ ] /admin — not yet traced\n",
            "count-mismatch": LEDGER_GOOD.replace("- [!] stock decrement — non-atomic read-modify-write\n", ""),
            "reasonless": LEDGER_GOOD.replace("— reason: CLI tool, no AI-crawl surface", ""),
        }
        ledger_paths = {}
        for name, content in ledgers.items():
            p = os.path.join(tmp, f"ledger-{name}.md")
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(content)
            ledger_paths[name] = p

        cases = [
            ("good", report(), good_ledger, 0),
            ("no-verdict", report(verdict=False), good_ledger, 1),
            ("few-pillars", report().replace(PILLARS, PILLARS.replace("| **8. Pillar 8** | focus | FAIL | proof |", "")), good_ledger, 1),
            ("open-line", report(), ledger_paths["open-line"], 1),
            ("count-mismatch", report(), ledger_paths["count-mismatch"], 1),
            ("reasonless", report(), ledger_paths["reasonless"], 1),
            ("no-ledger-cite", report(ledger_line=False), good_ledger, 1),
        ]
        for name, body, ledger, want in cases:
            path = os.path.join(tmp, f"{name}.md")
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(body)
            res = run(path, ledger)
            ok = res.returncode == want
            print(f"{'PASS' if ok else 'FAIL'}  {name} (exit {res.returncode}, wanted {want})")
            if not ok:
                print(res.stdout)
                failures += 1

    print(f"test-verify-audit: {failures} failing cases")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
