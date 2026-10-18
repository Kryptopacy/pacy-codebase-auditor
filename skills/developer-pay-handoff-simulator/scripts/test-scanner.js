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
  check('ship-readiness score is computed, not a static 100',
    r.summary.shipReadinessScore < 100 && r.summary.shipReadinessScore >= 0,
    String(r.summary.shipReadinessScore));
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
    L('security', 'weakResetTokens') + L('security', 'idorByParamId') +
    L('security', 'unthrottledAuthRoutes') +
    L('securityHardening', 'xssSinks') + L('securityHardening', 'sqlInterpolation') +
    L('securityHardening', 'dynamicCodeEval') + L('securityHardening', 'permissiveCors') +
    L('securityHardening', 'uncheckedFileUploads') + L('securityHardening', 'missingSecurityHeaders') +
    L('dataIntegrity', 'floatMoneyColumns') + L('dataIntegrity', 'floatMoneyMath') +
    L('dataIntegrity', 'migrationsWithoutRollback') +
    L('reliabilityOps', 'outboundWithoutTimeout') + L('reliabilityOps', 'unboundedRetry') +
    L('reliabilityOps', 'cronWithoutLock') + L('reliabilityOps', 'noTestInCI') +
    L('observability', 'noErrorTracking') + L('observability', 'noHealthEndpoint') +
    L('observability', 'noStructuredLogging') +
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

// 8: auth-family leads — each heuristic fires on its planted pattern
{
  const root = makeFixture('authleads', {
    'app/api/auth/reset/route.ts': [
      'import { db } from "@/lib/db";',
      'export async function POST(req: Request) {',
      '  const { token } = await req.json();',
      '  const reset_token = token;',
      '  const { data } = await db.from("users").select("*").eq("reset_token", reset_token);',
      '  return Response.json(data);',
      '}',
    ].join('\n'),
    'app/api/invoices/route.ts': [
      'import { db } from "@/lib/db";',
      'export async function GET(req: Request) {',
      '  const id = new URL(req.url).searchParams.get("id");',
      '  const { data } = await db.from("invoices").select("*").eq("id", req.searchParams.id);',
      '  return Response.json(data);',
      '}',
    ].join('\n'),
    'app/api/auth/login/route.ts': [
      'import { db } from "@/lib/db";',
      'export async function POST(req: Request) {',
      '  const { email, password } = await req.json();',
      '  return Response.json(await db.auth.signIn(email, password));',
      '}',
    ].join('\n'),
  });
  const r = run(root);
  check('reset token without expiry/use signal -> weakResetTokens', r.security.weakResetTokens.length === 1,
    JSON.stringify(r.security.weakResetTokens));
  check('query keyed by req param, no owner filter -> idorByParamId', r.security.idorByParamId.length === 1,
    JSON.stringify(r.security.idorByParamId));
  check('login+reset routes without limiter -> unthrottledAuthRoutes',
    r.security.unthrottledAuthRoutes.some(f => /login/.test(f.file)) &&
    r.security.unthrottledAuthRoutes.some(f => /reset/.test(f.file)),
    JSON.stringify(r.security.unthrottledAuthRoutes));
  check('auth leads say confirm/adjudicate, not auto-verdict',
    /confirm/i.test(r.security.idorByParamId[0].issue) && /trace|confirm/i.test(r.security.weakResetTokens[0].issue));
  fs.rmSync(root, { recursive: true, force: true });
}

// 9: auth-family false-positive guard — proper hygiene stays silent
{
  const root = makeFixture('authclean', {
    'app/api/auth/reset/route.ts': [
      'import { db } from "@/lib/db";',
      'export async function POST(req: Request) {',
      'import { ratelimit } from "@/lib/rate-limit";',
      '  const { token } = await req.json();',
      '  // token is stored hashed; expires_at checked; used_at set on use (single-use)',
      '  const { success } = await ratelimit.limit(req.headers.get("x-forwarded-for") ?? "");',
      '  if (!success) return new Response("too many", { status: 429 });',
      '  const row = await consumeResetToken(token);',
      '  if (!row || row.used_at) return new Response("invalid", { status: 400 });',
      '  return Response.json({ ok: true });',
      '}',
    ].join('\n'),
    'app/api/auth/login/route.ts': [
      'import { ratelimit } from "@/lib/rate-limit";',
      'export async function POST(req: Request) {',
      '  const { success } = await ratelimit.limit(req.headers.get("x-forwarded-for") ?? "");',
      '  if (!success) return new Response("too many", { status: 429 });',
      '  return Response.json({ ok: true });',
      '}',
    ].join('\n'),
    'app/api/invoices/route.ts': [
      'import { db } from "@/lib/db";',
      'import { requireUser } from "@/lib/auth";',
      'export async function GET(req: Request) {',
      '  const user = await requireUser();',
      '  const id = new URL(req.url).searchParams.get("id");',
      '  const { data } = await db.from("invoices").select("*").eq("id", req.searchParams.id).eq("user_id", user.id);',
      '  return Response.json(data);',
      '}',
    ].join('\n'),
  });
  const r = run(root);
  check('hygienic reset/login/owner-scoped query -> zero auth leads',
    r.security.weakResetTokens.length === 0 && r.security.idorByParamId.length === 0 &&
    r.security.unthrottledAuthRoutes.length === 0,
    JSON.stringify({ reset: r.security.weakResetTokens, idor: r.security.idorByParamId, throttle: r.security.unthrottledAuthRoutes }));
  fs.rmSync(root, { recursive: true, force: true });
}

