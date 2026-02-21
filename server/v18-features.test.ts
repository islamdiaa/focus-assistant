/**
 * V1.8 Tests — Reading List, Obsidian Sync
 */
import { describe, it, expect } from "vitest";
import { stateToMarkdown, markdownToState } from "./mdStorage";
import { generateObsidianMarkdown } from "./obsidianSync";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type { AppState, ReadingItem } from "../shared/appTypes";

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

describe("Reading List Serialization", () => {
  it("round-trips reading items through markdown", () => {
    const items: ReadingItem[] = [
      {
        id: "r1",
        url: "https://example.com/article",
        title: "Great Article",
        description: "About productivity",
        tags: ["ai", "productivity"],
        status: "unread",
        domain: "example.com",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
      {
        id: "r2",
        url: "https://blog.test/post",
        title: "Blog Post",
        tags: ["engineering"],
        status: "read",
        notes: "Key insight: focus on systems",
        domain: "blog.test",
        createdAt: "2026-02-19T08:00:00.000Z",
        readAt: "2026-02-20T14:00:00.000Z",
      },
    ];

    const state = makeState({ readingList: items });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.readingList).toHaveLength(2);
    expect(parsed.readingList![0].id).toBe("r1");
    expect(parsed.readingList![0].url).toBe("https://example.com/article");
    expect(parsed.readingList![0].title).toBe("Great Article");
    expect(parsed.readingList![0].description).toBe("About productivity");
    expect(parsed.readingList![0].tags).toEqual(["ai", "productivity"]);
    expect(parsed.readingList![0].status).toBe("unread");
    expect(parsed.readingList![0].domain).toBe("example.com");

    expect(parsed.readingList![1].id).toBe("r2");
    expect(parsed.readingList![1].status).toBe("read");
    expect(parsed.readingList![1].notes).toBe("Key insight: focus on systems");
    expect(parsed.readingList![1].readAt).toBe("2026-02-20T14:00:00.000Z");
  });

  it("handles empty reading list", () => {
    const state = makeState({ readingList: [] });
    const md = stateToMarkdown(state);
    expect(md).not.toContain("## Reading List");
    const parsed = markdownToState(md);
    // readingList may be undefined or empty array
    expect(parsed.readingList?.length || 0).toBe(0);
  });

  it("handles reading items with no tags", () => {
    const items: ReadingItem[] = [
      {
        id: "r3",
        url: "https://test.com",
        title: "No Tags",
        tags: [],
        status: "reading",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ readingList: items });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.readingList).toHaveLength(1);
    expect(parsed.readingList![0].tags).toEqual([]);
    expect(parsed.readingList![0].status).toBe("reading");
  });

  it("handles reading items with special characters in title/notes", () => {
    const items: ReadingItem[] = [
      {
        id: "r4",
        url: "https://test.com/special",
        title: "Pipes | and newlines",
        tags: ["test"],
        status: "unread",
        notes: "Line 1\nLine 2",
        createdAt: "2026-02-20T10:00:00.000Z",
      },
    ];

    const state = makeState({ readingList: items });
    const md = stateToMarkdown(state);
    const parsed = markdownToState(md);

    expect(parsed.readingList).toHaveLength(1);
    expect(parsed.readingList![0].title).toBe("Pipes | and newlines");
    expect(parsed.readingList![0].notes).toBe("Line 1\nLine 2");
  });
});

describe("Obsidian Markdown Generation", () => {
  it("generates valid Obsidian markdown with frontmatter", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          title: "Build feature",
          priority: "high",
          status: "active",
          quadrant: "do-first",
          createdAt: "2026-02-20T10:00:00.000Z",
          category: "work",
          subtasks: [
            { id: "s1", title: "Design", done: true },
            { id: "s2", title: "Implement", done: false },
          ],
        },
      ],
      currentStreak: 7,
    });

    const md = generateObsidianMarkdown(state);

    // Frontmatter
    expect(md).toContain("---");
    expect(md).toContain("title: FocusAssist Dashboard");
    expect(md).toContain("streak: 7");

    // Task with subtasks
    expect(md).toContain("🟠 **Build feature**");
    expect(md).toContain("- [x] Design");
    expect(md).toContain("- [ ] Implement");
    expect(md).toContain("#work");
  });

  it("includes reading list in Obsidian output", () => {
    const state = makeState({
      readingList: [
        {
          id: "r1",
          url: "https://example.com/article",
          title: "Great Article",
          tags: ["ai"],
          status: "unread",
          createdAt: "2026-02-20T10:00:00.000Z",
        },
        {
          id: "r2",
          url: "https://blog.test/post",
          title: "Blog Post",
          tags: [],
          status: "read",
          notes: "Good read",
          createdAt: "2026-02-19T08:00:00.000Z",
          readAt: "2026-02-20T14:00:00.000Z",
        },
      ],
    });

    const md = generateObsidianMarkdown(state);

    expect(md).toContain("## 📚 Reading List");
    expect(md).toContain("### 📥 Unread");
    expect(md).toContain("[Great Article](https://example.com/article)");
    expect(md).toContain("#ai");
    expect(md).toContain("### ✅ Read");
    expect(md).toContain("[Blog Post](https://blog.test/post)");
    expect(md).toContain("📝 Good read");
  });

  it("generates stats table", () => {
    const state = makeState({
      dailyStats: [
        {
          date: "2026-02-20",
          tasksCompleted: 5,
          focusMinutes: 120,
          pomodorosCompleted: 4,
        },
        {
          date: "2026-02-19",
          tasksCompleted: 3,
          focusMinutes: 90,
          pomodorosCompleted: 3,
        },
      ],
    });

    const md = generateObsidianMarkdown(state);

    expect(md).toContain("## 📊 Recent Stats");
    expect(md).toContain("| 2026-02-20 | 5 | 120 | 4 |");
    expect(md).toContain("| 2026-02-19 | 3 | 90 | 3 |");
  });

  it("handles empty state gracefully", () => {
    const state = makeState();
    const md = generateObsidianMarkdown(state);

    expect(md).toContain("# 🎯 FocusAssist");
    expect(md).toContain("_No active tasks._");
    expect(md).not.toContain("## 📚 Reading List");
  });
});
