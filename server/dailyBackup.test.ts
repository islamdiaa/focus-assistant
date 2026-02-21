/**
 * Daily Backup Snapshot Tests
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import {
  createDailySnapshot,
  saveToMdFile,
  stateToMarkdown,
} from "./mdStorage";
import type { AppState } from "../shared/appTypes";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "focus-assist-data.md");
const DAILY_BACKUP_DIR = path.join(DATA_DIR, "daily_backup");

function baseState(): AppState {
  return {
    tasks: [
      {
        id: "t1",
        title: "Test task",
        priority: "medium",
        status: "active",
        quadrant: "do-first",
        createdAt: new Date().toISOString(),
      },
    ],
    pomodoros: [],
    settings: { ...DEFAULT_SETTINGS },
    dailyStats: [],
    currentStreak: 0,
    templates: [],
    preferences: { ...DEFAULT_PREFERENCES },
  };
}

describe("createDailySnapshot", () => {
  const today = new Date().toISOString().split("T")[0];
  const snapshotPath = path.join(DAILY_BACKUP_DIR, `${today}.md`);

  beforeEach(async () => {
    // Clean up any existing snapshot for today
    try {
      await fs.unlink(snapshotPath);
    } catch {
      // doesn't exist, fine
    }
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.unlink(snapshotPath);
    } catch {
      // doesn't exist, fine
    }
  });

  it("creates a daily snapshot file for today", async () => {
    // Ensure data file exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    const state = baseState();
    await fs.writeFile(DATA_FILE, stateToMarkdown(state), "utf-8");

    await createDailySnapshot();

    const exists = await fs
      .access(snapshotPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(snapshotPath, "utf-8");
    expect(content).toContain("# Focus Assist Data");
    expect(content).toContain("Test task");
  });

  it("does not overwrite existing daily snapshot", async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(DAILY_BACKUP_DIR, { recursive: true });

    // Write initial data
    const state1 = baseState();
    await fs.writeFile(DATA_FILE, stateToMarkdown(state1), "utf-8");
    await createDailySnapshot();

    // Modify data
    const state2 = baseState();
    state2.tasks[0].title = "Modified task";
    await fs.writeFile(DATA_FILE, stateToMarkdown(state2), "utf-8");
    await createDailySnapshot();

    // Snapshot should still have original content
    const content = await fs.readFile(snapshotPath, "utf-8");
    expect(content).toContain("Test task");
    expect(content).not.toContain("Modified task");
  });

  it("handles missing data file gracefully", async () => {
    // Remove data file if it exists
    try {
      await fs.unlink(DATA_FILE);
    } catch {
      // fine
    }

    // Should not throw
    await expect(createDailySnapshot()).resolves.toBeUndefined();
  });
});

describe("saveToMdFile triggers daily snapshot", () => {
  const today = new Date().toISOString().split("T")[0];
  const snapshotPath = path.join(DAILY_BACKUP_DIR, `${today}.md`);

  beforeEach(async () => {
    try {
      await fs.unlink(snapshotPath);
    } catch {
      // fine
    }
  });

  afterEach(async () => {
    try {
      await fs.unlink(snapshotPath);
    } catch {
      // fine
    }
  });

  it("creates daily snapshot as part of save", async () => {
    // Ensure a data file exists first so the snapshot has something to copy
    await fs.mkdir(DATA_DIR, { recursive: true });
    const preState = baseState();
    await fs.writeFile(DATA_FILE, stateToMarkdown(preState), "utf-8");

    const state = baseState();
    state.tasks[0].title = "After save task";
    const result = await saveToMdFile(state);
    expect(result).toBe(true);

    const exists = await fs
      .access(snapshotPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});
