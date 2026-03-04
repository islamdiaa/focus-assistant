import { describe, it, expect } from "vitest";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CATEGORY_CONFIG,
  ENERGY_CONFIG,
  RECURRENCE_CONFIG,
} from "../constants";
import type {
  Priority,
  Category,
  EnergyLevel,
  RecurrenceFrequency,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// PRIORITY_COLORS
// ---------------------------------------------------------------------------

describe("PRIORITY_COLORS", () => {
  const priorityLevels: Priority[] = ["urgent", "high", "medium", "low"];

  it("has an entry for every priority level", () => {
    for (const p of priorityLevels) {
      expect(PRIORITY_COLORS).toHaveProperty(p);
    }
  });

  it("all priority color values are non-empty strings", () => {
    for (const p of priorityLevels) {
      expect(typeof PRIORITY_COLORS[p]).toBe("string");
      expect(PRIORITY_COLORS[p].trim().length).toBeGreaterThan(0);
    }
  });

  it("has exactly 4 priority entries", () => {
    expect(Object.keys(PRIORITY_COLORS)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// PRIORITY_LABELS
// ---------------------------------------------------------------------------

describe("PRIORITY_LABELS", () => {
  const priorityLevels: Priority[] = ["urgent", "high", "medium", "low"];

  it("has an entry for every priority level", () => {
    for (const p of priorityLevels) {
      expect(PRIORITY_LABELS).toHaveProperty(p);
    }
  });

  it("all priority label values are non-empty strings", () => {
    for (const p of priorityLevels) {
      expect(typeof PRIORITY_LABELS[p]).toBe("string");
      expect(PRIORITY_LABELS[p].trim().length).toBeGreaterThan(0);
    }
  });

  it("urgent label is 'Urgent'", () => {
    expect(PRIORITY_LABELS.urgent).toBe("Urgent");
  });

  it("high label is 'High'", () => {
    expect(PRIORITY_LABELS.high).toBe("High");
  });

  it("medium label is 'Medium'", () => {
    expect(PRIORITY_LABELS.medium).toBe("Medium");
  });

  it("low label is 'Low'", () => {
    expect(PRIORITY_LABELS.low).toBe("Low");
  });
});

// ---------------------------------------------------------------------------
// CATEGORY_CONFIG
// ---------------------------------------------------------------------------

describe("CATEGORY_CONFIG", () => {
  const categories: Category[] = [
    "work",
    "personal",
    "health",
    "learning",
    "errands",
    "other",
  ];

  it("has an entry for every category", () => {
    for (const c of categories) {
      expect(CATEGORY_CONFIG).toHaveProperty(c);
    }
  });

  it("has exactly 6 category entries", () => {
    expect(Object.keys(CATEGORY_CONFIG)).toHaveLength(6);
  });

  it("every category config has a non-empty emoji", () => {
    for (const c of categories) {
      expect(typeof CATEGORY_CONFIG[c].emoji).toBe("string");
      expect(CATEGORY_CONFIG[c].emoji.trim().length).toBeGreaterThan(0);
    }
  });

  it("every category config has a non-empty label", () => {
    for (const c of categories) {
      expect(typeof CATEGORY_CONFIG[c].label).toBe("string");
      expect(CATEGORY_CONFIG[c].label.trim().length).toBeGreaterThan(0);
    }
  });

  it("work category has correct label", () => {
    expect(CATEGORY_CONFIG.work.label).toBe("Work");
  });

  it("personal category has correct label", () => {
    expect(CATEGORY_CONFIG.personal.label).toBe("Personal");
  });

  it("health category has correct label", () => {
    expect(CATEGORY_CONFIG.health.label).toBe("Health");
  });

  it("no duplicate emojis across categories", () => {
    const emojis = categories.map(c => CATEGORY_CONFIG[c].emoji);
    const unique = new Set(emojis);
    expect(unique.size).toBe(emojis.length);
  });
});

// ---------------------------------------------------------------------------
// ENERGY_CONFIG
// ---------------------------------------------------------------------------

describe("ENERGY_CONFIG", () => {
  const energyLevels: EnergyLevel[] = ["low", "medium", "high"];

  it("has an entry for every energy level", () => {
    for (const e of energyLevels) {
      expect(ENERGY_CONFIG).toHaveProperty(e);
    }
  });

  it("has exactly 3 energy entries", () => {
    expect(Object.keys(ENERGY_CONFIG)).toHaveLength(3);
  });

  it("every energy config has a non-empty emoji", () => {
    for (const e of energyLevels) {
      expect(typeof ENERGY_CONFIG[e].emoji).toBe("string");
      expect(ENERGY_CONFIG[e].emoji.trim().length).toBeGreaterThan(0);
    }
  });

  it("every energy config has a non-empty label", () => {
    for (const e of energyLevels) {
      expect(typeof ENERGY_CONFIG[e].label).toBe("string");
      expect(ENERGY_CONFIG[e].label.trim().length).toBeGreaterThan(0);
    }
  });

  it("low energy has correct label", () => {
    expect(ENERGY_CONFIG.low.label).toBe("Low Energy");
  });

  it("medium energy has correct label", () => {
    expect(ENERGY_CONFIG.medium.label).toBe("Medium Energy");
  });

  it("high energy has correct label", () => {
    expect(ENERGY_CONFIG.high.label).toBe("High Energy");
  });
});

// ---------------------------------------------------------------------------
// RECURRENCE_CONFIG
// ---------------------------------------------------------------------------

describe("RECURRENCE_CONFIG", () => {
  const frequencies: RecurrenceFrequency[] = [
    "none",
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "weekdays",
  ];

  it("has an entry for every recurrence frequency", () => {
    for (const f of frequencies) {
      expect(RECURRENCE_CONFIG).toHaveProperty(f);
    }
  });

  it("has exactly 6 recurrence entries", () => {
    expect(Object.keys(RECURRENCE_CONFIG)).toHaveLength(6);
  });

  it("every recurrence config has a label string", () => {
    for (const f of frequencies) {
      expect(typeof RECURRENCE_CONFIG[f].label).toBe("string");
      expect(RECURRENCE_CONFIG[f].label.trim().length).toBeGreaterThan(0);
    }
  });

  it("every recurrence config has a short string (may be empty for none)", () => {
    for (const f of frequencies) {
      expect(typeof RECURRENCE_CONFIG[f].short).toBe("string");
    }
  });

  it("none frequency has empty short value", () => {
    expect(RECURRENCE_CONFIG.none.short).toBe("");
  });

  it("daily frequency has correct label", () => {
    expect(RECURRENCE_CONFIG.daily.label).toBe("Daily");
  });

  it("weekly frequency has correct label", () => {
    expect(RECURRENCE_CONFIG.weekly.label).toBe("Weekly");
  });

  it("monthly frequency has correct label", () => {
    expect(RECURRENCE_CONFIG.monthly.label).toBe("Monthly");
  });

  it("quarterly frequency has correct label", () => {
    expect(RECURRENCE_CONFIG.quarterly.label).toBe("Quarterly");
  });

  it("weekdays frequency has correct label", () => {
    expect(RECURRENCE_CONFIG.weekdays.label).toBe("Weekdays");
  });
});
