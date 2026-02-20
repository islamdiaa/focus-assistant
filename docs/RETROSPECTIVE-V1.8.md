# Retrospective: V1.8.x Session (2026-02-20)

## Summary

This session covered V1.8.1 through V1.8.4 — a mix of feature additions, a full UI audit, Docker deployment, and critical bug fixes. While we shipped significant functionality, several issues surfaced that were avoidable. This document analyzes root causes and establishes process improvements for future sessions.

---

## Issues Encountered

| # | Issue | Severity | Category | Root Cause |
|---|-------|----------|----------|------------|
| 1 | Silent save failures → data loss on container restart | **Critical** | Data Integrity | Save errors swallowed silently; no retry, no user feedback |
| 2 | Column format mismatch after upgrade (15-col → 18-col) | **High** | Migration | New fields added to serialization without backward-compatible deserialization |
| 3 | Dockerfile ARM64 QEMU crash (`--ignore-scripts` broke esbuild) | **High** | Deployment | `--ignore-scripts` applied to builder stage, preventing esbuild binary download |
| 4 | Analytics `URIError` on self-hosted (unresolved `%VITE_ANALYTICS_ENDPOINT%`) | **Medium** | Deployment | Platform-specific env var baked into HTML without conditional guard |
| 5 | `OAUTH_SERVER_URL not configured` spam on self-hosted | **Medium** | Deployment | No concept of "self-hosted mode" — OAuth assumed always present |
| 6 | Focus Mode exit ghost overlay | **Medium** | UI | `AnimatePresence` exit animation left DOM nodes behind |
| 7 | TimerPage `getEffectiveElapsed` null type mismatch | **Low** | Types | Zod schema allows `null` but function signature didn't |
| 8 | Version string stuck at v1.8.0 | **Low** | Process | Version not bumped in all locations |
| 9 | Cmd+R triggering reminder dialog instead of browser refresh | **Low** | UX | Keyboard shortcut handler didn't check for modifier keys |
| 10 | CHANGELOG not updated with all features before push | **Low** | Process | Features shipped incrementally without updating CHANGELOG each time |
| 11 | GitHub push failures / "up-to-date" confusion | **Low** | Tooling | Token expiry, force-push needed after rebase |

---

## Root Cause Analysis

### 1. No Self-Hosted Testing Path

The app was developed and tested exclusively on the Manus platform. When deployed to a Docker container on Unraid, three issues surfaced immediately (analytics URIError, OAuth errors, save failures). **We had no way to simulate the self-hosted environment during development.**

**Lesson:** Self-hosted is a first-class deployment target. It needs its own test path.

### 2. Schema Migration Without Backward Compatibility

When we added `pinnedToday`, `recurrenceDayOfMonth`, and `recurrenceStartMonth` columns to the markdown serialization, the deserializer used hardcoded array indices. Old data files with 15 columns would silently produce `undefined` for indices 15-17, but more critically, if the column count changed the index mapping, data could be misread.

**Lesson:** Every schema change needs a migration strategy. For a file-based format, that means the deserializer must handle variable column counts gracefully.

### 3. Silent Error Handling as Default

The save pipeline had three layers of error swallowing:
- `serverSave()` returned `false` on failure but the caller ignored it
- `saveState()` caught errors and only logged a warning
- `AppContext` debounced saves with no success/failure tracking

The user had no indication their data wasn't persisting. This is the most dangerous class of bug — everything looks fine until you restart.

**Lesson:** Save operations must be loud about failures. Silent `catch` blocks are technical debt that becomes data loss.

### 4. Incremental Feature Shipping Without Version Discipline

Features were shipped across multiple checkpoints within the same version number. The CHANGELOG was updated once at the start but not maintained as features accumulated. Version strings were scattered across 4 files (package.json, SettingsPage, Dockerfile, CHANGELOG) with no single source of truth.

**Lesson:** Version bumps should be atomic — all files updated together, CHANGELOG written before the checkpoint.

### 5. Dockerfile Changes Without Build Verification

