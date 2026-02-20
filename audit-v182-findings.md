# V1.8.2 Codebase Audit Findings

## Reducer Audit (AppContext.tsx)

### Issues Found

1. **TOGGLE_TASK: pinnedToday not cleared on completion** — When a task is toggled to 'done', the `pinnedToday` field persists. If the user un-toggles it the next day, it would still show the old pinned date. Not a critical bug since the date comparison handles it, but it's semantically cleaner to clear it.

2. **TOGGLE_TASK: recurring task clone doesn't copy `pinnedToday`** — This is correct behavior (new recurring instance shouldn't be auto-pinned), but worth noting as intentional.

3. **APPLY_TEMPLATE: missing `pinnedToday` field** — Template-applied tasks don't include `pinnedToday`, which is fine since it defaults to undefined/null.

4. **Energy suggestions in DailyPlannerPage exclude pinned tasks** — Need to verify this. Pinned tasks should not also appear in energy suggestions to avoid duplication.

### No Issues

- UNDO/REDO: properly handles all new actions (PIN_TO_TODAY, UNPIN_FROM_TODAY are undoable)
- ACK_REMINDER recurring logic: correctly advances date
- UNACK_REMINDER: correctly resets acknowledged state
- All null-safe patterns use `(state.reminders || [])` consistently
- Save/load cycle: appStateSchema.strict() will reject unknown fields, but `pinnedToday` is now in the schema

## Type Audit (appTypes.ts)

- `pinnedToday` added as `z.string().nullable().optional()` — correct
- All other fields properly use `.nullable().optional()` pattern
- No type drift between Zod schemas and inferred types

## Bugs to Fix

1. Energy suggestions in DailyPlannerPage should exclude pinned tasks to avoid duplication
2. TOGGLE_TASK should clear pinnedToday when task is completed (minor cleanup)
