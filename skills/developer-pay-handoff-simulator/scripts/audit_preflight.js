#!/usr/bin/env node
/**
 * pacy-codebase-auditor Preflight Scanner (v8.1.0 - Universal Zero-Assumption Edition)
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
    middlewareExcludesSeo: false,
    missingSeoAssets: []
  },
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

          // UNIVERSAL: Fragile .single() Queries (PostgREST PGRST116 / 406 Crash & Timeout Hazard across ANY table)
          if (/\.single\(\)/.test(content)) {
            report.dataLayerResilience.fragileSingleQueries.push({ 
              file: relPath, 
              issue: 'ZERO-ROW CRASH HAZARD: Uses .single() instead of .maybeSingle(). If 0 rows match (e.g. new user, missing record, un-created cart/settings, invalid query param), PostgREST throws PGRST116 causing 500 crashes or ERR_TIMED_OUT. Replace with .maybeSingle() and handle null fallback.'
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
  report.seoAeoGeo.missingSeoAssets.length;

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
  report.summary.businessRiskSummary.push(`ZERO-ROW CRASH HAZARD (${report.dataLayerResilience.fragileSingleQueries.length} site(s)): Database queries use .single() instead of .maybeSingle(). Any query returning 0 rows will trigger PostgREST PGRST116 and cause 500 errors or ERR_TIMED_OUT.`);
}
if (report.nextjsArchitecture.reactStrictModeLeaks.length > 0) {
  report.summary.businessRiskSummary.push("MEMORY LEAK RISK: Timers or real-time subscriptions lack cleanup. Users leaving open tabs will experience sluggish performance.");
}
if (report.seoAeoGeo.missingSeoAssets.length > 0) {
  report.summary.businessRiskSummary.push("GROWTH & AI DISCOVERY RISK: Missing SEO or AI crawler files (`robots.txt`, `/llms.txt`). Search engines and AI assistants won't index your site correctly.");
}

console.log(JSON.stringify(report, null, 2));
