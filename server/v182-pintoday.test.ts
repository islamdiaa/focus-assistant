/**
 * V1.8.2 Pin-to-Today Tests — pinnedToday field serialization and edge cases
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import {
  DEFAULT_SETTINGS,
  DEFAULT_PREFERENCES,
  appStateSchema,
} from "../shared/appTypes";
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
    ...overrides,
  };
}

describe("PIN_TO_TODAY — pinnedToday field", () => {
  it("pinnedToday field round-trips through markdown serialization", () => {
    const tasks: Task[] = [
      {
        id: "pin-1",
        title: "Pinned Task",
        priority: "high",
        status: "active",
        quadrant: "do-first",
        createdAt: "2026-02-20T10:00:00.000Z",
        pinnedToday: "2026-02-20",
      },
    ];

    const state = makeState({ tasks });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].pinnedToday).toBe("2026-02-20");
  });

  it("null pinnedToday does not break serialization", () => {
    const tasks: Task[] = [
      {
        id: "pin-2",
        title: "Unpinned Task",
        priority: "medium",
        status: "active",
        quadrant: "unassigned",
        createdAt: "2026-02-20T10:00:00.000Z",
        pinnedToday: null,
      },
    ];

    const state = makeState({ tasks });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].pinnedToday).toBeFalsy();
  });

  it("undefined pinnedToday (legacy tasks) round-trips safely", () => {
    const tasks: Task[] = [
      {
        id: "pin-3",
        title: "Legacy Task",
        priority: "low",
        status: "active",
        quadrant: "schedule",
        createdAt: "2026-02-20T10:00:00.000Z",
        // no pinnedToday field at all
      },
    ];

    const state = makeState({ tasks });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    // Should be undefined or null, not a truthy value
    expect(parsed.tasks[0].pinnedToday).toBeFalsy();
  });

  it("pinnedToday is accepted by Zod schema validation", () => {
    const state = makeState({
      tasks: [
        {
          id: "pin-zod-1",
          title: "Zod Test",
          priority: "urgent",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00.000Z",
          pinnedToday: "2026-02-20",
        },
      ],
    });

    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("state with null pinnedToday passes Zod validation", () => {
    const state = makeState({
      tasks: [
        {
          id: "pin-zod-2",
          title: "Null Pin Test",
          priority: "medium",
          status: "active",
          quadrant: "unassigned",
          createdAt: "2026-02-20T10:00:00.000Z",
          pinnedToday: null,
        },
      ],
    });

    const result = appStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });
});

describe("PIN_TO_TODAY — completion clears pin", () => {
  it("simulates TOGGLE_TASK clearing pinnedToday on completion", () => {
    const task: Task = {
      id: "pin-toggle-1",
      title: "Complete Me",
      priority: "high",
      status: "active",
      quadrant: "do-first",
      createdAt: "2026-02-20T10:00:00.000Z",
      pinnedToday: "2026-02-20",
    };

    // Simulate what TOGGLE_TASK does
    const completed = {
      ...task,
      status: "done" as const,
      completedAt: new Date().toISOString(),
      pinnedToday: null, // Should be cleared on completion
    };

    const state = makeState({ tasks: [completed] });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].status).toBe("done");
    expect(parsed.tasks[0].pinnedToday).toBeFalsy();
  });
});
