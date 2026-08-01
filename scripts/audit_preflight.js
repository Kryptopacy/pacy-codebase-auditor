/**
 * Master Codebase Auditor Preflight Scanner (v5.0 Enterprise - Zero Blind Spots)
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
    unprotectedWebhooks: []
  },
  dataLayerResilience: {
    fragileSingleQueries: [], // .single() calls without maybeSingle/limit(1)
    nPlusOneQueryLoops: []    // await db queries inside loops
  },
  nextjsArchitecture: {
    missingErrorBoundaries: [],
    unoptimizedImgTags: []
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
  summary: { totalFlags: 0 }
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
  { key: 'hasRobotsTxt', name: 'robots.txt', locations: ['public/robots.txt', 'app/robots.ts', 'app/robots.js'] },
  { key: 'hasSitemapXml', name: 'sitemap.xml', locations: ['public/sitemap.xml', 'app/sitemap.ts', 'app/sitemap.js'] },
  { key: 'hasManifestJson', name: 'manifest.json', locations: ['public/manifest.json', 'app/manifest.ts', 'app/manifest.js'] },
  { key: 'hasLlmsTxt', name: 'llms.txt', locations: ['public/llms.txt'] },
  { key: 'hasLlmsFullTxt', name: 'llms-full.txt', locations: ['public/llms-full.txt'] }
];

seoFiles.forEach(item => {
  const found = item.locations.some(loc => fs.existsSync(path.join(cwd, loc)));
  report.seoAeoGeo[item.key] = found;
  if (!found) {
    report.seoAeoGeo.missingSeoAssets.push(item.name);
  }
});

// Check middleware/proxy matcher exclusions for SEO assets
const proxyPath = fs.existsSync(path.join(cwd, 'proxy.ts')) ? path.join(cwd, 'proxy.ts') : (fs.existsSync(path.join(cwd, 'middleware.ts')) ? path.join(cwd, 'middleware.ts') : null);
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

          // Unhandled Client Auth scan
          if (/'use client'|"use client"/.test(content) && /supabase\.auth\.signInWithPassword/.test(content) && !/loginAction/.test(content)) {
            report.security.unhandledClientAuth.push({ file: relPath, issue: 'Direct client-side signInWithPassword without Server Action wrapper' });
          }

          // Fragile .single() Queries (Can crash with HTTP 406 on empty rows)
          if (/\.select\(.*?\)\s*\.single\(\)/s.test(content) && !/\.limit\(1\)/.test(content) && !/maybeSingle/.test(content)) {
            // Only flag if it doesn't catch or handle empty row fallback
            if (!/maybeSingle|\.catch/.test(content)) {
              report.dataLayerResilience.fragileSingleQueries.push({ file: relPath, issue: 'Uses .single() without .maybeSingle() or fallback handling (susceptible to empty-row crashes)' });
            }
          }

          // Potential N+1 Query Loops
          if (/(for\s*\(|for\s+await|\.forEach|\.map\().*?await\s+(supabase|prisma|db|fetch)/s.test(content) && !/Promise\.all/.test(content)) {
            report.dataLayerResilience.nPlusOneQueryLoops.push({ file: relPath, issue: 'Sequential await query inside loop (potential N+1 performance bottleneck)' });
          }

          // Next.js Unoptimized <img> vs <Image>
          if (/<img\s+[^>]*src=/i.test(content) && !content.includes('eslint-disable') && !relPath.includes('node_modules')) {
            report.nextjsArchitecture.unoptimizedImgTags.push({ file: relPath, issue: 'Uses standard HTML <img> instead of Next.js <Image> component' });
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

        } catch (e) {
          // Ignore read errors
        }
      }
    }
  }
}

scanDirectory(path.join(cwd, 'src'));
scanDirectory(path.join(cwd, 'app'));
scanDirectory(path.join(cwd, 'lib'));

report.summary.totalFlags = 
  report.security.leakedSecrets.length + 
  report.security.unhandledClientAuth.length + 
  report.security.unsafeCasts.length +
  report.security.unprotectedWebhooks.length +
  report.dataLayerResilience.fragileSingleQueries.length +
  report.dataLayerResilience.nPlusOneQueryLoops.length +
  report.nextjsArchitecture.missingErrorBoundaries.length +
  report.nextjsArchitecture.unoptimizedImgTags.length +
  report.environment.missingVars.length +
  report.seoAeoGeo.missingSeoAssets.length;

console.log(JSON.stringify(report, null, 2));
