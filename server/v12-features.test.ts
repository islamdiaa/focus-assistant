/**
 * V1.2 Feature Tests
 * Tests for subtasks, templates, preferences, linkedTaskId, and data integrity
 */
import { describe, expect, it } from "vitest";
import {
  stateToMarkdown,
  markdownToState,
  checkDataIntegrity,
} from "./mdStorage";
import type { AppState } from "../shared/appTypes";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    tasks: [],
    pomodoros: [],
    settings: { ...DEFAULT_SETTINGS },
    dailyStats: [],
    currentStreak: 0,
    templates: [],
    preferences: { ...DEFAULT_PREFERENCES },
    ...overrides,
  };
}

// ---- Subtasks ----

describe("subtasks serialization", () => {
  it("round-trips tasks with subtasks through markdown", () => {
    const state = baseState({
      tasks: [
        {
          id: "t1",
          title: "Build feature",
          priority: "high",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00Z",
          subtasks: [
            { id: "s1", title: "Design UI", done: true },
            { id: "s2", title: "Write tests", done: false },
            { id: "s3", title: "Deploy", done: false },
          ],
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].subtasks).toHaveLength(3);
    expect(parsed.tasks[0].subtasks![0].title).toBe("Design UI");
    expect(parsed.tasks[0].subtasks![0].done).toBe(true);
    expect(parsed.tasks[0].subtasks![1].done).toBe(false);
  });

  it("handles tasks without subtasks (undefined)", () => {
    const state = baseState({
      tasks: [
        {
          id: "t2",
          title: "Simple task",
          priority: "low",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-20T10:00:00Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].subtasks).toBeUndefined();
  });

  it("handles tasks with empty subtasks array", () => {
    const state = baseState({
      tasks: [
        {
          id: "t3",
          title: "Task with empty subtasks",
          priority: "medium",
          status: "active",
          quadrant: "schedule",
          createdAt: "2026-02-20T10:00:00Z",
          subtasks: [],
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    // Empty subtasks may serialize as undefined or empty array
    const subtasks = parsed.tasks[0].subtasks;
    expect(!subtasks || subtasks.length === 0).toBe(true);
  });
});

// ---- Templates ----

describe("templates serialization", () => {
  it("round-trips templates through markdown", () => {
    const state = baseState({
      templates: [
        {
          id: "tpl1",
          name: "Sprint Planning",
          description: "Weekly sprint setup",
          tasks: [
            { title: "Review backlog", priority: "high", category: "work" },
            { title: "Assign stories", priority: "medium" },
          ],
          createdAt: "2026-02-20T10:00:00Z",
        },
        {
          id: "tpl2",
          name: "Morning Routine",
          tasks: [
            { title: "Exercise", priority: "medium", energy: "high" },
            { title: "Journal", priority: "low" },
          ],
          createdAt: "2026-02-20T11:00:00Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    expect(md).toContain("## Templates");
    expect(md).toContain("Sprint Planning");
    expect(md).toContain("Morning Routine");

    const parsed = markdownToState(md);
    expect(parsed.templates).toHaveLength(2);
    expect(parsed.templates![0].name).toBe("Sprint Planning");
    expect(parsed.templates![0].tasks).toHaveLength(2);
    expect(parsed.templates![0].tasks[0].title).toBe("Review backlog");
    expect(parsed.templates![0].tasks[0].priority).toBe("high");
    expect(parsed.templates![1].name).toBe("Morning Routine");
  });

  it("handles empty templates list", () => {
    const state = baseState({ templates: [] });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);
    expect(parsed.templates).toBeDefined();
    expect(parsed.templates!.length).toBe(0);
  });
});

// ---- Preferences ----

describe("preferences serialization", () => {
  it("round-trips preferences through markdown", () => {
    const state = baseState({
      preferences: {
        notificationSound: "bell",
        obsidianVaultPath: "/home/user/vault",
        obsidianAutoSync: true,
      },
    });

    const md = stateToMarkdown(state);
    expect(md).toContain("## Preferences");
    expect(md).toContain("bell");
    expect(md).toContain("/home/user/vault");

    const parsed = markdownToState(md);
    expect(parsed.preferences).toBeDefined();
    expect(parsed.preferences!.notificationSound).toBe("bell");
    expect(parsed.preferences!.obsidianVaultPath).toBe("/home/user/vault");
    expect(parsed.preferences!.obsidianAutoSync).toBe(true);
  });

  it("returns defaults when preferences section is missing", () => {
    const md = `# Focus Assist Data

## Settings

- **Focus Duration:** 25 min
- **Short Break:** 5 min
- **Long Break:** 15 min
- **Sessions Before Long Break:** 4
- **Current Streak:** 0 days

## Tasks

_No tasks yet._

## Pomodoros

_No pomodoros yet._

## Daily Stats

_No stats yet._
`;
    const parsed = markdownToState(md);
    expect(parsed.preferences).toBeDefined();
    expect(parsed.preferences!.notificationSound).toBe(
      DEFAULT_PREFERENCES.notificationSound
    );
  });
});

// ---- LinkedTaskId on Pomodoros ----

describe("linkedTaskId serialization", () => {
  it("round-trips pomodoros with linkedTaskId", () => {
    const state = baseState({
      pomodoros: [
        {
          id: "p1",
          title: "Focus on feature",
          duration: 25,
          elapsed: 0,
          status: "idle",
          createdAt: "2026-02-20T10:00:00Z",
          linkedTaskId: "t1",
        },
        {
          id: "p2",
          title: "Unlinked session",
          duration: 25,
          elapsed: 0,
          status: "idle",
          createdAt: "2026-02-20T11:00:00Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    expect(md).toContain("LinkedTaskId");
    expect(md).toContain("t1");

    const parsed = markdownToState(md);
    expect(parsed.pomodoros).toHaveLength(2);
    expect(parsed.pomodoros[0].linkedTaskId).toBe("t1");
    expect(parsed.pomodoros[1].linkedTaskId).toBeUndefined();
  });
});

// ---- Data Integrity ----

describe("checkDataIntegrity", () => {
  it("returns ok for valid data", async () => {
    // This test relies on the data file existing or being empty
    // The function should handle missing files gracefully
    const result = await checkDataIntegrity();
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("issues");
    expect(result).toHaveProperty("fixed");
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.fixed)).toBe(true);
  });
});

// ---- Complex round-trip ----

describe("full V1.2 round-trip", () => {
  it("preserves all V1.2 fields through serialize/deserialize", () => {
    const state = baseState({
      tasks: [
        {
          id: "t1",
          title: "Parent task",
          priority: "high",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00Z",
          category: "work",
          energy: "high",
          recurrence: "weekly",
          subtasks: [
            { id: "s1", title: "Sub A", done: true },
            { id: "s2", title: "Sub B", done: false },
          ],
        },
      ],
      pomodoros: [
        {
          id: "p1",
          title: "Deep work",
          duration: 50,
          elapsed: 600,
          status: "running",
          createdAt: "2026-02-20T10:00:00Z",
          startedAt: "2026-02-20T10:05:00Z",
          accumulatedSeconds: 300,
          linkedTaskId: "t1",
        },
      ],
      templates: [
        {
          id: "tpl1",
          name: "Code Review",
          tasks: [
            { title: "Read PR", priority: "high" },
            { title: "Leave comments", priority: "medium" },
          ],
          createdAt: "2026-02-20T10:00:00Z",
        },
      ],
      preferences: {
        notificationSound: "digital-ping",
        obsidianVaultPath: "/vault",
        obsidianAutoSync: false,
      },
      dailyStats: [
        {
          date: "2026-02-20",
          tasksCompleted: 5,
          focusMinutes: 120,
          pomodorosCompleted: 4,
        },
      ],
      currentStreak: 7,
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    // Tasks + subtasks
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].subtasks).toHaveLength(2);
    expect(parsed.tasks[0].subtasks![0].done).toBe(true);
    expect(parsed.tasks[0].recurrence).toBe("weekly");

    // Pomodoros + linkedTaskId
    expect(parsed.pomodoros).toHaveLength(1);
    expect(parsed.pomodoros[0].linkedTaskId).toBe("t1");
    expect(parsed.pomodoros[0].accumulatedSeconds).toBe(300);

    // Templates
    expect(parsed.templates).toHaveLength(1);
    expect(parsed.templates![0].name).toBe("Code Review");
    expect(parsed.templates![0].tasks).toHaveLength(2);

    // Preferences
    expect(parsed.preferences!.notificationSound).toBe("digital-ping");
    expect(parsed.preferences!.obsidianVaultPath).toBe("/vault");

    // Stats
    expect(parsed.dailyStats).toHaveLength(1);
    expect(parsed.currentStreak).toBe(7);
  });
});
