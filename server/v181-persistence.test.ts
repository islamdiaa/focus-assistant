/**
 * V1.8.1 Persistence Tests — Save/Load Round-Trip
 *
 * Ensures all state mutations survive a save → load cycle.
 * This covers the bug where Zod schema mismatches caused data loss.
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type {
  AppState,
  Task,
  Pomodoro,
  Reminder,
  PomodoroLink,
} from "../shared/appTypes";

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

// ---- Task Persistence ----

describe("Task persistence round-trip", () => {
  it("preserves task status=done after save/load", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Buy groceries",
          priority: "medium",
          status: "done",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00.000Z",
          completedAt: "2026-02-20T12:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].status).toBe("done");
    expect(parsed.tasks[0].completedAt).toBe("2026-02-20T12:00:00.000Z");
  });

  it("preserves task with quarterly recurrence fields", () => {
    const state = makeState({
      tasks: [
        {
          id: "t2",
          title: "Quarterly review",
          priority: "high",
          status: "active",
          quadrant: "schedule",
          createdAt: "2026-02-16T10:00:00.000Z",
          recurrence: "quarterly",
          recurrenceDayOfMonth: 16,
          recurrenceStartMonth: 2,
          recurrenceNextDate: "2026-05-16",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].recurrence).toBe("quarterly");
    expect(parsed.tasks[0].recurrenceDayOfMonth).toBe(16);
    expect(parsed.tasks[0].recurrenceStartMonth).toBe(2);
    expect(parsed.tasks[0].recurrenceNextDate).toBe("2026-05-16");
  });

  it("preserves tasks with subtasks after toggle", () => {
    const state = makeState({
      tasks: [
        {
          id: "t3",
          title: "Build feature",
          priority: "high",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00.000Z",
          subtasks: [
            { id: "s1", title: "Design", done: true },
            { id: "s2", title: "Implement", done: false },
          ],
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].subtasks).toHaveLength(2);
    expect(parsed.tasks[0].subtasks![0].done).toBe(true);
    expect(parsed.tasks[0].subtasks![1].done).toBe(false);
  });

  it("preserves all task fields including optional ones", () => {
    const task: Task = {
      id: "t4",
      title: "Full task",
      description: "A task with all fields",
      priority: "urgent",
      status: "active",
      dueDate: "2026-03-01",
      category: "work",
      energy: "high",
      quadrant: "do-first",
      createdAt: "2026-02-20T10:00:00.000Z",
      recurrence: "weekly",
      recurrenceParentId: "parent1",
      recurrenceNextDate: "2026-02-27",
    };

    const state = makeState({ tasks: [task] });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].id).toBe("t4");
    expect(parsed.tasks[0].description).toBe("A task with all fields");
    expect(parsed.tasks[0].priority).toBe("urgent");
    expect(parsed.tasks[0].dueDate).toBe("2026-03-01");
    expect(parsed.tasks[0].category).toBe("work");
    expect(parsed.tasks[0].energy).toBe("high");
    expect(parsed.tasks[0].recurrence).toBe("weekly");
    expect(parsed.tasks[0].recurrenceParentId).toBe("parent1");
    expect(parsed.tasks[0].recurrenceNextDate).toBe("2026-02-27");
  });

  it("handles multiple tasks with mixed statuses", () => {
    const state = makeState({
      tasks: [
        {
          id: "t5",
          title: "Done task",
          priority: "low",
          status: "done",
          quadrant: "unassigned",
          createdAt: "2026-02-20T10:00:00.000Z",
          completedAt: "2026-02-20T11:00:00.000Z",
        },
        {
          id: "t6",
          title: "Active task",
          priority: "high",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
        {
          id: "t7",
          title: "Quarterly task",
          priority: "medium",
          status: "active",
          quadrant: "schedule",
          createdAt: "2026-02-20T10:00:00.000Z",
          recurrence: "quarterly",
          recurrenceDayOfMonth: 1,
          recurrenceStartMonth: 1,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.tasks[0].status).toBe("done");
    expect(parsed.tasks[1].status).toBe("active");
    expect(parsed.tasks[2].recurrence).toBe("quarterly");
    expect(parsed.tasks[2].recurrenceDayOfMonth).toBe(1);
  });
});

// ---- Pomodoro Persistence ----

describe("Pomodoro persistence round-trip", () => {
  it("preserves pomodoro with linkedTasks (multi-task)", () => {
    const linkedTasks: PomodoroLink[] = [
      { taskId: "t1" },
      { taskId: "t2", subtaskId: "s1" },
    ];

    const state = makeState({
      pomodoros: [
        {
          id: "p1",
          title: "Focus session",
          duration: 25,
          elapsed: 1500,
          status: "completed",
          createdAt: "2026-02-20T10:00:00.000Z",
          completedAt: "2026-02-20T10:25:00.000Z",
          linkedTasks,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.pomodoros).toHaveLength(1);
    expect(parsed.pomodoros[0].linkedTasks).toHaveLength(2);
    expect(parsed.pomodoros[0].linkedTasks![0].taskId).toBe("t1");
    expect(parsed.pomodoros[0].linkedTasks![1].taskId).toBe("t2");
    expect(parsed.pomodoros[0].linkedTasks![1].subtaskId).toBe("s1");
  });

  it("preserves pomodoro with legacy linkedTaskId", () => {
    const state = makeState({
      pomodoros: [
        {
          id: "p2",
          title: "Old session",
          duration: 25,
          elapsed: 0,
          status: "idle",
          createdAt: "2026-02-20T10:00:00.000Z",
          linkedTaskId: "t1",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.pomodoros[0].linkedTaskId).toBe("t1");
  });

  it("preserves pomodoro timer persistence fields", () => {
    const state = makeState({
      pomodoros: [
        {
          id: "p3",
          title: "Running timer",
          duration: 25,
          elapsed: 600,
          status: "running",
          createdAt: "2026-02-20T10:00:00.000Z",
          startedAt: "2026-02-20T10:05:00.000Z",
          accumulatedSeconds: 300,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.pomodoros[0].startedAt).toBe("2026-02-20T10:05:00.000Z");
    expect(parsed.pomodoros[0].accumulatedSeconds).toBe(300);
  });
});

// ---- Reminder Persistence ----

describe("Reminder persistence round-trip", () => {
  it("preserves reminders with all fields", () => {
    const state = makeState({
      reminders: [
        {
          id: "rem1",
          title: "Mom's Birthday",
          description: "Buy flowers",
          date: "2026-03-15",
          category: "birthday",
          recurrence: "yearly",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.reminders).toHaveLength(1);
    expect(parsed.reminders![0].title).toBe("Mom's Birthday");
    expect(parsed.reminders![0].description).toBe("Buy flowers");
    expect(parsed.reminders![0].date).toBe("2026-03-15");
    expect(parsed.reminders![0].category).toBe("birthday");
    expect(parsed.reminders![0].recurrence).toBe("yearly");
  });

  it("preserves acknowledged state", () => {
    const state = makeState({
      reminders: [
        {
          id: "rem2",
          title: "Doctor appointment",
          date: "2026-02-20",
          category: "appointment",
          recurrence: "none",
          acknowledged: true,
          acknowledgedAt: "2026-02-20T09:00:00.000Z",
          createdAt: "2026-02-15T10:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.reminders![0].acknowledged).toBe(true);
    expect(parsed.reminders![0].acknowledgedAt).toBe(
      "2026-02-20T09:00:00.000Z"
    );
  });

  it("handles empty reminders", () => {
    const state = makeState({ reminders: [] });
    const md = stateToMarkdown(state);
    expect(md).not.toContain("## Reminders");
    const parsed = markdownToState(md);
    expect(parsed.reminders?.length || 0).toBe(0);
  });

  it("preserves multiple reminders with different categories", () => {
    const state = makeState({
      reminders: [
        {
          id: "rem3",
          title: "Birthday",
          date: "2026-03-01",
          category: "birthday",
          recurrence: "yearly",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
        {
          id: "rem4",
          title: "Meeting",
          date: "2026-02-25",
          category: "appointment",
          recurrence: "none",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
        {
          id: "rem5",
          title: "Conference",
          date: "2026-04-10",
          category: "event",
          recurrence: "none",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
        {
          id: "rem6",
          title: "Check in",
          date: "2026-02-28",
          category: "other",
          recurrence: "weekly",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.reminders).toHaveLength(4);
    expect(parsed.reminders![0].category).toBe("birthday");
    expect(parsed.reminders![1].category).toBe("appointment");
    expect(parsed.reminders![2].category).toBe("event");
    expect(parsed.reminders![3].category).toBe("other");
    expect(parsed.reminders![3].recurrence).toBe("weekly");
  });
});

// ---- Full State Round-Trip ----

describe("Full state round-trip", () => {
  it("preserves complete state with all V1.8.1 features", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Done task",
          priority: "medium",
          status: "done",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00.000Z",
          completedAt: "2026-02-20T12:00:00.000Z",
        },
        {
          id: "t2",
          title: "Quarterly task",
          priority: "high",
          status: "active",
          quadrant: "schedule",
          createdAt: "2026-02-16T10:00:00.000Z",
          recurrence: "quarterly",
          recurrenceDayOfMonth: 16,
          recurrenceStartMonth: 2,
        },
      ],
      pomodoros: [
        {
          id: "p1",
          title: "Focus",
          duration: 25,
          elapsed: 1500,
          status: "completed",
          createdAt: "2026-02-20T10:00:00.000Z",
          completedAt: "2026-02-20T10:25:00.000Z",
          linkedTasks: [{ taskId: "t1" }, { taskId: "t2", subtaskId: "s1" }],
        },
      ],
      reminders: [
        {
          id: "rem1",
          title: "Birthday",
          date: "2026-03-15",
          category: "birthday",
          recurrence: "yearly",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
      ],
      dailyStats: [
        {
          date: "2026-02-20",
          tasksCompleted: 3,
          focusMinutes: 75,
          pomodorosCompleted: 3,
        },
      ],
      currentStreak: 5,
      readingList: [
        {
          id: "r1",
          url: "https://example.com",
          title: "Article",
          tags: ["ai"],
          status: "unread",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    // Tasks
    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.tasks[0].status).toBe("done");
    expect(parsed.tasks[1].recurrence).toBe("quarterly");
    expect(parsed.tasks[1].recurrenceDayOfMonth).toBe(16);

    // Pomodoros
    expect(parsed.pomodoros).toHaveLength(1);
    expect(parsed.pomodoros[0].linkedTasks).toHaveLength(2);

    // Reminders
    expect(parsed.reminders).toHaveLength(1);
    expect(parsed.reminders![0].category).toBe("birthday");

    // Stats
    expect(parsed.dailyStats).toHaveLength(1);
    expect(parsed.currentStreak).toBe(5);

    // Reading list
    expect(parsed.readingList).toHaveLength(1);
  });
});

// ---- Zod Schema Validation ----

describe("Zod schema accepts all V1.8.1 fields", () => {
  it("validates a complete state through the real appStateSchema", async () => {
    // Use the REAL schema from shared/appTypes.ts — NOT a hand-written copy
    const { appStateSchema } = await import("../shared/appTypes");

    const testState = {
      tasks: [
        {
          id: "t1",
          title: "Test",
          priority: "high" as const,
          status: "done" as const,
          quadrant: "do-first" as const,
          createdAt: "2026-02-20T10:00:00.000Z",
          completedAt: "2026-02-20T12:00:00.000Z",
          recurrence: "quarterly" as const,
          recurrenceDayOfMonth: 16,
          recurrenceStartMonth: 2,
        },
      ],
      pomodoros: [
        {
          id: "p1",
          title: "Focus",
          duration: 25,
          elapsed: 1500,
          status: "completed" as const,
          createdAt: "2026-02-20T10:00:00.000Z",
          linkedTasks: [{ taskId: "t1" }, { taskId: "t2", subtaskId: "s1" }],
        },
      ],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
      reminders: [
        {
          id: "rem1",
          title: "Birthday",
          date: "2026-03-15",
          category: "birthday" as const,
          recurrence: "yearly" as const,
          createdAt: "2026-02-20T10:00:00.000Z",
        },
      ],
    };

    const result = appStateSchema.safeParse(testState);
    expect(result.success).toBe(true);

    if (result.success) {
      // Verify quarterly fields survive Zod parsing
      expect(result.data.tasks[0].recurrence).toBe("quarterly");
      expect(result.data.tasks[0].recurrenceDayOfMonth).toBe(16);
      expect(result.data.tasks[0].recurrenceStartMonth).toBe(2);

      // Verify linkedTasks survive
      expect(result.data.pomodoros[0].linkedTasks).toHaveLength(2);

      // Verify reminders survive
      expect(result.data.reminders).toHaveLength(1);
    }
  });

  it("rejects invalid data through the real schema", async () => {
    const { appStateSchema } = await import("../shared/appTypes");

    const invalidState = {
      tasks: [
        {
          id: "t1",
          title: "Test",
          priority: "INVALID_PRIORITY",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01",
        },
      ],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const result = appStateSchema.safeParse(invalidState);
    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level fields due to .strict()", async () => {
    const { appStateSchema } = await import("../shared/appTypes");

    const stateWithExtra = {
      tasks: [],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
      unknownField: "should be rejected",
    };

    const result = appStateSchema.safeParse(stateWithExtra);
    expect(result.success).toBe(false);
  });
});
