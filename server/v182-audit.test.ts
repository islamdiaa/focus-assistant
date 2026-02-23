/**
 * V1.8.2 Audit Tests — Focus Mode, Timer, Version
 * Tests for bugs found during Layer 3 UI audit
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type { AppState, Pomodoro } from "../shared/appTypes";

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
    ...overrides,
  };
}

describe("Timer: getEffectiveElapsed handles null values", () => {
  // Reproduces the TS error where startedAt could be null from Zod schema
  it("serializes pomodoros with null startedAt correctly", () => {
    const pomodoros: Pomodoro[] = [
      {
        id: "p1",
        title: "Test Pomodoro",
        duration: 25,
        elapsed: 0,
        status: "idle",
        createdAt: "2026-02-20T10:00:00.000Z",
        startedAt: null as any,
        accumulatedSeconds: null as any,
      },
    ];

    const state = makeState({ pomodoros });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.pomodoros).toHaveLength(1);
    expect(parsed.pomodoros[0].id).toBe("p1");
    expect(parsed.pomodoros[0].status).toBe("idle");
  });

  it("serializes pomodoros with undefined startedAt correctly", () => {
    const pomodoros: Pomodoro[] = [
      {
        id: "p2",
        title: "Running Pomodoro",
        duration: 25,
        elapsed: 120,
        status: "running",
        createdAt: "2026-02-20T10:00:00.000Z",
        startedAt: "2026-02-20T10:05:00.000Z",
        accumulatedSeconds: 60,
      },
    ];

    const state = makeState({ pomodoros });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.pomodoros).toHaveLength(1);
    expect(parsed.pomodoros[0].startedAt).toBe("2026-02-20T10:05:00.000Z");
    expect(parsed.pomodoros[0].accumulatedSeconds).toBe(60);
  });
});

describe("Pomodoro with linked tasks round-trip", () => {
  it("preserves linkedTasks through serialization", () => {
    const pomodoros: Pomodoro[] = [
      {
        id: "p3",
        title: "Multi-task Pomodoro",
        duration: 25,
        elapsed: 0,
        status: "idle",
        createdAt: "2026-02-20T10:00:00.000Z",
        linkedTasks: [
          { taskId: "t1", subtaskId: undefined },
          { taskId: "t2", subtaskId: "s1" },
        ],
      },
    ];

    const state = makeState({ pomodoros });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.pomodoros).toHaveLength(1);
    expect(parsed.pomodoros[0].linkedTasks).toBeDefined();
    expect(parsed.pomodoros[0].linkedTasks!.length).toBe(2);
  });
});

describe("State integrity after round-trip", () => {
  it("preserves reminders through serialization", () => {
    const state = makeState({
      reminders: [
        {
          id: "rem1",
          title: "Test Reminder",
          description: "A test reminder",
          date: "2026-03-01",
          time: "09:00",
          recurrence: "none",
          category: "other",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.reminders).toBeDefined();
    expect(parsed.reminders!).toHaveLength(1);
    expect(parsed.reminders![0].title).toBe("Test Reminder");
    expect(parsed.reminders![0].date).toBe("2026-03-01");
    expect(parsed.reminders![0].category).toBe("other");
  });
});
