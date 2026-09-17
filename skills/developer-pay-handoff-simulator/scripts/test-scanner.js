#!/usr/bin/env node
/**
 * Self-test for audit_preflight.js — deterministic regression coverage.
 *
 * Builds throwaway fixture projects in the OS temp dir, runs the scanner
 * against each, and asserts which flags fire and which don't:
 *
 *   1. planted JWT secret        -> security.leakedSecrets (1)
 *   2. planted .single()         -> dataLayerResilience.fragileSingleQueries (1)
 *   3. planted 400 KB png        -> performance.heavyImages (1)
 *   4. .env without .env.local   -> environment.missingVars empty (the fixed
 *                                   fallback bug: .env must be read)
 *   5. .env.local present        -> missingVars flags keys missing from it
 *   6. clean project             -> no secret/single/heavy flags
 *   7. --html scorecard          -> audit_scorecard.html exists, zero <script>
 *
 * Usage: node test-scanner.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCANNER = path.join(__dirname, 'audit_preflight.js');

let failures = 0;

function makeFixture(name, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pacy-scan-${name}-`));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

function run(root, args = []) {
  const res = spawnSync(process.execPath, [SCANNER, ...args], { cwd: root, encoding: 'utf8' });
  if (res.status !== 0 && !args.includes('--html')) {
    throw new Error(`scanner exited ${res.status}: ${res.stderr}`);
  }
  return JSON.parse(res.stdout);
}

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ' — ' + detail}`);
  if (!ok) failures++;
}

const JWT = 'const s="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc-_def.ghiJKTLMNOp";\n';

// 1-3: planted findings
{
  const root = makeFixture('planted', {
    'src/api.ts': JWT + 'const u = await db.from("profiles").select("*").eq("id", uid).single();\n',
    'public/heavy.png': Buffer.alloc(400 * 1024, 7),
  });
  const r = run(root);
  check('planted JWT -> leakedSecrets', r.security.leakedSecrets.length === 1);
  check('planted .single() -> fragileSingleQueries', r.dataLayerResilience.fragileSingleQueries.length === 1);
  check('flag text says adjudicate (not blanket replace)',
    /Adjudicate/.test(r.dataLayerResilience.fragileSingleQueries[0].issue));
  check('planted 400KB png -> heavyImages', r.performance.heavyImages.length === 1);
  fs.rmSync(root, { recursive: true, force: true });
}

// 4: .env read when .env.local absent (regression for the || fallback bug)
{
  const root = makeFixture('envonly', {
    '.env.example': 'PACY_KEY=x\nOTHER=y\n',
    '.env': 'PACY_KEY=x\nOTHER=y\n',
    'src/index.ts': 'const a = 1;\n',
  });
  const r = run(root);
  check('.env keys satisfy .env.example (no false missingVars)', r.environment.missingVars.length === 0,
    JSON.stringify(r.environment.missingVars));
  fs.rmSync(root, { recursive: true, force: true });
}

// 5: .env.local present and missing a key -> flagged
{
  const root = makeFixture('envlocal', {
    '.env.example': 'PACY_KEY=x\nOTHER=y\n',
    '.env.local': 'OTHER=y\n',
    'src/index.ts': 'const a = 1;\n',
  });
  const r = run(root);
  check('missing key in .env.local -> missingVars', r.environment.missingVars.includes('PACY_KEY'),
    JSON.stringify(r.environment.missingVars));
  fs.rmSync(root, { recursive: true, force: true });
}

function sumAll(r) {
  const L = (cat, key) => r[cat][key].length;
  return L('security', 'leakedSecrets') + L('security', 'unhandledClientAuth') +
    L('security', 'unsafeCasts') + L('security', 'unprotectedWebhooks') +
    L('security', 'unsafeTargetBlank') + L('security', 'exposedPublicSecrets') +
    L('security', 'clientSideAiSdkUsage') + L('security', 'permissiveRlsPolicies') +
    L('ghostUiAndMockData', 'emptyEventHandlers') + L('ghostUiAndMockData', 'mockDataStrings') +
    L('ghostUiAndMockData', 'unimplementedTodos') + L('dataLayerResilience', 'fragileSingleQueries') +
    L('dataLayerResilience', 'nPlusOneQueryLoops') + L('dataLayerResilience', 'unboundedQueries') +
    L('complianceAndPrivacy', 'unmaskedPiiLogs') + L('complianceAndPrivacy', 'missingLegalPages') +
    L('ghostDependencies', 'unusedPackages') + L('nextjsArchitecture', 'missingErrorBoundaries') +
    L('nextjsArchitecture', 'unoptimizedImgTags') + L('nextjsArchitecture', 'reactStrictModeLeaks') +
    L('nextjsArchitecture', 'missingRevalidations') + L('performance', 'heavyImages') +
    r.environment.missingVars.length + r.seoAeoGeo.missingSeoAssets.length;
}

// 6: clean project -> the planted categories stay silent
{
  const root = makeFixture('clean', {
    'src/index.ts': 'export const a = 1;\n',
    'public/tiny.png': Buffer.alloc(1024, 7),
  });
  const r = run(root);
  check('clean: no leakedSecrets', r.security.leakedSecrets.length === 0);
  check('clean: no fragileSingleQueries', r.dataLayerResilience.fragileSingleQueries.length === 0);
  check('clean: no heavyImages', r.performance.heavyImages.length === 0);
  check('totalFlags equals sum of all flag categories', r.summary.totalFlags === sumAll(r),
    `totalFlags=${r.summary.totalFlags} sum=${sumAll(r)}`);
  fs.rmSync(root, { recursive: true, force: true });
}

// 7: --html scorecard
{
  const root = makeFixture('html', {
    'src/api.ts': JWT,
    'public/heavy.png': Buffer.alloc(400 * 1024, 7),
  });
  run(root, ['--html']);
  const htmlPath = path.join(root, 'audit_scorecard.html');
  const ok = fs.existsSync(htmlPath);
  check('--html writes audit_scorecard.html', ok);
  if (ok) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    check('scorecard has no <script> tags (locked surface)', !/<script/i.test(html));
    check('scorecard embeds planted finding', /api\.ts/.test(html) && /Hardcoded JWT/.test(html));
  }
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(`test-scanner: ${failures} failing cases`);
process.exit(failures ? 1 : 0);
