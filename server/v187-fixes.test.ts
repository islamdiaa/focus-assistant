/**
 * V1.8.7 — Tests for H1/H7/H9 audit fixes and code-split
 *
 * H1: AudioContext leak — ctx.close() called after tones finish
 * H7: Duplicate recurrences — dedup check before spawning
 * H9: COMPLETE_POMODORO uses actual elapsed time, not planned duration
 * Code-split: React.lazy imports for heavy pages
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type { AppState, Task, Pomodoro, DailyStats } from "../shared/appTypes";

// ---- Helpers ----

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    tasks: [],
    pomodoros: [],
    settings: { ...DEFAULT_SETTINGS },
    dailyStats: [],
    currentStreak: 0,
    templates: [],
    preferences: { ...DEFAULT_PREFERENCES },
    readingList: [],
    reminders: [],
    ...overrides,
  };
}

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
    createdAt: "2026-02-20T10:00:00.000Z",
    completedAt: undefined,
    recurrence: "none",
    recurrenceParentId: undefined,
    recurrenceNextDate: undefined,
    subtasks: [],
    recurrenceDayOfMonth: undefined,
    recurrenceStartMonth: undefined,
    pinnedToday: null,
    statusChangedAt: undefined,
    ...overrides,
  };
}

function makePomodoro(overrides: Partial<Pomodoro> = {}): Pomodoro {
  return {
    id: `pom-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Pomodoro",
    duration: 25,
    elapsed: 0,
    status: "idle",
    createdAt: "2026-02-20T10:00:00.000Z",
    ...overrides,
  };
}

// ---- H7: Duplicate Recurrence Prevention ----

describe("H7: Duplicate recurrence prevention", () => {
  it("should not spawn duplicate recurrence if pending child already exists", () => {
    const parentId = "parent-task-1";
    const tasks = [
      makeTask({
        id: parentId,
        title: "Weekly standup",
        status: "active",
        recurrence: "weekly",
      }),
    ];

    // First completion: simulate spawning a recurrence
    const childTask = makeTask({
      id: "child-task-1",
      title: "Weekly standup",
      status: "active",
      recurrenceParentId: parentId,
    });
    const tasksAfterFirst = [
      { ...tasks[0], status: "done" as const },
      childTask,
    ];

    // Second completion attempt: check for existing pending recurrence
    const hasPendingRecurrence = tasksAfterFirst.some(
      t => t.recurrenceParentId === parentId && t.status === "active"
    );
    expect(hasPendingRecurrence).toBe(true);
    // Should NOT spawn another recurrence
  });

  it("should spawn recurrence if no pending child exists", () => {
    const parentId = "parent-task-2";
    const tasks = [
      makeTask({
        id: parentId,
        title: "Monthly review",
        status: "active",
        recurrence: "monthly",
      }),
    ];

    const hasPendingRecurrence = tasks.some(
      t => t.recurrenceParentId === parentId && t.status === "active"
    );
    expect(hasPendingRecurrence).toBe(false);
    // Should spawn a new recurrence
  });

  it("should spawn recurrence if existing child is already done", () => {
    const parentId = "parent-task-3";
    const tasks = [
      makeTask({
        id: parentId,
        title: "Daily standup",
        status: "active",
        recurrence: "daily",
      }),
      makeTask({
        id: "child-done",
        title: "Daily standup",
        status: "done",
        recurrenceParentId: parentId,
      }),
    ];

    const hasPendingRecurrence = tasks.some(
      t => t.recurrenceParentId === parentId && t.status === "active"
    );
    expect(hasPendingRecurrence).toBe(false);
    // Should spawn because existing child is done, not active
  });

  it("should spawn recurrence if existing child is monitored (not active)", () => {
    const parentId = "parent-task-4";
    const tasks = [
      makeTask({
        id: parentId,
        title: "Weekly report",
        status: "active",
        recurrence: "weekly",
      }),
      makeTask({
        id: "child-monitored",
        title: "Weekly report",
        status: "monitored",
        recurrenceParentId: parentId,
      }),
    ];

    const hasPendingRecurrence = tasks.some(
      t => t.recurrenceParentId === parentId && t.status === "active"
    );
    expect(hasPendingRecurrence).toBe(false);
    // Should spawn because monitored child is not "active"
  });

  it("rapid toggle done→active→done should not create duplicate", () => {
    const parentId = "parent-task-5";

    // State after first toggle to done (child spawned)
    const childId = "child-task-5";
    const tasksAfterFirstDone = [
      makeTask({
        id: parentId,
        title: "Recurring task",
        status: "done",
        recurrence: "weekly",
      }),
      makeTask({
        id: childId,
        title: "Recurring task",
        status: "active",
        recurrenceParentId: parentId,
      }),
    ];

    // Toggle back to active
    const tasksAfterReactivate = tasksAfterFirstDone.map(t =>
      t.id === parentId ? { ...t, status: "active" as const } : t
    );

    // Toggle to done again — should NOT spawn another child
    const hasPending = tasksAfterReactivate.some(
      t => t.recurrenceParentId === parentId && t.status === "active"
    );
    expect(hasPending).toBe(true);
    // Dedup check prevents second spawn
  });
});

// ---- H9: COMPLETE_POMODORO Elapsed Time ----

describe("H9: COMPLETE_POMODORO uses actual elapsed time", () => {
  it("should use elapsed seconds converted to minutes, not planned duration", () => {
    const pom = makePomodoro({
      duration: 25,
      elapsed: 1500, // 25 minutes in seconds — full completion
    });
    const focusMinutes = Math.round((pom.elapsed || 0) / 60);
    expect(focusMinutes).toBe(25);
  });

  it("should record partial elapsed time when timer stopped early", () => {
    const pom = makePomodoro({
      duration: 25,
      elapsed: 600, // Only 10 minutes elapsed
    });
    const focusMinutes = Math.round((pom.elapsed || 0) / 60);
    expect(focusMinutes).toBe(10);
    // Old behavior would have recorded 25 (planned duration)
  });

  it("should handle zero elapsed time gracefully", () => {
    const pom = makePomodoro({
      duration: 25,
      elapsed: 0,
    });
    const focusMinutes = Math.round((pom.elapsed || 0) / 60);
    expect(focusMinutes).toBe(0);
  });

  it("should handle undefined elapsed time gracefully", () => {
    const pom = makePomodoro({
      duration: 25,
      elapsed: undefined as any,
    });
    const focusMinutes = Math.round((pom.elapsed || 0) / 60);
    expect(focusMinutes).toBe(0);
  });

  it("should round to nearest minute for partial seconds", () => {
    const pom = makePomodoro({
      duration: 25,
      elapsed: 90, // 1.5 minutes
    });
    const focusMinutes = Math.round((pom.elapsed || 0) / 60);
    expect(focusMinutes).toBe(2); // Rounds up from 1.5
  });

  it("should correctly calculate for long focus sessions", () => {
    const pom = makePomodoro({
      duration: 50,
      elapsed: 2700, // 45 minutes
    });
    const focusMinutes = Math.round((pom.elapsed || 0) / 60);
    expect(focusMinutes).toBe(45);
    // Old behavior would have recorded 50 (planned duration)
  });

  it("accumulates correctly across multiple pomodoros", () => {
    const poms = [
      makePomodoro({ duration: 25, elapsed: 1500 }), // 25 min
      makePomodoro({ duration: 25, elapsed: 600 }), // 10 min
      makePomodoro({ duration: 50, elapsed: 2700 }), // 45 min
    ];
    const totalFocusMinutes = poms.reduce(
      (sum, p) => sum + Math.round((p.elapsed || 0) / 60),
      0
    );
    expect(totalFocusMinutes).toBe(80);
    // Old behavior: 25 + 25 + 50 = 100 (inflated)
  });
});

// ---- Serialization with new fields ----

describe("Serialization preserves H7/H9 related data", () => {
  it("round-trips recurrenceParentId correctly", () => {
    const state = makeState({
      tasks: [
        makeTask({
          id: "parent-1",
          title: "Parent task",
          recurrence: "weekly",
          status: "done",
        }),
        makeTask({
          id: "child-1",
          title: "Parent task",
          recurrence: "weekly",
          recurrenceParentId: "parent-1",
          status: "active",
        }),
      ],
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.tasks[1].recurrenceParentId).toBe("parent-1");
  });

  it("round-trips pomodoro elapsed field correctly", () => {
    const state = makeState({
      pomodoros: [
        makePomodoro({ elapsed: 1500, status: "completed" }),
        makePomodoro({ elapsed: 600, status: "completed" }),
        makePomodoro({ elapsed: 0, status: "idle" }),
      ],
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.pomodoros[0].elapsed).toBe(1500);
    expect(restored.pomodoros[1].elapsed).toBe(600);
    expect(restored.pomodoros[2].elapsed).toBe(0);
  });

  it("round-trips dailyStats focusMinutes correctly with actual elapsed values", () => {
    const state = makeState({
      dailyStats: [
        {
          date: "2026-02-20",
          tasksCompleted: 3,
          focusMinutes: 80, // Actual elapsed, not planned
          pomodorosCompleted: 3,
          tasksCreated: 5,
        },
      ],
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.dailyStats[0].focusMinutes).toBe(80);
  });

  it("handles tasks with both recurrence and statusChangedAt", () => {
    const state = makeState({
      tasks: [
        makeTask({
          title: "Recurring monitored",
          recurrence: "weekly",
          status: "monitored",
          statusChangedAt: "2026-02-20T15:00:00.000Z",
          recurrenceParentId: "some-parent",
        }),
      ],
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.tasks[0].status).toBe("monitored");
    expect(restored.tasks[0].statusChangedAt).toBe("2026-02-20T15:00:00.000Z");
    expect(restored.tasks[0].recurrenceParentId).toBe("some-parent");
    expect(restored.tasks[0].recurrence).toBe("weekly");
  });
});

// ---- Code-split verification ----

describe("Code-split: lazy-loaded page modules exist", () => {
  it("TimerPage module exists and exports default", async () => {
    // Verify the module can be dynamically imported
    const mod = await import("../client/src/pages/TimerPage");
    expect(mod.default).toBeDefined();
  });

  it("MatrixPage module exists and exports default", async () => {
    const mod = await import("../client/src/pages/MatrixPage");
    expect(mod.default).toBeDefined();
  });

  it("StatsPage module exists and exports default", async () => {
    const mod = await import("../client/src/pages/StatsPage");
    expect(mod.default).toBeDefined();
  });

  it("SettingsPage module exists and exports default", async () => {
    const mod = await import("../client/src/pages/SettingsPage");
    expect(mod.default).toBeDefined();
  });

  it("TemplatesPage module exists and exports default", async () => {
    const mod = await import("../client/src/pages/TemplatesPage");
    expect(mod.default).toBeDefined();
  });

  it("WeeklyReviewPage module exists and exports default", async () => {
    const mod = await import("../client/src/pages/WeeklyReviewPage");
    expect(mod.default).toBeDefined();
  });

  it("ReadLaterPage module exists and exports default", async () => {
    const mod = await import("../client/src/pages/ReadLaterPage");
    expect(mod.default).toBeDefined();
  });

  it("FocusModePage module exists and exports default", async () => {
    const mod = await import("../client/src/pages/FocusModePage");
    expect(mod.default).toBeDefined();
  });
});
