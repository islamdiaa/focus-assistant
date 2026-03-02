/**
 * Canvas feature — serialization round-trip tests
 *
 * Validates:
 * 1. Schema validation for canvas entries
 * 2. Markdown round-trip (serialize -> parse -> compare)
 * 3. Empty canvas handling
 * 4. Backward compatibility (no Canvas section in markdown)
 * 5. Content escaping (pipes, newlines)
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import { canvasEntrySchema } from "../shared/appTypes";
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
    scratchPad: [],
    canvas: [],
    ...overrides,
  };
}

// ---- Schema validation ----

describe("canvasEntrySchema", () => {
  it("accepts a valid canvas entry", () => {
    const valid = {
      id: "ce-1",
      date: "2026-03-02",
      content: '{"type":"doc","content":[]}',
      wordCount: 42,
      updatedAt: "2026-03-02T10:00:00.000Z",
      createdAt: "2026-03-02T09:00:00.000Z",
    };

    const result = canvasEntrySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts entry with null wordCount", () => {
    const valid = {
      id: "ce-2",
      date: "2026-03-02",
      content: "",
      wordCount: null,
      updatedAt: "2026-03-02T10:00:00.000Z",
      createdAt: "2026-03-02T09:00:00.000Z",
    };

    const result = canvasEntrySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts entry without wordCount (optional)", () => {
    const valid = {
      id: "ce-3",
      date: "2026-03-02",
      content: "Hello world",
      updatedAt: "2026-03-02T10:00:00.000Z",
      createdAt: "2026-03-02T09:00:00.000Z",
    };

    const result = canvasEntrySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects entry missing required id field", () => {
    const invalid = {
      date: "2026-03-02",
      content: "test",
      updatedAt: "2026-03-02T10:00:00.000Z",
      createdAt: "2026-03-02T09:00:00.000Z",
    };

    const result = canvasEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects entry missing required date field", () => {
    const invalid = {
      id: "ce-4",
      content: "test",
      updatedAt: "2026-03-02T10:00:00.000Z",
      createdAt: "2026-03-02T09:00:00.000Z",
    };

    const result = canvasEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects entry with non-string content", () => {
    const invalid = {
      id: "ce-5",
      date: "2026-03-02",
      content: 12345,
      updatedAt: "2026-03-02T10:00:00.000Z",
      createdAt: "2026-03-02T09:00:00.000Z",
    };

    const result = canvasEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects entry with non-number wordCount", () => {
    const invalid = {
      id: "ce-6",
      date: "2026-03-02",
      content: "test",
      wordCount: "forty-two",
      updatedAt: "2026-03-02T10:00:00.000Z",
      createdAt: "2026-03-02T09:00:00.000Z",
    };

    const result = canvasEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ---- Serialization round-trip ----

describe("Canvas serialization round-trip", () => {
  it("canvas entries survive markdown round-trip", () => {
    const state = makeState({
      canvas: [
        {
          id: "ce-1",
          date: "2026-03-02",
          content:
            '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]}',
          wordCount: 2,
          updatedAt: "2026-03-02T10:00:00.000Z",
          createdAt: "2026-03-02T09:00:00.000Z",
        },
        {
          id: "ce-2",
          date: "2026-03-01",
          content: "Plain text entry for yesterday",
          wordCount: 5,
          updatedAt: "2026-03-01T20:00:00.000Z",
          createdAt: "2026-03-01T08:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.canvas).toHaveLength(2);
    expect(parsed.canvas![0].id).toBe("ce-1");
    expect(parsed.canvas![0].date).toBe("2026-03-02");
    expect(parsed.canvas![0].content).toContain("Hello world");
    expect(parsed.canvas![0].wordCount).toBe(2);
    expect(parsed.canvas![0].updatedAt).toBe("2026-03-02T10:00:00.000Z");
    expect(parsed.canvas![0].createdAt).toBe("2026-03-02T09:00:00.000Z");

    expect(parsed.canvas![1].id).toBe("ce-2");
    expect(parsed.canvas![1].date).toBe("2026-03-01");
    expect(parsed.canvas![1].content).toBe("Plain text entry for yesterday");
    expect(parsed.canvas![1].wordCount).toBe(5);
  });

  it("canvas entry with null wordCount round-trips correctly", () => {
    const state = makeState({
      canvas: [
        {
          id: "ce-n",
          date: "2026-03-02",
          content: "Some content",
          wordCount: null,
          updatedAt: "2026-03-02T10:00:00.000Z",
          createdAt: "2026-03-02T09:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.canvas).toHaveLength(1);
    expect(parsed.canvas![0].wordCount).toBeNull();
  });
});

// ---- Empty canvas ----

describe("Empty canvas", () => {
  it("empty canvas array does not produce a Canvas section in markdown", () => {
    const state = makeState({ canvas: [] });
    const md = stateToMarkdown(state);

    expect(md).not.toContain("## Canvas");
  });

  it("state without canvas field serializes without Canvas section", () => {
    const state = makeState();
    // Remove the canvas key entirely to simulate old state shape
    delete (state as any).canvas;

    const md = stateToMarkdown(state);
    expect(md).not.toContain("## Canvas");
  });
});

// ---- Backward compatibility ----

describe("Backward compatibility", () => {
  it("markdown without Canvas section parses to canvas: []", () => {
    // Create state with no canvas, serialize, then parse
    const state = makeState({ canvas: [] });
    const md = stateToMarkdown(state);

    // Verify there is no Canvas section
    expect(md).not.toContain("## Canvas");

    const parsed = markdownToState(md);
    expect(parsed.canvas).toBeDefined();
    expect(parsed.canvas).toEqual([]);
  });

  it("old-format markdown (pre-canvas) parses cleanly", () => {
    // Minimal old-format markdown with just settings and streak
    const oldMd = `# Focus Assist Data

## Settings

**Focus Duration:** 25 min
**Short Break:** 5 min
**Long Break:** 15 min
**Sessions Before Long Break:** 4

**Current Streak:** 3 days

## Tasks

| ID | Title | Description | Priority | Status | DueDate | Category | Energy | Quadrant | CreatedAt | CompletedAt | ParentId | SubtaskIds | Recurrence | RecurrenceDayOfMonth | RecurrenceStartMonth | LastRecurrenceDate | PinnedToDate | StatusChangedAt | IsFocusGoal | EstimatedMinutes |
|----|-------|-------------|----------|--------|---------|----------|--------|----------|-----------|-------------|----------|------------|------------|----------------------|----------------------|--------------------|--------------|-----------------|-------------|------------------|

## Pomodoros

| ID | Title | Duration | Elapsed | Status | CreatedAt | CompletedAt | PomodoroLinks |
|----|-------|----------|---------|--------|-----------|-------------|---------------|

## Daily Stats

| Date | TasksCompleted | FocusMinutes | PomodorosCompleted |
|------|----------------|--------------|--------------------|
`;

    const parsed = markdownToState(oldMd);

    expect(parsed.canvas).toBeDefined();
    expect(parsed.canvas).toEqual([]);
    expect(parsed.settings.focusDuration).toBe(25);
    expect(parsed.currentStreak).toBe(3);
  });
});

// ---- Content escaping ----

describe("Content escaping", () => {
  it("canvas content with pipe characters survives round-trip", () => {
    const state = makeState({
      canvas: [
        {
          id: "ce-pipe",
          date: "2026-03-02",
          content: "Option A | Option B | Option C",
          wordCount: 6,
          updatedAt: "2026-03-02T10:00:00.000Z",
          createdAt: "2026-03-02T09:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.canvas).toHaveLength(1);
    expect(parsed.canvas![0].content).toBe("Option A | Option B | Option C");
  });

  it("canvas content with newlines survives round-trip", () => {
    const state = makeState({
      canvas: [
        {
          id: "ce-nl",
          date: "2026-03-02",
          content: "Line one\nLine two\nLine three",
          wordCount: 6,
          updatedAt: "2026-03-02T10:00:00.000Z",
          createdAt: "2026-03-02T09:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.canvas).toHaveLength(1);
    expect(parsed.canvas![0].content).toBe("Line one\nLine two\nLine three");
  });

  it("canvas content with pipes AND newlines survives round-trip", () => {
    const state = makeState({
      canvas: [
        {
          id: "ce-both",
          date: "2026-03-02",
          content: "Row 1 | Col A\nRow 2 | Col B",
          wordCount: 8,
          updatedAt: "2026-03-02T10:00:00.000Z",
          createdAt: "2026-03-02T09:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.canvas).toHaveLength(1);
    expect(parsed.canvas![0].content).toBe("Row 1 | Col A\nRow 2 | Col B");
  });

  it("canvas content with JSON containing pipe chars survives round-trip", () => {
    const jsonContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello | world" },
            { type: "text", text: "Pipes | everywhere | here" },
          ],
        },
      ],
    });

    const state = makeState({
      canvas: [
        {
          id: "ce-json",
          date: "2026-03-02",
          content: jsonContent,
          wordCount: 4,
          updatedAt: "2026-03-02T10:00:00.000Z",
          createdAt: "2026-03-02T09:00:00.000Z",
        },
      ],
    });

    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.canvas).toHaveLength(1);
    // The JSON string should survive the round-trip intact
    expect(parsed.canvas![0].content).toBe(jsonContent);
  });
});
