import { describe, it, expect } from "vitest";
import {
  getCurrentEnergyZone,
  getEnergyBoost,
  getEnergyMatchLabel,
} from "../energyTimeMatch";
import type { Task } from "@/lib/types";

// ---------------------------------------------------------------------------
// Minimal Task factory
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Test task",
    priority: "medium",
    status: "active",
    quadrant: "unassigned",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getCurrentEnergyZone
// ---------------------------------------------------------------------------

describe("getCurrentEnergyZone", () => {
  it("returns Morning zone for hours 6–9", () => {
    for (const h of [6, 7, 8, 9]) {
      const zone = getCurrentEnergyZone(h);
      expect(zone.name).toBe("Morning");
      expect(zone.recommended).toBe("high");
    }
  });

  it("returns Mid-morning zone for hours 10–11", () => {
    for (const h of [10, 11]) {
      const zone = getCurrentEnergyZone(h);
      expect(zone.name).toBe("Mid-morning");
      expect(zone.recommended).toBe("medium");
    }
  });

  it("returns Afternoon zone for hours 12–14", () => {
    for (const h of [12, 13, 14]) {
      const zone = getCurrentEnergyZone(h);
      expect(zone.name).toBe("Afternoon");
      expect(zone.recommended).toBe("low");
    }
  });

  it("returns Late afternoon zone for hours 15–16", () => {
    for (const h of [15, 16]) {
      const zone = getCurrentEnergyZone(h);
      expect(zone.name).toBe("Late afternoon");
      expect(zone.recommended).toBe("medium");
    }
  });

  it("returns Evening zone for hours 17–23", () => {
    for (const h of [17, 18, 20, 22, 23]) {
      const zone = getCurrentEnergyZone(h);
      expect(zone.name).toBe("Evening");
      expect(zone.recommended).toBe("low");
    }
  });

  it("returns Early morning zone for hours 0–5", () => {
    for (const h of [0, 1, 2, 3, 4, 5]) {
      const zone = getCurrentEnergyZone(h);
      expect(zone.name).toBe("Early morning");
      expect(zone.recommended).toBe("low");
    }
  });

  // Boundary tests
  it("boundary: hour 6 is Morning (not Early morning)", () => {
    const zone = getCurrentEnergyZone(6);
    expect(zone.name).toBe("Morning");
  });

  it("boundary: hour 10 is Mid-morning (not Morning)", () => {
    const zone = getCurrentEnergyZone(10);
    expect(zone.name).toBe("Mid-morning");
  });

  it("boundary: hour 12 is Afternoon (not Mid-morning)", () => {
    const zone = getCurrentEnergyZone(12);
    expect(zone.name).toBe("Afternoon");
  });

  it("boundary: hour 15 is Late afternoon (not Afternoon)", () => {
    const zone = getCurrentEnergyZone(15);
    expect(zone.name).toBe("Late afternoon");
  });

  it("boundary: hour 17 is Evening (not Late afternoon)", () => {
    const zone = getCurrentEnergyZone(17);
    expect(zone.name).toBe("Evening");
  });

  it("boundary: hour 0 is Early morning", () => {
    const zone = getCurrentEnergyZone(0);
    expect(zone.name).toBe("Early morning");
  });

  it("returned zone has all required fields", () => {
    const zone = getCurrentEnergyZone(9);
    expect(typeof zone.name).toBe("string");
    expect(typeof zone.startHour).toBe("number");
    expect(typeof zone.endHour).toBe("number");
    expect(["low", "medium", "high"]).toContain(zone.recommended);
    expect(typeof zone.description).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// getEnergyBoost
// ---------------------------------------------------------------------------

describe("getEnergyBoost", () => {
  it("returns 0 when task has no energy level", () => {
    const task = makeTask({ energy: undefined });
    // 7 AM = Morning zone (recommended: high)
    expect(getEnergyBoost(task, 7)).toBe(0);
  });

  it("returns 20 for a perfect match (high task in Morning zone)", () => {
    const task = makeTask({ energy: "high" });
    expect(getEnergyBoost(task, 7)).toBe(20); // Morning = high
  });

  it("returns 20 for a perfect match (medium task in Mid-morning zone)", () => {
    const task = makeTask({ energy: "medium" });
    expect(getEnergyBoost(task, 10)).toBe(20); // Mid-morning = medium
  });

  it("returns 20 for a perfect match (low task in Afternoon zone)", () => {
    const task = makeTask({ energy: "low" });
    expect(getEnergyBoost(task, 13)).toBe(20); // Afternoon = low
  });

  it("returns 10 for an adjacent match (medium task in Morning zone)", () => {
    const task = makeTask({ energy: "medium" });
    expect(getEnergyBoost(task, 7)).toBe(10); // Morning = high; medium is one away
  });

  it("returns 10 for an adjacent match (low task in Mid-morning zone)", () => {
    const task = makeTask({ energy: "low" });
    expect(getEnergyBoost(task, 10)).toBe(10); // Mid-morning = medium; low is one away
  });

  it("returns 0 for a two-level mismatch (high task in Afternoon zone)", () => {
    const task = makeTask({ energy: "high" });
    expect(getEnergyBoost(task, 13)).toBe(0); // Afternoon = low; high is two away
  });

  it("returns 0 for a two-level mismatch (low task in Morning zone)", () => {
    const task = makeTask({ energy: "low" });
    expect(getEnergyBoost(task, 7)).toBe(0); // Morning = high; low is two away
  });

  it("returns 20 for perfect match in Evening zone (low task)", () => {
    const task = makeTask({ energy: "low" });
    expect(getEnergyBoost(task, 20)).toBe(20); // Evening = low
  });

  it("returns 20 for perfect match in Early morning zone (low task)", () => {
    const task = makeTask({ energy: "low" });
    expect(getEnergyBoost(task, 3)).toBe(20); // Early morning = low
  });
});

// ---------------------------------------------------------------------------
// getEnergyMatchLabel
// ---------------------------------------------------------------------------

describe("getEnergyMatchLabel", () => {
  it("returns null when task has no energy level", () => {
    const task = makeTask({ energy: undefined });
    expect(getEnergyMatchLabel(task)).toBeNull();
  });

  it("returns a non-null label when energy matches the current zone", () => {
    // We can't control the current hour in getEnergyMatchLabel since it uses
    // new Date().getHours() internally. So we test that the function:
    // (a) returns null for no energy
    // (b) returns a string when called with a matching task
    // We'll verify the shape of the returned value.
    const task = makeTask({ energy: "low" });
    const result = getEnergyMatchLabel(task);
    // result is either null or a non-empty string
    if (result !== null) {
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("returns a label containing the zone name when it is a match", () => {
    // Get the current zone, build a matching task, verify label format.
    const zone = getCurrentEnergyZone();
    const task = makeTask({ energy: zone.recommended });
    const label = getEnergyMatchLabel(task);
    expect(label).not.toBeNull();
    expect(label!.toLowerCase()).toContain(zone.name.toLowerCase());
  });

  it("returns null when task energy does not match current zone", () => {
    // Get the current zone and find a non-matching energy level.
    const zone = getCurrentEnergyZone();
    const allLevels = ["low", "medium", "high"] as const;
    const mismatch = allLevels.find(l => l !== zone.recommended);
    // Should always find a mismatch (there are 3 levels, only 1 matches)
    if (!mismatch) return;

    // getEnergyMatchLabel only returns a non-null value for an exact match,
    // so any non-matching energy yields null.
    const task = makeTask({ energy: mismatch });
    const label = getEnergyMatchLabel(task);
    expect(label).toBeNull();
  });
});
