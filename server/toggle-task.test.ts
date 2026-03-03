/**
 * TOGGLE_TASK reducer — unit tests
 *
 * Validates the status-transition logic extracted from the TOGGLE_TASK case
 * in client/src/contexts/AppContext.tsx (line ~393).
 *
 * Key regression: before the fix, the toggle used
 *   `task.status === "active" ? "done" : "active"`
 * which meant "monitored" tasks toggled to "active" instead of "done".
 *
 * The corrected logic is:
 *   `task.status === "done" ? "active" : "done"`
 * so both "active" and "monitored" tasks toggle to "done", and only
 * "done" tasks toggle back to "active".
 */
import { describe, it, expect } from "vitest";
import type { Task, Subtask } from "../shared/appTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TaskStatus = "active" | "done" | "monitored";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Task",
    description: "",
    priority: "medium",
    status: "active",
    dueDate: null,
    category: null,
    energy: null,
    quadrant: "unassigned",
    createdAt: "2026-03-01T10:00:00.000Z",
    completedAt: undefined,
    recurrence: "none",
    recurrenceParentId: undefined,
    recurrenceNextDate: undefined,
    subtasks: [],
    recurrenceDayOfMonth: undefined,
    recurrenceStartMonth: undefined,
    pinnedToday: null,
    statusChangedAt: undefined,
    isFocusGoal: undefined,
    ...overrides,
  };
}

function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: `sub-${Math.random().toString(36).slice(2, 8)}`,
    title: "Subtask",
    done: false,
    ...overrides,
  };
}

/**
 * Pure-function replica of the TOGGLE_TASK reducer case from
 * client/src/contexts/AppContext.tsx.
 *
 * We replicate it here so tests run without React / browser dependencies.
 * Only the per-task field mutations are included — dailyStats and recurrence
 * spawning are omitted since they don't affect the core toggle logic.
 */
