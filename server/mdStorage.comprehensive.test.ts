import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import {
  stateToMarkdown,
  markdownToState,
  saveToMdFile,
  loadFromMdFile,
  getMdFileTimestamp,
} from "./mdStorage";
import type { AppState } from "../shared/appTypes";
import { DEFAULT_SETTINGS } from "../shared/appTypes";

// ---- Serialization / Deserialization (pure functions, no I/O) ----

describe("stateToMarkdown", () => {
  it("produces valid Markdown with all sections", () => {
    const state: AppState = {
      tasks: [],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };
    const md = stateToMarkdown(state);

    expect(md).toContain("# Focus Assist Data");
    expect(md).toContain("## Settings");
    expect(md).toContain("## Tasks");
    expect(md).toContain("## Pomodoros");
    expect(md).toContain("## Daily Stats");
  });

  it("shows 'No tasks yet' for empty tasks", () => {
    const state: AppState = {
      tasks: [],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };
    const md = stateToMarkdown(state);
    expect(md).toContain("_No tasks yet._");
  });

  it("shows 'No pomodoros yet' for empty pomodoros", () => {
    const state: AppState = {
      tasks: [],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };
    const md = stateToMarkdown(state);
    expect(md).toContain("_No pomodoros yet._");
  });

  it("includes recurrence fields in task table", () => {
    const state: AppState = {
      tasks: [
        {
          id: "t1",
          title: "Daily standup",
          priority: "medium",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00Z",
          recurrence: "daily",
          recurrenceNextDate: "2026-02-21",
        },
      ],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };
    const md = stateToMarkdown(state);
    expect(md).toContain("daily");
    expect(md).toContain("2026-02-21");
    expect(md).toContain("Recurrence");
  });

  it("includes timer persistence fields in pomodoro table", () => {
    const state: AppState = {
      tasks: [],
      pomodoros: [
        {
          id: "p1",
          title: "Focus session",
          duration: 25,
          elapsed: 300,
          status: "running",
          createdAt: "2026-02-20T10:00:00Z",
          startedAt: "2026-02-20T10:05:00Z",
          accumulatedSeconds: 120,
        },
      ],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };
    const md = stateToMarkdown(state);
    expect(md).toContain("StartedAt");
    expect(md).toContain("AccumulatedSeconds");
    expect(md).toContain("2026-02-20T10:05:00Z");
    expect(md).toContain("120");
  });
});

describe("markdownToState", () => {
  it("parses settings from Markdown", () => {
    const md = `# Focus Assist Data

## Settings

- **Focus Duration:** 45 min
- **Short Break:** 10 min
- **Long Break:** 25 min
- **Sessions Before Long Break:** 3
- **Current Streak:** 12 days

## Tasks

_No tasks yet._

## Pomodoros

_No pomodoros yet._

## Daily Stats

_No stats yet._
`;
    const state = markdownToState(md);
    expect(state.settings.focusDuration).toBe(45);
    expect(state.settings.shortBreak).toBe(10);
    expect(state.settings.longBreak).toBe(25);
    expect(state.settings.sessionsBeforeLongBreak).toBe(3);
    expect(state.currentStreak).toBe(12);
  });

  it("returns defaults for missing settings", () => {
    const md = `# Focus Assist Data

## Settings

## Tasks

_No tasks yet._

## Pomodoros

_No pomodoros yet._

## Daily Stats

_No stats yet._
`;
    const state = markdownToState(md);
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.currentStreak).toBe(0);
  });

  it("parses tasks with all fields including recurrence", () => {
    const state: AppState = {
      tasks: [
        {
          id: "t1",
          title: "Weekly review",
          description: "Check OKRs",
          priority: "high",
          status: "active",
          dueDate: "2026-03-01",
          category: "work",
          energy: "high",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00Z",
          recurrence: "weekly",
          recurrenceNextDate: "2026-02-27",
        },
        {
          id: "t2",
          title: "Buy milk",
          priority: "low",
          status: "done",
          quadrant: "delegate",
          createdAt: "2026-02-19T08:00:00Z",
          completedAt: "2026-02-19T12:00:00Z",
        },
      ],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.tasks[0].recurrence).toBe("weekly");
    expect(parsed.tasks[0].recurrenceNextDate).toBe("2026-02-27");
    expect(parsed.tasks[0].category).toBe("work");
    expect(parsed.tasks[0].energy).toBe("high");
    expect(parsed.tasks[1].status).toBe("done");
    expect(parsed.tasks[1].completedAt).toBe("2026-02-19T12:00:00Z");
  });

  it("parses pomodoros with timer persistence fields", () => {
    const state: AppState = {
      tasks: [],
      pomodoros: [
        {
          id: "p1",
          title: "Deep work",
          duration: 50,
          elapsed: 1200,
          status: "paused",
          createdAt: "2026-02-20T10:00:00Z",
          startedAt: "2026-02-20T10:05:00Z",
          accumulatedSeconds: 600,
        },
      ],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.pomodoros).toHaveLength(1);
    expect(parsed.pomodoros[0].startedAt).toBe("2026-02-20T10:05:00Z");
    expect(parsed.pomodoros[0].accumulatedSeconds).toBe(600);
    expect(parsed.pomodoros[0].status).toBe("paused");
    expect(parsed.pomodoros[0].duration).toBe(50);
  });

  it("handles special characters in titles and descriptions", () => {
    const state: AppState = {
      tasks: [
        {
          id: "t1",
          title: "Option A | Option B | Option C",
          description: "Choose one | or another\nNew line here",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-20T10:00:00Z",
        },
      ],
      pomodoros: [
        {
          id: "p1",
          title: "Work on A | B project",
          duration: 25,
          elapsed: 0,
          status: "idle",
          createdAt: "2026-02-20T10:00:00Z",
        },
      ],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].title).toBe("Option A | Option B | Option C");
    expect(parsed.tasks[0].description).toBe(
      "Choose one | or another\nNew line here"
    );
    expect(parsed.pomodoros[0].title).toBe("Work on A | B project");
  });

  it("handles empty string fields gracefully", () => {
    const state: AppState = {
      tasks: [
        {
          id: "t1",
          title: "No extras",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-20T10:00:00Z",
        },
      ],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].description).toBeUndefined();
    expect(parsed.tasks[0].dueDate).toBeUndefined();
    expect(parsed.tasks[0].category).toBeUndefined();
    expect(parsed.tasks[0].energy).toBeUndefined();
    expect(parsed.tasks[0].recurrence).toBeUndefined();
  });
});

