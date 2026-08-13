#!/usr/bin/env node
/**
 * pacy-codebase-auditor Preflight Scanner (v1.0.0)
 * Deep automated AST/regex scanner covering Security, Data Layer, Next.js, SEO/AEO/GEO, and Performance.
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
    clientSideAiSdkUsage: []
  },
  ghostUiAndMockData: {
    emptyEventHandlers: [],
    mockDataStrings: [],
    unimplementedTodos: []
  },
  dataLayerResilience: {
    fragileSingleQueries: [], // .single() calls without maybeSingle/limit(1)
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
    reactStrictModeLeaks: []
  },
  seoAeoGeo: {
    hasRobotsTxt: false,
    hasSitemapXml: false,
    hasManifestJson: false,
    hasLlmsTxt: false,
    hasLlmsFullTxt: false,
    middlewareExcludesSeo: false,
    missingSeoAssets: []
  },
  codeHygiene: { orphanConsoleLogs: [], tsIgnoreCount: 0 },
  environment: { missingVars: [] },
  summary: {
    totalFlags: 0,
    shipReadinessScore: 100,
    verdict: "🟢 PRODUCTION GOLD - SAFE TO SHIP & RELEASE PAYMENT",
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

// 3. Compare .env.example with .env / .env.local
const envExamplePath = path.join(cwd, '.env.example');
const envLocalPath = path.join(cwd, '.env.local') || path.join(cwd, '.env');

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
const appDir = path.join(cwd, 'app');
if (fs.existsSync(appDir)) {
  if (!fs.existsSync(path.join(appDir, 'error.tsx')) && !fs.existsSync(path.join(appDir, 'error.js'))) {
    report.nextjsArchitecture.missingErrorBoundaries.push('Root app/error.tsx is missing');
  }
  if (!fs.existsSync(path.join(appDir, 'not-found.tsx')) && !fs.existsSync(path.join(appDir, 'not-found.js'))) {
    report.nextjsArchitecture.missingErrorBoundaries.push('Root app/not-found.tsx is missing');
  }
}

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
            if (!/validateWebhookSignature|verifyHeader|crypto|hmac|signature|x-paystack-signature|x-bachs-key/i.test(content)) {
              report.security.unprotectedWebhooks.push({ file: relPath, issue: 'Webhook route appears to lack HMAC signature or header verification' });
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

          // Fragile .single() Queries (Can crash with HTTP 406 on empty rows)
          if (/\.single\(\)/.test(content) && !/\.maybeSingle\(\)/.test(content) && !/\.limit\(1\)/.test(content)) {
            if (!/\.catch\(|try\s*\{/.test(content)) {
              report.dataLayerResilience.fragileSingleQueries.push({ file: relPath, issue: 'Uses .single() without .maybeSingle() or fallback handling (susceptible to empty-row crashes)' });
            }
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

const targetDirs = ['src', 'app', 'lib', 'components', 'actions', 'utils', 'hooks', 'services', 'server', 'api', 'pages'];
targetDirs.forEach(dir => scanDirectory(path.join(cwd, dir)));

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
  report.environment.missingVars.length +
  report.seoAeoGeo.missingSeoAssets.length;

// Calculate Ship-Readiness Score (0 - 100%)
let score = 100;
score -= report.security.leakedSecrets.length * 25;
score -= report.security.exposedPublicSecrets.length * 25;
score -= report.security.clientSideAiSdkUsage.length * 15;
score -= report.security.unprotectedWebhooks.length * 15;
score -= report.complianceAndPrivacy.unmaskedPiiLogs.length * 15;
score -= report.ghostUiAndMockData.emptyEventHandlers.length * 5;
score -= report.ghostUiAndMockData.mockDataStrings.length * 5;
score -= report.dataLayerResilience.fragileSingleQueries.length * 5;
score -= report.dataLayerResilience.unboundedQueries.length * 5;
score -= report.complianceAndPrivacy.missingLegalPages.length * 5;
score -= report.nextjsArchitecture.reactStrictModeLeaks.length * 5;
score -= report.seoAeoGeo.missingSeoAssets.length * 5;
score = Math.max(0, score);
report.summary.shipReadinessScore = score;

if (score >= 90) {
  report.summary.verdict = "🟢 PRODUCTION GOLD - SAFE TO SHIP & RELEASE PAYMENT";
} else if (score >= 70) {
  report.summary.verdict = "🟡 FUNCTIONAL WITH TECH DEBT - REMEDIATION RECOMMENDED BEFORE FULL PAYMENT";
} else {
  report.summary.verdict = "🔴 REJECTED - BULLSHIT / BROKEN / UNWIRED CODE DETECTED";
}

// Generate Plain-English Business Risk Translations for Non-Techies
if (report.security.leakedSecrets.length > 0 || report.security.exposedPublicSecrets.length > 0) {
  report.summary.businessRiskSummary.push("CRITICAL SECURITY RISK: Hardcoded DB passwords or private API keys found. Attackers can steal customer data or run up your cloud bill.");
}
if (report.security.clientSideAiSdkUsage.length > 0) {
  report.summary.businessRiskSummary.push("FINANCIAL RISK (Denial of Wallet): AI models (OpenAI/Gemini) are called directly from client browser code without backend rate-limiting.");
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
  report.summary.businessRiskSummary.push("RELIABILITY RISK: Database queries lack fallback handling. Pages will crash to a white screen if a user or record doesn't exist yet.");
}
if (report.nextjsArchitecture.reactStrictModeLeaks.length > 0) {
  report.summary.businessRiskSummary.push("MEMORY LEAK RISK: Timers or real-time subscriptions lack cleanup. Users leaving open tabs will experience sluggish performance.");
}
if (report.seoAeoGeo.missingSeoAssets.length > 0) {
  report.summary.businessRiskSummary.push("GROWTH & AI DISCOVERY RISK: Missing SEO or AI crawler files (`robots.txt`, `/llms.txt`). Search engines and AI assistants won't index your site correctly.");
}

// Optional Standalone HTML Scorecard Generator for Non-Techie Founders (--html)
if (process.argv.includes('--html')) {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-fit, initial-scale=1.0">
  <title>Codebase Audit Executive Scorecard</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --text: #f8fafc; --accent: #3b82f6; --red: #ef4444; --yellow: #f59e0b; --green: #10b981; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; max-width: 900px; margin: 0 auto; }
    .card { background: var(--card); border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); }
    .score { font-size: 3.5rem; font-weight: 800; margin: 0.5rem 0; }
    .badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 999px; font-weight: 700; font-size: 0.9rem; }
    .badge-gold { background: rgba(16,185,129,0.2); color: var(--green); border: 1px solid var(--green); }
    .badge-warn { background: rgba(245,158,11,0.2); color: var(--yellow); border: 1px solid var(--yellow); }
    .badge-fail { background: rgba(239,68,68,0.2); color: var(--red); border: 1px solid var(--red); }
    ul { padding-left: 1.25rem; line-height: 1.7; }
    h1, h2, h3 { margin-top: 0; }
    .risk-item { background: rgba(239,68,68,0.1); border-left: 4px solid var(--red); padding: 1rem; margin: 0.75rem 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🛡️ Executive Codebase Audit Scorecard</h1>
    <p>Project Path: <code>${cwd}</code> | Date: ${new Date().toLocaleDateString()}</p>
    <div class="score">${report.summary.shipReadinessScore}%</div>
    <div class="badge ${report.summary.shipReadinessScore >= 90 ? 'badge-gold' : report.summary.shipReadinessScore >= 70 ? 'badge-warn' : 'badge-fail'}">
      ${report.summary.verdict}
    </div>
  </div>
  <div class="card">
    <h2>📌 Plain-English Business & Financial Risks</h2>
    ${report.summary.businessRiskSummary.length === 0 ? '<p style="color: var(--green);">✨ Zero business risks discovered. All core systems pass preflight inspection.</p>' : report.summary.businessRiskSummary.map(r => `<div class="risk-item">${r}</div>`).join('')}
  </div>
  <div class="card">
    <h2>📊 Automated AST Preflight Summary</h2>
    <ul>
      <li><strong>Total Defect Flags:</strong> ${report.summary.totalFlags}</li>
      <li><strong>Leaked Secret Keys / Exposed Public Secrets:</strong> ${report.security.leakedSecrets.length + report.security.exposedPublicSecrets.length}</li>
      <li><strong>Unwired Ghost UI / Dummy Event Handlers:</strong> ${report.ghostUiAndMockData.emptyEventHandlers.length}</li>
      <li><strong>Hardcoded Mock Data Strings:</strong> ${report.ghostUiAndMockData.mockDataStrings.length}</li>
      <li><strong>Fragile Database Queries (.single()):</strong> ${report.dataLayerResilience.fragileSingleQueries.length}</li>
      <li><strong>React 18 Memory Leaks:</strong> ${report.nextjsArchitecture.reactStrictModeLeaks.length}</li>
      <li><strong>Missing SEO / AEO / GEO Crawl Assets:</strong> ${report.seoAeoGeo.missingSeoAssets.length}</li>
    </ul>
  </div>
</body>
</html>`;
  try {
    fs.writeFileSync(path.join(cwd, 'audit_scorecard.html'), htmlContent, 'utf-8');
  } catch (e) {
    // Ignore write errors
  }
}

console.log(JSON.stringify(report, null, 2));