function applyToggleTask(task: Task): Task {
  // Fixed logic: "done" -> "active", everything else -> "done"
  const newStatus: TaskStatus = task.status === "done" ? "active" : "done";

  return {
    ...task,
    status: newStatus,
    completedAt: newStatus === "done" ? new Date().toISOString() : undefined,
    statusChangedAt: new Date().toISOString(),
    pinnedToday: newStatus === "done" ? null : task.pinnedToday,
    isFocusGoal: newStatus === "done" ? undefined : task.isFocusGoal,
    subtasks:
      newStatus === "done" && task.subtasks
        ? task.subtasks.map(s => ({ ...s, done: true }))
        : newStatus === "active" && task.subtasks
          ? task.subtasks.map(s => ({ ...s, done: false }))
          : task.subtasks,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TOGGLE_TASK reducer logic", () => {
  // 1. Active -> Done
  it('toggles an "active" task to "done"', () => {
    const task = makeTask({ status: "active" });
    const result = applyToggleTask(task);

    expect(result.status).toBe("done");
    expect(result.completedAt).toBeDefined();
    expect(typeof result.completedAt).toBe("string");
  });

  // 2. Done -> Active
  it('toggles a "done" task back to "active"', () => {
    const task = makeTask({
      status: "done",
      completedAt: "2026-03-01T12:00:00.000Z",
    });
    const result = applyToggleTask(task);

    expect(result.status).toBe("active");
    expect(result.completedAt).toBeUndefined();
  });

  // 3. REGRESSION: Monitored -> Done (not "active")
  it('toggles a "monitored" task to "done" — NOT "active" (regression)', () => {
    const task = makeTask({ status: "monitored" });
    const result = applyToggleTask(task);

    // This is the core regression test. Before the fix, this returned "active".
    expect(result.status).toBe("done");
    expect(result.status).not.toBe("active");
    expect(result.completedAt).toBeDefined();
    expect(typeof result.completedAt).toBe("string");
  });

  // 4. Monitored task with subtasks -> all subtasks marked done
  it("marks all subtasks as done when completing a monitored task", () => {
    const task = makeTask({
      status: "monitored",
      subtasks: [
        makeSubtask({ title: "Step 1", done: false }),
        makeSubtask({ title: "Step 2", done: false }),
        makeSubtask({ title: "Step 3", done: true }), // already done
      ],
    });
    const result = applyToggleTask(task);

    expect(result.status).toBe("done");
    expect(result.subtasks).toHaveLength(3);
    result.subtasks!.forEach(s => {
      expect(s.done).toBe(true);
    });
  });

  // 5. Done task un-completed -> subtasks cleared (marked undone)
  it("marks all subtasks as undone when un-completing a done task", () => {
    const task = makeTask({
      status: "done",
      completedAt: "2026-03-01T14:00:00.000Z",
      subtasks: [
        makeSubtask({ title: "Step 1", done: true }),
        makeSubtask({ title: "Step 2", done: true }),
      ],
    });
    const result = applyToggleTask(task);

    expect(result.status).toBe("active");
    expect(result.subtasks).toHaveLength(2);
    result.subtasks!.forEach(s => {
      expect(s.done).toBe(false);
    });
  });

  // 6. Status change sets statusChangedAt for all three transitions
  describe("statusChangedAt is set on every transition", () => {
    it("sets statusChangedAt when active -> done", () => {
      const task = makeTask({ status: "active", statusChangedAt: undefined });
      const result = applyToggleTask(task);

      expect(result.statusChangedAt).toBeDefined();
      expect(typeof result.statusChangedAt).toBe("string");
      // Should be a valid ISO date
      expect(new Date(result.statusChangedAt!).toISOString()).toBe(
        result.statusChangedAt
      );
    });

    it("sets statusChangedAt when done -> active", () => {
      const task = makeTask({
        status: "done",
        statusChangedAt: "2026-03-01T08:00:00.000Z",
      });
      const result = applyToggleTask(task);

      expect(result.statusChangedAt).toBeDefined();
      // Should be updated (not the old value)
      expect(result.statusChangedAt).not.toBe("2026-03-01T08:00:00.000Z");
    });

    it("sets statusChangedAt when monitored -> done", () => {
      const task = makeTask({
        status: "monitored",
        statusChangedAt: "2026-03-01T09:00:00.000Z",
      });
      const result = applyToggleTask(task);

      expect(result.statusChangedAt).toBeDefined();
      expect(result.statusChangedAt).not.toBe("2026-03-01T09:00:00.000Z");
    });
  });

  // 7. Completing a task clears pinnedToday
  it("clears pinnedToday when completing a task", () => {
    const task = makeTask({
      status: "active",
      pinnedToday: "2026-03-03",
    });
    const result = applyToggleTask(task);

    expect(result.status).toBe("done");
    expect(result.pinnedToday).toBeNull();
  });

  it("preserves pinnedToday when un-completing a task", () => {
    const task = makeTask({
      status: "done",
      pinnedToday: "2026-03-03",
    });
    const result = applyToggleTask(task);

    expect(result.status).toBe("active");
    // pinnedToday is preserved on un-complete (only cleared on complete)
    expect(result.pinnedToday).toBe("2026-03-03");
  });

  // 8. Completing a monitored task clears isFocusGoal
  it("clears isFocusGoal when completing a monitored task", () => {
    const task = makeTask({
      status: "monitored",
      isFocusGoal: true,
    });
    const result = applyToggleTask(task);

    expect(result.status).toBe("done");
    expect(result.isFocusGoal).toBeUndefined();
  });

  it("clears isFocusGoal when completing an active task", () => {
    const task = makeTask({
      status: "active",
      isFocusGoal: true,
    });
    const result = applyToggleTask(task);

    expect(result.status).toBe("done");
    expect(result.isFocusGoal).toBeUndefined();
  });

  it("preserves isFocusGoal when un-completing a done task", () => {
    const task = makeTask({
      status: "done",
      isFocusGoal: true,
    });
    const result = applyToggleTask(task);

    expect(result.status).toBe("active");
    expect(result.isFocusGoal).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Regression: verify the OLD (buggy) logic would have failed
// ---------------------------------------------------------------------------

describe("TOGGLE_TASK — old buggy logic contrast", () => {
  /**
   * This reproduces the BROKEN logic that existed before the fix:
   *   const newStatus = task.status === "active" ? "done" : "active";
   *
   * With that logic, "monitored" falls into the else branch and becomes
   * "active" — which is wrong.
   */
  function applyToggleTaskBuggy(task: Task): Task {
    const newStatus: TaskStatus = task.status === "active" ? "done" : "active"; // <-- BUG

    return {
      ...task,
      status: newStatus,
      completedAt: newStatus === "done" ? new Date().toISOString() : undefined,
    };
  }

  it("old logic incorrectly sets monitored task to active", () => {
    const task = makeTask({ status: "monitored" });
    const result = applyToggleTaskBuggy(task);

    // Demonstrates the bug: monitored -> active (WRONG)
    expect(result.status).toBe("active");
    expect(result.completedAt).toBeUndefined();
  });

  it("fixed logic correctly sets monitored task to done", () => {
    const task = makeTask({ status: "monitored" });
    const result = applyToggleTask(task);

    // Correct behavior: monitored -> done
    expect(result.status).toBe("done");
    expect(result.completedAt).toBeDefined();
  });
});
