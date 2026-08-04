# Pacy Codebase Auditor Skill Installer for PowerShell
# Author: kryptopacy (kryptopacy@gmail.com)
# https://github.com/kryptopacy/pacy-codebase-auditor

$ErrorActionPreference = "Stop"

$SkillName = "pacy-codebase-auditor"
$RawBaseUrl = "https://raw.githubusercontent.com/kryptopacy/pacy-codebase-auditor/main"

Write-Host "🛡️ Installing Pacy Codebase Auditor ($SkillName)..." -ForegroundColor Cyan

$TargetDir = Join-Path -Path $PWD -ChildPath ".agents\skills\$SkillName"
$ScriptsDir = Join-Path -Path $TargetDir -ChildPath "scripts"

if (-not (Test-Path -Path $ScriptsDir)) {
    New-Item -ItemType Directory -Path $ScriptsDir -Force | Out-Null
}

Write-Host "📥 Downloading skill files from GitHub ($RawBaseUrl)..." -ForegroundColor Yellow

$files = @(
    @{ Path = "SKILL.md"; Target = Join-Path $TargetDir "SKILL.md" },
    @{ Path = "README.md"; Target = Join-Path $TargetDir "README.md" },
    @{ Path = "skills.json"; Target = Join-Path $TargetDir "skills.json" },
    @{ Path = "scripts/audit_preflight.js"; Target = Join-Path $ScriptsDir "audit_preflight.js" }
)

foreach ($file in $files) {
    $url = "$RawBaseUrl/$($file.Path)"
    Write-Host "   -> Downloading $($file.Path)..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $url -OutFile $file.Target -UseBasicParsing
}

Write-Host "✅ Successfully installed $SkillName to: $TargetDir" -ForegroundColor Green
Write-Host "🚀 You can now run: node $TargetDir\scripts\audit_preflight.js" -ForegroundColor Cyan
