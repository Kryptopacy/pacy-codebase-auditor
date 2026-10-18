#!/usr/bin/env node
'use strict';

// Cross-platform Python resolution for the test suite and verifiers.
// Windows often has no `python` on PATH (only the `py` launcher), and some
// machines have the Microsoft Store stub which exits non-zero. Try the
// candidates in order and run the first working interpreter.
//
// Usage: node scripts/run-python.js <script.py> [args...]

const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/run-python.js <script.py> [args...]');
  process.exit(2);
}

const candidates = process.platform === 'win32'
  ? [['py', ['-3']], ['python3', []], ['python', []]]
  : [['python3', []], ['python', []]];

for (const [cmd, base] of candidates) {
  const probe = spawnSync(cmd, [...base, '--version'], { encoding: 'utf8' });
  if (probe.status === 0) {
    const res = spawnSync(cmd, [...base, ...args], { stdio: 'inherit' });
    process.exit(res.status === null ? 1 : res.status);
  }
}

console.error('No working Python interpreter found (tried py -3, python3, python).');
process.exit(1);
