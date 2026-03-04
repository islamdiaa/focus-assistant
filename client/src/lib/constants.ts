/**
 * Shared lookup constants for task display.
 * Used by TasksPage, DailyPlannerPage, and other components.
 */
import type {
  Priority,
  Category,
  EnergyLevel,
  RecurrenceFrequency,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Config shape types                                                */
/* ------------------------------------------------------------------ */

export interface CategoryConfig {
  emoji: string;
  label: string;
}

export interface EnergyConfig {
  emoji: string;
  label: string;
}

export interface RecurrenceConfig {
  label: string;
  short: string;
}

/* ------------------------------------------------------------------ */
/*  Priority                                                          */
/* ------------------------------------------------------------------ */

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent:
    "bg-warm-terracotta/15 text-warm-terracotta border-warm-terracotta/30",
  high: "bg-warm-terracotta-light text-warm-terracotta border-warm-terracotta/20",
  medium: "bg-warm-amber-light text-warm-amber border-warm-amber/20",
  low: "bg-warm-sage-light text-warm-sage border-warm-sage/20",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/* ------------------------------------------------------------------ */
/*  Category                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  work: { emoji: "\u{1F4BC}", label: "Work" },
  personal: { emoji: "\u{1F3E0}", label: "Personal" },
  health: { emoji: "\u{1F4AA}", label: "Health" },
  learning: { emoji: "\u{1F4DA}", label: "Learning" },
  errands: { emoji: "\u{1F6D2}", label: "Errands" },
  other: { emoji: "\u{1F4CC}", label: "Other" },
};

/* ------------------------------------------------------------------ */
/*  Energy                                                            */
/* ------------------------------------------------------------------ */

export const ENERGY_CONFIG: Record<EnergyLevel, EnergyConfig> = {
  low: { emoji: "\u{1F50B}", label: "Low Energy" },
  medium: { emoji: "\u26A1", label: "Medium Energy" },
  high: { emoji: "\u{1F525}", label: "High Energy" },
};

/* ------------------------------------------------------------------ */
/*  Recurrence                                                        */
/* ------------------------------------------------------------------ */

export const RECURRENCE_CONFIG: Record<RecurrenceFrequency, RecurrenceConfig> =
  {
    none: { label: "No Repeat", short: "" },
    daily: { label: "Daily", short: "Daily" },
    weekly: { label: "Weekly", short: "Weekly" },
    monthly: { label: "Monthly", short: "Monthly" },
    quarterly: { label: "Quarterly", short: "Quarterly" },
    weekdays: { label: "Weekdays", short: "Weekdays" },
  };