describe("round-trip integrity", () => {
  it("preserves a complex state through serialize → deserialize", () => {
    const state: AppState = {
      tasks: [
        {
          id: "t1",
          title: "Review Q1 OKRs",
          description: "Check all team OKRs for Q1",
          priority: "high",
          status: "active",
          dueDate: "2026-03-01",
          category: "work",
          energy: "high",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00Z",
          recurrence: "weekly",
          recurrenceNextDate: "2026-02-27",
        },
        {
          id: "t2",
          title: "Morning run",
          priority: "medium",
          status: "done",
          category: "health",
          energy: "medium",
          quadrant: "schedule",
          createdAt: "2026-02-19T06:00:00Z",
          completedAt: "2026-02-19T07:00:00Z",
          recurrence: "daily",
          recurrenceNextDate: "2026-02-20",
        },
        {
          id: "t3",
          title: "Task with pipes | and special chars",
          description: "Line 1\nLine 2 | with pipe",
          priority: "low",
          status: "active",
          quadrant: "eliminate",
          createdAt: "2026-02-18T12:00:00Z",
        },
      ],
      pomodoros: [
        {
          id: "p1",
          title: "Deep work",
          duration: 50,
          elapsed: 3000,
          status: "completed",
          createdAt: "2026-02-20T10:00:00Z",
          completedAt: "2026-02-20T10:50:00Z",
        },
        {
          id: "p2",
          title: "Quick focus",
          duration: 15,
          elapsed: 300,
          status: "paused",
          createdAt: "2026-02-20T11:00:00Z",
          startedAt: "2026-02-20T11:00:00Z",
          accumulatedSeconds: 300,
        },
      ],
      settings: {
        focusDuration: 50,
        shortBreak: 10,
        longBreak: 25,
        sessionsBeforeLongBreak: 3,
      },
      dailyStats: [
        {
          date: "2026-02-18",
          tasksCompleted: 3,
          focusMinutes: 90,
          pomodorosCompleted: 3,
        },
        {
          date: "2026-02-19",
          tasksCompleted: 5,
          focusMinutes: 150,
          pomodorosCompleted: 6,
        },
        {
          date: "2026-02-20",
          tasksCompleted: 2,
          focusMinutes: 50,
          pomodorosCompleted: 1,
        },
      ],
      currentStreak: 14,
    };

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    // Tasks
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.tasks[0].id).toBe("t1");
    expect(parsed.tasks[0].recurrence).toBe("weekly");
    expect(parsed.tasks[1].completedAt).toBe("2026-02-19T07:00:00Z");
    expect(parsed.tasks[2].title).toBe("Task with pipes | and special chars");
    expect(parsed.tasks[2].description).toBe("Line 1\nLine 2 | with pipe");

    // Pomodoros
    expect(parsed.pomodoros).toHaveLength(2);
    expect(parsed.pomodoros[0].status).toBe("completed");
    expect(parsed.pomodoros[1].startedAt).toBe("2026-02-20T11:00:00Z");
    expect(parsed.pomodoros[1].accumulatedSeconds).toBe(300);

    // Settings
    expect(parsed.settings.focusDuration).toBe(50);
    expect(parsed.settings.longBreak).toBe(25);
    expect(parsed.settings.sessionsBeforeLongBreak).toBe(3);

    // Stats
    expect(parsed.dailyStats).toHaveLength(3);
    expect(parsed.dailyStats[1].focusMinutes).toBe(150);

    // Streak
    expect(parsed.currentStreak).toBe(14);
  });

  it("handles maximum field lengths without corruption", () => {
    const longTitle = "A".repeat(500);
    const longDesc = "B".repeat(1000);

    const state: AppState = {
      tasks: [
        {
          id: "t-long",
          title: longTitle,
          description: longDesc,
          priority: "urgent",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00Z",
        },
      ],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].title).toBe(longTitle);
    expect(parsed.tasks[0].description).toBe(longDesc);
  });

  it("handles many tasks without data loss", () => {
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: `t-${i}`,
      title: `Task number ${i}`,
      priority: (["low", "medium", "high", "urgent"] as const)[i % 4],
      status: (i % 3 === 0 ? "done" : "active") as "active" | "done",
      quadrant: (
        ["do-first", "schedule", "delegate", "eliminate", "unassigned"] as const
      )[i % 5],
      createdAt: `2026-02-${String(1 + (i % 28)).padStart(2, "0")}T10:00:00Z`,
    }));

    const state: AppState = {
      tasks,
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(100);
    expect(parsed.tasks[0].title).toBe("Task number 0");
    expect(parsed.tasks[99].title).toBe("Task number 99");
  });
});