// 10: .sql migrations are scanned — permissive RLS policy is caught
//     (regression: the RLS branch used to sit behind an extension list
//      that excluded .sql, making it unreachable)
{
  const root = makeFixture('rls', {
    'supabase/migrations/0001_init.sql': [
      'create table invoices (id uuid primary key, user_id uuid not null);',
      'alter table invoices enable row level security;',
      'create policy "invoices_read" on invoices for select using (true);',
    ].join('\n'),
  });
  const r = run(root);
  check('.sql file -> permissive scale RLS policy flagged', r.security.permissiveRlsPolicies.length === 1,
    JSON.stringify(r.security.permissiveRlsPolicies));
  fs.rmSync(root, { recursive: true, force: true });
}

// 11: pillar 9 + 10 heuristics fire on their planted patterns
{
  const root = makeFixture('hardening', {
    'package.json': JSON.stringify({ dependencies: { next: '15.0.0' } }),
    'app/page.tsx': 'export default function P() { return null; }\n',
    'app/components/Rich.tsx': 'export function Rich({ html }: { html: string }) { return <div dangerouslySetInnerHTML={{ __html: html }} />; }\n',
    'lib/reports.ts': 'export function find(id: string) { return db.query(`SELECT * FROM users WHERE id = ${id}`); }\n',
    'lib/calc.ts': 'eval(userInput);\n',
    'app/api/cors/route.ts': 'export async function GET() { return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } }); }\n',
    'app/api/upload/route.ts': 'export async function POST(req: Request) { const data = await req.formData(); return Response.json({ ok: true }); }\n',
    'supabase/migrations/0002_money.sql': 'alter table invoices add column amount real;\n',
    'lib/money.ts': 'const total = parseFloat(amount) + parseFloat(tax);\n',
  });
  const r = run(root);
  check('dangerouslySetInnerHTML w/o sanitizer -> xssSinks', r.securityHardening.xssSinks.length === 1,
    JSON.stringify(r.securityHardening.xssSinks));
  check('interpolated SQL -> sqlInterpolation', r.securityHardening.sqlInterpolation.length === 1,
    JSON.stringify(r.securityHardening.sqlInterpolation));
  check('eval() -> dynamicCodeEval', r.securityHardening.dynamicCodeEval.length === 1);
  check('wildcard CORS -> permissiveCors', r.securityHardening.permissiveCors.length === 1);
  check('formData upload without limits -> uncheckedFileUploads', r.securityHardening.uncheckedFileUploads.length === 1);
  check('web app with no header config -> missingSecurityHeaders', r.securityHardening.missingSecurityHeaders.length === 1,
    JSON.stringify(r.securityHardening.missingSecurityHeaders));
  check('money column as real -> floatMoneyColumns', r.dataIntegrity.floatMoneyColumns.length === 1,
    JSON.stringify(r.dataIntegrity.floatMoneyColumns));
  check('parseFloat money math -> floatMoneyMath', r.dataIntegrity.floatMoneyMath.length === 1,
    JSON.stringify(r.dataIntegrity.floatMoneyMath));
  check('migration without rollback -> migrationsWithoutRollback', r.dataIntegrity.migrationsWithoutRollback.length === 1,
    JSON.stringify(r.dataIntegrity.migrationsWithoutRollback));
  check('critical hardening defects drop the heuristic score below 100',
    r.summary.shipReadinessScore < 100, String(r.summary.shipReadinessScore));
  check('hardening leads say trace/confirm, not verdict',
    /trace|confirm/i.test(r.securityHardening.xssSinks[0].issue) &&
    /confirm/i.test(r.securityHardening.missingSecurityHeaders[0].issue));
  fs.rmSync(root, { recursive: true, force: true });
}

// 12: hardening false-positive guard — proper hygiene stays silent
{
  const root = makeFixture('hardening-clean', {
    'package.json': JSON.stringify({ dependencies: { next: '15.0.0' } }),
    'next.config.js': 'module.exports = { async headers() { return [{ source: "/(.*)", headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] }]; } };\n',
    'app/page.tsx': 'export default function P() { return null; }\n',
    'app/components/Rich.tsx': 'import DOMPurify from "dompurify";\nexport function Rich({ html }: { html: string }) { return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />; }\n',
    'lib/reports.ts': 'export function find(id: string) { return db.query("SELECT * FROM users WHERE id = $1", [id]); }\n',
    'app/api/upload/route.ts': 'export async function POST(req: Request) { const data = await req.formData(); const file = data.get("f"); if (!file || file.size > 5_000_000 || file.type !== "image/png") return new Response("bad", { status: 400 }); return Response.json({ ok: true }); }\n',
    'supabase/migrations/0002_money.sql': 'alter table invoices add column amount_cents integer;\n-- down\n-- alter table invoices drop column amount_cents;\n',
    'lib/money.ts': 'const totalCents = amountCents + taxCents;\n',
  });
  const r = run(root);
  const clean = r.securityHardening.xssSinks.length === 0 &&
    r.securityHardening.sqlInterpolation.length === 0 &&
    r.securityHardening.permissiveCors.length === 0 &&
    r.securityHardening.uncheckedFileUploads.length === 0 &&
    r.securityHardening.missingSecurityHeaders.length === 0 &&
    r.dataIntegrity.floatMoneyColumns.length === 0 &&
    r.dataIntegrity.floatMoneyMath.length === 0 &&
    r.dataIntegrity.migrationsWithoutRollback.length === 0;
  check('hygienic hardening project -> zero pillar 9/10 leads', clean,
    JSON.stringify({ sh: r.securityHardening, di: r.dataIntegrity }));
  fs.rmSync(root, { recursive: true, force: true });
}

