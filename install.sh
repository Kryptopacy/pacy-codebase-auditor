#!/usr/bin/env bash
# Pacy Codebase Auditor Skill Installer for AI Agents & Terminal
# Author: kryptopacy (kryptopacy@gmail.com)
# https://github.com/kryptopacy/pacy-codebase-auditor

set -e

SKILL_NAME="pacy-codebase-auditor"
REPO_URL="https://github.com/kryptopacy/pacy-codebase-auditor.git"
RAW_BASE_URL="https://raw.githubusercontent.com/kryptopacy/pacy-codebase-auditor/main"

echo "🛡️ Installing Pacy Codebase Auditor ($SKILL_NAME)..."

# Determine target agents directory
if [ -n "$1" ]; then
  TARGET_DIR="$1/.agents/skills/$SKILL_NAME"
else
  TARGET_DIR=".agents/skills/$SKILL_NAME"
fi

mkdir -p "$TARGET_DIR/scripts"

# Try cloning or downloading files
if command -v git &> /dev/null; then
  echo "📥 Cloning repository..."
  tmp_dir=$(mktemp -d)
  if git clone --depth 1 "$REPO_URL" "$tmp_dir" 2>/dev/null; then
    cp -r "$tmp_dir/"* "$TARGET_DIR/"
    rm -rf "$tmp_dir"
  else
    echo "📥 Fetching files directly from GitHub..."
    curl -sSL "$RAW_BASE_URL/SKILL.md" -o "$TARGET_DIR/SKILL.md"
    curl -sSL "$RAW_BASE_URL/README.md" -o "$TARGET_DIR/README.md"
    curl -sSL "$RAW_BASE_URL/skills.json" -o "$TARGET_DIR/skills.json"
    curl -sSL "$RAW_BASE_URL/scripts/audit_preflight.js" -o "$TARGET_DIR/scripts/audit_preflight.js"
  fi
else
  echo "📥 Downloading files directly via curl..."
  curl -sSL "$RAW_BASE_URL/SKILL.md" -o "$TARGET_DIR/SKILL.md"
  curl -sSL "$RAW_BASE_URL/README.md" -o "$TARGET_DIR/README.md"
  curl -sSL "$RAW_BASE_URL/skills.json" -o "$TARGET_DIR/skills.json"
  curl -sSL "$RAW_BASE_URL/scripts/audit_preflight.js" -o "$TARGET_DIR/scripts/audit_preflight.js"
fi

echo "✅ Successfully installed $SKILL_NAME to: $TARGET_DIR"
echo "🚀 You can now run: node $TARGET_DIR/scripts/audit_preflight.js"
