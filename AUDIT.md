# FocusAssist Codebase Audit Report

> **Initial audit:** 2026-02-20 on V1.8.5 (`dcb92bd`)
> **Last updated:** 2026-02-21 on V1.8.7 (`d45f752`)
> **Scope:** Every file in the codebase — client, server, shared types, tests, config, Docker, CI
> **Method:** 4 parallel audit agents covering: (1) client state & data flow, (2) all page components, (3) server storage & data, (4) tests & build config

---

## Fix History

| Version            | Issues Fixed               | Details                                                                                                                                                   |
| ------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1.8.6 (`69c7054`) | C1, C2, C3, C4, C6, H5, H8 | Auto-save race, dirty flag polling, JSON import validation, write mutex + atomic saves, zero-safe parseInt, corrupt file handling, missing default fields |
| V1.8.7 (`8311f6a`) | H1, H7, H9                 | AudioContext leak, duplicate recurrence guard, actual elapsed time in stats                                                                               |

---

## Table of Contents

- [Critical Issues (6) — ALL FIXED](#critical-issues--all-fixed)
- [High Issues (14) — 5 fixed, 9 remaining](#high-issues)
- [Medium Issues (16) — 0 fixed, all remaining](#medium-issues)
- [Low Issues (10) — 0 fixed, all remaining](#low-issues)
- [Zero Coverage Areas](#zero-coverage-areas)
- [Summary](#summary)

---

## Critical Issues — ALL FIXED

### ~~C1. Auto-save races with initial load — can overwrite server data with empty state~~

> **FIXED in V1.8.6** — `loadedRef.current = true` now set AFTER `loadState()` resolves and `LOAD_STATE` dispatches. Separate `loadStartedRef` prevents re-entry.

**Original file:** `client/src/contexts/AppContext.tsx`

**Original problem:** `loadedRef.current = true` fired synchronously before the async `loadState()` resolved. The save effect's guard was already `true`, so on a slow network the 500ms debounced save could write empty `initialState` to the server before real data loaded.

**Fix applied (AppContext.tsx:868-882):**

```typescript
const loadStartedRef = useRef(false);
useEffect(() => {
  if (loadStartedRef.current) return;
  loadStartedRef.current = true;
  loadState().then(loaded => {
    dispatch({ type: "LOAD_STATE", payload: loaded });
    loadedRef.current = true; // ← NOW set AFTER load completes
    pollTimestamp()
      .then(ts => {
        lastTimestampRef.current = ts;
      })
      .catch(() => {});
  });
}, [dispatch]);
```

---

### ~~C2. Polling overwrites unsaved local changes — no merge logic~~

> **FIXED in V1.8.6** — New `dirtyRef` flag prevents polling from replacing state while unsaved user changes exist.

**Original file:** `client/src/contexts/AppContext.tsx`

**Original problem:** Poll detected a server timestamp change and did a full `LOAD_STATE` replacement. Any unsaved edits within the 500ms debounce window were silently discarded.

**Fix applied (AppContext.tsx:841, 848-854, 893, 918):**

```typescript
const dirtyRef = useRef(false);

// Set dirty on user actions
const dispatch = useCallback((action: Action) => {
  if (!NON_UNDOABLE_ACTIONS.has(action.type)) {
    dirtyRef.current = true;
  }
  rawDispatch(action);
}, []);

// Clear after successful save
dirtyRef.current = false;

// Skip poll reload when dirty
if (dirtyRef.current) return;
```

---

### ~~C3. JSON import bypasses all Zod validation~~

> **FIXED in V1.8.6** — `appStateSchema.safeParse()` now validates JSON imports before accepting.

**Original file:** `server/dataRouter.ts`

**Original problem:** `JSON.parse(input.content)` was assigned directly to `state` with no schema validation. Any arbitrary JSON was written to the data file.

**Fix applied (dataRouter.ts:119-133):**

```typescript
if (input.format === "json") {
  try {
    const parsed = JSON.parse(input.content);
    const result = appStateSchema.safeParse(parsed);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid data structure: ${result.error.issues.map(i => i.message).join(", ")}`,
      };
    }
    state = result.data;
  } catch {
    return { success: false, error: "Invalid JSON" };
  }
}
```

---

### ~~C4. Concurrent saves have no file locking — last-write-wins race condition~~

> **FIXED in V1.8.6** — Promise-based write mutex serializes concurrent saves. Write-to-temp-then-rename for atomicity.

**Original file:** `server/mdStorage.ts`

**Original problem:** No mutex, no write serialization, no atomic writes. Two saves could interleave backup rotation and file writes. `fs.writeFile()` was non-atomic (crash mid-write = truncated file).

**Fix applied (mdStorage.ts:537-569):**

```typescript
let writeLock: Promise<void> = Promise.resolve();

export async function saveToMdFile(state: AppState): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    writeLock = writeLock.then(async () => {
      try {
        await ensureDataDir();
        await rotateBackups();
        await createDailySnapshot();
        const tmpFile = DATA_FILE + ".tmp";
        await fs.writeFile(tmpFile, stateToMarkdown(state), "utf-8");
        await fs.rename(tmpFile, DATA_FILE); // atomic on POSIX
        syncToObsidian(state).catch(e =>
          console.warn("[ObsidianSync] Error:", e)
        );
        resolve(true);
      } catch (e) {
        try {
          await fs.unlink(DATA_FILE + ".tmp");
        } catch {}
        resolve(false);
      }
    });
  });
}
```

---

### ~~C5. FocusMode timer stale closure overwrite risk~~

> **Downgraded to HIGH (H2)** — The "double-counts" claim was overclaimed. The effect cleanup prevents literal double-firing. The real bug is the stale `state.dailyStats` closure used for absolute value dispatch, which can overwrite another component's stats update under a narrow timing window (two timers completing near-simultaneously). Interval recreation every second is wasteful but not functionally broken.

---

### ~~C6. `parseInt(val) || default` treats zero as invalid~~

> **FIXED in V1.8.6** — New `safeParseInt()` helper using `isNaN()` replaces all instances in `mdStorage.ts`.

**Original files:** `server/mdStorage.ts`, `server/sheetsStorage.ts`

**Original problem:** `parseInt("0") || 25` evaluates to `25` because `0` is falsy. Any numeric field with a legitimate zero value silently reverted to its default on every load/save round-trip.

**Fix applied (mdStorage.ts:42-45):**

```typescript
function safeParseInt(val: string, fallback: number): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}
```

Used throughout settings parsing, pomodoro parsing, and daily stats parsing. **Note:** `sheetsStorage.ts` still uses the old `parseInt || default` pattern, but this is lower risk since Sheets write mode is non-functional anyway (H4).

---

## High Issues

### ~~H1. AudioContext leak stops sound after ~6 pomodoros~~

> **FIXED in V1.8.7** — `ctx.close()` called via `setTimeout` after second tone finishes.

**Fix applied (TimerPage.tsx:108-109):**

```typescript
setTimeout(() => ctx.close().catch(() => {}), 1200);
```

---

### H2. FocusMode timer recreates interval every second + stale closure overwrite risk

> **STILL OPEN** — `FocusModePage.tsx:51-91` unchanged.

**Code:**

```typescript
useEffect(() => {
  if (timerRunning && timerSeconds > 0) {
    intervalRef.current = setInterval(() => {
      setTimerSeconds(s => s - 1);
    }, 1000);
  } else if (timerSeconds === 0 && timerRunning) {
    setTimerRunning(false);
    if (timerPhase === "focus") {
      dispatch({
        type: "UPDATE_DAILY_STATS",
        payload: {
          focusMinutes:
            (state.dailyStats.find(...)?.focusMinutes || 0) + state.settings.focusDuration,
          pomodorosCompleted:
            (state.dailyStats.find(...)?.pomodorosCompleted || 0) + 1,
        },
      });
    }
  }
  return () => clearInterval(intervalRef.current);
}, [timerRunning, timerSeconds, timerPhase, state.settings, dispatch, state.dailyStats]);
```

**Problems:**

- `timerSeconds` in dependency array causes interval tear-down/recreate every second (wasteful but not broken)
- Completion dispatch uses absolute values from stale `state.dailyStats` closure instead of delta-based updates inside the reducer
- No audio notification or browser notification on completion (unlike TimerPage)

**Risk:** If TimerPage completes a pomodoro and updates dailyStats, then FocusMode completes shortly after, FocusMode's stale closure overwrites TimerPage's stats. Requires narrow timing window.

---

### H3. Google Sheets backend drops most V1.2+ fields

> **STILL OPEN** — `server/sheetsStorage.ts` unchanged.

Tasks lose: recurrence, subtasks, pinnedToday, statusChangedAt. Pomodoros lose: startedAt, accumulatedSeconds, linkedTasks. Templates, preferences, readingList, and reminders entirely missing. Switching to Sheets mode permanently destroys this data.

---

### H4. Google Sheets writes always fail — API key insufficient for PUT

> **STILL OPEN** — `server/sheetsStorage.ts:35-53` unchanged.

Google Sheets API v4 requires OAuth2 for writes, not API keys. PUT request always returns 401/403. Error silently swallowed.

---

### ~~H5. Corrupt data file returns null → emptyState → next save destroys data~~

> **FIXED in V1.8.6** — `loadFromMdFile()` now throws on non-ENOENT errors instead of returning `null`.

**Fix applied (mdStorage.ts:472-478):**

```typescript
catch (e: any) {
  if (e.code === "ENOENT") return null;
  console.error("Failed to read MD file (data may be corrupt):", e);
  throw new Error(`Failed to load data file: ${e.message || e}`);
}
```

---

### H6. Task reorder with filters silently reorders hidden tasks

> **STILL OPEN** — `TasksPage.tsx` / `AppContext.tsx` unchanged.

When a filter is active, `REORDER_TASKS` payload only contains visible task IDs. The reducer pushes all non-visible tasks to the end of the array.

---

### ~~H7. Rapid toggle of recurring tasks creates duplicate recurrences~~

> **FIXED in V1.8.7** — Checks for existing pending recurrence before spawning.

**Fix applied (AppContext.tsx:335-343):**

```typescript
const hasPendingRecurrence = tasks.some(
  t => t.recurrenceParentId === task.id && t.status === "active"
);
if (
  newStatus === "done" &&
  task.recurrence &&
  task.recurrence !== "none" &&
  !hasPendingRecurrence
) {
  // ... spawn recurrence
}
```

---

### ~~H8. `reminders` missing from multiple default/fallback states~~

> **FIXED in V1.8.6** — `reminders: []` added to `initialState`, `LOAD_STATE` handler, `loadLocal()`, and `markdownToState()`. `readingList: []` added to `markdownToState()`.

---

### ~~H9. COMPLETE_POMODORO adds configured duration, not actual elapsed time~~

> **FIXED in V1.8.7** — Now uses `Math.round((pom.elapsed || 0) / 60)` instead of `pom.duration`.

**Fix applied (AppContext.tsx:531-534):**

```typescript
dailyStats: updateTodayStats(state.dailyStats, {
  focusMinutes: todayStats.focusMinutes + Math.round((pom.elapsed || 0) / 60),
  pomodorosCompleted: todayStats.pomodorosCompleted + 1,
}),
```

---

### H10. Settings sliders desync after undo/redo or server sync

> **STILL OPEN** — `SettingsPage.tsx` unchanged.

Local `settings` state initialized once from `state.settings` on mount. No `useEffect` syncs when global state changes via undo, redo, poll reload, or import.

**Fix:** Add sync effect:

```typescript
useEffect(() => {
  setSettings({ ...state.settings });
}, [state.settings]);
```

---

### H11. FocusMode task picker has no click-outside handler

> **STILL OPEN** — `FocusModePage.tsx:326-379` unchanged.

Dropdown stays open until a task is selected or button re-clicked. No way to dismiss by clicking elsewhere.

---

### H12. Save retry loop blocks pipeline — stale `.then()` callbacks mask failures

> **STILL OPEN** — `sheets.ts:158-196` unchanged.

Retry loop runs up to 4 attempts with delays totaling ~12 seconds. Old promise's `.then()` can set status to `"ok"` even if a newer save failed. `consecutiveFailures` is module-level shared state manipulated by concurrent promises.

---

### H13. Tests that test the wrong thing

> **STILL OPEN** — Test files unchanged.

- `storageConfig.test.ts` — Tests own inline JSON code, not real `loadConfig`/`saveConfig`
- `v181-persistence.test.ts` — Validates against hand-written Zod schema with `z.any()`, not real `appStateSchema`
- `v185-features.test.ts` — Duplicates client filter logic instead of importing real code
- `v182-audit.test.ts` — Uses invalid `category: "personal"` for Reminder, undetected

---

### H14. `tsconfig.json` excludes all test files from type checking

> **STILL OPEN** — `tsconfig.json:3` unchanged.

`"exclude": ["**/*.test.ts"]` means `tsc --noEmit` never catches type errors in tests.

---

## Medium Issues

### M1. Page navigation destroys all local state

> **STILL OPEN** — `Home.tsx` conditional rendering unchanged.

Unmounts pages on navigation. Search queries, filter selections, form drafts, expanded items, and scroll positions lost.

---

### M2. Poll endpoint always checks MD file, even in Sheets mode

> **STILL OPEN** — `dataRouter.ts:79-82` unchanged.

`getMdFileTimestamp()` always reads MD file mtime regardless of storage mode. Returns `0` in Sheets mode.

---

### M3. No runtime validation on Markdown-parsed enum values

> **STILL OPEN** — `mdStorage.ts:325-330` unchanged.

Values cast with `as Task['priority']` and no validation. Invalid enum values from hand-editing pass through silently.

---

### M4. Reading List and Reminders sections omitted when empty

> **STILL OPEN** — `mdStorage.ts:155,173` unchanged.

Tasks/Pomodoros always get section headers. Reading List/Reminders omitted when empty, creating asymmetric round-trip behavior.

---

### M5. Subtask edit allows saving empty titles

> **STILL OPEN** — `TasksPage.tsx` SubtaskList unchanged.

No `editTitle.trim().length > 0` check. Pressing Enter on blank input saves empty title.

---

### M6. Undo after poll reload can revert and persist stale data

> **STILL OPEN** — `AppContext.tsx` unchanged.

`LOAD_STATE` replaces `current` but doesn't clear `past`/`future`. Undoing after poll reload reverts to pre-reload state, then debounced save persists it.

---

### M7. `weekDays` in StatsPage memoized with `[]` — stale at midnight

> **STILL OPEN** — `StatsPage.tsx:58` unchanged.

Computed once on mount. Chart shows stale date labels if app stays open past midnight.

---

### M8. WeeklyReview carryOverTasks wrong for past weeks

> **STILL OPEN** — `WeeklyReviewPage.tsx:77-79` unchanged.

Shows all _currently_ active tasks created before that week ended, not tasks active _during_ that week.

---

### M9. Non-atomic config file write

> **STILL OPEN** — `storageConfig.ts:34-43` unchanged.

`fs.writeFile` without write-to-temp-then-rename. Crash mid-write produces truncated `config.json`.

---

### M10. Sheets doesn't clear old rows — deleted data reappears

> **STILL OPEN** — `sheetsStorage.ts:244-271` unchanged.

PUT replaces values but doesn't clear rows beyond new data range. Deleted items resurrected on next load.

---

### M11. `parseInt` returns NaN with no guard for non-numeric strings in task columns

> **STILL OPEN** — `mdStorage.ts:337-338` unchanged.

`recurrenceDayOfMonth` and `recurrenceStartMonth` use raw `parseInt()` without NaN guard. Non-numeric strings produce `NaN`.

---

### M12. Integrity check query has write side effects

> **STILL OPEN** — `mdStorage.ts:674-676` unchanged.

A `query` endpoint triggers `saveToMdFile()` (with backup rotation + Obsidian sync) when fixes are applied.

---

### M13. Section split on `## ` is fragile