The `--ignore-scripts` flag was added to fix an ARM64 QEMU crash but broke the x86 build because esbuild's binary wasn't downloaded. We iterated through 3 Dockerfile versions before getting it right, each requiring a push-build-fail-fix cycle on the user's homeserver.

**Lesson:** Dockerfile changes need a local build test before pushing. Even `docker build --target builder .` would have caught the esbuild issue.

---

## Process Improvements

### For Every Session

1. **Read this retrospective first** — before starting work, review `docs/RETROSPECTIVE-V1.8.md` for lessons learned.

2. **Version bump checklist** — when bumping versions, update ALL of these atomically:
   - `package.json` → `version`
   - `client/src/pages/SettingsPage.tsx` → version badge
   - `Dockerfile` → `org.opencontainers.image.version` label
   - `CHANGELOG.md` → new section header
   - Run: `grep -rn "1\.8\." --include="*.ts" --include="*.tsx" --include="*.json" --include="Dockerfile" --include="*.md" | grep -v node_modules | grep -v CHANGELOG`

3. **CHANGELOG-first development** — write the CHANGELOG entry *before* implementing the feature. Update it as you go. Never push without reviewing the CHANGELOG.

### For Schema Changes

4. **Backward-compatible deserialization** — when adding columns to the markdown format:
   - Use a safe accessor: `const col = (idx) => (idx < r.length ? r[idx] : '') || ''`
   - Add a comment noting the column count per version
   - Write a test that deserializes old-format data with fewer columns

5. **Migration test** — for every new field, add a test that:
   - Serializes state with the new field
   - Deserializes old-format data (without the field)
   - Verifies both produce valid state

### For Save/Persistence

6. **Save failures must be visible** — every save operation must:
   - Return success/failure status
   - Retry with backoff on failure
   - Show a user-visible indicator on persistent failure
   - Cache to localStorage as a fallback

7. **Periodic heartbeat save** — save state every 60 seconds regardless of changes, as insurance against browser crashes and missed change events.

### For Docker/Deployment

8. **Self-hosted smoke test** — before pushing Docker changes:
   - Build locally: `docker build -t focus-assistant:test .`
   - Run with `SKIP_AUTH=true` and verify the app loads
   - Check server logs for errors

9. **Dockerfile change = local build test** — never push a Dockerfile change without building it first. Even a `--target builder` partial build catches most issues.

10. **Environment variable guards** — every `VITE_*` env var referenced in HTML must have a conditional check. Platform-specific features (analytics, OAuth) must degrade gracefully when their env vars are absent.

### For Keyboard Shortcuts

11. **Modifier key check** — every keyboard shortcut must check `!e.metaKey && !e.ctrlKey` unless it's intentionally a modifier combo. Browser shortcuts (Cmd+R, Cmd+T, Cmd+W) must never be intercepted.

### For Testing

12. **Self-hosted integration test** — add a test that:
   - Starts the server with `SKIP_AUTH=true` and no OAuth env vars
   - Verifies the app loads without errors
   - Verifies save/load round-trip works

13. **Column-count regression test** — maintain test fixtures with old-format markdown data (15-col, 17-col) and verify they deserialize correctly with the current code.

---

## Checklist: Before Every Push

```
[ ] Version bumped in ALL 4 locations
[ ] CHANGELOG updated with all changes since last push
[ ] `npx tsc --noEmit` passes (0 errors)
[ ] `pnpm test` passes (all tests)
[ ] No new keyboard shortcuts conflict with browser defaults
[ ] If schema changed: backward-compat deserializer + migration test added
[ ] If Dockerfile changed: `docker build .` tested locally
[ ] If new env var: guarded in code, documented in README/Dockerfile
```

---

## Key Takeaway

The most dangerous bugs in this session were **silent failures** — saves that looked like they worked but didn't, schema changes that didn't crash but produced wrong data, env vars that weren't set but didn't error. The common thread is **optimistic error handling**: catching errors and continuing instead of failing loudly.

Going forward, the default should be **fail loud, recover gracefully**. Every operation that touches user data should have visible success/failure feedback, and every schema change should be tested against the previous format.
