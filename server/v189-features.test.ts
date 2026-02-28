/**
 * V1.8.9 Feature Tests
 *
 * Tests for 6 new features:
 * 1. isFocusGoal field on tasks (focus goals for today)
 * 2. estimatedMinutes field on tasks (time estimates)
 * 3. autoCompleteParent preference (auto-complete parent when subtasks done)
 * 4. availableHoursPerDay preference (daily time budget)
 * 5. Backward compatibility with older markdown formats
 * 6. Combined features round-trip
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type { AppState, Task } from "../shared/appTypes";

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
    scratchPad: [],
    ...overrides,
  };
}

// ---- Focus Goals ----

describe("Focus Goals", () => {
  it("isFocusGoal persists through markdown round-trip", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Ship feature",
          priority: "high",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-28T09:00:00.000Z",
          isFocusGoal: true,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].isFocusGoal).toBe(true);
  });

  it("isFocusGoal=false/undefined survives round-trip as undefined", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Regular task",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-28T09:00:00.000Z",
        },
        {
          id: "t2",
          title: "Explicitly false",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-28T09:00:00.000Z",
          isFocusGoal: false,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    // Both undefined and false serialize as "" and parse back as undefined
    expect(parsed.tasks[0].isFocusGoal).toBeUndefined();
    expect(parsed.tasks[1].isFocusGoal).toBeUndefined();
  });
});

// ---- Task Duration Estimates ----

describe("Task Duration Estimates", () => {
  it("estimatedMinutes persists through round-trip", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Write tests",
          priority: "medium",
          status: "active",
          quadrant: "schedule",
          createdAt: "2026-02-28T09:00:00.000Z",
          estimatedMinutes: 30,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].estimatedMinutes).toBe(30);
  });

  it("estimatedMinutes handles large values", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Full day project",
          priority: "high",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-28T09:00:00.000Z",
          estimatedMinutes: 480,
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].estimatedMinutes).toBe(480);
  });

  it("missing estimatedMinutes round-trips as undefined", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "No estimate",
          priority: "low",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-28T09:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].estimatedMinutes).toBeUndefined();
  });
});

// ---- Auto-Complete Parent Preference ----

describe("Auto-Complete Parent Preference", () => {
  it("autoCompleteParent=true persists through round-trip", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_PREFERENCES,
        autoCompleteParent: true,
      },
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.preferences!.autoCompleteParent).toBe(true);
  });

  it("autoCompleteParent=false persists through round-trip", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_PREFERENCES,
        autoCompleteParent: false,
      },
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.preferences!.autoCompleteParent).toBe(false);
  });
});

// ---- Available Hours Per Day Preference ----

describe("Available Hours Per Day Preference", () => {
  it("availableHoursPerDay persists through round-trip", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_PREFERENCES,
        availableHoursPerDay: 6,
      },
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.preferences!.availableHoursPerDay).toBe(6);
  });

  it("fractional hours persist through round-trip", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_PREFERENCES,
        availableHoursPerDay: 7.5,
      },
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.preferences!.availableHoursPerDay).toBe(7.5);
  });
});

// ---- Backward Compatibility ----

describe("Backward Compatibility", () => {
  it("tasks without new fields parse correctly", () => {
    // Serialize a task with the new fields, then strip them from the markdown
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Old task",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-28T09:00:00.000Z",
          isFocusGoal: true,
          estimatedMinutes: 45,
        },
      ],
    });

    const md = stateToMarkdown(state);

    // Simulate old format by removing the IsFocusGoal and EstimatedMinutes columns
    // The old format had fewer columns — we truncate each data row to 20 columns (indices 0-19)
    const lines = md.split("\n");
    const oldLines = lines.map(line => {
      if (!line.startsWith("|")) return line;
      // Skip separator lines
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) {
        // Rebuild separator with 19 columns (old format: up to StatusChangedAt, index 18)
        const cols = line.split("|").filter(c => c.trim() !== "");
        if (cols.length > 19) {
          return "| " + cols.slice(0, 19).join(" | ") + " |";
        }
        return line;
      }
      // Data rows: strip the last two columns (IsFocusGoal, EstimatedMinutes)
      const inner = line.trim().slice(1, -1); // remove outer pipes
      const cells: string[] = [];
      let current = "";
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === "\\" && i + 1 < inner.length && inner[i + 1] === "|") {
          current += "\\|";
          i++;
        } else if (inner[i] === "|") {
          cells.push(current);
          current = "";
        } else {
          current += inner[i];
        }
      }
      cells.push(current);
      // Header row has "IsFocusGoal" and "EstimatedMinutes" — only truncate task table rows
      if (cells.length > 19 && cells[0].trim() !== "") {
        return "| " + cells.slice(0, 19).join(" | ") + " |";
      }
      return line;
    });

    const oldMd = oldLines.join("\n");
    const parsed = markdownToState(oldMd);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].id).toBe("t1");
    expect(parsed.tasks[0].title).toBe("Old task");
    expect(parsed.tasks[0].isFocusGoal).toBeUndefined();
    expect(parsed.tasks[0].estimatedMinutes).toBeUndefined();
  });

  it("preferences without new fields parse correctly", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_PREFERENCES,
        autoCompleteParent: true,
        availableHoursPerDay: 6,
      },
    });

    const md = stateToMarkdown(state);

    // Strip the new preference lines to simulate old format
    const oldMd = md
      .split("\n")
      .filter(
        line =>
          !line.includes("**Auto Complete Parent:**") &&
          !line.includes("**Available Hours Per Day:**")
      )
      .join("\n");

    const parsed = markdownToState(oldMd);

    // Without those lines, the parser never sets them, so they remain at defaults
    // The parser initializes preferences with DEFAULT_PREFERENCES which has
    // autoCompleteParent: false and availableHoursPerDay: 8
    expect(parsed.preferences).toBeDefined();
    expect(parsed.preferences!.autoCompleteParent).toBe(false);
    expect(parsed.preferences!.availableHoursPerDay).toBe(8);
  });
});

// ---- Combined Features ----

describe("Combined features round-trip", () => {
  it("task with all new fields survives round-trip", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Focus goal with estimate",
          priority: "high",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-28T09:00:00.000Z",
          isFocusGoal: true,
          estimatedMinutes: 45,
        },
        {
          id: "t2",
          title: "Regular task with estimate",
          priority: "medium",
          status: "active",
          quadrant: "schedule",
          createdAt: "2026-02-28T10:00:00.000Z",
          estimatedMinutes: 120,
        },
        {
          id: "t3",
          title: "Plain task",
          priority: "low",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-28T11:00:00.000Z",
        },
      ],
      preferences: {
        ...DEFAULT_PREFERENCES,
        autoCompleteParent: true,
        availableHoursPerDay: 6,
      },
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    // Task 1: focus goal with estimate
    expect(parsed.tasks[0].isFocusGoal).toBe(true);
    expect(parsed.tasks[0].estimatedMinutes).toBe(45);

    // Task 2: regular task with estimate only
    expect(parsed.tasks[1].isFocusGoal).toBeUndefined();
    expect(parsed.tasks[1].estimatedMinutes).toBe(120);

    // Task 3: no new fields
    expect(parsed.tasks[2].isFocusGoal).toBeUndefined();
    expect(parsed.tasks[2].estimatedMinutes).toBeUndefined();

    // Preferences
    expect(parsed.preferences!.autoCompleteParent).toBe(true);
    expect(parsed.preferences!.availableHoursPerDay).toBe(6);
  });
});
