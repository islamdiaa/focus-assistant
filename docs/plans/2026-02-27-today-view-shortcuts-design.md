# Today View Keyboard Shortcuts — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable keyboard shortcuts (N, R, /, Ctrl+Z) on the Today (Daily Planner) view so users can create tasks, reminders, and search without leaving the page.

**Architecture:** Expand the existing centralized shortcut system in `Home.tsx` to fire triggers on the `"planner"` page. Add a new atomic `ADD_TASK_AND_PIN_TODAY` reducer action in `AppContext.tsx`. Add task creation dialog, reminder creation dialog, and a search filter bar to `DailyPlannerPage.tsx`, all using the same trigger-detection pattern (`useRef` + `useEffect`) already used in `TasksPage.tsx`.

**Tech Stack:** React, TypeScript, Radix Dialog (via shadcn), Framer Motion, nanoid, Tailwind CSS.

---

### Task 1: Add `ADD_TASK_AND_PIN_TODAY` reducer action

**Files:**

- Modify: `client/src/contexts/AppContext.tsx:43-136` (Action type union)
- Modify: `client/src/contexts/AppContext.tsx:269-298` (reducer switch)

**Step 1: Add the action type to the Action union**

In `client/src/contexts/AppContext.tsx`, after line 59 (the closing `}` of `ADD_TASK`), add:

```typescript
  | {
      type: "ADD_TASK_AND_PIN_TODAY";
      payload: {
        title: string;
        description?: string;
        priority: Priority;
        dueDate?: string;
        category?: Category;
        energy?: EnergyLevel;
        recurrence?: RecurrenceFrequency;
        recurrenceDayOfMonth?: number;
        recurrenceStartMonth?: number;
        subtasks?: Array<{ title: string }>;
      };
    }
```

**Step 2: Add the reducer case**

In the same file, after the `case "ADD_TASK"` block (after line 298 `return { ...state, tasks: [task, ...state.tasks] };` and its closing `}`), add:

```typescript
    case "ADD_TASK_AND_PIN_TODAY": {
      const subtasks: Subtask[] = (action.payload.subtasks || []).map(s => ({
        id: nanoid(),
        title: s.title,
        done: false,
      }));
      const todayDate = new Date().toISOString().split("T")[0];
      const task: Task = {
        id: nanoid(),
        title: action.payload.title,
        description: action.payload.description,
        priority: action.payload.priority,
        status: "active",
        dueDate: action.payload.dueDate,
        category: action.payload.category,
        energy: action.payload.energy,
        quadrant: "unassigned",
        createdAt: new Date().toISOString(),
        pinnedToday: todayDate,
        recurrence: action.payload.recurrence,
        recurrenceDayOfMonth: action.payload.recurrenceDayOfMonth,
        recurrenceStartMonth: action.payload.recurrenceStartMonth,
        recurrenceNextDate:
          action.payload.recurrence && action.payload.recurrence !== "none"
            ? computeNextDate(action.payload.recurrence, new Date(), {
                recurrenceDayOfMonth: action.payload.recurrenceDayOfMonth,
                recurrenceStartMonth: action.payload.recurrenceStartMonth,
              })
            : undefined,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }
```

**Step 3: Verify the app compiles**

Run: `cd /home/ubuntu/focus-assistant && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `ADD_TASK_AND_PIN_TODAY`.

**Step 4: Commit**

```bash
git add client/src/contexts/AppContext.tsx
git commit -m "feat: add ADD_TASK_AND_PIN_TODAY reducer action

