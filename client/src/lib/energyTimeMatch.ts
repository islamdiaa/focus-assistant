/**
 * Energy-Time Matching — smart task sorting by time of day.
 *
 * ADHD users benefit from matching task energy requirements to their natural
 * energy levels throughout the day. This module defines time-of-day energy
 * zones and provides utilities to score, label, and recommend tasks based on
 * the current hour.
 */
import type { Task, EnergyLevel } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Energy zone definitions                                           */
/* ------------------------------------------------------------------ */

export interface EnergyZone {
  /** Human-readable zone name */
  name: string;
  /** Start hour (inclusive, 24-h) */
  startHour: number;
  /** End hour (exclusive, 24-h) */
  endHour: number;
  /** Recommended task energy level for this zone */
  recommended: EnergyLevel;
  /** Short description shown in the UI */
  description: string;
}

const ENERGY_ZONES: EnergyZone[] = [
  {
    name: "Morning",
    startHour: 6,
    endHour: 10,
    recommended: "high",
    description: "Peak focus — tackle demanding tasks",
  },
  {
    name: "Mid-morning",
    startHour: 10,
    endHour: 12,
    recommended: "medium",
    description: "Steady energy — great for planning & collaboration",
  },
  {
    name: "Afternoon",
    startHour: 12,
    endHour: 15,
    recommended: "low",
    description: "Post-lunch dip — routine & low-effort tasks",
  },
  {
    name: "Late afternoon",
    startHour: 15,
    endHour: 17,
    recommended: "medium",
    description: "Second wind — good for medium-effort work",
  },
  {
    name: "Evening",
    startHour: 17,
    endHour: 24, // 17:00–midnight
    recommended: "low",
    description: "Wind down — light tasks & review",
  },
];

// Early-morning fallback (midnight–6 AM) maps to low energy
const EARLY_MORNING_ZONE: EnergyZone = {
  name: "Early morning",
  startHour: 0,
  endHour: 6,
  recommended: "low",
  description: "Rest period — only light tasks if needed",
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Return the energy zone for the given hour (0-23).
 * Defaults to the current hour when omitted.
 */
export function getCurrentEnergyZone(hour?: number): EnergyZone {
  const h = hour ?? new Date().getHours();
  const zone = ENERGY_ZONES.find(z => h >= z.startHour && h < z.endHour);
  return zone ?? EARLY_MORNING_ZONE;
}

/**
 * Numeric energy-match bonus (0–20) used by the task suggestion engine.
 *
 * - 20 = perfect match (task energy === zone recommended)
 * - 10 = adjacent match (e.g. medium task in a high zone)
 * -  0 = no match / missing data
 */
export function getEnergyBoost(task: Task, currentHour?: number): number {
  if (!task.energy) return 0;

  const zone = getCurrentEnergyZone(currentHour);

  if (task.energy === zone.recommended) return 20;

  // Adjacent-match bonus: one level away
  const levels: EnergyLevel[] = ["low", "medium", "high"];
  const taskIdx = levels.indexOf(task.energy);
  const zoneIdx = levels.indexOf(zone.recommended);
  if (Math.abs(taskIdx - zoneIdx) === 1) return 10;

  return 0;
}

/**
 * Human-readable label for use in the UI, e.g.
 *   "Good fit for morning energy"
 *   "Matches your afternoon wind-down"
 *
 * Returns `null` when no meaningful match exists.
 */
export function getEnergyMatchLabel(task: Task): string | null {
  if (!task.energy) return null;

  const zone = getCurrentEnergyZone();

  if (task.energy === zone.recommended) {
    return `Good fit for ${zone.name.toLowerCase()} energy`;
  }

  return null;
}