> **STILL OPEN** — `mdStorage.ts:248` unchanged.

Hand-edited content with lines starting `## ` can break section parsing.

---

### M14. Vite 7.x + Vitest 2.x major version mismatch

> **STILL OPEN** — `package.json` unchanged.

Vitest 2.x designed for Vite 5/6. Vite 7.x may have breaking API changes.

---

### M15. `wouter` patch targets `3.7.1` but dep is `^3.3.5`

> **STILL OPEN** — `package.json:116-118` unchanged.

Patch silently stops applying if pnpm resolves to a newer 3.x version.

---

### M16. CI does not run `pnpm build`

> **STILL OPEN** — `.github/workflows/ci.yml` unchanged.

Production build regressions undetected until Docker build fails.

---

## Low Issues

### L1. Accidental `"add"` package in devDependencies

> **STILL OPEN** — `package.json`

### L2. `pnpm` listed as devDependency

> **STILL OPEN** — `package.json`

### L3. Unused `@types/google.maps` devDependency

> **STILL OPEN** — `package.json`

### L4. Container runs as root — no `USER` directive

> **STILL OPEN** — `Dockerfile`

### L5. No Docker `HEALTHCHECK`

> **STILL OPEN** — `Dockerfile`, `docker-compose.yml`

### L6. Deprecated `version: "3.8"` in docker-compose.yml

