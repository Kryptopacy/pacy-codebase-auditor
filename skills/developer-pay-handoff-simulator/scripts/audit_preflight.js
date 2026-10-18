#!/usr/bin/env node
/**
 * Developer Pay Handoff Simulator — Preflight Scanner (v1.0.0)
 * Regex-heuristic reconnaissance (no AST parsing) covering Security, Data Layer,
 * Next.js, SEO/AEO/GEO, Performance, and launch assets.
 * Every flag is a lead for manual tracing, not a verdict.
 * Usage: node audit_preflight.js [--html]   (--html also writes audit_scorecard.html)
 */
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const report = {
  timestamp: new Date().toISOString(),
  projectPath: cwd,
  stack: {},
  security: {
    leakedSecrets: [],
    unhandledClientAuth: [],
    unsafeCasts: [],
    unprotectedWebhooks: [],
    unsafeTargetBlank: [],
    exposedPublicSecrets: [],
    clientSideAiSdkUsage: [],
    permissiveRlsPolicies: [],
    weakResetTokens: [],
    idorByParamId: [],
    unthrottledAuthRoutes: []
  },
  ghostUiAndMockData: {
    emptyEventHandlers: [],
    mockDataStrings: [],
    unimplementedTodos: []
  },
  dataLayerResilience: {
    fragileSingleQueries: [], // Any .single() call instead of .maybeSingle()
    nPlusOneQueryLoops: [],   // await db queries inside loops
    unboundedQueries: []      // select(*) without limit/range/pagination
  },
  complianceAndPrivacy: {
    missingLegalPages: [],
    unmaskedPiiLogs: []
  },
  securityHardening: {
    xssSinks: [],
    sqlInterpolation: [],
    dynamicCodeEval: [],
    permissiveCors: [],
    uncheckedFileUploads: [],
    missingSecurityHeaders: []
  },
  dataIntegrity: {
    floatMoneyColumns: [],
    floatMoneyMath: [],
    migrationsWithoutRollback: []
  },
  reliabilityOps: {
    outboundWithoutTimeout: [],
    unboundedRetry: [],
    cronWithoutLock: [],
    noTestInCI: []
  },
  observability: {
    noErrorTracking: [],
    noHealthEndpoint: [],
    noStructuredLogging: []
  },
  accessibility: {
    imgWithoutAlt: [],
    clickableNonInteractive: [],
    inputWithoutLabel: [],
    focusOutlineRemoved: [],
    htmlWithoutLang: [],
    localeLessFormatting: []
  },
  ghostDependencies: {
    unusedPackages: []
  },
  nextjsArchitecture: {
    missingErrorBoundaries: [],
    unoptimizedImgTags: [],
    reactStrictModeLeaks: [],
    missingRevalidations: []
  },
  seoAeoGeo: {
    hasRobotsTxt: false,
    hasSitemapXml: false,
    hasManifestJson: false,
    hasLlmsTxt: false,
    hasLlmsFullTxt: false,
    hasOgImage: false,
    hasFavicon: false,
    middlewareExcludesSeo: false,
    missingSeoAssets: []
  },
  performance: { heavyImages: [] },
  codeHygiene: { orphanConsoleLogs: [], tsIgnoreCount: 0 },
  environment: { missingVars: [] },
  summary: {
    totalFlags: 0,
    shipReadinessScore: 100,
    preflightStatus: "⚠️ PRE-FLIGHT COMPLETED - MANDATORY MANUAL TRACING REQUIRED (DO NOT END TURN)",
    businessRiskSummary: []
  }
};

// 1. Detect Stack Manifests
const manifestFiles = [
  'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 
  'Composer.json', 'pubspec.yaml', 'Gemfile', 'pom.xml'
];

manifestFiles.forEach(file => {
  if (fs.existsSync(path.join(cwd, file))) {
    report.stack[file] = true;
  }
});

// 2. Check SEO / AEO / GEO Root Files
const seoFiles = [
  { key: 'hasRobotsTxt', name: 'robots.txt', locations: ['public/robots.txt', 'app/robots.ts', 'app/robots.js', 'src/app/robots.ts', 'src/app/robots.js', 'src/public/robots.txt'] },
  { key: 'hasSitemapXml', name: 'sitemap.xml', locations: ['public/sitemap.xml', 'app/sitemap.ts', 'app/sitemap.js', 'src/app/sitemap.ts', 'src/app/sitemap.js', 'src/public/sitemap.xml'] },
  { key: 'hasManifestJson', name: 'manifest.json', locations: ['public/manifest.json', 'app/manifest.ts', 'app/manifest.js', 'src/app/manifest.ts', 'src/app/manifest.js', 'src/public/manifest.json'] },
  { key: 'hasLlmsTxt', name: 'llms.txt', locations: ['public/llms.txt', 'src/public/llms.txt'] },
  { key: 'hasLlmsFullTxt', name: 'llms-full.txt', locations: ['public/llms-full.txt', 'src/public/llms-full.txt'] }
];

seoFiles.forEach(item => {
  const found = item.locations.some(loc => fs.existsSync(path.join(cwd, loc)));
  report.seoAeoGeo[item.key] = found;
  if (!found) {
    report.seoAeoGeo.missingSeoAssets.push(item.name);
  }
});

// Check middleware/proxy matcher exclusions for SEO assets
const proxyPaths = [
  'proxy.ts', 'proxy.js', 'middleware.ts', 'middleware.js',
  'src/proxy.ts', 'src/proxy.js', 'src/middleware.ts', 'src/middleware.js'
];
const proxyPath = proxyPaths.map(p => path.join(cwd, p)).find(p => fs.existsSync(p));
if (proxyPath) {
  const proxyContent = fs.readFileSync(proxyPath, 'utf8');
  if (/robots|sitemap|llms|manifest/.test(proxyContent)) {
    report.seoAeoGeo.middlewareExcludesSeo = true;
  } else {
    report.seoAeoGeo.missingSeoAssets.push('Edge middleware matcher does not exclude robots/sitemap/llms/manifest assets');
  }
}

// 2b. OG image metadata & favicon set (Next app-router metadata conventions + plain HTML)
const metaCandidatePaths = [
  'app/layout.tsx', 'app/layout.js', 'src/app/layout.tsx', 'src/app/layout.js',
  'app/page.tsx', 'src/app/page.tsx', 'index.html', 'public/index.html'
];
const metaContent = metaCandidatePaths
  .map(p => path.join(cwd, p))
  .filter(p => fs.existsSync(p))
  .map(p => fs.readFileSync(p, 'utf8'))
  .join('\n');
