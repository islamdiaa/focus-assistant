import { describe, it, expect } from "vitest";
import {
  checkBreakReminder,
  getBreakSeverityStyles,
  BREAK_THRESHOLDS,
  type BreakSeverity,
} from "../breakReminder";

// ---------------------------------------------------------------------------
// checkBreakReminder
// ---------------------------------------------------------------------------

describe("checkBreakReminder", () => {
  it("returns null when cumulative minutes is 0", () => {
    expect(checkBreakReminder(0, [])).toBeNull();
  });

  it("returns null when cumulative minutes is below the first threshold (25)", () => {
    expect(checkBreakReminder(24, [])).toBeNull();
    expect(checkBreakReminder(0.5, [])).toBeNull();
    expect(checkBreakReminder(24.9, [])).toBeNull();
  });

  it("returns the 25-minute reminder exactly at threshold", () => {
    const result = checkBreakReminder(25, []);
    expect(result).not.toBeNull();
    expect(result!.minutesWorked).toBe(25);
    expect(result!.severity).toBe("gentle");
  });

  it("returns the 25-minute reminder just above threshold", () => {
    const result = checkBreakReminder(26, []);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("gentle");
  });

  it("returns the 50-minute reminder at 50 minutes", () => {
    const result = checkBreakReminder(50, []);
    expect(result).not.toBeNull();
    expect(result!.minutesWorked).toBe(50);
    expect(result!.severity).toBe("moderate");
  });

  it("returns the 90-minute reminder at 90 minutes", () => {
    const result = checkBreakReminder(90, []);
    expect(result).not.toBeNull();
    expect(result!.minutesWorked).toBe(90);
    expect(result!.severity).toBe("urgent");
  });

  it("returns the 120-minute reminder at 120 minutes", () => {
    const result = checkBreakReminder(120, []);
    expect(result).not.toBeNull();
    expect(result!.minutesWorked).toBe(120);
    expect(result!.severity).toBe("urgent");
  });

  it("returns the highest applicable threshold (120) when well past it", () => {
    const result = checkBreakReminder(150, []);
    expect(result).not.toBeNull();
    expect(result!.minutesWorked).toBe(150);
    // 120-minute threshold is the highest
    expect(result!.severity).toBe("urgent");
    expect(result!.message).toContain("2 hours");
  });

  it("skips the 25-minute threshold when it is dismissed", () => {
    const result = checkBreakReminder(30, [25]);
    // 25 is dismissed; no other threshold reached yet
    expect(result).toBeNull();
  });

  it("skips dismissed thresholds and returns the next applicable one", () => {
    // 50 minutes reached, 50 dismissed → should return 25 threshold
    const result = checkBreakReminder(50, [50]);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("gentle"); // 25-minute threshold
  });

  it("skips multiple dismissed thresholds", () => {
    // 90 minutes reached, 25 and 50 dismissed → should return 90
    const result = checkBreakReminder(90, [25, 50]);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("urgent");
    expect(result!.minutesWorked).toBe(90);
  });

  it("returns null when all applicable thresholds are dismissed", () => {
    const result = checkBreakReminder(90, [25, 50, 90]);
    expect(result).toBeNull();
  });

  it("returns the 120-minute threshold even when lower ones are dismissed", () => {
    const result = checkBreakReminder(120, [25, 50, 90]);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("urgent");
    expect(result!.message).toContain("2 hours");
  });

  it("returns null when all four thresholds are dismissed and minutes is 120", () => {
    const result = checkBreakReminder(120, [25, 50, 90, 120]);
    expect(result).toBeNull();
  });

  it("floors fractional minutes in minutesWorked", () => {
    const result = checkBreakReminder(25.7, []);
    expect(result).not.toBeNull();
    expect(result!.minutesWorked).toBe(25); // Math.floor(25.7)
  });

  it("result includes a non-empty message string", () => {
    const result = checkBreakReminder(25, []);
    expect(result).not.toBeNull();
    expect(typeof result!.message).toBe("string");
    expect(result!.message.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getBreakSeverityStyles
// ---------------------------------------------------------------------------

describe("getBreakSeverityStyles", () => {
  const severities: BreakSeverity[] = ["gentle", "moderate", "urgent"];

  it("returns an object with bg, hoverBg, border, text, and icon for each severity", () => {
    for (const s of severities) {
      const styles = getBreakSeverityStyles(s);
      expect(styles).toHaveProperty("bg");
      expect(styles).toHaveProperty("hoverBg");
      expect(styles).toHaveProperty("border");
      expect(styles).toHaveProperty("text");
      expect(styles).toHaveProperty("icon");
    }
  });

  it("gentle severity uses warm-sage classes", () => {
    const styles = getBreakSeverityStyles("gentle");
    expect(styles.bg).toContain("warm-sage");
    expect(styles.text).toContain("warm-sage");
    expect(styles.border).toContain("warm-sage");
  });

  it("moderate severity uses warm-amber classes", () => {
    const styles = getBreakSeverityStyles("moderate");
    expect(styles.bg).toContain("warm-amber");
    expect(styles.text).toContain("warm-amber");
    expect(styles.border).toContain("warm-amber");
  });

  it("urgent severity uses warm-terracotta classes", () => {
    const styles = getBreakSeverityStyles("urgent");
    expect(styles.bg).toContain("warm-terracotta");
    expect(styles.text).toContain("warm-terracotta");
    expect(styles.border).toContain("warm-terracotta");
  });

  it("gentle and moderate styles are different", () => {
    const gentle = getBreakSeverityStyles("gentle");
    const moderate = getBreakSeverityStyles("moderate");
    expect(gentle.bg).not.toBe(moderate.bg);
    expect(gentle.text).not.toBe(moderate.text);
  });

  it("moderate and urgent styles are different", () => {
    const moderate = getBreakSeverityStyles("moderate");
    const urgent = getBreakSeverityStyles("urgent");
    expect(moderate.bg).not.toBe(urgent.bg);
    expect(moderate.text).not.toBe(urgent.text);
  });

  it("all style values are non-empty strings", () => {
    for (const s of severities) {
      const styles = getBreakSeverityStyles(s);
      for (const value of Object.values(styles)) {
        expect(typeof value).toBe("string");
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// BREAK_THRESHOLDS constant integrity
// ---------------------------------------------------------------------------

describe("BREAK_THRESHOLDS", () => {
  it("has 4 threshold entries", () => {
    expect(BREAK_THRESHOLDS).toHaveLength(4);
  });

  it("thresholds are in ascending order", () => {
    for (let i = 1; i < BREAK_THRESHOLDS.length; i++) {
      expect(BREAK_THRESHOLDS[i].minutes).toBeGreaterThan(
        BREAK_THRESHOLDS[i - 1].minutes
      );
    }
  });

  it("first threshold is 25 minutes with gentle severity", () => {
    expect(BREAK_THRESHOLDS[0].minutes).toBe(25);
    expect(BREAK_THRESHOLDS[0].severity).toBe("gentle");
  });

  it("second threshold is 50 minutes with moderate severity", () => {
    expect(BREAK_THRESHOLDS[1].minutes).toBe(50);
    expect(BREAK_THRESHOLDS[1].severity).toBe("moderate");
  });

  it("third threshold is 90 minutes with urgent severity", () => {
    expect(BREAK_THRESHOLDS[2].minutes).toBe(90);
    expect(BREAK_THRESHOLDS[2].severity).toBe("urgent");
  });

  it("fourth threshold is 120 minutes with urgent severity", () => {
    expect(BREAK_THRESHOLDS[3].minutes).toBe(120);
    expect(BREAK_THRESHOLDS[3].severity).toBe("urgent");
  });

  it("every threshold has a non-empty message", () => {
    for (const t of BREAK_THRESHOLDS) {
      expect(typeof t.message).toBe("string");
      expect(t.message.trim().length).toBeGreaterThan(0);
    }
  });

  it("every threshold has a valid severity", () => {
    const validSeverities: BreakSeverity[] = ["gentle", "moderate", "urgent"];
    for (const t of BREAK_THRESHOLDS) {
      expect(validSeverities).toContain(t.severity);
    }
  });
});
