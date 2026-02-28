# High-Impact Features Design

**Date:** 2026-02-28
**Status:** Approved

---

## Overview

Six high-impact features to implement, all full quality:

1. Daily Focus Goals / "Top 3"
2. Command Palette (Ctrl+K)
3. Auto-Complete Parent Task
4. Drag-and-Drop in Today View
5. Bulk Task Actions
6. Task Duration Estimates + Time Budget

---

## Feature 1: Daily Focus Goals / "Top 3"

**Concept:** Users mark up to 3 pinned-today tasks as focus goals. Progress indicator (0/3 → 3/3) at top of Today view.

**Schema changes:**

- `taskSchema`: add `isFocusGoal: z.boolean().nullable().optional()`

**Reducer actions:**

- `TOGGLE_FOCUS_GOAL` — sets/unsets `isFocusGoal`, max-3 enforcement

**UI (DailyPlannerPage):**

- New "Today's Focus (0/3)" section above "My Today" with star icon
- Each pinned task gets a star toggle button (max 3)
- When all 3 completed → celebratory micro-animation
- Focus goal count in progress grid

---

## Feature 2: Command Palette (Ctrl+K)

**Concept:** Modal overlay from any page. Search tasks + navigate pages.

**New component:** `client/src/components/CommandPalette.tsx`

**Trigger:** Ctrl+K / Cmd+K globally (in Home.tsx keydown handler)

**UI:**

- Radix Dialog, search input at top, results below
- Two sections: "Pages" (icon + name) and "Tasks" (title + priority + status)
- Arrow keys navigate, Enter selects, Escape closes
- Page selection → `setActivePage`; task selection → navigate to Tasks page

**Implementation:** Client-side only, searches `state.tasks`.

---

## Feature 3: Auto-Complete Parent Task

**Concept:** When all subtasks are done, parent auto-completes. Toggle in Settings (off by default).

**Schema changes:**

- `appPreferencesSchema`: add `autoCompleteParent: z.boolean().nullable().optional()`

**Settings UI:** New "Automation" section with toggle switch.

**Reducer logic:** In `TOGGLE_SUBTASK` case, after toggling, if `state.preferences.autoCompleteParent` is true and all subtasks are `done`, auto-set parent status to `"done"`, set `completedAt`, increment daily stats.

**Undo:** Existing undo system handles reversal.

---

## Feature 4: Drag-and-Drop in Today View

**Concept:** Reorder pinned tasks in "My Today" via drag-and-drop.

**No schema changes.** Uses existing `REORDER_TASKS` action.

**Implementation (DailyPlannerPage):**

- Import `@dnd-kit/react` (already a dependency)
- Wrap "My Today" task list in DnD context with sortable items
- Drag handle (grip icon) on each task card
- On drop → dispatch `REORDER_TASKS` with new ID ordering
- Touch-drag on mobile via dnd-kit

---

## Feature 5: Bulk Task Actions

**Concept:** Multi-select mode on Tasks page for bulk operations.

**UI flow:**

1. "Select" toggle in Tasks page header
2. Checkboxes on task cards when active
3. Floating action bar at bottom: "X selected" + Complete / Delete / Pin to Today / Move to Quadrant
4. Select All / Deselect All links
5. Escape exits selection mode

**Local state:** `selectionMode: boolean`, `selectedIds: Set<string>`

**New reducer actions:**

- `BULK_COMPLETE_TASKS` — `{ taskIds: string[] }`
- `BULK_DELETE_TASKS` — `{ taskIds: string[] }`
- `BULK_PIN_TODAY` — `{ taskIds: string[] }`
- `BULK_SET_QUADRANT` — `{ taskIds: string[], quadrant: QuadrantType }`

---

## Feature 6: Task Duration Estimates + Time Budget

**Concept:** Optional `estimatedMinutes` on tasks. Summary bar on Today view.

**Schema changes:**

- `taskSchema`: add `estimatedMinutes: z.number().nullable().optional()`
- `appPreferencesSchema`: add `availableHoursPerDay: z.number().nullable().optional()` (default 8)

**Task dialogs (both pages):**

- "Estimated Time" field with quick-pick: 15m, 30m, 1h, 2h, custom
- Clock badge on task cards (e.g., "30m")

**Today view time budget (DailyPlannerPage):**

- Progress bar below stats grid
- Shows: total estimated vs available hours
- Color: green (< 75%), yellow (75-100%), red (> 100%)

**Settings:** "Available Hours Per Day" number input (default 8).

---

## Implementation Order

1. **Schema changes first** (appTypes.ts) — all 3 schema additions
2. **Reducer actions** (AppContext.tsx) — TOGGLE*FOCUS_GOAL, BULK*\*, auto-complete logic
3. **Command Palette** (new component, Home.tsx integration)
4. **Daily Focus Goals** (DailyPlannerPage)
5. **Drag-and-Drop in Today** (DailyPlannerPage)
6. **Task Duration Estimates** (both task dialogs + Today view budget bar)
7. **Bulk Task Actions** (TasksPage)
8. **Auto-Complete Parent** (Settings toggle + reducer logic)
9. **Tests** for all new functionality
