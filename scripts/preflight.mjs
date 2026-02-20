#!/usr/bin/env node

/**
 * Preflight Check — runs before every push/checkpoint.
 * Catches the classes of bugs we hit in V1.8.x:
 *   1. Version inconsistency across files
 *   2. TypeScript errors
 *   3. Test failures
 *   4. Unguarded VITE_ env vars in HTML
 *   5. Keyboard shortcuts missing modifier key checks
 *   6. Schema changes without backward-compat tests
 *   7. CHANGELOG not updated
 *
 * Usage: pnpm preflight
 * Exit code 0 = all clear, 1 = issues found
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let failures = 0;
let warnings = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); failures++; }
function warn(msg) { console.log(`  ⚠️  ${msg}`); warnings++; }
function header(msg) { console.log(`\n━━━ ${msg} ━━━`); }

// ─── 1. Version Consistency ───────────────────────────────────────────

header('Version Consistency');

const pkgJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const pkgVersion = pkgJson.version;
console.log(`  package.json version: ${pkgVersion}`);

// Check SettingsPage imports version from package.json (no hardcoded version to check)
const settingsPath = resolve(ROOT, 'client/src/pages/SettingsPage.tsx');
if (existsSync(settingsPath)) {
  const settingsContent = readFileSync(settingsPath, 'utf8');
  if (settingsContent.includes('pkgJson.version') || settingsContent.includes('package.json')) {
    pass('SettingsPage reads version dynamically from package.json');
  } else {
    // Fallback: check for hardcoded version match
    const vMatch = settingsContent.match(/v(\d+\.\d+\.\d+)/);
    if (vMatch) {
      if (vMatch[1] === pkgVersion) {
        pass(`SettingsPage version matches: v${vMatch[1]}`);
      } else {
        fail(`SettingsPage version mismatch: v${vMatch[1]} (expected v${pkgVersion})`);
      }
    } else {
      warn('Could not find version string in SettingsPage.tsx');
    }
  }
}

// Check Dockerfile
const dockerfilePath = resolve(ROOT, 'Dockerfile');
if (existsSync(dockerfilePath)) {
  const dockerContent = readFileSync(dockerfilePath, 'utf8');
  const dMatch = dockerContent.match(/org\.opencontainers\.image\.version="([^"]+)"/);
  if (dMatch) {
    if (dMatch[1] === pkgVersion) {
      pass(`Dockerfile version label matches: ${dMatch[1]}`);
    } else {
      fail(`Dockerfile version label mismatch: ${dMatch[1]} (expected ${pkgVersion})`);
    }
  } else {
    warn('Could not find version label in Dockerfile');
  }
}

// Check CHANGELOG has current version
const changelogPath = resolve(ROOT, 'CHANGELOG.md');
if (existsSync(changelogPath)) {
  const changelog = readFileSync(changelogPath, 'utf8');
  if (changelog.includes(`[${pkgVersion}]`)) {
    pass(`CHANGELOG.md has section for [${pkgVersion}]`);
  } else {
    fail(`CHANGELOG.md missing section for [${pkgVersion}] — update before pushing`);
  }
}

// ─── 2. TypeScript ────────────────────────────────────────────────────

header('TypeScript');

try {
  execSync('npx tsc --noEmit 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  pass('No TypeScript errors');
} catch (e) {
  const output = e.stdout || e.stderr || '';
  const errorCount = (output.match(/error TS/g) || []).length;
  fail(`TypeScript: ${errorCount} error(s) found`);
  // Show first 5 errors
  const lines = output.split('\n').filter(l => l.includes('error TS')).slice(0, 5);
  lines.forEach(l => console.log(`    ${l.trim()}`));
}

// ─── 3. Tests ─────────────────────────────────────────────────────────

header('Tests');

try {
  const testOutput = execSync('pnpm test 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const passMatch = testOutput.match(/(\d+) passed/);
  const failMatch = testOutput.match(/(\d+) failed/);
  if (failMatch && parseInt(failMatch[1]) > 0) {
    fail(`Tests: ${failMatch[1]} failed`);
  } else if (passMatch) {
    pass(`Tests: ${passMatch[1]} passed`);
  } else {
    pass('Tests passed');
  }
} catch (e) {
  const output = e.stdout || e.stderr || '';
  const failMatch = output.match(/(\d+) failed/);
  fail(`Tests failed${failMatch ? `: ${failMatch[1]} failures` : ''}`);
}

// ─── 4. Unguarded VITE_ Env Vars in HTML ─────────────────────────────

header('Environment Variable Guards');

const indexHtmlPath = resolve(ROOT, 'client/index.html');
if (existsSync(indexHtmlPath)) {
  const html = readFileSync(indexHtmlPath, 'utf8');
  // Find raw %VITE_ references that aren't inside conditional blocks
  const viteRefs = html.match(/%VITE_[A-Z_]+%/g) || [];
  // Check each one is wrapped in a conditional (simple heuristic: check if there's an "if" nearby)
  const lines = html.split('\n');
  let unguarded = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const refs = line.match(/%VITE_[A-Z_]+%/g);
    if (refs) {
      // Check if this line or the 5 lines around it contain a conditional
      const context = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join('\n');
      if (!context.includes('if') && !context.includes('?') && !context.includes('&&') && !context.includes('includes(')) {
        unguarded.push(...refs.map(r => `line ${i + 1}: ${r}`));
      }
    }
  }
  if (unguarded.length === 0) {
    pass('All VITE_ env vars in HTML are guarded');
  } else {
    unguarded.forEach(u => fail(`Unguarded env var in index.html — ${u}`));
  }
}

// ─── 5. Keyboard Shortcut Modifier Checks ─────────────────────────────

header('Keyboard Shortcuts');

const homePath = resolve(ROOT, 'client/src/pages/Home.tsx');
if (existsSync(homePath)) {
  const homeContent = readFileSync(homePath, 'utf8');
  // Find single-key shortcuts (e.key === 'x') that don't check for modifier keys
  const shortcutPattern = /if\s*\(\s*(?:\()?e\.key\s*===\s*['"]([a-zA-Z])['"]/g;
  let match;
  let badShortcuts = [];
  while ((match = shortcutPattern.exec(homeContent)) !== null) {
    const key = match[1];
    // Get surrounding context (100 chars before)
    const start = Math.max(0, match.index - 200);
    const context = homeContent.substring(start, match.index + match[0].length);
    // Check if there's a !isMod or !e.metaKey or !e.ctrlKey check
    if (!context.includes('!isMod') && !context.includes('!e.metaKey') && !context.includes('!e.ctrlKey')) {
      // Check the same line
      const lineStart = homeContent.lastIndexOf('\n', match.index) + 1;
      const lineEnd = homeContent.indexOf('\n', match.index);
      const line = homeContent.substring(lineStart, lineEnd);
      if (!line.includes('!isMod') && !line.includes('!e.metaKey') && !line.includes('!e.ctrlKey')) {
        badShortcuts.push(key);
      }
    }
  }
  if (badShortcuts.length === 0) {
    pass('All single-key shortcuts check for modifier keys');
  } else {
    badShortcuts.forEach(k => fail(`Shortcut '${k}' missing modifier key check (!isMod) — will intercept Cmd+${k.toUpperCase()}`));
  }
}

// ─── 6. Schema Backward Compatibility ─────────────────────────────────

header('Schema Backward Compatibility');

const mdStoragePath = resolve(ROOT, 'server/mdStorage.ts');
if (existsSync(mdStoragePath)) {
  const mdContent = readFileSync(mdStoragePath, 'utf8');
  // Check for safe column accessor pattern
  if (mdContent.includes('col(') || mdContent.includes('col =') || mdContent.includes('safeGet')) {
    pass('mdStorage uses safe column accessor for task deserialization');
  } else {
    // Check if there are hardcoded array indices for task parsing
    const hardcodedPattern = /r\[1[5-9]\]|r\[2\d\]/g;
    if (hardcodedPattern.test(mdContent)) {
      warn('mdStorage uses hardcoded high indices — consider using a safe column accessor');
    } else {
      pass('mdStorage column access looks reasonable');
    }
  }
}

// ─── 7. Save Error Handling ───────────────────────────────────────────

header('Save Error Handling');

const sheetsPath = resolve(ROOT, 'client/src/lib/sheets.ts');
if (existsSync(sheetsPath)) {
  const sheetsContent = readFileSync(sheetsPath, 'utf8');
  if (sheetsContent.includes('retry') || sheetsContent.includes('Retry') || sheetsContent.includes('MAX_RETRIES')) {
    pass('Save logic includes retry mechanism');
  } else {
    warn('Save logic has no retry mechanism — save failures may cause data loss');
  }
  if (sheetsContent.includes('onSaveError') || sheetsContent.includes('saveError') || sheetsContent.includes('onError')) {
    pass('Save logic reports errors to caller');
  } else {
    warn('Save logic may swallow errors silently');
  }
}

// ─── Summary ──────────────────────────────────────────────────────────

header('Summary');

if (failures === 0 && warnings === 0) {
  console.log('  🟢 All checks passed. Safe to push.\n');
  process.exit(0);
} else if (failures === 0) {
  console.log(`  🟡 ${warnings} warning(s), 0 failures. Review warnings before pushing.\n`);
  process.exit(0);
} else {
  console.log(`  🔴 ${failures} failure(s), ${warnings} warning(s). Fix failures before pushing.\n`);
  process.exit(1);
}
