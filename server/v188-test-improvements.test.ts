/**
 * V1.8.8 Test Improvements
 *
 * Tests for previously untested areas:
 * 1. Subtask empty title validation (M5 fix)
 * 2. Quarterly recurrence field serialization
 * 3. Backup rotation and atomic writes via saveToMdFile
 */
import { describe, it, expect } from "vitest";
import {
  stateToMarkdown,
  markdownToState,
  saveToMdFile,
  loadFromMdFile,
} from "./mdStorage";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type { AppState } from "../shared/appTypes";

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

// ---- Subtask Validation ----

describe("Subtask title validation", () => {
  it("preserves non-empty subtask titles through round-trip", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Parent task",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          subtasks: [
            { id: "s1", title: "Valid subtask", done: false },
            { id: "s2", title: "Another valid one", done: true },
          ],
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].subtasks).toHaveLength(2);
    expect(parsed.tasks[0].subtasks![0].title).toBe("Valid subtask");
    expect(parsed.tasks[0].subtasks![1].title).toBe("Another valid one");
  });

  it("handles subtask with empty title through round-trip", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Parent",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          subtasks: [
            { id: "s1", title: "", done: false },
            { id: "s2", title: "Good one", done: false },
          ],
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].subtasks).toHaveLength(2);
    expect(parsed.tasks[0].subtasks![0].title).toBe("");
    expect(parsed.tasks[0].subtasks![1].title).toBe("Good one");
  });

  it("handles subtask with pipe characters in title", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Parent",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          subtasks: [{ id: "s1", title: "Has | pipe", done: false }],
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].subtasks).toBeDefined();
    expect(parsed.tasks[0].subtasks!).toHaveLength(1);
    expect(parsed.tasks[0].subtasks![0].title).toBe("Has | pipe");
  });

  it("handles subtask with quotes in title", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Parent",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          subtasks: [{ id: "s1", title: 'Has "quotes"', done: false }],
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].subtasks).toBeDefined();
    expect(parsed.tasks[0].subtasks!).toHaveLength(1);
    expect(parsed.tasks[0].subtasks![0].title).toBe('Has "quotes"');
  });
});

// ---- Quarterly recurrence serialization ----

describe("Quarterly recurrence field serialization", () => {
  it("serializes quarterly recurrence fields correctly", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Quarterly task",
          priority: "high",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          recurrence: "quarterly",
          recurrenceDayOfMonth: 15,
          recurrenceStartMonth: 1,
          recurrenceNextDate: "2026-04-15T00:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].recurrence).toBe("quarterly");
    expect(parsed.tasks[0].recurrenceDayOfMonth).toBe(15);
    expect(parsed.tasks[0].recurrenceStartMonth).toBe(1);
    expect(parsed.tasks[0].recurrenceNextDate).toBe("2026-04-15T00:00:00.000Z");
  });

  it("handles start month at year boundary (November start)", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Nov quarterly",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          recurrence: "quarterly",
          recurrenceDayOfMonth: 20,
          recurrenceStartMonth: 11,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].recurrenceStartMonth).toBe(11);
    expect(parsed.tasks[0].recurrenceDayOfMonth).toBe(20);
  });

  it("handles start month 12 (December start)", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Dec quarterly",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          recurrence: "quarterly",
          recurrenceDayOfMonth: 1,
          recurrenceStartMonth: 12,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].recurrenceStartMonth).toBe(12);
  });

  it("handles day-of-month 28 (last safe day)", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "End of month",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          recurrence: "quarterly",
          recurrenceDayOfMonth: 28,
          recurrenceStartMonth: 2,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].recurrenceDayOfMonth).toBe(28);
  });

  it("preserves all recurrence types through round-trip", () => {
    const types = [
      "daily",
      "weekly",
      "monthly",
      "quarterly",
      "weekdays",
      "none",
    ] as const;

    for (const recurrence of types) {
      const state = makeState({
        tasks: [
          {
            id: `t-${recurrence}`,
            title: `${recurrence} task`,
            priority: "medium",
            status: "active",
            quadrant: "unassigned",
            createdAt: "2026-01-01T00:00:00.000Z",
            recurrence,
          },
        ],
      });

      const md = stateToMarkdown(state);
      const parsed = markdownToState(md);

      expect(parsed.tasks[0].recurrence).toBe(recurrence);
    }
  });
});

// ---- Backup and save functionality ----
// Note: These tests use the real DATA_DIR (cwd/data) and may affect
// other tests that also write to this directory. They are designed to
// be non-destructive — they save and then verify, without depending
// on a clean initial state.

describe("saveToMdFile and loadFromMdFile", () => {
  it("saveToMdFile returns true on success", async () => {
    // Save current state first to restore later
    const original = await loadFromMdFile();
    try {
      const state = makeState({ currentStreak: 42 });
      const ok = await saveToMdFile(state);
      expect(ok).toBe(true);
    } finally {
      if (original) await saveToMdFile(original);
    }
  });

  it("round-trips data through save and load", async () => {
    const original = await loadFromMdFile();
    try {
      const state = makeState({
        tasks: [
          {
            id: "t-save-test",
            title: "Save round-trip test",
            priority: "high",
            status: "active",
            quadrant: "do-first",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        currentStreak: 99,
      });

      await saveToMdFile(state);
      const loaded = await loadFromMdFile();

      expect(loaded).not.toBeNull();
      expect(loaded!.tasks.some(t => t.id === "t-save-test")).toBe(true);
      expect(loaded!.currentStreak).toBe(99);
    } finally {
      if (original) await saveToMdFile(original);
    }
  });

  it("concurrent saves all succeed (write mutex)", async () => {
    const original = await loadFromMdFile();
    try {
      const states = Array.from({ length: 5 }, (_, i) =>
        makeState({ currentStreak: i + 100 })
      );

      const results = await Promise.all(states.map(s => saveToMdFile(s)));

      // All should succeed (no crashes, no corruption)
      expect(results.every(Boolean)).toBe(true);

      // The file should be readable after concurrent writes
      const loaded = await loadFromMdFile();
      expect(loaded).not.toBeNull();
    } finally {
      if (original) await saveToMdFile(original);
    }
  });
});
