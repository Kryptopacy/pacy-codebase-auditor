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
    permissiveRlsPolicies: []
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
      if (['.js', '.ts', '.tsx', '.jsx', '.py', '.rs', '.go', '.php'].includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relPath = path.relative(cwd, fullPath);
          scannedFilesList.push(relPath);

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

// Generate Plain-English Business Risk Translations for Non-Techies
if (report.security.leakedSecrets.length > 0 || report.security.exposedPublicSecrets.length > 0) {
  report.summary.businessRiskSummary.push("CRITICAL SECURITY RISK: Hardcoded DB passwords or private API keys found. Attackers can steal customer data or run up your cloud bill.");
}
if (report.security.permissiveRlsPolicies.length > 0) {
  report.summary.businessRiskSummary.push("CRITICAL DATA PRIVACY LEAK: Supabase RLS policy uses 'USING (true)', exposing database records across tenants to public anon keys.");
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
