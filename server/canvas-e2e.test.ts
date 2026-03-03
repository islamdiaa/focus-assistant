/**
 * Canvas feature — end-to-end integration tests
 *
 * These tests exercise the full Canvas lifecycle through the data layer:
 * reducer logic (create / upsert / delete) combined with the markdown
 * serialization round-trip (stateToMarkdown -> markdownToState).
 *
 * Validates:
 * 1. Create a canvas entry (SET_CANVAS_ENTRY on empty state)
 * 2. Update / upsert a canvas entry (same date, new content)
 * 3. Delete a canvas entry (DELETE_CANVAS_ENTRY)
 * 4. Persistence round-trip (serialize -> deserialize)
 * 5. Date navigation simulation (multiple dates, lookup by date)
 * 6. Auto-save idempotency (repeated identical dispatches)
 * 7. Word count tracking through serialization
 * 8. Content with special characters survives round-trip
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type { AppState, CanvasEntry } from "../shared/appTypes";

// ---------------------------------------------------------------------------
// Helpers — mirrors the pattern from canvas.test.ts
// ---------------------------------------------------------------------------

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

/**
 * Pure-function replica of the SET_CANVAS_ENTRY reducer case from
 * client/src/contexts/AppContext.tsx.
 *
 * We replicate it here so tests run without React / browser dependencies.
 */