report.seoAeoGeo.hasOgImage = /og:image|openGraph\s*:\s*\{/.test(metaContent);
if (!report.seoAeoGeo.hasOgImage) report.seoAeoGeo.missingSeoAssets.push('No og:image / openGraph metadata found in root layout');
const faviconCandidates = ['app/favicon.ico', 'src/app/favicon.ico', 'public/favicon.ico', 'public/apple-touch-icon.png', 'app/apple-touch-icon.png', 'src/app/apple-touch-icon.png'];
report.seoAeoGeo.hasFavicon =
  faviconCandidates.some(p => fs.existsSync(path.join(cwd, p))) ||
  /icon\s*:\s*\[|appleTouchIcon|rel=["']icon["']/.test(metaContent);
if (!report.seoAeoGeo.hasFavicon) report.seoAeoGeo.missingSeoAssets.push('No favicon set (favicon.ico / icon metadata) found');

// 3. Compare .env.example with .env.local / .env (whichever exists)
const envExamplePath = path.join(cwd, '.env.example');
const envLocalPath = [path.join(cwd, '.env.local'), path.join(cwd, '.env')]
  .find(p => fs.existsSync(p)) || path.join(cwd, '.env.local');

if (fs.existsSync(envExamplePath)) {
  const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
  const exampleKeys = (exampleContent.match(/^[A-Z0-9_]+/gm) || []);
  
  let localKeys = [];
  if (fs.existsSync(envLocalPath)) {
    const localContent = fs.readFileSync(envLocalPath, 'utf8');
    localKeys = (localContent.match(/^[A-Z0-9_]+/gm) || []);
  }

  exampleKeys.forEach(key => {
    if (!localKeys.includes(key)) {
      report.environment.missingVars.push(key);
    }
  });
}

// 4. Scan Route Error Boundaries
const appDirs = [path.join(cwd, 'app'), path.join(cwd, 'src', 'app')];
appDirs.forEach(appDir => {
  if (fs.existsSync(appDir)) {
    if (!fs.existsSync(path.join(appDir, 'error.tsx')) && !fs.existsSync(path.join(appDir, 'error.js'))) {
      report.nextjsArchitecture.missingErrorBoundaries.push(`${path.relative(cwd, appDir)}/error.tsx is missing`);
    }
    if (!fs.existsSync(path.join(appDir, 'not-found.tsx')) && !fs.existsSync(path.join(appDir, 'not-found.js'))) {
      report.nextjsArchitecture.missingErrorBoundaries.push(`${path.relative(cwd, appDir)}/not-found.tsx is missing`);
    }
  }
});

// Scan package.json for installed dependencies
const packageJsonPath = path.join(cwd, 'package.json');
let declaredDeps = new Set();
let importedDeps = new Set();
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach(dep => {
        if (!['next', 'react', 'react-dom', 'typescript'].includes(dep)) {
          declaredDeps.add(dep);
        }
      });
    }
  } catch (e) {}
}

let scannedFilesList = [];
let sawConsoleLog = false;
let sawStructuredLogger = false;