// 13: pillar 11 + 12 heuristics fire on their planted patterns
{
  const root = makeFixture('opsgap', {
    'package.json': JSON.stringify({ scripts: { test: 'vitest run' }, dependencies: { next: '15.0.0' } }),
    'app/page.tsx': 'export default function P() { console.log("page"); return null; }\n',
    'lib/payments.ts': 'export async function charge(url: string) { return await fetch(url); }\n',
    'lib/retry.ts': 'export async function retry(url: string) { while (true) { await fetch(url); } }\n',
    'lib/cron.ts': 'export function start() { setInterval(async () => { await sweep(); }, 60000); }\nasync function sweep() {}\n',
  });
  const r = run(root);
  check('fetch without timeout -> outboundWithoutTimeout', r.reliabilityOps.outboundWithoutTimeout.length >= 1,
    JSON.stringify(r.reliabilityOps.outboundWithoutTimeout));
  check('while(true) fetch without backoff -> unboundedRetry', r.reliabilityOps.unboundedRetry.length === 1,
    JSON.stringify(r.reliabilityOps.unboundedRetry));
  check('setInterval job without lock -> cronWithoutLock', r.reliabilityOps.cronWithoutLock.length === 1,
    JSON.stringify(r.reliabilityOps.cronWithoutLock));
  check('test script with no CI -> noTestInCI', r.reliabilityOps.noTestInCI.length === 1,
    JSON.stringify(r.reliabilityOps.noTestInCI));
  check('web app with no Sentry -> noErrorTracking', r.observability.noErrorTracking.length === 1);
  check('web app with no health route -> noHealthEndpoint', r.observability.noHealthEndpoint.length === 1);
  check('console-only logging -> noStructuredLogging', r.observability.noStructuredLogging.length === 1,
    JSON.stringify(r.observability.noStructuredLogging));
  fs.rmSync(root, { recursive: true, force: true });
}

// 14: pillar 11 + 12 false-positive guard — proper ops hygiene stays silent
{
  const root = makeFixture('opsclean', {
    'package.json': JSON.stringify({ scripts: { test: 'vitest run' }, dependencies: { next: '15.0.0', pino: '^9.0.0', '@sentry/nextjs': '^10.0.0' } }),
    '.github/workflows/ci.yml': 'jobs:\n  test:\n    steps:\n      - run: npm test\n',
    'app/page.tsx': 'import { logger } from "@/lib/logger";\nexport default function P() { logger.info("page"); return null; }\n',
    'app/api/health/route.ts': 'export async function GET() { return Response.json({ ok: true }); }\n',
    'lib/logger.ts': 'import pino from "pino";\nexport const logger = pino();\n',
    'lib/payments.ts': 'export async function charge(url: string) { return await fetch(url, { signal: AbortSignal.timeout(5000) }); }\n',
    'lib/retry.ts': 'export async function retry(url: string) { let attempt = 0; const delays = [100, 500, 2000]; for (attempt = 0; attempt < 3; attempt++) { try { return await fetch(url, { signal: AbortSignal.timeout(2000) }); } catch (e) { await new Promise(r => setTimeout(r, delays[attempt])); } } throw new Error("failed"); }\n',
    'lib/cron.ts': 'export function start() { setInterval(async () => { if (await acquireLock("sweep")) await sweep(); }, 60000); }\nasync function acquireLock(_n: string) { return true; }\nasync function sweep() {}\n',
  });
  const r = run(root);
  const clean = r.reliabilityOps.outboundWithoutTimeout.length === 0 &&
    r.reliabilityOps.unboundedRetry.length === 0 &&
    r.reliabilityOps.cronWithoutLock.length === 0 &&
    r.reliabilityOps.noTestInCI.length === 0 &&
    r.observability.noErrorTracking.length === 0 &&
    r.observability.noHealthEndpoint.length === 0 &&
    r.observability.noStructuredLogging.length === 0;
  check('hygienic ops project -> zero pillar 11/12 leads', clean,
    JSON.stringify({ rel: r.reliabilityOps, obs: r.observability }));
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(`test-scanner: ${failures} failing cases`);
process.exit(failures ? 1 : 0);
