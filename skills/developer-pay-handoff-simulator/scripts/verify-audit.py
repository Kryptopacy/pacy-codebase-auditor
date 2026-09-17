#!/usr/bin/env python3
"""Mechanical verification for the Simulator's final audit report.

Usage:
    python verify-audit.py audit_final_report.md [--ledger audit_checklist.md]

Hard checks (any failure exits 1):
  file      report exists and is non-trivial (> 500 bytes)
  sections  Executive Summary, business-risk table, 8-Pillar Scorecard,
            Discovered Architectural Flaws, Final Sign-Off Verdict present
  pillars   scorecard has all 8 pillar rows, each PASS or FAIL
  verdict   a well-formed decision line (approved / hold / rejected)
  ledger    the report cites its completeness ledger with close counts
  ledger-file  with --ledger: file exists, ZERO open [ ] lines, every
            [!] closed as a defect matches the report's "defects filed
            below" count, and every [~] N/A line carries a written reason

Zero failures is the bar. The ledger gate in SKILL.md says no verdict may be
issued with an open surface line - this script enforces that mechanically.
"""

import argparse
import os
import re
import sys

SECTIONS = [
    "Executive Summary",
    "Business & Financial Risk",
    "8-Pillar Empirical Scorecard",
    "Discovered Architectural Flaws",
    "Final Sign-Off Verdict",
]
VERDICTS = ["\U0001F7E2 APPROVED", "\U0001F7E1 HOLD", "\U0001F534 REJECTED"]

failures = []


def fail(check, msg):
    failures.append(f"FAIL [{check}] {msg}")


def main():
    ap = argparse.ArgumentParser(description="Verify a Simulator final audit report.")
    ap.add_argument("report", help="path to audit_final_report.md")
    ap.add_argument("--ledger", help="path to audit_checklist.md (enables ledger cross-checks)")
    args = ap.parse_args()

    if not os.path.isfile(args.report):
        print(f"FAIL [file] report not found: {args.report}")
        sys.exit(1)
    with open(args.report, encoding="utf-8") as fh:
        text = fh.read()

    if len(text) < 500:
        fail("file", f"report is only {len(text)} bytes - likely a stub")

    for section in SECTIONS:
        if section not in text:
            fail("sections", f"missing required section: {section}")

    rows = re.findall(r"^\|\s*\*\*[1-8]\.\s.*$", text, re.M)
    if len(rows) < 8:
        fail("pillars", f"scorecard has {len(rows)} pillar rows - all 8 are required")
    for row in rows:
        if not re.search(r"\b(PASS|FAIL)\b", row):
            fail("pillars", f"pillar row without a PASS/FAIL status: {row[:60]!r}")

    verdict_zone = text[text.find("Final Sign-Off Verdict"):]
    if not any(v in verdict_zone for v in VERDICTS):
        fail("verdict", f"final verdict must contain one of: {', '.join(VERDICTS)}")

    m = re.search(
        r"Completeness Ledger\*{0,2}:\s*audit_checklist\.md\s*[—-]\s*(\d+)\s*surface lines closed\s*"
        r"\(\s*\d+\s*clean\s*/\s*(\d+)\s*defect\s*/\s*\d+\s*N/A\s*\)\s*[·.\-]*\s*(\d+)\s*defects filed below",
        text, re.I,
    )
    if not m:
        fail("ledger", "report must cite its ledger: 'Completeness Ledger: audit_checklist.md — N surface lines "
                       "closed (X clean / Y defect / Z N/A) · M defects filed below'")
    defects_filed = int(m.group(3)) if m else None

    if args.ledger:
        if not os.path.isfile(args.ledger):
            fail("ledger-file", f"ledger not found: {args.ledger}")
        else:
            with open(args.ledger, encoding="utf-8") as fh:
                ledger = fh.read()
            open_lines = [ln.strip() for ln in ledger.splitlines() if "- [ ]" in ln]
            if open_lines:
                fail("ledger-file", f"{len(open_lines)} open [ ] surface line(s) - the ledger gate forbids a "
                                    f"verdict with open lines; first: {open_lines[0][:70]!r}")
            defect_lines = [ln for ln in ledger.splitlines() if "- [!]" in ln]
            if defects_filed is not None and len(defect_lines) != defects_filed:
                fail("ledger-file", f"ledger has {len(defect_lines)} [!] defect lines but the report claims "
                                    f"{defects_filed} filed below")
            for ln in [l for l in ledger.splitlines() if "- [~]" in l]:
                body = ln.split("[~]", 1)[1].strip()
                if len(body) < 12:
                    fail("ledger-file", f"N/A line lacks a written reason: {ln.strip()[:70]!r}")

    print(f"verify-audit: {args.report}")
    for line in failures:
        print(line)
    print(f"{len(failures)} failed")
    if failures:
        print("Fix the failures and re-run. A report that fails verification is not a sign-off report.")
        sys.exit(1)
    print("All hard checks pass - the report is mechanically consistent with its ledger.")


if __name__ == "__main__":
    main()
