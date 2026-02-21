/**
 * V1.8.2 Feature Tests — Edit Reminder + Inline Matrix Task Editing
 * Tests for the two new features added in v1.8.2
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type { AppState, Task, Reminder } from "../shared/appTypes";

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

describe("Edit Reminder — UPDATE_REMINDER round-trip", () => {
  it("preserves updated reminder fields through serialization", () => {
    const reminders: Reminder[] = [
      {
        id: "rem-edit-1",
        title: "Original Title",
        description: "Original description",
        date: "2026-03-01",
        time: "09:00",
        recurrence: "none",
        category: "birthday",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ reminders });

    // Simulate UPDATE_REMINDER by applying the merge manually (same as reducer)
    const updatedReminders = state.reminders!.map(r =>
      r.id === "rem-edit-1"
        ? {
            ...r,
            title: "Updated Birthday",
            date: "2026-04-15",
            category: "event" as const,
            time: "14:30",
          }
        : r
    );
    const updatedState = makeState({ reminders: updatedReminders });

    const md = stateToMarkdown(updatedState);
    const parsed = markdownToState(md);

    expect(parsed.reminders).toBeDefined();
    expect(parsed.reminders!).toHaveLength(1);
    expect(parsed.reminders![0].title).toBe("Updated Birthday");
    expect(parsed.reminders![0].date).toBe("2026-04-15");
    expect(parsed.reminders![0].category).toBe("event");
    expect(parsed.reminders![0].time).toBe("14:30");
    expect(parsed.reminders![0].id).toBe("rem-edit-1");
  });

  it("preserves recurrence change through serialization", () => {
    const reminders: Reminder[] = [
      {
        id: "rem-recur-1",
        title: "Weekly Standup",
        date: "2026-03-01",
        recurrence: "weekly",
        category: "appointment",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ reminders });

    // Change from weekly to monthly
    const updatedReminders = state.reminders!.map(r =>
      r.id === "rem-recur-1" ? { ...r, recurrence: "monthly" as const } : r
    );
    const updatedState = makeState({ reminders: updatedReminders });

    const md = stateToMarkdown(updatedState);
    const parsed = markdownToState(md);

    expect(parsed.reminders![0].recurrence).toBe("monthly");
  });

  it("handles removing optional fields during edit", () => {
    const reminders: Reminder[] = [
      {
        id: "rem-optional-1",
        title: "Meeting",
        description: "With team",
        date: "2026-03-01",
        time: "10:00",
        recurrence: "none",
        category: "appointment",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ reminders });

    // Remove description and time
    const updatedReminders = state.reminders!.map(r =>
      r.id === "rem-optional-1"
        ? { ...r, description: undefined, time: undefined }
        : r
    );
    const updatedState = makeState({ reminders: updatedReminders });

    const md = stateToMarkdown(updatedState);
    const parsed = markdownToState(md);

    expect(parsed.reminders![0].title).toBe("Meeting");
    // After round-trip, undefined fields should not have values
    expect(parsed.reminders![0].description).toBeFalsy();
    expect(parsed.reminders![0].time).toBeFalsy();
  });
});

describe("Inline Matrix Task Editing — UPDATE_TASK round-trip", () => {
  it("preserves updated task title through serialization", () => {
    const tasks: Task[] = [
      {
        id: "task-matrix-1",
        title: "Original Task",
        priority: "medium",
        status: "active",
        quadrant: "do-first",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ tasks });

    // Simulate inline edit: change title
    const updatedTasks = state.tasks.map(t =>
      t.id === "task-matrix-1" ? { ...t, title: "Edited Task Title" } : t
    );
    const updatedState = makeState({ tasks: updatedTasks });

    const md = stateToMarkdown(updatedState);
    const parsed = markdownToState(md);

    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].title).toBe("Edited Task Title");
    expect(parsed.tasks[0].quadrant).toBe("do-first");
  });

  it("preserves updated priority through serialization", () => {
    const tasks: Task[] = [
      {
        id: "task-matrix-2",
        title: "Priority Task",
        priority: "low",
        status: "active",
        quadrant: "schedule",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ tasks });

    // Change priority from low to urgent
    const updatedTasks = state.tasks.map(t =>
      t.id === "task-matrix-2" ? { ...t, priority: "urgent" as const } : t
    );
    const updatedState = makeState({ tasks: updatedTasks });

    const md = stateToMarkdown(updatedState);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].priority).toBe("urgent");
  });

  it("preserves updated dueDate through serialization", () => {
    const tasks: Task[] = [
      {
        id: "task-matrix-3",
        title: "Due Date Task",
        priority: "high",
        status: "active",
        quadrant: "delegate",
        dueDate: "2026-03-01",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ tasks });

    // Change due date
    const updatedTasks = state.tasks.map(t =>
      t.id === "task-matrix-3" ? { ...t, dueDate: "2026-04-15" } : t
    );
    const updatedState = makeState({ tasks: updatedTasks });

    const md = stateToMarkdown(updatedState);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].dueDate).toBe("2026-04-15");
  });

  it("handles setting dueDate to null (clearing it)", () => {
    const tasks: Task[] = [
      {
        id: "task-matrix-4",
        title: "Clear Date Task",
        priority: "medium",
        status: "active",
        quadrant: "eliminate",
        dueDate: "2026-03-01",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ tasks });

    // Clear due date
    const updatedTasks = state.tasks.map(t =>
      t.id === "task-matrix-4" ? { ...t, dueDate: null } : t
    );
    const updatedState = makeState({ tasks: updatedTasks });

    const md = stateToMarkdown(updatedState);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].dueDate).toBeFalsy();
  });

  it("preserves quadrant assignment when editing other fields", () => {
    const tasks: Task[] = [
      {
        id: "task-matrix-5",
        title: "Quadrant Preserved",
        priority: "low",
        status: "active",
        quadrant: "do-first",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ tasks });

    // Edit title and priority but quadrant should stay
    const updatedTasks = state.tasks.map(t =>
      t.id === "task-matrix-5"
        ? { ...t, title: "New Title", priority: "high" as const }
        : t
    );
    const updatedState = makeState({ tasks: updatedTasks });

    const md = stateToMarkdown(updatedState);
    const parsed = markdownToState(md);

    expect(parsed.tasks[0].title).toBe("New Title");
    expect(parsed.tasks[0].priority).toBe("high");
    expect(parsed.tasks[0].quadrant).toBe("do-first");
  });
});
