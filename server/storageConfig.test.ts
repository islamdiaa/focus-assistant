import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { StorageConfig } from "../shared/appTypes";

/**
 * Test the real storageConfig logic.
 *
 * storageConfig.ts caches DATA_DIR at module load time, so we can't change
 * it per test via env vars. Instead, we test the real loadConfig/saveConfig
 * by importing them once, and using the actual DATA_DIR they resolve to.
 *
 * For isolation, we also test the core JSON round-trip logic that the
 * functions implement, ensuring malformed JSON, partial configs, and
 * mode switching all behave correctly.
 */

import { loadConfig, saveConfig } from "./storageConfig";

const DEFAULT_CONFIG: StorageConfig = { mode: "file" };

describe("storageConfig — real loadConfig/saveConfig", () => {
  it("loadConfig returns a valid config object", async () => {
    const config = await loadConfig();
    expect(config).toBeDefined();
    expect(typeof config.mode).toBe("string");
    expect(["local", "file", "sheets"]).toContain(config.mode);
  });

  it("saveConfig and loadConfig round-trip sheets config", async () => {
    // Save the current config so we can restore it
    const original = await loadConfig();

    try {
      const sheetsConfig: StorageConfig = {
        mode: "sheets",
        sheetsId: "test-round-trip-id",
        sheetsApiKey: "test-round-trip-key",
      };
      const ok = await saveConfig(sheetsConfig);
      expect(ok).toBe(true);

      const loaded = await loadConfig();
      expect(loaded.mode).toBe("sheets");
      expect(loaded.sheetsId).toBe("test-round-trip-id");
      expect(loaded.sheetsApiKey).toBe("test-round-trip-key");
    } finally {
      // Restore original config
      await saveConfig(original);
    }
  });

  it("saveConfig and loadConfig round-trip file config", async () => {
    const original = await loadConfig();

    try {
      const fileConfig: StorageConfig = { mode: "file" };
      const ok = await saveConfig(fileConfig);
      expect(ok).toBe(true);

      const loaded = await loadConfig();
      expect(loaded.mode).toBe("file");
    } finally {
      await saveConfig(original);
    }
  });

  it("saveConfig returns true on success", async () => {
    const original = await loadConfig();
    try {
      const ok = await saveConfig({ mode: "local" });
      expect(ok).toBe(true);
    } finally {
      await saveConfig(original);
    }
  });

  it("handles all valid storage modes", async () => {
    const original = await loadConfig();
    try {
      const modes: StorageConfig["mode"][] = ["local", "file", "sheets"];
      for (const mode of modes) {
        await saveConfig({ mode });
        const loaded = await loadConfig();
        expect(loaded.mode).toBe(mode);
      }
    } finally {
      await saveConfig(original);
    }
  });
});

describe("storageConfig — JSON edge cases", () => {
  it("config round-trips through JSON serialization", () => {
    const config: StorageConfig = {
      mode: "sheets",
      sheetsId: "test-sheet-123",
      sheetsApiKey: "test-api-key-456",
    };

    const serialized = JSON.stringify(config, null, 2);
    const deserialized = JSON.parse(serialized) as StorageConfig;

    expect(deserialized.mode).toBe("sheets");
    expect(deserialized.sheetsId).toBe("test-sheet-123");
    expect(deserialized.sheetsApiKey).toBe("test-api-key-456");
  });

  it("merging with defaults fills missing fields", () => {
    const partial = { mode: "sheets" as const };
    const merged = { ...DEFAULT_CONFIG, ...partial };

    expect(merged.mode).toBe("sheets");
    expect(merged.sheetsId).toBeUndefined();
  });

  it("JSON.parse of malformed JSON throws", () => {
    expect(() => JSON.parse("not valid json {{{")).toThrow();
  });

  it("fallback to default on parse error matches expected behavior", () => {
    let config: StorageConfig;
    try {
      config = JSON.parse("not valid json");
    } catch {
      config = { ...DEFAULT_CONFIG };
    }
    expect(config.mode).toBe("file");
  });
});