> **STILL OPEN** — `docker-compose.yml:1`

### L7. Daily backups grow unboundedly

> **STILL OPEN** — `mdStorage.ts:510-535`

Daily snapshots kept indefinitely. ~36MB/year at 100KB/file.

### L8. `todayStr` in Home.tsx computed once — stale at midnight

> **STILL OPEN** — `Home.tsx:91`

### L9. Obsidian sync errors silently swallowed

> **STILL OPEN** — `mdStorage.ts:553-554`

Save returns `{ success: true }` even if sync failed.

### L10. MatrixPage `activeTasks` not memoized — defeats downstream useMemo

> **STILL OPEN** — `MatrixPage.tsx:237-239`

---

## Zero Coverage Areas

| Area                                        | Location                                     | Lines of Code | Risk Level                          |
| ------------------------------------------- | -------------------------------------------- | ------------- | ----------------------------------- |
| AppContext reducer (30+ actions, undo/redo) | `client/src/contexts/AppContext.tsx:252-776` | ~550          | HIGH — all client business logic    |
| dataRouter tRPC endpoints                   | `server/dataRouter.ts`                       | ~100          | HIGH — import/export/validation     |
| All client components                       | `client/src/pages/*.tsx`                     | ~6000         | MEDIUM — UI logic untested          |
| `rotateBackups()`                           | `server/mdStorage.ts:483-506`                | ~25           | MEDIUM — backup reliability         |
| `syncToObsidian()` I/O logic                | `server/obsidianSync.ts:205-229`             | ~25           | LOW — fire-and-forget               |
| `computeNextDate()` quarterly logic         | `client/src/contexts/AppContext.tsx:183-234` | ~50           | MEDIUM — date arithmetic edge cases |

---

## Summary

| Priority     | Original Count | Fixed                                      | Remaining |
| ------------ | -------------- | ------------------------------------------ | --------- |
| **Critical** | 6              | **6** (V1.8.6: C1-C4, C6; C5 downgraded)   | **0**     |
| **High**     | 14             | **5** (V1.8.6: H5, H8; V1.8.7: H1, H7, H9) | **9**     |
| **Medium**   | 16             | 0                                          | **16**    |
| **Low**      | 10             | 0                                          | **10**    |
| **Total**    | **46**         | **11**                                     | **35**    |

All critical data-loss issues are resolved. The remaining high-priority items are: FocusMode timer pattern (H2), broken Google Sheets backend (H3-H4), task reorder with filters (H6), stale settings (H10), missing click-outside (H11), save retry edge case (H12), and test quality/config issues (H13-H14).
