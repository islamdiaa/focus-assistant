import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, DAILY_TIPS } from "../shared/appTypes";

describe("appTypes constants", () => {
  describe("DEFAULT_SETTINGS", () => {
    it("has sensible default values", () => {
      expect(DEFAULT_SETTINGS.focusDuration).toBe(25);
      expect(DEFAULT_SETTINGS.shortBreak).toBe(5);
      expect(DEFAULT_SETTINGS.longBreak).toBe(15);
      expect(DEFAULT_SETTINGS.sessionsBeforeLongBreak).toBe(4);
    });

    it("all values are positive numbers", () => {
      expect(DEFAULT_SETTINGS.focusDuration).toBeGreaterThan(0);
      expect(DEFAULT_SETTINGS.shortBreak).toBeGreaterThan(0);
      expect(DEFAULT_SETTINGS.longBreak).toBeGreaterThan(0);
      expect(DEFAULT_SETTINGS.sessionsBeforeLongBreak).toBeGreaterThan(0);
    });

    it("break durations are shorter than focus duration", () => {
      expect(DEFAULT_SETTINGS.shortBreak).toBeLessThan(
        DEFAULT_SETTINGS.focusDuration
      );
      expect(DEFAULT_SETTINGS.longBreak).toBeLessThan(
        DEFAULT_SETTINGS.focusDuration
      );
    });
  });

  describe("DAILY_TIPS", () => {
    it("has at least 5 tips", () => {
      expect(DAILY_TIPS.length).toBeGreaterThanOrEqual(5);
    });

    it("all tips are non-empty strings", () => {
      for (const tip of DAILY_TIPS) {
        expect(typeof tip).toBe("string");
        expect(tip.trim().length).toBeGreaterThan(0);
      }
    });

    it("no duplicate tips", () => {
      const unique = new Set(DAILY_TIPS);
      expect(unique.size).toBe(DAILY_TIPS.length);
    });
  });
});
