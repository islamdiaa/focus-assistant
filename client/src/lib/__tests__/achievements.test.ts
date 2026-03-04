import { describe, it, expect } from "vitest";
import {
  getUnlockedAchievements,
  getNewlyUnlocked,
  buildAchievementStats,
  ACHIEVEMENTS,
  type AchievementStats,
} from "../achievements";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStats(
  overrides: Partial<AchievementStats> = {}
): AchievementStats {
  return {
    totalTasksCompleted: 0,
    totalPomodorosCompleted: 0,
    currentStreak: 0,
    totalFocusMinutes: 0,
    tasksCompletedToday: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getUnlockedAchievements
// ---------------------------------------------------------------------------

describe("getUnlockedAchievements", () => {
  it("returns empty array for all-zero stats", () => {
    const result = getUnlockedAchievements(makeStats());
    expect(result).toHaveLength(0);
  });

  it("unlocks 'first-steps' when totalTasksCompleted reaches 1", () => {
    const ids = getUnlockedAchievements(
      makeStats({ totalTasksCompleted: 1 })
    ).map(a => a.id);
    expect(ids).toContain("first-steps");
  });

  it("unlocks task achievements progressively", () => {
    const at1 = getUnlockedAchievements(
      makeStats({ totalTasksCompleted: 1 })
    ).map(a => a.id);
    const at5 = getUnlockedAchievements(
      makeStats({ totalTasksCompleted: 5 })
    ).map(a => a.id);
    const at10 = getUnlockedAchievements(
      makeStats({ totalTasksCompleted: 10 })
    ).map(a => a.id);
    const at50 = getUnlockedAchievements(
      makeStats({ totalTasksCompleted: 50 })
    ).map(a => a.id);
    const at100 = getUnlockedAchievements(
      makeStats({ totalTasksCompleted: 100 })
    ).map(a => a.id);

    expect(at1).toContain("first-steps");
    expect(at1).not.toContain("getting-started");

    expect(at5).toContain("first-steps");
    expect(at5).toContain("getting-started");
    expect(at5).not.toContain("double-digits");

    expect(at10).toContain("double-digits");
    expect(at10).not.toContain("task-master");

    expect(at50).toContain("task-master");
    expect(at50).not.toContain("century");

    expect(at100).toContain("century");
  });

  it("unlocks focus achievements at correct thresholds", () => {
    const at4 = getUnlockedAchievements(
      makeStats({ totalPomodorosCompleted: 4 })
    ).map(a => a.id);
    const at5 = getUnlockedAchievements(
      makeStats({ totalPomodorosCompleted: 5 })
    ).map(a => a.id);
    const at25 = getUnlockedAchievements(
      makeStats({ totalPomodorosCompleted: 25 })
    ).map(a => a.id);

    expect(at4).not.toContain("focus-apprentice");
    expect(at5).toContain("focus-apprentice");
    expect(at5).not.toContain("focus-pro");
    expect(at25).toContain("focus-pro");
  });

  it("unlocks deep-work at 60 focus minutes and flow-state at 300", () => {
    const at59 = getUnlockedAchievements(
      makeStats({ totalFocusMinutes: 59 })
    ).map(a => a.id);
    const at60 = getUnlockedAchievements(
      makeStats({ totalFocusMinutes: 60 })
    ).map(a => a.id);
    const at300 = getUnlockedAchievements(
      makeStats({ totalFocusMinutes: 300 })
    ).map(a => a.id);

    expect(at59).not.toContain("deep-work");
    expect(at60).toContain("deep-work");
    expect(at60).not.toContain("flow-state");
    expect(at300).toContain("flow-state");
  });

  it("unlocks streak achievements at correct thresholds", () => {
    const at2 = getUnlockedAchievements(makeStats({ currentStreak: 2 })).map(
      a => a.id
    );
    const at3 = getUnlockedAchievements(makeStats({ currentStreak: 3 })).map(
      a => a.id
    );
    const at7 = getUnlockedAchievements(makeStats({ currentStreak: 7 })).map(
      a => a.id
    );
    const at30 = getUnlockedAchievements(makeStats({ currentStreak: 30 })).map(
      a => a.id
    );

    expect(at2).not.toContain("streak-starter");
    expect(at3).toContain("streak-starter");
    expect(at7).toContain("week-warrior");
    expect(at30).toContain("month-master");
  });

  it("unlocks habit achievements based on tasksCompletedToday", () => {
    const at4 = getUnlockedAchievements(
      makeStats({ tasksCompletedToday: 4 })
    ).map(a => a.id);
    const at5 = getUnlockedAchievements(
      makeStats({ tasksCompletedToday: 5 })
    ).map(a => a.id);
    const at10 = getUnlockedAchievements(
      makeStats({ tasksCompletedToday: 10 })
    ).map(a => a.id);

    expect(at4).not.toContain("daily-hero");
    expect(at5).toContain("daily-hero");
    expect(at5).not.toContain("power-day");
    expect(at10).toContain("power-day");
  });

  it("unlocks achievements across multiple stat categories simultaneously", () => {
    const stats = makeStats({
      totalTasksCompleted: 10,
      totalPomodorosCompleted: 5,
      currentStreak: 7,
      totalFocusMinutes: 60,
      tasksCompletedToday: 5,
    });
    const ids = getUnlockedAchievements(stats).map(a => a.id);

    expect(ids).toContain("first-steps");
    expect(ids).toContain("double-digits");
    expect(ids).toContain("focus-apprentice");
    expect(ids).toContain("streak-starter");
    expect(ids).toContain("week-warrior");
    expect(ids).toContain("deep-work");
    expect(ids).toContain("daily-hero");
  });

  it("returns all achievements when stats are at maximum values", () => {
    const stats = makeStats({
      totalTasksCompleted: 1000,
      totalPomodorosCompleted: 500,
      currentStreak: 365,
      totalFocusMinutes: 10000,
      tasksCompletedToday: 100,
    });
    const result = getUnlockedAchievements(stats);
    expect(result).toHaveLength(ACHIEVEMENTS.length);
  });

  it("each returned achievement has required fields", () => {
    const stats = makeStats({ totalTasksCompleted: 100 });
    const result = getUnlockedAchievements(stats);
    for (const a of result) {
      expect(typeof a.id).toBe("string");
      expect(a.id.length).toBeGreaterThan(0);
      expect(typeof a.title).toBe("string");
      expect(typeof a.description).toBe("string");
      expect(typeof a.icon).toBe("string");
      expect(["tasks", "focus", "streaks", "habits"]).toContain(a.category);
    }
  });
});

// ---------------------------------------------------------------------------
// getNewlyUnlocked
// ---------------------------------------------------------------------------

describe("getNewlyUnlocked", () => {
  it("returns all unlocked achievements when previouslyUnlocked is empty", () => {
    const stats = makeStats({ totalTasksCompleted: 10 });
    const result = getNewlyUnlocked(stats, []);
    const ids = result.map(a => a.id);
    expect(ids).toContain("first-steps");
    expect(ids).toContain("double-digits");
  });

  it("returns empty array when all unlocked achievements were already noted", () => {
    const stats = makeStats({ totalTasksCompleted: 10 });
    const alreadyUnlocked = getUnlockedAchievements(stats).map(a => a.id);
    const result = getNewlyUnlocked(stats, alreadyUnlocked);
    expect(result).toHaveLength(0);
  });

  it("filters out previously unlocked achievements correctly", () => {
    const prevStats = makeStats({ totalTasksCompleted: 1 });
    const prevUnlocked = getUnlockedAchievements(prevStats).map(a => a.id);

    const newStats = makeStats({ totalTasksCompleted: 10 });
    const newly = getNewlyUnlocked(newStats, prevUnlocked);
    const newIds = newly.map(a => a.id);

    expect(newIds).toContain("getting-started");
    expect(newIds).toContain("double-digits");
    expect(newIds).not.toContain("first-steps");
  });

  it("returns empty array when no thresholds are met and previouslyUnlocked is empty", () => {
    const stats = makeStats();
    const result = getNewlyUnlocked(stats, []);
    expect(result).toHaveLength(0);
  });

  it("handles previouslyUnlocked IDs that are not in ACHIEVEMENTS", () => {
    const stats = makeStats({ totalTasksCompleted: 1 });
    const result = getNewlyUnlocked(stats, ["nonexistent-id", "another-fake"]);
    const ids = result.map(a => a.id);
    expect(ids).toContain("first-steps");
  });

  it("returns only newly crossed thresholds when stats grow", () => {
    const prevUnlocked = ["first-steps", "getting-started", "deep-work"];
    const stats = makeStats({
      totalTasksCompleted: 50,
      totalFocusMinutes: 300,
    });
    const newly = getNewlyUnlocked(stats, prevUnlocked);
    const newIds = newly.map(a => a.id);

    expect(newIds).toContain("double-digits");
    expect(newIds).toContain("task-master");
    expect(newIds).toContain("flow-state");
    expect(newIds).not.toContain("first-steps");
    expect(newIds).not.toContain("getting-started");
    expect(newIds).not.toContain("deep-work");
  });
});

// ---------------------------------------------------------------------------
// buildAchievementStats
// ---------------------------------------------------------------------------

describe("buildAchievementStats", () => {
  it("computes totalTasksCompleted as count of done tasks", () => {
    const tasks = [
      { status: "done" },
      { status: "active" },
      { status: "done" },
      { status: "monitored" },
    ];
    const stats = buildAchievementStats({
      tasks,
      dailyStats: [],
      currentStreak: 0,
      today: "2026-03-04",
    });
    expect(stats.totalTasksCompleted).toBe(2);
  });

  it("computes totalPomodorosCompleted as sum across all dailyStats", () => {
    const dailyStats = [
      {
        date: "2026-03-01",
        tasksCompleted: 3,
        pomodorosCompleted: 4,
        focusMinutes: 100,
      },
      {
        date: "2026-03-02",
        tasksCompleted: 2,
        pomodorosCompleted: 2,
        focusMinutes: 50,
      },
      {
        date: "2026-03-03",
        tasksCompleted: 1,
        pomodorosCompleted: 3,
        focusMinutes: 75,
      },
    ];
    const stats = buildAchievementStats({
      tasks: [],
      dailyStats,
      currentStreak: 0,
      today: "2026-03-04",
    });
    expect(stats.totalPomodorosCompleted).toBe(9);
  });

  it("computes totalFocusMinutes as sum across all dailyStats", () => {
    const dailyStats = [
      {
        date: "2026-03-01",
        tasksCompleted: 0,
        pomodorosCompleted: 0,
        focusMinutes: 120,
      },
      {
        date: "2026-03-02",
        tasksCompleted: 0,
        pomodorosCompleted: 0,
        focusMinutes: 80,
      },
    ];
    const stats = buildAchievementStats({
      tasks: [],
      dailyStats,
      currentStreak: 0,
      today: "2026-03-04",
    });
    expect(stats.totalFocusMinutes).toBe(200);
  });

  it("passes through currentStreak unchanged", () => {
    const stats = buildAchievementStats({
      tasks: [],
      dailyStats: [],
      currentStreak: 14,
      today: "2026-03-04",
    });
    expect(stats.currentStreak).toBe(14);
  });

  it("computes tasksCompletedToday from today's dailyStat entry", () => {
    const dailyStats = [
      {
        date: "2026-03-02",
        tasksCompleted: 5,
        pomodorosCompleted: 2,
        focusMinutes: 60,
      },
      {
        date: "2026-03-04",
        tasksCompleted: 8,
        pomodorosCompleted: 3,
        focusMinutes: 75,
      },
    ];
    const stats = buildAchievementStats({
      tasks: [],
      dailyStats,
      currentStreak: 0,
      today: "2026-03-04",
    });
    expect(stats.tasksCompletedToday).toBe(8);
  });

  it("returns tasksCompletedToday as 0 when no entry for today", () => {
    const dailyStats = [
      {
        date: "2026-03-01",
        tasksCompleted: 5,
        pomodorosCompleted: 2,
        focusMinutes: 60,
      },
    ];
    const stats = buildAchievementStats({
      tasks: [],
      dailyStats,
      currentStreak: 0,
      today: "2026-03-04",
    });
    expect(stats.tasksCompletedToday).toBe(0);
  });

  it("returns all-zero stats for empty inputs", () => {
    const stats = buildAchievementStats({
      tasks: [],
      dailyStats: [],
      currentStreak: 0,
      today: "2026-03-04",
    });
    expect(stats.totalTasksCompleted).toBe(0);
    expect(stats.totalPomodorosCompleted).toBe(0);
    expect(stats.totalFocusMinutes).toBe(0);
    expect(stats.tasksCompletedToday).toBe(0);
    expect(stats.currentStreak).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ACHIEVEMENTS constant integrity
// ---------------------------------------------------------------------------

describe("ACHIEVEMENTS constant", () => {
  it("has no duplicate IDs", () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every achievement has a non-empty title", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.title.trim().length).toBeGreaterThan(0);
    }
  });

  it("every achievement has a non-empty description", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("every achievement has a non-empty icon name", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.icon.trim().length).toBeGreaterThan(0);
    }
  });

  it("every achievement category is one of the valid values", () => {
    const validCategories = ["tasks", "focus", "streaks", "habits"];
    for (const a of ACHIEVEMENTS) {
      expect(validCategories).toContain(a.category);
    }
  });

  it("every achievement check function is callable and returns a boolean", () => {
    const stats = makeStats();
    for (const a of ACHIEVEMENTS) {
      const result = a.check(stats);
      expect(typeof result).toBe("boolean");
    }
  });

  it("has at least one achievement per category", () => {
    const categories = ["tasks", "focus", "streaks", "habits"];
    for (const cat of categories) {
      const inCategory = ACHIEVEMENTS.filter(a => a.category === cat);
      expect(inCategory.length).toBeGreaterThan(0);
    }
  });
});
