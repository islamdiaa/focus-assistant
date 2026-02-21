/**
 * V1.8.6 Bug Fix Tests — Critical Data Safety
 *
 * Comprehensive tests covering:
 * 1. C3: JSON import Zod validation
 * 2. C4: Write mutex + atomic saves
 * 3. C6: safeParseInt — zero-safe integer parsing
 * 4. H5: Corrupt file vs missing file distinction
 * 5. H8: All default/fallback states include reminders, templates, preferences, readingList
 * 6. Backward compatibility: old data (pre-V1.8.5) loads correctly with new code
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import {
  DEFAULT_SETTINGS,
  DEFAULT_PREFERENCES,
  appStateSchema,
} from "../shared/appTypes";
import type { AppState, Task } from "../shared/appTypes";

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
    ...overrides,
  };
}

// ---- C3: JSON Import Zod Validation ----

describe("C3: JSON import Zod validation", () => {
  it("valid AppState passes Zod validation", () => {
    const state = makeState({
      tasks: [makeTask({ title: "Valid task" })],
      currentStreak: 5,
    });
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("rejects state with invalid task status", () => {
    const state = makeState({
      tasks: [makeTask({ status: "invalid_status" as any })],
    });
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it("rejects state with missing required fields", () => {
    const badState = { tasks: [], pomodoros: [] }; // missing settings, dailyStats, currentStreak
    const result = appStateSchema.safeParse(badState);
    expect(result.success).toBe(false);
  });

  it("rejects state with extra unknown fields (strict mode)", () => {
    const state = {
      ...makeState(),
      unknownField: "should not be here",
    };
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it("accepts state with nullable optional fields as null", () => {
    const state = makeState({
      templates: null as any,
      preferences: null as any,
      readingList: null as any,
      reminders: null as any,
    });
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("accepts state with optional fields omitted", () => {
    const state = {
      tasks: [],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("rejects state with invalid priority value", () => {
    const state = makeState({
      tasks: [makeTask({ priority: "super_urgent" as any })],
    });
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it("rejects state with invalid settings values", () => {
    const state = makeState({
      settings: {
        focusDuration: "not a number" as any,
        shortBreak: 5,
        longBreak: 15,
        sessionsBeforeLongBreak: 4,
      },
    });
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it("accepts monitored status in tasks (V1.8.5 feature)", () => {
    const state = makeState({
      tasks: [makeTask({ status: "monitored" })],
    });
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });
});

// ---- C6: safeParseInt — zero-safe integer parsing ----

describe("C6: safeParseInt via Markdown round-trip", () => {
  it("preserves zero values for focusDuration through serialization", () => {
    // Zero is an edge case — old parseInt(val) || default would treat 0 as falsy
    const state = makeState({
      settings: {
        focusDuration: 0,
        shortBreak: 0,
        longBreak: 0,
        sessionsBeforeLongBreak: 0,
      },
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.settings.focusDuration).toBe(0);
    expect(restored.settings.shortBreak).toBe(0);
    expect(restored.settings.longBreak).toBe(0);
    expect(restored.settings.sessionsBeforeLongBreak).toBe(0);
  });

  it("preserves zero currentStreak through serialization", () => {
    const state = makeState({ currentStreak: 0 });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.currentStreak).toBe(0);
  });

  it("preserves zero pomodoro elapsed through serialization", () => {
    const state = makeState({
      pomodoros: [
        {
          id: "pom-1",
          title: "Focus",
          duration: 25,
          elapsed: 0,
          status: "idle",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
      ],
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.pomodoros[0].elapsed).toBe(0);
  });

  it("preserves zero dailyStats values through serialization", () => {
    const state = makeState({
      dailyStats: [
        {
          date: "2026-02-20",
          tasksCompleted: 0,
          focusMinutes: 0,
          pomodorosCompleted: 0,
        },
      ],
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.dailyStats[0].tasksCompleted).toBe(0);
    expect(restored.dailyStats[0].focusMinutes).toBe(0);
    expect(restored.dailyStats[0].pomodorosCompleted).toBe(0);
  });

  it("handles NaN gracefully — falls back to defaults", () => {
    // Manually construct markdown with non-numeric values in correct bold format
    const md = `# Focus Assistant Data

## Settings
- **Focus Duration:** abc min
- **Short Break:** xyz min
- **Long Break:** --- min
- **Sessions Before Long Break:** ???
- **Current Streak:** nope days
`;
    const restored = markdownToState(md);
    expect(restored.settings.focusDuration).toBe(
      DEFAULT_SETTINGS.focusDuration
    );
    expect(restored.settings.shortBreak).toBe(DEFAULT_SETTINGS.shortBreak);
    expect(restored.settings.longBreak).toBe(DEFAULT_SETTINGS.longBreak);
    expect(restored.settings.sessionsBeforeLongBreak).toBe(
      DEFAULT_SETTINGS.sessionsBeforeLongBreak
    );
    expect(restored.currentStreak).toBe(0);
  });

  it("handles empty string values — falls back to defaults", () => {
    const md = `# Focus Assistant Data

## Settings
- **Focus Duration:**  min
- **Short Break:**  min
- **Long Break:**  min
- **Sessions Before Long Break:** 
- **Current Streak:**  days
`;
    const restored = markdownToState(md);
    expect(restored.settings.focusDuration).toBe(
      DEFAULT_SETTINGS.focusDuration
    );
    expect(restored.settings.shortBreak).toBe(DEFAULT_SETTINGS.shortBreak);
  });

  it("preserves normal positive integer values", () => {
    const state = makeState({
      settings: {
        focusDuration: 45,
        shortBreak: 10,
        longBreak: 20,
        sessionsBeforeLongBreak: 6,
      },
      currentStreak: 12,
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.settings.focusDuration).toBe(45);
    expect(restored.settings.shortBreak).toBe(10);
    expect(restored.settings.longBreak).toBe(20);
    expect(restored.settings.sessionsBeforeLongBreak).toBe(6);
    expect(restored.currentStreak).toBe(12);
  });
});

// ---- H5: Corrupt file vs missing file ----

describe("H5: markdownToState handles edge cases", () => {
  it("returns valid empty state for empty markdown", () => {
    const state = markdownToState("");
    expect(state.tasks).toEqual([]);
    expect(state.pomodoros).toEqual([]);
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.reminders).toEqual([]);
  });

  it("returns valid state for markdown with only header", () => {
    const state = markdownToState("# Focus Assistant Data\n");
    expect(state.tasks).toEqual([]);
    expect(state.reminders).toEqual([]);
  });

  it("handles markdown with malformed table rows gracefully", () => {
    const md = `# Focus Assistant Data

## Tasks
| ID | Title | Description | Priority | Status | Due Date | Category | Energy | Quadrant | Created | Completed | Recurrence | Recurrence Parent | Next Recurrence | Subtasks | Recurrence Day | Recurrence Start Month | Pinned Today | Status Changed At |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1 |
`;
    // Should not throw
    const state = markdownToState(md);
    expect(Array.isArray(state.tasks)).toBe(true);
  });

  it("handles markdown with corrupted settings section", () => {
    const md = `# Focus Assistant Data

## Settings
This is not a valid settings format
Just random text here
`;
    const state = markdownToState(md);
    // Should fall back to defaults
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });
});

// ---- H8: All default/fallback states include all fields ----

describe("H8: Default states include all required fields", () => {
  it("markdownToState returns state with reminders array", () => {
    const state = markdownToState("");
    expect(state.reminders).toBeDefined();
    expect(Array.isArray(state.reminders)).toBe(true);
  });

  it("markdownToState returns state with readingList array", () => {
    const state = markdownToState("");
    expect(state.readingList).toBeDefined();
    expect(Array.isArray(state.readingList)).toBe(true);
  });

  it("markdownToState returns state with templates array", () => {
    const state = markdownToState("");
    expect(state.templates).toBeDefined();
    expect(Array.isArray(state.templates)).toBe(true);
  });

  it("markdownToState returns state with preferences object", () => {
    const state = markdownToState("");
    expect(state.preferences).toBeDefined();
    expect(state.preferences).toEqual(
      expect.objectContaining(DEFAULT_PREFERENCES)
    );
  });

  it("markdownToState output passes Zod validation", () => {
    const state = markdownToState("");
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("round-trip state passes Zod validation", () => {
    const original = makeState({
      tasks: [
        makeTask({
          title: "Test",
          status: "monitored",
          statusChangedAt: "2026-02-20T12:00:00.000Z",
        }),
      ],
      reminders: [
        {
          id: "r1",
          title: "Reminder",
          date: "2026-03-01",
          recurrence: "none",
          category: "other",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
      ],
    });
    const md = stateToMarkdown(original);
    const restored = markdownToState(md);
    const result = appStateSchema.safeParse(restored);
    expect(result.success).toBe(true);
  });
});

// ---- C4: Atomic writes — serialization consistency ----

describe("C4: Serialization consistency for atomic writes", () => {
  it("stateToMarkdown produces deterministic output", () => {
    const state = makeState({
      tasks: [
        makeTask({ id: "t1", title: "Task A" }),
        makeTask({ id: "t2", title: "Task B" }),
      ],
      currentStreak: 5,
    });
    const md1 = stateToMarkdown(state);
    const md2 = stateToMarkdown(state);
    expect(md1).toBe(md2);
  });

  it("stateToMarkdown output is valid markdown that round-trips", () => {
    const state = makeState({
      tasks: [
        makeTask({
          id: "t1",
          title: "Work task",
          category: "work",
          status: "active",
        }),
        makeTask({
          id: "t2",
          title: "Personal task",
          category: "personal",
          status: "monitored",
          statusChangedAt: "2026-02-20T14:00:00.000Z",
        }),
        makeTask({
          id: "t3",
          title: "Done task",
          status: "done",
          completedAt: "2026-02-20T15:00:00.000Z",
        }),
      ],
      pomodoros: [
        {
          id: "p1",
          title: "Focus",
          duration: 25,
          elapsed: 0,
          status: "idle",
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
      currentStreak: 7,
      settings: {
        focusDuration: 30,
        shortBreak: 7,
        longBreak: 20,
        sessionsBeforeLongBreak: 3,
      },
      preferences: { ...DEFAULT_PREFERENCES, activeContext: "work" },
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);

    expect(restored.tasks).toHaveLength(3);
    expect(restored.tasks[0].title).toBe("Work task");
    expect(restored.tasks[1].status).toBe("monitored");
    expect(restored.tasks[1].statusChangedAt).toBe("2026-02-20T14:00:00.000Z");
    expect(restored.tasks[2].status).toBe("done");
    expect(restored.pomodoros).toHaveLength(1);
    expect(restored.pomodoros[0].elapsed).toBe(0);
    expect(restored.dailyStats).toHaveLength(1);
    expect(restored.dailyStats[0].tasksCompleted).toBe(3);
    expect(restored.currentStreak).toBe(7);
    expect(restored.settings.focusDuration).toBe(30);
    expect(restored.preferences?.activeContext).toBe("work");
  });
});

// ---- Backward Compatibility ----

describe("Backward compatibility: pre-V1.8.5 data", () => {
  it("loads old markdown without statusChangedAt column", () => {
    // Old V1.8.4 format: tasks table has no statusChangedAt column
    const md = `# Focus Assistant Data

## Settings
- **Focus Duration:** 25 min
- **Short Break:** 5 min
- **Long Break:** 15 min
- **Sessions Before Long Break:** 4
- **Current Streak:** 3 days

## Tasks
| ID | Title | Description | Priority | Status | Due Date | Category | Energy | Quadrant | Created | Completed | Recurrence | Recurrence Parent | Next Recurrence | Subtasks | Recurrence Day | Recurrence Start Month | Pinned Today |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1 | Old task | desc | high | active | 2026-03-01 | work | high | do-first | 2026-01-01T00:00:00.000Z | | none | | | | | | |
| t2 | Done task | | low | done | | personal | low | schedule | 2026-01-02T00:00:00.000Z | 2026-01-15T00:00:00.000Z | none | | | | | | |
`;
    const state = markdownToState(md);
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks[0].title).toBe("Old task");
    expect(state.tasks[0].status).toBe("active");
    expect(state.tasks[0].statusChangedAt).toBeUndefined();
    expect(state.tasks[1].status).toBe("done");
    expect(state.currentStreak).toBe(3);
  });

  it("loads old markdown without preferences section", () => {
    const md = `# Focus Assistant Data

## Settings
- **Focus Duration:** 25 min
- **Short Break:** 5 min
- **Long Break:** 15 min
- **Sessions Before Long Break:** 4
- **Current Streak:** 0 days
`;
    const state = markdownToState(md);
    expect(state.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(state.reminders).toEqual([]);
    expect(state.readingList).toEqual([]);
    expect(state.templates).toEqual([]);
  });

  it("loads old markdown without reminders section", () => {
    const md = `# Focus Assistant Data

## Settings
- **Focus Duration:** 30 min
- **Short Break:** 5 min
- **Long Break:** 15 min
- **Sessions Before Long Break:** 4
- **Current Streak:** 5 days

## Tasks
| ID | Title | Description | Priority | Status | Due Date | Category | Energy | Quadrant | Created | Completed | Recurrence | Recurrence Parent | Next Recurrence | Subtasks | Recurrence Day | Recurrence Start Month | Pinned Today |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1 | My task | | medium | active | | | | unassigned | 2026-01-01T00:00:00.000Z | | none | | | | | | |
`;
    const state = markdownToState(md);
    expect(state.tasks).toHaveLength(1);
    expect(state.reminders).toEqual([]);
    // Should pass Zod validation
    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("loads old markdown without monitored status — all tasks are active or done", () => {
    const md = `# Focus Assistant Data

## Settings
- **Focus Duration:** 25 min
- **Short Break:** 5 min
- **Long Break:** 15 min
- **Sessions Before Long Break:** 4
- **Current Streak:** 0 days

## Tasks
| ID | Title | Description | Priority | Status | Due Date | Category | Energy | Quadrant | Created | Completed | Recurrence | Recurrence Parent | Next Recurrence | Subtasks | Recurrence Day | Recurrence Start Month | Pinned Today |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1 | Active | | medium | active | | | | unassigned | 2026-01-01T00:00:00.000Z | | none | | | | | | |
| t2 | Done | | low | done | | | | unassigned | 2026-01-01T00:00:00.000Z | 2026-01-10T00:00:00.000Z | none | | | | | | |
`;
    const state = markdownToState(md);
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks[0].status).toBe("active");
    expect(state.tasks[1].status).toBe("done");
    // No monitored tasks — that's fine, old data just doesn't have them
    const monitored = state.tasks.filter(t => t.status === "monitored");
    expect(monitored).toHaveLength(0);
  });

  it("old data with zero values now preserved (C6 regression test)", () => {
    const md = `# Focus Assistant Data

## Settings
- **Focus Duration:** 0 min
- **Short Break:** 0 min
- **Long Break:** 0 min
- **Sessions Before Long Break:** 0
- **Current Streak:** 0 days

## Daily Stats
| Date | Tasks Completed | Focus Minutes | Pomodoros Completed |
| --- | --- | --- | --- |
| 2026-02-20 | 0 | 0 | 0 |

## Pomodoros
| ID | Title | Duration | Elapsed | Status | Created | Completed |
| --- | --- | --- | --- | --- | --- | --- |
| p1 | Focus | 25 | 0 | idle | 2026-02-20T10:00:00.000Z | |
`;
    const state = markdownToState(md);
    expect(state.settings.focusDuration).toBe(0);
    expect(state.settings.shortBreak).toBe(0);
    expect(state.settings.longBreak).toBe(0);
    expect(state.settings.sessionsBeforeLongBreak).toBe(0);
    expect(state.currentStreak).toBe(0);
    expect(state.dailyStats[0].tasksCompleted).toBe(0);
    expect(state.dailyStats[0].focusMinutes).toBe(0);
    expect(state.dailyStats[0].pomodorosCompleted).toBe(0);
    expect(state.pomodoros[0].elapsed).toBe(0);
  });
});

// ---- statusChangedAt serialization ----

describe("statusChangedAt serialization", () => {
  it("preserves statusChangedAt through round-trip", () => {
    const state = makeState({
      tasks: [
        makeTask({
          id: "t1",
          status: "monitored",
          statusChangedAt: "2026-02-20T14:30:00.000Z",
        }),
        makeTask({
          id: "t2",
          status: "done",
          statusChangedAt: "2026-02-20T15:00:00.000Z",
          completedAt: "2026-02-20T15:00:00.000Z",
        }),
        makeTask({ id: "t3", status: "active" }), // no statusChangedAt
      ],
    });
    const md = stateToMarkdown(state);
    const restored = markdownToState(md);
    expect(restored.tasks[0].statusChangedAt).toBe("2026-02-20T14:30:00.000Z");
    expect(restored.tasks[1].statusChangedAt).toBe("2026-02-20T15:00:00.000Z");
    expect(restored.tasks[2].statusChangedAt).toBeUndefined();
  });

  it("statusChangedAt is undefined for new tasks", () => {
    const task = makeTask();
    expect(task.statusChangedAt).toBeUndefined();
  });
});
