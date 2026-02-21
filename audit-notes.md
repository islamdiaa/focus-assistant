# V1.8.6 Full Audit Notes

## Reducer Audit

- [x] LOAD_STATE: Has fallbacks for templates, preferences, readingList, reminders. OK.
- [x] ADD_TASK: Creates nanoid, sets defaults. OK.
- [x] UPDATE_TASK: Spread merge. OK.
- [x] DELETE_TASK: Filter by id. OK.
- [x] TOGGLE_TASK: Sets statusChangedAt, clears pinnedToday on done, handles recurrence. OK.
- [x] TOGGLE_MONITOR: Sets statusChangedAt, clears pinnedToday on monitored. OK.
- [x] MOVE_TASK_QUADRANT: Simple map. OK.
- [x] ADD/TOGGLE/DELETE/UPDATE_SUBTASK: All handle missing subtasks array. OK.
- [x] ADD_POMODORO: Creates with elapsed=0, status=idle. OK.
- [x] UPDATE_POMODORO: Spread merge. OK.
- [x] DELETE_POMODORO: Filter. OK.
- [x] TICK_POMODORO: Only ticks if running. OK.
- [BUG] COMPLETE_POMODORO (line 527): Uses `pom.duration` (planned) instead of `Math.ceil(pom.elapsed / 60)` (actual). This is the H9 audit finding.
- [x] UPDATE_SETTINGS: Direct replace. OK.
- [x] UPDATE_DAILY_STATS: Uses updateTodayStats helper. OK.
- [x] SET_STREAK: Direct set. OK.
- [x] REORDER_TASKS: Preserves hidden tasks via remaining array. OK.
- [x] ADD/DELETE/APPLY_TEMPLATE: All handle missing templates. OK.
- [x] UPDATE_PREFERENCES: Spread merge with defaults. OK.
- [x] ADD/UPDATE/DELETE/MARK_READING_ITEM: All handle missing readingList. OK.
- [x] ADD/UPDATE/DELETE/ACK/UNACK_REMINDER: All handle missing reminders. OK.
- [x] PIN_TO_TODAY / UNPIN_FROM_TODAY: OK.
- [x] SET_CONTEXT: Updates preferences.activeContext. OK.
- [x] UNDO/REDO: Correct history management. OK.

## Effects Audit

- [x] C1 fix: loadedRef set inside .then(). OK.
- [x] C2 fix: dirtyRef set on user actions, cleared on save, checked on poll. OK.
- [x] Load guard: loadStartedRef prevents double load. OK.
- [x] Save debounce: 500ms timeout, clears on re-trigger. OK.
- [x] Poll: 5s interval, skips if dirty. OK.

## Bugs Found

1. COMPLETE_POMODORO uses pom.duration (planned minutes) not actual elapsed time for focusMinutes stat (H9)