// 5. Deep Source Code Scanner
function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.next', 'dist', 'build', 'target', 'vendor', '.gemini'].includes(entry.name)) continue;
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.js', '.ts', '.tsx', '.jsx', '.py', '.rs', '.go', '.php', '.sql', '.css', '.scss'].includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relPath = path.relative(cwd, fullPath);
          scannedFilesList.push(relPath);

          if (/console\.(log|info|error|warn|debug)\(/.test(content)) sawConsoleLog = true;
          if (/from\s+["'](pino|winston|bunyan|consola|log4js)["']|require\(["'](pino|winston|bunyan|consola|log4js)["']\)/.test(content)) sawStructuredLogger = true;

          // Track imported dependencies
          declaredDeps.forEach(dep => {
            if (content.includes(`'${dep}'`) || content.includes(`"${dep}"`) || content.includes(`'${dep}/`) || content.includes(`"${dep}/`)) {
              importedDeps.add(dep);
            }
          });

          // Hardcoded secrets scan
          if (/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(content)) {
            report.security.leakedSecrets.push({ file: relPath, type: 'Hardcoded JWT Token' });
          }
          if (/(postgres|mysql):\/\/[a-zA-Z0-9_]+:[^@]+@/.test(content)) {
            report.security.leakedSecrets.push({ file: relPath, type: 'Hardcoded Database URL' });
          }

          // Webhook Signature Check Scanner
          if (relPath.includes(path.join('api', 'webhooks')) || relPath.includes('webhook')) {
            if (!/validateWebhookSignature|verifyHeader|crypto|hmac|signature|x-paystack-signature|x-bachs-key|svix/i.test(content)) {
              report.security.unprotectedWebhooks.push({ file: relPath, issue: 'Webhook route appears to lack HMAC signature, svix, or header verification' });
            }
          }

          // Unmasked PII / SPI Logging Check
          if (/console\.(log|info|warn|error)\(.*?\b(bvn|nin|ssn|card_number|cvv|password|passcode)\b/i.test(content)) {
            report.complianceAndPrivacy.unmaskedPiiLogs.push({ file: relPath, issue: 'Console statement appears to log unmasked PII/SPI or credentials' });
          }

          // Unhandled Client Auth scan
          if (/'use client'|"use client"/.test(content) && /supabase\.auth\.signInWithPassword/.test(content) && !/loginAction/.test(content)) {
            report.security.unhandledClientAuth.push({ file: relPath, issue: 'Direct client-side signInWithPassword without Server Action wrapper' });
          }

          // Fragile .single() Queries — heuristic lead: each needs adjudication (exactly-one invariant proven, or maybeSingle + null fallback)
          if (/\.single\(\)/.test(content)) {
            report.dataLayerResilience.fragileSingleQueries.push({ 
              file: relPath, 
              issue: 'Uses .single(), which asserts exactly one row exists. If 0 rows can match here (new user, missing record, invalid param), PostgREST throws PGRST116. Adjudicate: prove the ≥1-row invariant, or convert to .maybeSingle() with a null fallback.'
            });
          }

          // Unbounded Queries (select(*) without pagination/limits)
          if (/\.from\(["'][^"']+["']\)\.select\(["']\*["']\)/.test(content) && !/\.limit\(|\.range\(|\.single\(|\.maybeSingle\(|\.count\(/.test(content)) {
            report.dataLayerResilience.unboundedQueries.push({ file: relPath, issue: 'Unbounded .select("*") query without .limit(), .range(), or pagination' });
          }

          // Potential N+1 Query Loops
          if (/(for\s*\(|for\s+await|\.forEach|\.map\().*?await\s+(supabase|prisma|db|fetch)/s.test(content) && !/Promise\.all/.test(content)) {
            report.dataLayerResilience.nPlusOneQueryLoops.push({ file: relPath, issue: 'Sequential await query inside loop (potential N+1 performance bottleneck)' });
          }

          // Next.js Unoptimized <img> vs <Image>
          if (/<img\s+[^>]*src=/i.test(content) && !content.includes('eslint-disable') && !relPath.includes('node_modules')) {
            report.nextjsArchitecture.unoptimizedImgTags.push({ file: relPath, issue: 'Uses standard HTML <img> instead of Next.js <Image> component' });
          }

          // React 18 Strict Mode / Timer / Subscription Leak Check
          if (/useEffect\(/.test(content) && /(setInterval|setTimeout|addEventListener|\.subscribe\(|WebSocket)/.test(content)) {
            if (!/return\s*\(\)\s*=>|return\s+function|isMounted|clearInterval|clearTimeout|removeEventListener|\.unsubscribe\(\)/.test(content)) {
              report.nextjsArchitecture.reactStrictModeLeaks.push({ file: relPath, issue: 'useEffect establishes timer/subscription without cleanup or isMounted check (React 18 memory leak)' });
            }
          }

          // Unsafe target="_blank" without rel="noopener noreferrer"
          if (/target=["']_blank["']/.test(content) && !/rel=["'][^"']*(noopener|noreferrer)[^"']*["']/.test(content)) {
            report.security.unsafeTargetBlank.push({ file: relPath, issue: 'target="_blank" link missing rel="noopener noreferrer" (tab-nabbing vulnerability)' });
          }

          // Unsafe Casts & Typescript Bypass
          if (/as\s+any|@ts-ignore|@ts-nocheck/.test(content)) {
            report.security.unsafeCasts.push({ file: relPath, issue: 'Contains "as any" or "@ts-ignore" suppression' });
            report.codeHygiene.tsIgnoreCount++;
          }

          // Stray console.log statements
          if (/console\.log\(/.test(content) && !relPath.includes('audit_preflight')) {
            report.codeHygiene.orphanConsoleLogs.push(relPath);
          }

          // Exposed Public Secrets (NEXT_PUBLIC_SECRET_KEY, NEXT_PUBLIC_SERVICE_ROLE_KEY, etc.)
          if (/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|ADMIN_KEY|SERVICE_KEY|MASTER_KEY)/i.test(content) && !/ANON_KEY|PUBLISHABLE_KEY|PUBLIC_KEY/i.test(content) && !relPath.includes('.example')) {
            report.security.exposedPublicSecrets.push({ file: relPath, issue: 'Private API secret key or admin token exposed to public browser bundle' });
          }

          // Client-Side AI SDK calls (Denial of Wallet risk)
          if (/'use client'|"use client"/.test(content) && /(new\s+OpenAI|new\s+GoogleGenerativeAI|api\.openai\.com|generativelanguage\.googleapis\.com)/.test(content)) {
            report.security.clientSideAiSdkUsage.push({ file: relPath, issue: 'AI model SDK called directly from client browser code without backend rate-limiting wrapper' });
          }

          // Ghost UI / Unwired Event Handlers
          if (/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}|onClick=\{undefined\}|alert\(["']TODO|toast\(["']Coming soon/i.test(content)) {
            report.ghostUiAndMockData.emptyEventHandlers.push({ file: relPath, issue: 'Interactive UI button or element is unwired or contains dummy handler' });
          }

          // Hardcoded Mock Data Strings
          if (/(const|let|var)\s+(MOCK_|DUMMY_|PLACEHOLDER_)|lorem\s+ipsum|via\.placeholder\.com/i.test(content) && !relPath.includes('test') && !relPath.includes('spec')) {
            report.ghostUiAndMockData.mockDataStrings.push({ file: relPath, issue: 'Contains hardcoded mock data or placeholder strings in production code' });
          }

          // Money as floating point — schema column types
          if (/\.sql$/i.test(relPath) || /CREATE\s+TABLE/i.test(content)) {
            if (/(amount|price|total|balance|cost|fee|subtotal|tax)[a-z_]*\s+(real|double(\s+precision)?|float(4|8)?)(\W|$)/i.test(content)) {
              report.dataIntegrity.floatMoneyColumns.push({ file: relPath, issue: 'Money-like column stored as float/real/double — use integer minor units or exact decimal. 0.1 + 0.2 != 0.3.' });
            }
          }

          // Money arithmetic through floating point in application code
          if (/parseFloat\([^)]*(amount|price|total|balance|cost|fee)/i.test(content) || /(amount|price|total|balance|cost|fee)[a-zA-Z_]*\s*[+\-*/]=?\s*parseFloat/i.test(content)) {
            report.dataIntegrity.floatMoneyMath.push({ file: relPath, issue: 'Money arithmetic via parseFloat — binary floating point loses cents. Compute in integer minor units.' });
          }

          // Migration rollback lead — migrations are present but none shows a
          // rollback path (down/rollback/reverse). A forward-only migration set
          // means a bad deploy cannot be backed out without a restore.
          if (/\.sql$/i.test(relPath) && /(migrations?|prisma|drizzle)/i.test(relPath)) {
            if (!/(\bdown\b|rollback|revert|--\s*down|DROP\s+(TABLE|COLUMN|INDEX))/i.test(content)) {
              report.dataIntegrity.migrationsWithoutRollback.push({ file: relPath, issue: 'Migration file shows no rollback path in this file — confirm a paired down/rollback exists before closing.' });
            }
          }

          // Permissive RLS Policy Scan (.sql files or migrations)
          if (ext === '.sql' || content.includes('CREATE POLICY') || content.includes('create policy')) {
            if (/CREATE\s+POLICY.*?USING\s*\(\s*true\s*\)/is.test(content) || /CREATE\s+POLICY.*?WITH\s+CHECK\s*\(\s*true\s*\)/is.test(content)) {
              report.security.permissiveRlsPolicies.push({ file: relPath, issue: 'RLS Policy uses permissive "USING (true)" or "WITH CHECK (true)" without user identity scoping' });
            }
          }

          // Server Action Mutation without Cache Revalidation
          if (relPath.includes('action') || /'use server'|"use server"/.test(content)) {
            if (/\.(insert|update|delete|upsert)\(/.test(content) && !/revalidatePath|revalidateTag/.test(content)) {
              report.nextjsArchitecture.missingRevalidations.push({ file: relPath, issue: 'Server Action performs DB mutation without revalidatePath() or revalidateTag() (stale client cache risk)' });
            }
          }

          // Password-reset token hygiene — lead: token looked up/compared with no
          // expiry or single-use signal anywhere in the file. Adjudicate manually:
          // the check may live in a shared helper or DB constraint this file doesn't show.
          if (/reset[_-]?token/i.test(content) && !/expires|expiry|expir|used_?at|single[_-]?use|valid[_-]?until|token_?used|max_?age/i.test(content)) {
            report.security.weakResetTokens.push({ file: relPath, issue: 'Password-reset token handled with no visible expiry, single-use, or invalidation signal in this file. Reset links must expire, work once, and be invalidated on use — trace the full lifecycle before closing (the check may live elsewhere).' });
          }

          // IDOR lead — query keyed only by a request parameter with no visible
          // ownership filter in this file. RLS or an upstream guard may scope it:
          // verify before flagging; a proven guard closes the line clean.
          if (/\.eq\(\s*["'](id|uuid|order_id|invoice_id)["']\s*,\s*(params\.|req\.|request\.|searchParams)/.test(content) && !/user_id|owner_id|auth\.uid|requireUser|getUser\(|current_user|currentUser/.test(content)) {
            report.security.idorByParamId.push({ file: relPath, issue: 'Query keyed by request parameter (id/uuid) with no ownership filter visible in this file — potential IDOR (user A reading user B\'s row by changing one number). Confirm an RLS policy or ownership check actually scopes it.' });
          }

          // Auth-route throttling lead — login/signup/reset route files with no
          // rate-limit signal. Confirm a limiter (middleware, gateway, shared
          // helper) covers the endpoint before closing.
          if (/(api|actions?|routes?|auth)/i.test(relPath) && /login|signin|sign-in|signup|sign-up|forgot|reset/i.test(relPath) && !/rate.?limit|ratelimit|throttle|limiter|upstash|brute|bottleneck/i.test(content)) {
            report.security.unthrottledAuthRoutes.push({ file: relPath, issue: 'Auth-related route file (login/signup/reset) shows no rate-limiting signal — brute-force password guessing and bill-burn lead. Confirm a limiter covers this endpoint.' });
          }

          // XSS sink lead — raw HTML injection site. Legit only when the value
          // passes a maintained sanitizer: trace the source before closing.
          if (/dangerouslySetInnerHTML|innerHTML\s*=|v-html|\[innerHTML\]/.test(content) && !/DOMPurify|sanitize-html|sanitizeHtml|<Sanitized/.test(content)) {
            report.securityHardening.xssSinks.push({ file: relPath, issue: 'Raw HTML injection sink with no visible sanitizer in this file — trace the value source. If any part is user-controlled, this is stored/reflected XSS.' });
          }

          // String-built query lead — SQL/NoSQL assembled by interpolation.
          if (/(\.query|\.execute|raw|prepare)\(\s*`[^`]*\$\{|(\.query|\.execute|raw|prepare)\([^)]*\+\s*[a-zA-Z_$]/.test(content)) {
            report.securityHardening.sqlInterpolation.push({ file: relPath, issue: 'Query string built with interpolation/concatenation — use parameterized bindings. Confirm no user-controlled value reaches this string.' });
          }

          // Dynamic code evaluation
          if (/(^|[^\w])eval\s*\(|new\s+Function\s*\(/.test(content) && !/node_modules/.test(relPath)) {
            report.securityHardening.dynamicCodeEval.push({ file: relPath, issue: 'Dynamic code evaluation (eval / new Function) — a code-execution sink. Prove the input cannot be user-controlled or remove it.' });
          }

          // CORS wildcard lead
          if (/Access-Control-Allow-Origin[^\n]{0,40}["\x27]\*["\x27]|origin\s*:\s*["\x27]\*["\x27]|cors\(\s*\)/.test(content)) {
            report.securityHardening.permissiveCors.push({ file: relPath, issue: 'Permissive CORS (wildcard origin or bare cors()) — use an explicit allow-list. Never combine wildcard with credentials.' });
          }

          // Upload handling lead — multipart/formData parsing with no size/type guard
          if (/(formData\(\)|multer\(|busboy|multipart)/.test(content) && !/(maxFileSize|fileSize|sizeLimit|limits\s*:|mimetype|contentType|accept\s*:|\.size(\W|$)|\.type(\W|$)|allowedTypes|ALLOWED_)/i.test(content)) {
            report.securityHardening.uncheckedFileUploads.push({ file: relPath, issue: 'File-upload handler with no visible size/type limit — enforce both server-side and store outside the executable web root.' });
          }

          // Outbound call without a timeout — server-side only. A hung
          // dependency should fail fast, not hold the request open.
          if (/(^|[\\/])(api|server|lib|actions|services)[\\/]/.test(relPath) &&
              /\b(fetch|axios\.(get|post|put|patch|delete)|got)\s*\(/.test(content) &&
              !/(AbortSignal|signal\s*:|timeout\s*:|timeoutMs|Promise\.race)/.test(content)) {
            report.reliabilityOps.outboundWithoutTimeout.push({ file: relPath, issue: 'Outbound HTTP call with no visible timeout/abort signal — a slow dependency can hang this request. Add a timeout and a fallback.' });
          }

          // Unbounded retry loop — while(true)/for(;;) around an outbound call
          // with no backoff or cap.
          if (/(while\s*\(\s*(true|1)\s*\)|for\s*\(\s*;\s*;\s*\))/.test(content) &&
              /(fetch|axios|await\s+\w+\()/.test(content) &&
              !/(backoff|sleep|setTimeout|delay|maxRetries|max_retries|attempts)/i.test(content)) {
            report.reliabilityOps.unboundedRetry.push({ file: relPath, issue: 'Retry loop with no visible backoff/cap — an outage turns into hammering. Use bounded exponential backoff.' });
          }

          // Cron/scheduled work with no distributed lock — adding a second
          // server double-runs it.
          if (/(cron\.schedule\(|node-cron|\bsetInterval\s*\()/.test(content) &&
              /(api|server|lib|jobs?|workers?|cron)[\\/]/.test(relPath) &&
              !/(pg_advisory_lock|advisoryLock|withLock|acquireLock|SKIP\s+LOCKED|leader|singleton|mutex)/i.test(content)) {
            report.reliabilityOps.cronWithoutLock.push({ file: relPath, issue: 'Scheduled/interval work with no visible distributed lock — running two instances double-runs the job.' });
          }

          // Image without alt (or with alt={undefined}) — content images need
          // descriptive alt; decorative ones need an explicit empty alt.
          if (/<(img|Image)\b[^>]*>/g.test(content)) {
            const tags = content.match(/<(img|Image)\b[^>]*>/g) || [];
            for (const tag of tags) {
              if (!/\balt\s*=/.test(tag)) {
                report.accessibility.imgWithoutAlt.push({ file: relPath, issue: 'Image tag without an alt attribute — content images need descriptive alt, decorative images need alt="".' });
                break;
              }
            }
          }

          // Clickable non-interactive element — div/span with onClick and no
          // role + keyboard handler. A lead: confirm it is truly interactive.
          if (/<(div|span)\b[^>]*onClick=/.test(content) && !/(role\s*=|onKeyDown|onKeyUp|onKeyPress|tabIndex)/.test(content)) {
            report.accessibility.clickableNonInteractive.push({ file: relPath, issue: 'Clickable div/span with no role, keyboard handler, or tabIndex — not keyboard operable. Use a button or add role + key handling.' });
          }

          // Input without a programmatic label — label/htmlFor, aria-label,
          // or aria-labelledby. Placeholder text is not a label.
          if (/<(input|select|textarea)\b[^>]*>/g.test(content)) {
            const fields = content.match(/<(input|select|textarea)\b[^>]*>/g) || [];
            for (const field of fields) {
              if (!/(aria-label|aria-labelledby|id\s*=|name\s*=)/.test(field) && /type\s*=\s*["'](text|email|password|search|tel|url|number)?["']?/.test(field)) {
                report.accessibility.inputWithoutLabel.push({ file: relPath, issue: 'Form field with no id/aria-label — a placeholder is not a label. Confirm a wrapping <label> exists before closing.' });
                break;
              }
            }
          }

          // Focus outline removed — only a defect if no :focus-visible
          // replacement exists in the same file (or a global stylesheet).
          if (/(outline\s*:\s*(none|0)|outline-none)/.test(content) && !/(:focus-visible|focus-visible:|focus-visible\b)/.test(content)) {
            report.accessibility.focusOutlineRemoved.push({ file: relPath, issue: 'Focus outline removed with no :focus-visible replacement visible in this file — keyboard users lose their place.' });
          }

          // Locale-less date/number formatting — Intl/toLocale* without a
          // locale argument formats in the runtime's locale, not the user's.
          if (/(toLocaleDateString|toLocaleTimeString|toLocaleString|toFixed)\s*\(\s*\)/.test(content)) {
            report.accessibility.localeLessFormatting.push({ file: relPath, issue: 'Locale-less date/number formatting (e.g. toLocaleDateString()) — pass the user locale or use Intl with an explicit locale.' });
          }

          // Unimplemented TODO / FIXME / HACK markers
          if (/\/\/\s*(TODO|FIXME|HACK):/i.test(content)) {
            report.ghostUiAndMockData.unimplementedTodos.push({ file: relPath, issue: 'Unresolved TODO/FIXME comment marker left in source code' });
          }

        } catch (e) {
          // Ignore read errors
        }
      }
    }
  }
}

const targetDirs = ['src', 'app', 'lib', 'components', 'actions', 'utils', 'hooks', 'services', 'server', 'api', 'pages', 'supabase', 'migrations', 'prisma', 'drizzle'];
targetDirs.forEach(dir => scanDirectory(path.join(cwd, dir)));

// 5b. Static image weight scan — flag shipped images over 300 KB (LCP risk)
const HEAVY_IMAGE_KB = 300;
const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];
(function scanImages(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.next', 'dist', 'build', 'target', 'vendor'].includes(entry.name)) continue;
      scanImages(fullPath);
    } else if (entry.isFile() && imageExts.includes(path.extname(entry.name).toLowerCase())) {
      const kb = Math.round(fs.statSync(fullPath).size / 1024);
      const rel = path.relative(cwd, fullPath).replace(/\\/g, '/');
      // icons and logos are legitimately tiny or svg-based; only flag raster weight
      if (kb > HEAVY_IMAGE_KB && path.extname(rel).toLowerCase() !== '.svg' && !/(favicon|icon|logo)/i.test(rel)) {
        report.performance.heavyImages.push({ file: rel, kb, issue: `Static image is ${kb} KB (> ${HEAVY_IMAGE_KB} KB) — compress/convert to WebP/AVIF or serve via <Image>` });
      }
    }
  }
})(cwd);

// Ghost Dependencies Evaluation
declaredDeps.forEach(dep => {
  if (!importedDeps.has(dep)) {
    report.ghostDependencies.unusedPackages.push(dep);
  }
});

// Security headers — project-level lead. Only fires for a web application, and
// only when NO header configuration is visible anywhere scanned. Absence of a
// config is a lead (headers can be set at the edge/CDN), never a verdict.
(function checkSecurityHeaders() {
  const isWebApp = ['app', 'src/app', 'pages'].some(d => fs.existsSync(path.join(cwd, d))) ||
    (fs.existsSync(packageJsonPath) && (() => {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        return ['next', 'express', 'fastify', 'koa', 'hapi', '@hono/node-server'].some(d => deps[d]);
      } catch (e) { return false; }
    })());
  if (!isWebApp) return;

  const configCandidates = ['next.config.js', 'next.config.ts', 'next.config.mjs', 'middleware.ts', 'middleware.js',
    'src/middleware.ts', 'proxy.ts', 'src/proxy.ts'];
  const configText = configCandidates
    .map(f => path.join(cwd, f))
    .filter(f => fs.existsSync(f))
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n');
  const headerSignal = /Content-Security-Policy|Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options|frame-ancestors|Referrer-Policy|helmet\(|headers\s*\(\s*\)/i
    .test(configText + '\n' + scannedFilesList.slice(0, 0).join('\n'));
  if (!headerSignal) {
    report.securityHardening.missingSecurityHeaders.push({
      file: 'project',
      issue: 'No security-header configuration found in the config/middleware files (or helmet()). Confirm headers are set at the edge/CDN; if not, HSTS/CSP/X-Content-Type-Options/frame-ancestors/Referrer-Policy are missing on every response.',
    });
  }
})();

// Reliability & observability — project-level leads for web apps.
(function checkOpsSurface() {
  const isWebApp = ['app', 'src/app', 'pages'].some(d => fs.existsSync(path.join(cwd, d))) ||
    (fs.existsSync(packageJsonPath) && (() => {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        return ['next', 'express', 'fastify', 'koa', 'hapi', '@hono/node-server'].some(d => deps[d]);
      } catch (e) { return false; }
    })());
  if (!isWebApp) return;

  const allSource = scannedFilesList.join('\n');

  // Error tracking: dependency or init call anywhere.
  const hasErrorTracking = /@sentry|Sentry\.init|bugsnag|rollbar|datadog|honeybadger|newrelic/i.test(allSource + '\n' + (fs.existsSync(packageJsonPath) ? fs.readFileSync(packageJsonPath, 'utf8') : ''));
  if (!hasErrorTracking) {
    report.observability.noErrorTracking.push({ file: 'project', issue: 'No error-tracking provider found (Sentry/Bugsnag/Rollbar/…). Confirm one is wired outside the scanned tree; otherwise you learn about errors from users.' });
  }

  // Health endpoint for external uptime checks.
  const hasHealthRoute = scannedFilesList.some(f => /health(z)?(\.|\/|$)/i.test(f)) ||
    fs.existsSync(path.join(cwd, 'app', 'api', 'health', 'route.ts')) ||
    fs.existsSync(path.join(cwd, 'app', 'api', 'health', 'route.js'));
  if (!hasHealthRoute) {
    report.observability.noHealthEndpoint.push({ file: 'project', issue: 'No health endpoint found — external uptime checks have nothing meaningful to probe.' });
  }

  // Structured logging: console usage seen with no structured logger imported.
  if (sawConsoleLog && !sawStructuredLogger) {
    report.observability.noStructuredLogging.push({ file: 'project', issue: 'Logging appears to be console.* with no structured logger imported — logs are hard to search and correlate at 3am. Confirm an edge/platform logger covers this.' });
  }
})();

// CI test gate — a test script that no workflow runs is not a gate.
(function checkCITestGate() {
  if (!fs.existsSync(packageJsonPath)) return;
  let testScript = null;
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    testScript = pkg.scripts && pkg.scripts.test;
  } catch (e) { return; }
  if (!testScript || /no test specified/i.test(testScript)) return;

  const workflowDirs = ['.github/workflows', '.gitlab-ci.yml', '.circleci'];
  let workflows = '';
  if (fs.existsSync(path.join(cwd, '.github', 'workflows'))) {
    for (const f of fs.readdirSync(path.join(cwd, '.github', 'workflows'))) {
      const fp = path.join(cwd, '.github', 'workflows', f);
      if (fs.statSync(fp).isFile()) workflows += fs.readFileSync(fp, 'utf8') + '\n';
    }
  }
  for (const alt of ['.gitlab-ci.yml', '.circleci/config.yml']) {
    const fp = path.join(cwd, alt);
    if (fs.existsSync(fp)) workflows += fs.readFileSync(fp, 'utf8') + '\n';
  }
  if (!workflows.trim()) {
    report.reliabilityOps.noTestInCI = report.reliabilityOps.noTestInCI || [];
    report.reliabilityOps.noTestInCI.push({ file: 'project', issue: 'A test script exists but no CI workflow was found — tests are not gating deploys. Add a pipeline that runs them before deploy.' });
  } else if (!/(npm (run )?test|yarn test|pnpm test|vitest|jest|pytest|go test|cargo test|php artisan test)/i.test(workflows)) {
    report.reliabilityOps.noTestInCI = report.reliabilityOps.noTestInCI || [];
    report.reliabilityOps.noTestInCI.push({ file: 'project', issue: 'CI workflows exist but none runs the test suite — a green deploy can ship broken code.' });
  }
})();

// Accessibility — document language on the root element.
(function checkHtmlLang() {
  const candidates = ['app/layout.tsx', 'app/layout.js', 'src/app/layout.tsx', 'src/app/layout.js',
    'index.html', 'public/index.html', 'app/index.html'];
  const found = candidates.map(f => path.join(cwd, f)).filter(f => fs.existsSync(f));
  if (!found.length) return; // non-web or non-HTML root: nothing to verify here
  const hasLang = found.some(f => /<html[^>]*\blang\s*=/i.test(fs.readFileSync(f, 'utf8')));
  if (!hasLang) {
    report.accessibility.htmlWithoutLang.push({ file: path.relative(cwd, found[0]), issue: 'Root <html> has no lang attribute — screen readers cannot choose the right pronunciation. Add lang (and dir where RTL locales are supported).' });
  }
})();

// Legal Pages Evaluation (Privacy Policy / Terms)
const hasPrivacyPage = scannedFilesList.some(f => /privacy/i.test(f));
const hasTermsPage = scannedFilesList.some(f => /terms/i.test(f));
if (!hasPrivacyPage) report.complianceAndPrivacy.missingLegalPages.push('Privacy Policy route (/privacy) not found');
if (!hasTermsPage) report.complianceAndPrivacy.missingLegalPages.push('Terms of Service route (/terms) not found');

report.summary.totalFlags = 
  report.security.leakedSecrets.length + 
  report.security.unhandledClientAuth.length + 
  report.security.unsafeCasts.length +
  report.security.unprotectedWebhooks.length +
  report.security.unsafeTargetBlank.length +
  report.security.exposedPublicSecrets.length +
  report.security.clientSideAiSdkUsage.length +
  report.security.permissiveRlsPolicies.length +
  report.security.weakResetTokens.length +
  report.security.idorByParamId.length +
  report.security.unthrottledAuthRoutes.length +
  report.securityHardening.xssSinks.length +
  report.securityHardening.sqlInterpolation.length +
  report.securityHardening.dynamicCodeEval.length +
  report.securityHardening.permissiveCors.length +
  report.securityHardening.uncheckedFileUploads.length +
  report.securityHardening.missingSecurityHeaders.length +
  report.dataIntegrity.floatMoneyColumns.length +
  report.dataIntegrity.floatMoneyMath.length +
  report.dataIntegrity.migrationsWithoutRollback.length +
  report.reliabilityOps.outboundWithoutTimeout.length +
  report.reliabilityOps.unboundedRetry.length +
  report.reliabilityOps.cronWithoutLock.length +
  report.reliabilityOps.noTestInCI.length +
  report.observability.noErrorTracking.length +
  report.observability.noHealthEndpoint.length +
  report.observability.noStructuredLogging.length +
  report.accessibility.imgWithoutAlt.length +
  report.accessibility.clickableNonInteractive.length +
  report.accessibility.inputWithoutLabel.length +
  report.accessibility.focusOutlineRemoved.length +
  report.accessibility.htmlWithoutLang.length +
  report.accessibility.localeLessFormatting.length +
  report.ghostUiAndMockData.emptyEventHandlers.length +
  report.ghostUiAndMockData.mockDataStrings.length +
  report.ghostUiAndMockData.unimplementedTodos.length +
  report.dataLayerResilience.fragileSingleQueries.length +
  report.dataLayerResilience.nPlusOneQueryLoops.length +
  report.dataLayerResilience.unboundedQueries.length +
  report.complianceAndPrivacy.unmaskedPiiLogs.length +
  report.complianceAndPrivacy.missingLegalPages.length +
  report.ghostDependencies.unusedPackages.length +
  report.nextjsArchitecture.missingErrorBoundaries.length +
  report.nextjsArchitecture.unoptimizedImgTags.length +
  report.nextjsArchitecture.reactStrictModeLeaks.length +
  report.nextjsArchitecture.missingRevalidations.length +
  report.environment.missingVars.length +
  report.seoAeoGeo.missingSeoAssets.length +
  report.performance.heavyImages.length;

// Ship-readiness score — a heuristic lead, NOT a verdict. Critical categories
// (secret exposure, injection/XSS sinks, IDOR, permissive RLS, unprotected
// webhooks, weak reset tokens) weigh 8x; everything else weighs 2x. The report's
// verified score supersedes this number; a scanner score of 100 on a repo that
// cannot build is the exact overclaim this weighting exists to prevent.
const criticalFlags =
  report.security.leakedSecrets.length +
  report.security.exposedPublicSecrets.length +
  report.security.permissiveRlsPolicies.length +
  report.security.unprotectedWebhooks.length +
  report.security.weakResetTokens.length +
  report.security.idorByParamId.length +
  report.securityHardening.xssSinks.length +
  report.securityHardening.sqlInterpolation.length;
report.summary.shipReadinessScore = Math.max(
  0,
  100 - (criticalFlags * 8 + (report.summary.totalFlags - criticalFlags) * 2)
);

// Generate Plain-English Business Risk Translations for Non-Techies
if (report.security.leakedSecrets.length > 0 || report.security.exposedPublicSecrets.length > 0) {
  report.summary.businessRiskSummary.push("CRITICAL SECURITY RISK: Hardcoded DB passwords or private API keys found. Attackers can steal customer data or run up your cloud bill.");
}
if (report.security.permissiveRlsPolicies.length > 0) {
  report.summary.businessRiskSummary.push("CRITICAL DATA PRIVACY LEAK: Supabase RLS policy uses 'USING (true)', exposing database records across tenants to public anon keys.");
}
if (report.security.idorByParamId.length > 0) {
  report.summary.businessRiskSummary.push("DATA EXPOSURE RISK (IDOR lead): queries keyed by URL/request id with no visible ownership filter — one customer may read another's records by editing the URL. Adjudicate each lead against RLS/upstream guards.");
}
if (report.security.weakResetTokens.length > 0) {
  report.summary.businessRiskSummary.push("ACCOUNT TAKEOVER RISK: password-reset tokens show no expiry/single-use signal — a stolen or reused reset link may work forever. Trace the token lifecycle before closing.");
}
if (report.security.unthrottledAuthRoutes.length > 0) {
  report.summary.businessRiskSummary.push("BRUTE-FORCE & BILL-BURN RISK: auth routes (login/signup/reset) show no rate-limiting signal — passwords can be guessed at scale.");
}
if (report.securityHardening.xssSinks.length > 0) {
  report.summary.businessRiskSummary.push("CODE-EXECUTION RISK (XSS lead): raw HTML injection sinks with no visible sanitizer — trace whether user content reaches them.");
}
if (report.securityHardening.sqlInterpolation.length > 0) {
  report.summary.businessRiskSummary.push("INJECTION RISK: queries built by string interpolation/concatenation — parameterize and confirm no user input reaches the string.");
}
if (report.securityHardening.permissiveCors.length > 0) {
  report.summary.businessRiskSummary.push("CROSS-ORIGIN RISK: permissive CORS (wildcard/bare cors()) — any site can call your API from a victim's browser.");
}
if (report.securityHardening.uncheckedFileUploads.length > 0) {
  report.summary.businessRiskSummary.push("UPLOAD RISK: file-upload handlers with no visible size/type limits — abuse, storage cost, and executable-file upload.");
}
if (report.dataIntegrity.floatMoneyColumns.length > 0 || report.dataIntegrity.floatMoneyMath.length > 0) {
  report.summary.businessRiskSummary.push("MONEY-PRECISION RISK: money stored or computed in binary floating point — cents drift, invoices fail to reconcile. Use integer minor units.");
}
if (report.dataIntegrity.migrationsWithoutRollback.length > 0) {
  report.summary.businessRiskSummary.push("RECOVERY RISK: migrations show no rollback path in the scanned files — a bad deploy may only be recoverable from a backup.");
}
if (report.reliabilityOps.outboundWithoutTimeout.length > 0) {
  report.summary.businessRiskSummary.push("HANG RISK: outbound HTTP calls with no timeout — one slow vendor can freeze requests and pile up.");
}
if (report.reliabilityOps.unboundedRetry.length > 0) {
  report.summary.businessRiskSummary.push("RETRY HAMMERING RISK: retry loops with no backoff/cap — a vendor outage becomes a self-inflicted flood.");
}
if (report.reliabilityOps.cronWithoutLock.length > 0) {
  report.summary.businessRiskSummary.push("DOUBLE-RUN RISK: scheduled work without a distributed lock — the second server runs every job twice (double emails, double charges).");
}
if (report.reliabilityOps.noTestInCI.length > 0) {
  report.summary.businessRiskSummary.push("DEPLOY RISK: tests are not gating deploys — broken code can reach customers on a green pipeline.");
}
if (report.observability.noErrorTracking.length > 0) {
  report.summary.businessRiskSummary.push("BLINDNESS RISK: no error tracking found — you learn about outages from users, not from your tools.");
}
if (report.observability.noHealthEndpoint.length > 0) {
  report.summary.businessRiskSummary.push("UPTIME-BLIND RISK: no health endpoint for external probes — downtime may go unnoticed until someone emails.");
}
if (report.observability.noStructuredLogging.length > 0) {
  report.summary.businessRiskSummary.push("3AM RISK: console-only logging — no searchable, correlated logs to debug an incident.");
}
if (report.accessibility.imgWithoutAlt.length > 0) {
  report.summary.businessRiskSummary.push("A11Y/SEO RISK: images without alt text — screen-reader users lose the content, and image search cannot index it.");
}
if (report.accessibility.clickableNonInteractive.length > 0) {
  report.summary.businessRiskSummary.push("KEYBOARD-USABILITY RISK: clickable div/span elements with no keyboard support — keyboard-only users cannot operate the flow.");
}
if (report.accessibility.inputWithoutLabel.length > 0) {
  report.summary.businessRiskSummary.push("FORM-A11Y RISK: form fields without programmatic labels — screen readers announce nothing useful.");
}
if (report.accessibility.focusOutlineRemoved.length > 0) {
  report.summary.businessRiskSummary.push("FOCUS RISK: focus outlines removed — keyboard users cannot see where they are.");
}
if (report.accessibility.localeLessFormatting.length > 0) {
  report.summary.businessRiskSummary.push("LOCALE RISK: dates/numbers formatted without the user locale — wrong order and separators outside the developer's region.");
}
if (report.security.clientSideAiSdkUsage.length > 0) {
  report.summary.businessRiskSummary.push("FINANCIAL RISK (Denial of Wallet): AI models (OpenAI/Gemini) are called directly from client browser code without backend rate-limiting.");
}
if (report.nextjsArchitecture.missingRevalidations.length > 0) {
  report.summary.businessRiskSummary.push("STALE UI / CACHE RISK: Server Actions mutate database records without calling revalidatePath() or revalidateTag(), leaving the user interface showing outdated information.");
}
if (report.complianceAndPrivacy.unmaskedPiiLogs.length > 0) {
  report.summary.businessRiskSummary.push("REGULATORY & PRIVACY RISK: Console logs unmasked PII (BVN/NIN/SSN/Cards). Fines or data compliance violations possible.");
}
if (report.dataLayerResilience.unboundedQueries.length > 0) {
  report.summary.businessRiskSummary.push("DENIAL OF SERVICE & SCALE RISK: Database queries fetch un-paginated data (select * without limit). As traffic grows, the database will exhaust memory.");
}
if (report.complianceAndPrivacy.missingLegalPages.length > 0) {
  report.summary.businessRiskSummary.push("LEGAL COMPLIANCE RISK: Missing Privacy Policy (/privacy) or Terms of Service (/terms) routes. Payment gateways and app stores may reject launch.");
}
if (report.ghostDependencies.unusedPackages.length > 0) {
  report.summary.businessRiskSummary.push(`GHOST DEPENDENCY BLOAT: Found ${report.ghostDependencies.unusedPackages.length} package(s) installed in package.json but never imported in source code.`);
}
if (report.ghostUiAndMockData.emptyEventHandlers.length > 0 || report.ghostUiAndMockData.mockDataStrings.length > 0) {
  report.summary.businessRiskSummary.push("USER EXPERIENCE RISK (Ghost UI): Interactive buttons do nothing or display hardcoded dummy data instead of live database connections.");
}
if (report.dataLayerResilience.fragileSingleQueries.length > 0) {
  report.summary.businessRiskSummary.push(`ZERO-ROW REVIEW LEADS (${report.dataLayerResilience.fragileSingleQueries.length} site(s)): .single() asserts exactly one row exists. Manual adjudication required: prove the ≥1-row invariant or convert to .maybeSingle() with null fallback.`);
}
if (report.nextjsArchitecture.reactStrictModeLeaks.length > 0) {
  report.summary.businessRiskSummary.push("MEMORY LEAK RISK: Timers or real-time subscriptions lack cleanup. Users leaving open tabs will experience sluggish performance.");
}
if (report.seoAeoGeo.missingSeoAssets.length > 0) {
  report.summary.businessRiskSummary.push("GROWTH & AI DISCOVERY RISK: Missing SEO or AI crawler files (`robots.txt`, `/llms.txt`, OG image, favicon). Search engines and AI assistants won't index your site correctly.");
}
if (report.performance.heavyImages.length > 0) {
  report.summary.businessRiskSummary.push(`LCP / BANDWIDTH RISK: ${report.performance.heavyImages.length} heavy static image(s) over 300 KB shipped without compression or responsive serving.`);
}

// ---- Output ----
console.log(JSON.stringify(report, null, 2));

if (process.argv.includes('--html')) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const section = (title, rows) => {
    if (!rows.length) return '';
    const body = rows.map(r =>
      `<tr><td class="f">${esc(typeof r === 'string' ? r : r.file || r.name || JSON.stringify(r))}</td><td>${esc(typeof r === 'string' ? 'flagged for manual tracing' : r.issue || r.type || '')}</td></tr>`
    ).join('\n');
    return `<h2>${esc(title)} <span class="c">${rows.length}</span></h2>\n<table><tbody>${body}</tbody></table>`;
  };
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Pacy Preflight Scorecard</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#0f172a;background:#f8fafc}
  h1{font-size:1.4rem} h2{font-size:1.05rem;margin-top:1.6rem;border-bottom:2px solid #e2e8f0;padding-bottom:.25rem}
  .c{background:#fee2e2;color:#991b1b;border-radius:999px;padding:0 .5rem;font-size:.8rem;vertical-align:middle}
  table{border-collapse:collapse;width:100%;background:#fff} td{border:1px solid #e2e8f0;padding:.35rem .5rem;font-size:.85rem;vertical-align:top}
  td.f{font-family:ui-monospace,monospace;white-space:nowrap} .meta{color:#475569;font-size:.9rem}
  .risk{background:#fff7ed;border-left:4px solid #f97316;padding:.5rem .75rem;margin:.35rem 0;font-size:.9rem}
  .empty{color:#16a34a}
</style></head><body>
<h1>🛡️ Pacy Preflight Scorecard</h1>
<p class="meta">Path: ${esc(report.projectPath)} · ${esc(report.timestamp)} · Flags: <strong>${report.summary.totalFlags}</strong> (heuristic leads — manual tracing required before any verdict)</p>
${report.summary.businessRiskSummary.map(r => `<div class="risk">${esc(r)}</div>`).join('\n')}
${[
  ['Leaked secrets', report.security.leakedSecrets],
  ['Exposed public secrets', report.security.exposedPublicSecrets],
  ['Permissive RLS policies', report.security.permissiveRlsPolicies],
  ['Weak reset-token hygiene (leads)', report.security.weakResetTokens],
  ['IDOR by request param (leads)', report.security.idorByParamId],
  ['Unthrottled auth routes (leads)', report.security.unthrottledAuthRoutes],
  ['XSS sinks (leads)', report.securityHardening.xssSinks],
  ['String-built queries (leads)', report.securityHardening.sqlInterpolation],
  ['Dynamic code evaluation', report.securityHardening.dynamicCodeEval],
  ['Permissive CORS', report.securityHardening.permissiveCors],
  ['Unchecked file uploads', report.securityHardening.uncheckedFileUploads],
  ['Float money columns', report.dataIntegrity.floatMoneyColumns],
  ['Float money math', report.dataIntegrity.floatMoneyMath],
  ['Migrations without rollback (leads)', report.dataIntegrity.migrationsWithoutRollback],
  ['Outbound calls without timeout', report.reliabilityOps.outboundWithoutTimeout],
  ['Unbounded retry loops', report.reliabilityOps.unboundedRetry],
  ['Cron without distributed lock', report.reliabilityOps.cronWithoutLock],
  ['Tests not gated in CI', report.reliabilityOps.noTestInCI],
  ['No error tracking', report.observability.noErrorTracking],
  ['No health endpoint', report.observability.noHealthEndpoint],
  ['No structured logging', report.observability.noStructuredLogging],
  ['Images without alt', report.accessibility.imgWithoutAlt],
  ['Clickable non-interactive elements', report.accessibility.clickableNonInteractive],
  ['Form fields without labels', report.accessibility.inputWithoutLabel],
  ['Focus outline removed', report.accessibility.focusOutlineRemoved],
  ['Root html without lang', report.accessibility.htmlWithoutLang],
  ['Locale-less formatting', report.accessibility.localeLessFormatting],
  ['Unprotected webhooks', report.security.unprotectedWebhooks],
  ['Client-side AI SDK (denial-of-wallet)', report.security.clientSideAiSdkUsage],
  ['Unhandled client auth', report.security.unhandledClientAuth],
  ['Unsafe target=_blank', report.security.unsafeTargetBlank],
  ['Unsafe casts / suppressions', report.security.unsafeCasts],
  ['Fragile .single() queries', report.dataLayerResilience.fragileSingleQueries],
  ['Unbounded queries', report.dataLayerResilience.unboundedQueries],
  ['Potential N+1 loops', report.dataLayerResilience.nPlusOneQueryLoops],
  ['Ghost UI / mock data / TODOs', [...report.ghostUiAndMockData.emptyEventHandlers, ...report.ghostUiAndMockData.mockDataStrings, ...report.ghostUiAndMockData.unimplementedTodos]],
  ['Missing error boundaries', report.nextjsArchitecture.missingErrorBoundaries.map(m => ({ file: m, issue: 'route-level error boundary missing' }))],
  ['Unoptimized <img> tags', report.nextjsArchitecture.unoptimizedImgTags],
  ['Strict-mode leak candidates', report.nextjsArchitecture.reactStrictModeLeaks],
  ['Missing revalidations', report.nextjsArchitecture.missingRevalidations],
  ['SEO/AEO/GEO asset gaps', report.seoAeoGeo.missingSeoAssets.map(m => ({ file: m, issue: 'launch/discovery asset gap' }))],
  ['Heavy static images', report.performance.heavyImages],
  ['Unmasked PII in logs', report.complianceAndPrivacy.unmaskedPiiLogs],
  ['Missing legal pages', report.complianceAndPrivacy.missingLegalPages.map(m => ({ file: m, issue: 'legal page gap' }))],
  ['Ghost dependencies', report.ghostDependencies.unusedPackages],
  ['Missing env vars', report.environment.missingVars],
  ['Stray console.log files', report.codeHygiene.orphanConsoleLogs]
].map(([t, rows]) => section(t, rows)).join('\n') || '<p class="empty">No flags.</p>'}
<p class="meta">Regex heuristics produce these flags; false positives are expected. Confirm or clear each one during the 8-pillar manual audit.</p>
</body></html>\n`;
  const outPath = path.join(cwd, 'audit_scorecard.html');
  fs.writeFileSync(outPath, html);
  console.error(`audit_scorecard.html written to ${outPath}`);
}
