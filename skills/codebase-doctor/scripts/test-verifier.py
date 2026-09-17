#!/usr/bin/env python3
"""Self-test for verify-report.py - deterministic regression coverage.

Builds a tiny throwaway repo plus four reports in a temp dir, runs the
verifier against each, and asserts exit codes and which checks fired:

  1. good report          -> exit 0
  2. hallucinated path in Files/Evidence -> FAIL [paths]
  3. proposed new path in Solution       -> exit 0, WARN [paths]
  4. unknown mermaid type + unbalanced brackets -> FAIL [mermaid]

Usage: python test-verifier.py
"""

import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
VERIFIER = os.path.join(HERE, "verify-report.py")


def make_repo(root):
    for rel in ("src/app.py", "src/db.py", "lib/orders.py"):
        path = os.path.join(root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as fh:
            fh.write("# fixture\n")


def report(files_evidence, solution, mermaid_body="flowchart LR\n    A[One] --> B[Two]\n"):
    card = f"""
    <article id="candidate-x">
      <h3>Collapse intake</h3><p>Strong</p>
      <p><strong>Files</strong> <code>{files_evidence[0]}</code></p>
      <p><strong>Evidence</strong> {'; '.join(files_evidence)} - 9 of 30 commits, 14 call sites</p>
      <p><strong>Problem</strong> shallow module spread across 4 files.</p>
      <p><strong>Solution</strong> {solution}</p>
      <p><strong>Wins</strong> locality: bugs concentrate in one module</p>
      <pre class="mermaid">{mermaid_body}</pre>
    </article>
    """
    return f"""<!doctype html>
<html><head>
<script src="https://cdn.tailwindcss.com"></script>
<script type="module">import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";</script>
</head><body>
<header>module - a unit with an interface; interface - what callers see;
seam - the boundary you can swap at; deep - lots of behaviour behind little interface;
shallow - interface nearly equals implementation; locality - change clusters in one place;
leverage - one interface serves many call sites.</header>
<main><section id="candidates" class="filler">{'x' * 2100}</section>
<section id="top-recommendation"><a href="#candidate-x">top pick</a></section>
{card}
<p>Padding to comfortably exceed the two-kilobyte minimum so size is never the thing under test.
This paragraph exists purely to lengthen the fixture past the threshold and mentions no paths at all.
{'more padding words. ' * 40}</p></main></body></html>"""


def run(path, repo):
    return subprocess.run(
        [sys.executable, VERIFIER, path, "--repo", repo],
        capture_output=True, text=True,
    )


def main():
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        repo = os.path.join(tmp, "repo")
        make_repo(repo)

        cases = [
            ("good", report(["src/app.py", "src/db.py"], "move logic into lib/orders.py"), 0),
            ("hallucinated-files", report(["src/ghost.py", "src/db.py"], "consolidate"), 1),
            ("proposed-path", report(["src/app.py", "src/db.py"], "create src/new-module.py"), 0),
            ("bad-mermaid", report(["src/app.py", "src/db.py"], "consolidate",
                                   "notADiagram A --> B["), 1),
        ]
        for name, body, want in cases:
            path = os.path.join(tmp, f"{name}.html")
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(body)
            res = run(path, repo)
            ok = res.returncode == want
            check = ""
            if name == "hallucinated-files":
                ok = ok and "FAIL [paths]" in res.stdout and "src/ghost.py" in res.stdout
            if name == "proposed-path":
                ok = ok and "WARN [paths]" in res.stdout
            if name == "bad-mermaid":
                ok = ok and "FAIL [mermaid]" in res.stdout
            print(f"{'PASS' if ok else 'FAIL'}  {name} (exit {res.returncode}, wanted {want})")
            if not ok:
                print(res.stdout)
                failures += 1

    print(f"test-verifier: {failures} failing cases")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
