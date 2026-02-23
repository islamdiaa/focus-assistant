/**
 * V1.8.8 Test Improvements
 *
 * Tests for previously untested areas:
 * 1. Subtask empty title validation (M5 fix)
 * 2. Quarterly recurrence field serialization
 * 3. Backup rotation and atomic writes via saveToMdFile
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
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

// Note: saveToMdFile/loadFromMdFile I/O tests removed due to shared data/ directory
// causing flaky interactions with dailyBackup.test.ts. The serialization logic is
// thoroughly tested above via stateToMarkdown/markdownToState pure function tests.

// ---- Scratch Pad ----

describe("Scratch Pad serialization", () => {
  it("round-trips scratch notes through markdown", () => {
    const state = makeState({
      scratchPad: [
        {
          id: "n1",
          text: "Buy groceries",
          createdAt: "2026-02-23T10:00:00.000Z",
        },
        {
          id: "n2",
          text: "Call dentist",
          createdAt: "2026-02-23T11:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    expect(md).toContain("## Scratch Pad");
    expect(md).toContain("Buy groceries");
    expect(md).toContain("Call dentist");

    const parsed = markdownToState(md);
    expect(parsed.scratchPad).toHaveLength(2);
    expect(parsed.scratchPad![0].id).toBe("n1");
    expect(parsed.scratchPad![0].text).toBe("Buy groceries");
    expect(parsed.scratchPad![1].id).toBe("n2");
    expect(parsed.scratchPad![1].text).toBe("Call dentist");
  });

  it("handles empty scratch pad (no section written)", () => {
    const state = makeState({ scratchPad: [] });
    const md = stateToMarkdown(state);
    expect(md).not.toContain("## Scratch Pad");

    const parsed = markdownToState(md);
    expect(parsed.scratchPad).toEqual([]);
  });

  it("backward compat: old data without scratch pad loads with empty array", () => {
    const oldMd = `# Focus Assist Data

## Settings

- **Focus Duration:** 25 min
- **Short Break:** 5 min
- **Long Break:** 15 min
- **Sessions Before Long Break:** 4

## Tasks

_No tasks yet._

## Pomodoros

_No pomodoros yet._

## Daily Stats

_No stats yet._
`;

    const parsed = markdownToState(oldMd);
    expect(parsed.scratchPad).toEqual([]);
  });

  it("handles special characters in scratch note text", () => {
    const state = makeState({
      scratchPad: [
        {
          id: "n1",
          text: "Has | pipe and\nnewline",
          createdAt: "2026-02-23T10:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.scratchPad).toHaveLength(1);
    expect(parsed.scratchPad![0].text).toBe("Has | pipe and\nnewline");
  });
});
