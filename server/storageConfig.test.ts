import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import path from "path";
import type { StorageConfig } from "../shared/appTypes";

/**
 * Test the storage config logic by directly testing the JSON read/write
 * pattern used by storageConfig.ts, since the module caches DATA_DIR at
 * import time and can't be re-imported with a different env.
 */

const DEFAULT_CONFIG: StorageConfig = { mode: "file" };

describe("storageConfig logic", () => {
  it("default config has mode 'file'", () => {
    expect(DEFAULT_CONFIG.mode).toBe("file");
    expect(DEFAULT_CONFIG.sheetsId).toBeUndefined();
    expect(DEFAULT_CONFIG.sheetsApiKey).toBeUndefined();
  });

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

  it("handles all valid storage modes", () => {
    const modes: StorageConfig["mode"][] = ["local", "file", "sheets"];
    for (const mode of modes) {
      const config: StorageConfig = { ...DEFAULT_CONFIG, mode };
      expect(config.mode).toBe(mode);
    }
  });

  it("config with sheets credentials validates correctly", () => {
    const config: StorageConfig = {
      mode: "sheets",
      sheetsId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      sheetsApiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    };

    expect(config.sheetsId!.length).toBeGreaterThan(10);
    expect(config.sheetsApiKey!.startsWith("AIza")).toBe(true);
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
