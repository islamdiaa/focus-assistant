/**
 * Obsidian vault sync path validation tests
 *
 * syncToObsidian writes a FocusAssist.md file into a user-configured
 * directory. The path comes from app preferences, so validate it before
 * touching the filesystem: no traversal segments, no sensitive system
 * directories. (The app is single-user with no login by design; this is
 * defense-in-depth on top of the trusted-network deployment model.)
 */
import { describe, it, expect } from "vitest";
import { validateVaultPath, syncToObsidian } from "./obsidianSync";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "../shared/appTypes";
import type { AppState } from "../shared/appTypes";

describe("validateVaultPath", () => {
  it("accepts a normal absolute vault path", () => {
    expect(validateVaultPath("/home/user/Obsidian/Vault").ok).toBe(true);
  });

  it("accepts a plain path (resolved against cwd)", () => {
    expect(validateVaultPath("obsidian-vault").ok).toBe(true);
  });

  it("rejects traversal segments", () => {
    expect(validateVaultPath("../etc").ok).toBe(false);
    expect(validateVaultPath("/home/user/../../etc").ok).toBe(false);
    expect(validateVaultPath("/vault/..").ok).toBe(false);
  });

  it("rejects sensitive system directories", () => {
    expect(validateVaultPath("/etc").ok).toBe(false);
    expect(validateVaultPath("/etc/obsidian").ok).toBe(false);
    expect(validateVaultPath("/proc/self/obsidian").ok).toBe(false);
    expect(validateVaultPath("/sys/kernel/obsidian").ok).toBe(false);
    expect(validateVaultPath("/dev/shm/obsidian").ok).toBe(false);
  });

  it("does not over-block similarly named paths", () => {
    // A directory merely starting with a blocked prefix name is fine
    expect(validateVaultPath("/home/user/etcetera").ok).toBe(true);
  });
});

describe("syncToObsidian validation integration", () => {
  const state = {
    tasks: [],
    pomodoros: [],
    settings: { ...DEFAULT_SETTINGS },
    dailyStats: [],
    currentStreak: 0,
    templates: [],
    preferences: {
      ...DEFAULT_PREFERENCES,
      obsidianAutoSync: true,
      obsidianVaultPath: "/etc/fake-vault",
    },
    readingList: [],
    reminders: [],
  } as AppState;

  it("skips sync with an error for a blocked vault path", async () => {
    const result = await syncToObsidian(state);
    expect(result.synced).toBe(false);
    expect(result.error).toBe("Invalid vault path");
  });
});