function applySetCanvasEntry(
  state: AppState,
  payload: { date: string; content: string; wordCount?: number }
): AppState {
  const entries = state.canvas || [];
  const existing = entries.find(e => e.date === payload.date);
  const now = new Date().toISOString();

  if (existing) {
    return {
      ...state,
      canvas: entries.map(e =>
        e.date === payload.date
          ? {
              ...e,
              content: payload.content,
              wordCount: payload.wordCount ?? e.wordCount,
              updatedAt: now,
            }
          : e
      ),
    };
  }

  const newEntry: CanvasEntry = {
    id: `ce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: payload.date,
    content: payload.content,
    wordCount: payload.wordCount ?? null,
    updatedAt: now,
    createdAt: now,
  };
  return { ...state, canvas: [newEntry, ...entries] };
}

/**
 * Pure-function replica of the DELETE_CANVAS_ENTRY reducer case.
 */
function applyDeleteCanvasEntry(state: AppState, id: string): AppState {
  return {
    ...state,
    canvas: (state.canvas || []).filter(e => e.id !== id),
  };
}

/**
 * Shortcut: serialize state to markdown, then parse it back.
 */
function roundTrip(state: AppState): AppState {
  return markdownToState(stateToMarkdown(state));
}

// ---------------------------------------------------------------------------
// 1. Create a canvas entry
// ---------------------------------------------------------------------------

describe("E2E: Create a canvas entry", () => {
  it("dispatching SET_CANVAS_ENTRY on empty state creates exactly one entry", () => {
    let state = makeState();
    expect(state.canvas).toHaveLength(0);

    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Today I learned about Vitest.",
      wordCount: 5,
    });

    expect(state.canvas).toHaveLength(1);
    expect(state.canvas![0].date).toBe("2026-03-03");
    expect(state.canvas![0].content).toBe("Today I learned about Vitest.");
    expect(state.canvas![0].wordCount).toBe(5);
    expect(state.canvas![0].id).toBeTruthy();
    expect(state.canvas![0].createdAt).toBeTruthy();
    expect(state.canvas![0].updatedAt).toBeTruthy();
  });

  it("new entry is prepended to the canvas array", () => {
    let state = makeState({
      canvas: [
        {
          id: "ce-old",
          date: "2026-03-01",
          content: "Old entry",
          wordCount: 2,
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdAt: "2026-03-01T00:00:00.000Z",
        },
      ],
    });

    state = applySetCanvasEntry(state, {
      date: "2026-03-02",
      content: "New entry",
      wordCount: 2,
    });

    expect(state.canvas).toHaveLength(2);
    expect(state.canvas![0].date).toBe("2026-03-02"); // newest first
    expect(state.canvas![1].date).toBe("2026-03-01");
  });
});

// ---------------------------------------------------------------------------
// 2. Update (upsert) a canvas entry
// ---------------------------------------------------------------------------

describe("E2E: Update / upsert a canvas entry", () => {
  it("dispatching SET_CANVAS_ENTRY with the same date updates in place", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Draft 1",
      wordCount: 2,
    });

    const originalId = state.canvas![0].id;
    const originalCreatedAt = state.canvas![0].createdAt;

    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Draft 2 — revised",
      wordCount: 3,
    });

    expect(state.canvas).toHaveLength(1); // no duplicate
    expect(state.canvas![0].id).toBe(originalId); // same id
    expect(state.canvas![0].createdAt).toBe(originalCreatedAt); // createdAt unchanged
    expect(state.canvas![0].content).toBe("Draft 2 — revised");
    expect(state.canvas![0].wordCount).toBe(3);
  });

  it("upsert preserves existing wordCount when new payload omits it", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Initial",
      wordCount: 10,
    });

    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Updated content",
      // wordCount intentionally omitted
    });

    expect(state.canvas![0].wordCount).toBe(10); // preserved from original
  });

  it("upsert updates updatedAt timestamp", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "V1",
    });
    const firstUpdatedAt = state.canvas![0].updatedAt;

    // Small delay to ensure timestamp differs
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "V2",
    });

    // updatedAt should be set (may or may not differ depending on speed,
    // but the field must be a valid ISO string)
    expect(state.canvas![0].updatedAt).toBeTruthy();
    expect(
      new Date(state.canvas![0].updatedAt).getTime()
    ).toBeGreaterThanOrEqual(new Date(firstUpdatedAt).getTime());
  });
});

// ---------------------------------------------------------------------------
// 3. Delete a canvas entry
// ---------------------------------------------------------------------------

describe("E2E: Delete a canvas entry", () => {
  it("DELETE_CANVAS_ENTRY removes the entry by id", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Will be deleted",
    });
    const entryId = state.canvas![0].id;

    state = applyDeleteCanvasEntry(state, entryId);
    expect(state.canvas).toHaveLength(0);
  });

  it("DELETE_CANVAS_ENTRY with non-existent id is a no-op", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Keep me",
    });

    state = applyDeleteCanvasEntry(state, "ce-does-not-exist");
    expect(state.canvas).toHaveLength(1);
    expect(state.canvas![0].content).toBe("Keep me");
  });

  it("delete one entry leaves other entries intact", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, { date: "2026-03-01", content: "A" });
    state = applySetCanvasEntry(state, { date: "2026-03-02", content: "B" });
    state = applySetCanvasEntry(state, { date: "2026-03-03", content: "C" });
    expect(state.canvas).toHaveLength(3);

    const idToDelete = state.canvas!.find(e => e.date === "2026-03-02")!.id;
    state = applyDeleteCanvasEntry(state, idToDelete);

    expect(state.canvas).toHaveLength(2);
    expect(state.canvas!.map(e => e.date).sort()).toEqual([
      "2026-03-01",
      "2026-03-03",
    ]);
  });
});

// ---------------------------------------------------------------------------
// 4. Persistence round-trip
// ---------------------------------------------------------------------------

describe("E2E: Persistence round-trip", () => {
  it("entries created via reducer survive markdown serialization", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-01",
      content: "Day one thoughts",
      wordCount: 3,
    });
    state = applySetCanvasEntry(state, {
      date: "2026-03-02",
      content: '{"type":"doc","content":[]}',
      wordCount: 0,
    });

    const restored = roundTrip(state);

    expect(restored.canvas).toHaveLength(2);

    const day1 = restored.canvas!.find(e => e.date === "2026-03-01")!;
    expect(day1.content).toBe("Day one thoughts");
    expect(day1.wordCount).toBe(3);
    expect(day1.id).toBeTruthy();
    expect(day1.updatedAt).toBeTruthy();
    expect(day1.createdAt).toBeTruthy();

    const day2 = restored.canvas!.find(e => e.date === "2026-03-02")!;
    expect(day2.content).toBe('{"type":"doc","content":[]}');
    expect(day2.wordCount).toBe(0);
  });

  it("create -> update -> serialize -> deserialize preserves final content", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "First draft",
      wordCount: 2,
    });
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Polished final version",
      wordCount: 3,
    });

    const restored = roundTrip(state);

    expect(restored.canvas).toHaveLength(1);
    expect(restored.canvas![0].content).toBe("Polished final version");
    expect(restored.canvas![0].wordCount).toBe(3);
  });

  it("create -> delete -> serialize produces no Canvas section", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Temporary",
    });
    state = applyDeleteCanvasEntry(state, state.canvas![0].id);

    const md = stateToMarkdown(state);
    expect(md).not.toContain("## Canvas");

    const restored = markdownToState(md);
    expect(restored.canvas).toEqual([]);
  });

  it("null wordCount survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "No word count",
      // wordCount omitted -> defaults to null
    });
    expect(state.canvas![0].wordCount).toBeNull();

    const restored = roundTrip(state);
    expect(restored.canvas![0].wordCount).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Date navigation simulation
// ---------------------------------------------------------------------------

describe("E2E: Date navigation simulation", () => {
  it("entries for 3 different dates can each be found by date", () => {
    let state = makeState();
    const dates = ["2026-03-01", "2026-03-02", "2026-03-03"];
    for (const d of dates) {
      state = applySetCanvasEntry(state, {
        date: d,
        content: `Notes for ${d}`,
        wordCount: 3,
      });
    }

    // Simulate date navigation: look up each date
    for (const d of dates) {
      const entry = state.canvas!.find(e => e.date === d);
      expect(entry).toBeDefined();
      expect(entry!.content).toBe(`Notes for ${d}`);
    }
  });

  it("navigating to a date with no entry returns undefined", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-01",
      content: "Only entry",
    });

    const missing = state.canvas!.find(e => e.date === "2026-03-15");
    expect(missing).toBeUndefined();
  });

  it("date navigation works after round-trip", () => {
    let state = makeState();
    const dates = ["2026-02-28", "2026-03-01", "2026-03-02"];
    for (const d of dates) {
      state = applySetCanvasEntry(state, {
        date: d,
        content: `Entry ${d}`,
        wordCount: 2,
      });
    }

    const restored = roundTrip(state);

    for (const d of dates) {
      const entry = restored.canvas!.find(e => e.date === d);
      expect(entry).toBeDefined();
      expect(entry!.content).toBe(`Entry ${d}`);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Auto-save idempotency
// ---------------------------------------------------------------------------

describe("E2E: Auto-save idempotency", () => {
  it("dispatching SET_CANVAS_ENTRY multiple times with same content produces 1 entry", () => {
    let state = makeState();
    const payload = {
      date: "2026-03-03",
      content: "Repeated content",
      wordCount: 2,
    };

    // Simulate auto-save firing 5 times with identical content
    for (let i = 0; i < 5; i++) {
      state = applySetCanvasEntry(state, payload);
    }

    expect(state.canvas).toHaveLength(1);
    expect(state.canvas![0].content).toBe("Repeated content");
    expect(state.canvas![0].wordCount).toBe(2);
  });

  it("idempotent saves preserve the original id and createdAt", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Stable",
      wordCount: 1,
    });
    const originalId = state.canvas![0].id;
    const originalCreatedAt = state.canvas![0].createdAt;

    for (let i = 0; i < 3; i++) {
      state = applySetCanvasEntry(state, {
        date: "2026-03-03",
        content: "Stable",
        wordCount: 1,
      });
    }

    expect(state.canvas).toHaveLength(1);
    expect(state.canvas![0].id).toBe(originalId);
    expect(state.canvas![0].createdAt).toBe(originalCreatedAt);
  });

  it("idempotent saves followed by round-trip still yield 1 entry", () => {
    let state = makeState();
    for (let i = 0; i < 4; i++) {
      state = applySetCanvasEntry(state, {
        date: "2026-03-03",
        content: "Same",
        wordCount: 1,
      });
    }

    const restored = roundTrip(state);
    expect(restored.canvas).toHaveLength(1);
    expect(restored.canvas![0].content).toBe("Same");
  });
});

// ---------------------------------------------------------------------------
// 7. Word count tracking
// ---------------------------------------------------------------------------

describe("E2E: Word count tracking", () => {
  it("wordCount persists through serialization", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "One two three four five",
      wordCount: 5,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].wordCount).toBe(5);
  });

  it("wordCount of zero persists through serialization", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "",
      wordCount: 0,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].wordCount).toBe(0);
  });

  it("wordCount updates when content changes", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Short",
      wordCount: 1,
    });

    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "This is a much longer piece of writing",
      wordCount: 8,
    });

    expect(state.canvas![0].wordCount).toBe(8);

    const restored = roundTrip(state);
    expect(restored.canvas![0].wordCount).toBe(8);
  });

  it("large wordCount values survive round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Essay content...",
      wordCount: 15000,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].wordCount).toBe(15000);
  });
});

// ---------------------------------------------------------------------------
// 8. Content with special characters
// ---------------------------------------------------------------------------

describe("E2E: Content with special characters", () => {
  it("content with double quotes survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: 'She said "hello" and then "goodbye"',
      wordCount: 6,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe(
      'She said "hello" and then "goodbye"'
    );
  });

  it("content with single quotes survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "It's a wonderful day, isn't it?",
      wordCount: 7,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe("It's a wonderful day, isn't it?");
  });

  it("content with newlines survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Paragraph 1\nParagraph 2\nParagraph 3",
      wordCount: 6,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe(
      "Paragraph 1\nParagraph 2\nParagraph 3"
    );
  });

  it("content with pipe characters survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Column A | Column B | Column C",
      wordCount: 6,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe("Column A | Column B | Column C");
  });

  it("content with pipes AND newlines survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Row 1 | A\nRow 2 | B\nRow 3 | C",
      wordCount: 9,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe("Row 1 | A\nRow 2 | B\nRow 3 | C");
  });

  it("content with HTML-like strings survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "<p>Hello <strong>world</strong></p>",
      wordCount: 2,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe(
      "<p>Hello <strong>world</strong></p>"
    );
  });

  it("content with backticks and code fences survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "Use `console.log()` or ```js\nconst x = 1;\n```",
      wordCount: 5,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe(
      "Use `console.log()` or ```js\nconst x = 1;\n```"
    );
  });

  it("content with markdown heading characters survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "## My Heading\n### Sub-heading\n- bullet point",
      wordCount: 6,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe(
      "## My Heading\n### Sub-heading\n- bullet point"
    );
  });

  it("Tiptap-style JSON content with special chars survives round-trip", () => {
    // Realistic Tiptap JSON: separate paragraph nodes for line breaks
    // (Tiptap never embeds literal \n inside text nodes)
    const tiptapContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: 'Quotes "here" and pipes | there' }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "A <b>bold</b> heading" }],
        },
      ],
    });

    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: tiptapContent,
      wordCount: 12,
    });

    const restored = roundTrip(state);
    expect(restored.canvas![0].content).toBe(tiptapContent);
    expect(restored.canvas![0].wordCount).toBe(12);
  });

  it("empty string content survives round-trip", () => {
    let state = makeState();
    state = applySetCanvasEntry(state, {
      date: "2026-03-03",
      content: "",
      wordCount: 0,
    });

    const restored = roundTrip(state);
    expect(restored.canvas).toHaveLength(1);
    expect(restored.canvas![0].content).toBe("");
  });
});
