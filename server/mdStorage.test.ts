import { describe, expect, it } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import type { AppState } from "../shared/appTypes";
import { DEFAULT_SETTINGS } from "../shared/appTypes";

const sampleState: AppState = {
  tasks: [
    {
      id: "task-1",
      title: "Review Q1 OKRs",
      description: "Check all team OKRs",
      priority: "high",
      status: "active",
      dueDate: "2026-03-01",
      category: "work",
      energy: "high",
      quadrant: "do-first",
      createdAt: "2026-02-20T10:00:00.000Z",
    },
    {
      id: "task-2",
      title: "Buy groceries",
      priority: "low",
      status: "done",
      quadrant: "unassigned",
      createdAt: "2026-02-19T08:00:00.000Z",
      completedAt: "2026-02-19T12:00:00.000Z",
    },
  ],
  pomodoros: [
    {
      id: "pom-1",
      title: "Deep work session",
      duration: 25,
      elapsed: 1500,
      status: "completed",
      createdAt: "2026-02-20T10:00:00.000Z",
      completedAt: "2026-02-20T10:25:00.000Z",
    },
  ],
  settings: {
    focusDuration: 50,
    shortBreak: 10,
    longBreak: 20,
    sessionsBeforeLongBreak: 3,
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
};

describe("mdStorage", () => {
  it("round-trips state through Markdown serialization", () => {
    const md = stateToMarkdown(sampleState);
    const parsed = markdownToState(md);

    // Tasks
    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.tasks[0].id).toBe("task-1");
    expect(parsed.tasks[0].title).toBe("Review Q1 OKRs");
    expect(parsed.tasks[0].priority).toBe("high");
    expect(parsed.tasks[0].category).toBe("work");
    expect(parsed.tasks[0].energy).toBe("high");
    expect(parsed.tasks[0].quadrant).toBe("do-first");
    expect(parsed.tasks[1].status).toBe("done");
    expect(parsed.tasks[1].completedAt).toBe("2026-02-19T12:00:00.000Z");

    // Pomodoros
    expect(parsed.pomodoros).toHaveLength(1);
    expect(parsed.pomodoros[0].title).toBe("Deep work session");
    expect(parsed.pomodoros[0].duration).toBe(25);
    expect(parsed.pomodoros[0].status).toBe("completed");

    // Settings
    expect(parsed.settings.focusDuration).toBe(50);
    expect(parsed.settings.shortBreak).toBe(10);
    expect(parsed.settings.longBreak).toBe(20);
    expect(parsed.settings.sessionsBeforeLongBreak).toBe(3);

    // Stats
    expect(parsed.dailyStats).toHaveLength(1);
    expect(parsed.dailyStats[0].tasksCompleted).toBe(5);
    expect(parsed.dailyStats[0].focusMinutes).toBe(120);

    // Streak
    expect(parsed.currentStreak).toBe(7);
  });

  it("handles empty state", () => {
    const emptyState: AppState = {
      tasks: [],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const md = stateToMarkdown(emptyState);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(0);
    expect(parsed.pomodoros).toHaveLength(0);
    expect(parsed.dailyStats).toHaveLength(0);
    expect(parsed.currentStreak).toBe(0);
    expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("handles pipe characters in task titles", () => {
    const stateWithPipes: AppState = {
      tasks: [{
        id: "t1",
        title: "Option A | Option B",
        description: "Choose one | or the other",
        priority: "medium",
        status: "active",
        quadrant: "unassigned",
        createdAt: "2026-02-20T10:00:00.000Z",
      }],
      pomodoros: [],
      settings: { ...DEFAULT_SETTINGS },
      dailyStats: [],
      currentStreak: 0,
    };

    const md = stateToMarkdown(stateWithPipes);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].title).toBe("Option A | Option B");
    expect(parsed.tasks[0].description).toBe("Choose one | or the other");
  });

  it("generates valid Markdown with headers", () => {
    const md = stateToMarkdown(sampleState);

    expect(md).toContain("# Focus Assist Data");
    expect(md).toContain("## Settings");
    expect(md).toContain("## Tasks");
    expect(md).toContain("## Pomodoros");
    expect(md).toContain("## Daily Stats");
    expect(md).toContain("**Focus Duration:** 50 min");
    expect(md).toContain("**Current Streak:** 7 days");
  });
});