Creates a task and atomically pins it to Today in one dispatch."
```

---

### Task 2: Expand keyboard shortcuts in Home.tsx to fire on planner page

**Files:**

- Modify: `client/src/pages/Home.tsx:181-206` (keyboard shortcut handlers)
- Modify: `client/src/pages/Home.tsx:333` (DailyPlannerPage rendering)

**Step 1: Expand the N shortcut condition**

In `client/src/pages/Home.tsx`, change line 183 from:

```typescript
        if (activePage === "tasks") {
```

to:

```typescript
        if (activePage === "tasks" || activePage === "planner") {
```

**Step 2: Expand the R shortcut condition**

Change line 192 from:

```typescript
        if (activePage === "tasks" || activePage === "reminders") {
```

to:

```typescript
        if (activePage === "tasks" || activePage === "reminders" || activePage === "planner") {
```

**Step 3: Expand the / shortcut condition**

Change line 201 from:

```typescript
        if (activePage === "tasks") {
```

to:

```typescript
        if (activePage === "tasks" || activePage === "planner") {
```

**Step 4: Pass trigger props to DailyPlannerPage**

Change line 333 from:

```typescript
              {activePage === "planner" && <DailyPlannerPage />}
```

to:

```typescript
              {activePage === "planner" && (
                <DailyPlannerPage
                  newTaskTrigger={newTaskTrigger}
                  searchTrigger={searchTrigger}
                  reminderTrigger={reminderTrigger}
                />
              )}
```

**Step 5: Verify compilation**

Run: `cd /home/ubuntu/focus-assistant && npx tsc --noEmit 2>&1 | head -20`
Expected: Type error about DailyPlannerPage not accepting those props (expected — we haven't updated DailyPlannerPage yet).

**Step 6: Commit**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat: expand keyboard shortcuts N/R/slash to fire on planner page

Passes newTaskTrigger, searchTrigger, reminderTrigger props to DailyPlannerPage."
```

---

### Task 3: Add trigger props, search, task dialog, and reminder dialog to DailyPlannerPage

**Files:**

- Modify: `client/src/pages/DailyPlannerPage.tsx`

This is the largest task. It adds:

1. Props interface with trigger numbers
2. Trigger detection via `useRef` + `useEffect`
3. Search state + filter logic across all task sections
4. Task creation dialog state + form + handler
5. Reminder creation dialog state + form + handler
6. Search bar in the UI
7. Buttons for "Add Task" and "Add Reminder" in the header

**Step 1: Add imports**

At the top of `DailyPlannerPage.tsx`, update the React import (line 7) from:

```typescript
import { useMemo, useState } from "react";
```

to:

```typescript
import { useMemo, useState, useRef, useEffect } from "react";
```

Add these imports after the existing lucide imports (after line 42):

```typescript
import { Textarea } from "@/components/ui/textarea";
```

Add these type imports — update the existing `type` import (line 52) from:

```typescript
import type { Task, EnergyLevel, Reminder } from "@/lib/types";
```

to:

```typescript
import type {
  Task,
  EnergyLevel,
  Reminder,
  Priority,
  Category,
  RecurrenceFrequency,
} from "@/lib/types";
```

**Step 2: Add config constants and props interface**

After the `ENERGY_EMOJI` constant (after line 63), add:

```typescript
const PRIORITY_COLORS: Record<Priority, string> = {
  urgent:
    "bg-warm-terracotta/15 text-warm-terracotta border-warm-terracotta/30",
  high: "bg-warm-terracotta-light text-warm-terracotta border-warm-terracotta/20",
  medium: "bg-warm-amber-light text-warm-amber border-warm-amber/20",
  low: "bg-warm-sage-light text-warm-sage border-warm-sage/20",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const CATEGORY_CONFIG: Record<Category, { emoji: string; label: string }> = {
  work: { emoji: "💼", label: "Work" },
  personal: { emoji: "🏠", label: "Personal" },
  health: { emoji: "💪", label: "Health" },
  learning: { emoji: "📚", label: "Learning" },
  errands: { emoji: "🛒", label: "Errands" },
  other: { emoji: "📌", label: "Other" },
};

const ENERGY_CONFIG: Record<EnergyLevel, { emoji: string; label: string }> = {
  low: { emoji: "🔋", label: "Low Energy" },
  medium: { emoji: "⚡", label: "Medium Energy" },
  high: { emoji: "🔥", label: "High Energy" },
};

const RECURRENCE_CONFIG: Record<RecurrenceFrequency, { label: string }> = {
  none: { label: "No Repeat" },
  daily: { label: "Daily" },
  weekly: { label: "Weekly" },
  monthly: { label: "Monthly" },
  quarterly: { label: "Quarterly" },
  weekdays: { label: "Weekdays" },
};

const REMINDER_CATEGORIES: Record<
  Reminder["category"],
  { icon: typeof Bell; label: string; color: string; bg: string }
> = {
  birthday: {
    icon: Cake,
    label: "Birthday",
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
  appointment: {
    icon: Calendar,
    label: "Appointment",
    color: "text-warm-blue",
    bg: "bg-warm-blue-light",
  },
  event: {
    icon: Star,
    label: "Event",
    color: "text-warm-amber",
    bg: "bg-warm-amber-light",
  },
  other: {
    icon: Bell,
    label: "Other",
    color: "text-warm-sage",
    bg: "bg-warm-sage-light",
  },
};

const REMINDER_RECURRENCE: { value: Reminder["recurrence"]; label: string }[] =
  [
    { value: "none", label: "One-time" },
    { value: "yearly", label: "Yearly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "monthly", label: "Monthly" },
    { value: "weekly", label: "Weekly" },
  ];

interface DailyPlannerPageProps {
  newTaskTrigger?: number;
  searchTrigger?: number;
  reminderTrigger?: number;
}
```

**Step 3: Update component signature**

Change the function signature (line 616) from:

```typescript
export default function DailyPlannerPage() {
```

to:

```typescript
export default function DailyPlannerPage({
  newTaskTrigger = 0,
  searchTrigger = 0,
  reminderTrigger = 0,
}: DailyPlannerPageProps) {
```

**Step 4: Add state and trigger detection**

After the `actionedExpanded` state declaration (line 744), add:

```typescript
// --- Search ---
const [searchQuery, setSearchQuery] = useState("");
const searchInputRef = useRef<HTMLInputElement>(null);

// --- New Task dialog state ---
const [taskDialogOpen, setTaskDialogOpen] = useState(false);
const [newTitle, setNewTitle] = useState("");
const [newDesc, setNewDesc] = useState("");
const [newPriority, setNewPriority] = useState<Priority>("medium");
const [newCategory, setNewCategory] = useState<Category | "">("");
const [newEnergy, setNewEnergy] = useState<EnergyLevel | "">("");
const [newDueDate, setNewDueDate] = useState("");
const [newRecurrence, setNewRecurrence] = useState<RecurrenceFrequency>("none");
const [newQuarterlyDay, setNewQuarterlyDay] = useState(16);
const [newQuarterlyStartMonth, setNewQuarterlyStartMonth] = useState(2);
const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
const [newSubtaskInput, setNewSubtaskInput] = useState("");

// --- New Reminder dialog state ---
const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
const [remTitle, setRemTitle] = useState("");
const [remDescription, setRemDescription] = useState("");
const [remDate, setRemDate] = useState("");
const [remTime, setRemTime] = useState("");
const [remRecurrence, setRemRecurrence] =
  useState<Reminder["recurrence"]>("none");
const [remCategory, setRemCategory] = useState<Reminder["category"]>("other");

// --- Keyboard shortcut trigger detection (skip initial mount) ---
const prevNewTaskTrigger = useRef(newTaskTrigger);
const prevSearchTrigger = useRef(searchTrigger);
const prevReminderTrigger = useRef(reminderTrigger);

useEffect(() => {
  if (newTaskTrigger !== prevNewTaskTrigger.current) {
    prevNewTaskTrigger.current = newTaskTrigger;
    if (newTaskTrigger > 0) setTaskDialogOpen(true);
  }
}, [newTaskTrigger]);

useEffect(() => {
  if (searchTrigger !== prevSearchTrigger.current) {
    prevSearchTrigger.current = searchTrigger;
    if (searchTrigger > 0) searchInputRef.current?.focus();
  }
}, [searchTrigger]);

useEffect(() => {
  if (reminderTrigger !== prevReminderTrigger.current) {
    prevReminderTrigger.current = reminderTrigger;
    if (reminderTrigger > 0) {
      setRemTitle("");
      setRemDescription("");
      setRemDate("");
      setRemTime("");
      setRemRecurrence("none");
      setRemCategory("other");
      setReminderDialogOpen(true);
    }
  }
}, [reminderTrigger]);

// --- Handlers ---
function handleAddTask() {
  if (!newTitle.trim()) return;
  dispatch({
    type: "ADD_TASK_AND_PIN_TODAY",
    payload: {
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      priority: newPriority,
      dueDate: newDueDate || undefined,
      category: newCategory || undefined,
      energy: newEnergy || undefined,
      recurrence: newRecurrence !== "none" ? newRecurrence : undefined,
      recurrenceDayOfMonth:
        newRecurrence === "quarterly" ? newQuarterlyDay : undefined,
      recurrenceStartMonth:
        newRecurrence === "quarterly" ? newQuarterlyStartMonth : undefined,
      subtasks:
        newSubtasks.length > 0
          ? newSubtasks.map(s => ({ title: s }))
          : undefined,
    },
  });
  setNewTitle("");
  setNewDesc("");
  setNewPriority("medium");
  setNewCategory("");
  setNewEnergy("");
  setNewDueDate("");
  setNewRecurrence("none");
  setNewQuarterlyDay(16);
  setNewQuarterlyStartMonth(2);
  setNewSubtasks([]);
  setNewSubtaskInput("");
  setTaskDialogOpen(false);
}

function addNewSubtask() {
  if (!newSubtaskInput.trim()) return;
  setNewSubtasks([...newSubtasks, newSubtaskInput.trim()]);
  setNewSubtaskInput("");
}

function handleAddReminder() {
  if (!remTitle.trim() || !remDate) return;
  dispatch({
    type: "ADD_REMINDER",
    payload: {
      title: remTitle.trim(),
      description: remDescription.trim() || undefined,
      date: remDate,
      time: remTime || undefined,
      recurrence: remRecurrence,
      category: remCategory,
    },
  });
  setRemTitle("");
  setRemDescription("");
  setRemDate("");
  setRemTime("");
  setRemRecurrence("none");
  setRemCategory("other");
  setReminderDialogOpen(false);
}
```

**Step 5: Add search filtering to task sections**

Wrap each existing `useMemo` for `pinnedTasks`, `dueTasks`, `highPriorityTasks`, and `energySuggestions` with an additional search filter. After each existing `.filter(...)` chain, add:

```typescript
      .filter(t => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q));
      })
```

And add `searchQuery` to each `useMemo` dependency array.

Specifically, update these four `useMemo` hooks:

1. `pinnedTasks` (around line 649): Add `.filter(...)` before `.sort(...)`, add `searchQuery` to deps.
2. `dueTasks` (around line 659): Add `.filter(...)` before `.sort(...)`, add `searchQuery` to deps.
3. `highPriorityTasks` (around line 679): Add `.filter(...)` at end, add `searchQuery` to deps.
4. `energySuggestions` (around line 716): Add `.filter(...)` before `.slice(...)`, add `searchQuery` to deps.

**Step 6: Add search bar, buttons, and dialogs to the JSX**

**6a. Add header buttons** — In the return JSX, after the greeting `<p>` tag with the date (around line 791, before the closing `</motion.div>` of the greeting section), add action buttons:

Right after `</p>` on line 791, before the closing `</motion.div>` on line 792, wrap the greeting content in a flex layout. Replace the greeting `<motion.div>` block (lines 773-792) with a version that has buttons on the right side:

Replace the inner content of the greeting motion.div. After the `<p>` with the date, add:

```tsx
<div className="flex items-center gap-2 mt-3">
  <Button
    onClick={() => setReminderDialogOpen(true)}
    variant="outline"
    size="sm"
    className="gap-1.5 border-warm-amber/30 text-warm-amber hover:bg-warm-amber-light"
  >
    <Bell className="w-3.5 h-3.5" />
    <span className="hidden sm:inline">Reminder</span>
    <span className="text-[10px] text-muted-foreground hidden sm:inline keyboard-hint">
      (R)
    </span>
  </Button>
  <Button
    onClick={() => setTaskDialogOpen(true)}
    size="sm"
    className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-1.5"
  >
    <Plus className="w-3.5 h-3.5" />
    <span className="hidden sm:inline">Add Task</span>
    <span className="text-[10px] text-white/70 hidden sm:inline keyboard-hint">
      (N)
    </span>
  </Button>
</div>
```

**6b. Add search bar** — After the "Today's Progress" grid section (after the closing `</div>` of the grid around line 875), add:

```tsx
{
  /* Search Bar */
}
<div className="relative mb-6">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  <Input
    ref={searchInputRef}
    placeholder="Search today's tasks..."
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    className="pl-10 bg-card border-border"
  />
  {searchQuery && (
    <button
      onClick={() => setSearchQuery("")}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
    >
      <X className="w-4 h-4" />
    </button>
  )}
</div>;
```

**6c. Add Task Creation Dialog** — Before the closing `</div>` of the component return (line 1231), add the full task dialog JSX. Copy the dialog structure from TasksPage lines 931-1240, but:

- Use `taskDialogOpen` / `setTaskDialogOpen` instead of `dialogOpen` / `setDialogOpen`
- Remove `DialogTrigger` (no trigger button — opened by keyboard shortcut or button click)
- Keep all form fields identical

**6d. Add Reminder Dialog** — Also before the closing `</div>`, add the reminder dialog (same structure as TasksPage lines 1245-1347).

**Step 7: Verify the app compiles and runs**

Run: `cd /home/ubuntu/focus-assistant && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

Run: `cd /home/ubuntu/focus-assistant && pnpm dev &` and test in browser:

1. Navigate to Today view (key `1` or click sidebar)
2. Press `N` — task dialog should open
3. Create a task — should appear in "Pinned Tasks" section
4. Press `R` — reminder dialog should open
5. Press `/` — search bar should focus
6. Type in search — tasks should filter across all sections

**Step 8: Commit**

```bash
git add client/src/pages/DailyPlannerPage.tsx
git commit -m "feat: add keyboard shortcuts N/R/slash to Today view

N opens task creation dialog (auto-pins to Today on save).
R opens reminder creation dialog.
/ focuses search bar to filter all visible task sections."
```

---

### Task 4: Manual verification and cleanup

**Step 1: Full shortcut verification**

Open the app in a browser and verify on the Today view:

- `N` → task dialog opens, create task → appears in Pinned Tasks
- `R` → reminder dialog opens, create reminder → appears in Reminders section
- `/` → search input focuses, typing filters all task sections
- `Ctrl+Z` → undoes last action
- `Ctrl+Shift+Z` → redoes
- `Esc` → closes any open dialog
- Shortcuts do NOT fire while typing in an input field
- Shortcuts still work correctly on the Tasks page (no regression)

**Step 2: Verify no TypeScript errors**

Run: `cd /home/ubuntu/focus-assistant && npx tsc --noEmit`
Expected: Clean exit.

**Step 3: Run existing tests**

Run: `cd /home/ubuntu/focus-assistant && pnpm test`
Expected: All existing tests pass.

**Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: cleanup after Today view shortcuts"
```
