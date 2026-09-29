#!/usr/bin/env node
'use strict';

// Installability guard: every skills/*/SKILL.md must have frontmatter that a
// strict YAML parser accepts. If it doesn't, CLIs like `npx skills add` skip
// the skill with only a warning (and agent loaders drop it silently) — this
// shipped once: a plain-scalar description containing ": " was parsed as a
// nested compact mapping and developer-pay-handoff-simulator vanished from
// installs while codebase-doctor kept working. Keep the descriptions in
// folded block scalars (description: >-) so prose can never break the YAML.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const root = path.join(__dirname, '..');
const skillsDir = path.join(root, 'skills');
const problems = [];

for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  const rel = ['skills', entry.name, 'SKILL.md'].join('/');
  const abs = path.join(skillsDir, entry.name, 'SKILL.md');
  let data = null;
  if (!fs.existsSync(abs)) {
    problems.push(`${rel}: skill directory has no SKILL.md`);
  } else {
    const text = fs.readFileSync(abs, 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) {
      problems.push(`${rel}: missing or malformed frontmatter delimiters`);
    } else {
      try {
        data = YAML.parse(m[1]);
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          problems.push(`${rel}: frontmatter is not a mapping`);
          data = null;
        } else {
          if (typeof data.name !== 'string' || data.name.trim() === '') {
            problems.push(`${rel}: missing "name"`);
          } else if (data.name !== entry.name) {
            problems.push(`${rel}: name "${data.name}" does not match directory "${entry.name}"`);
          }
          if (typeof data.description !== 'string' || data.description.trim().length < 20) {
            problems.push(`${rel}: missing or too-short "description"`);
          }
        }
      } catch (e) {
        problems.push(`${rel}: YAML parse error — ${String(e.message).split('\n')[0]}`);
      }
    }
  }
  if (!problems.some(p => p.startsWith(rel))) {
    console.log(`ok  ${rel} — ${data.name} (description ${data.description.length} chars)`);
  }
}

// skills.json entries must point at real, installable skills.
const manifestPath = path.join(root, 'skills.json');
if (!fs.existsSync(manifestPath)) {
  problems.push('skills.json: file is missing');
} else {
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    problems.push(`skills.json: invalid JSON — ${e.message}`);
  }
  if (manifest) {
    if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
      problems.push('skills.json: "entries" must be a non-empty array');
    } else {
      for (const e of manifest.entries) {
        if (!e || typeof e.path !== 'string' || !fs.existsSync(path.join(root, e.path, 'SKILL.md'))) {
          problems.push(`skills.json: entry "${e && e.name}" points at "${e && e.path}" which has no SKILL.md`);
        }
      }
    }
  }
}

if (problems.length) {
  console.error('\nFrontmatter check FAILED:');
  for (const p of problems) console.error('  x ' + p);
  console.error('\nA skill whose frontmatter does not parse is silently skipped by `npx skills add` and invisible to agent loaders. Use a folded block scalar for long descriptions.');
  process.exit(1);
}
console.log('\nFrontmatter check passed: every SKILL.md parses cleanly and matches skills.json.');
