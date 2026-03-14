/**
 * Shared lookup constants for task and reminder display.
 * Used by TasksPage, DailyPlannerPage, RemindersPage, and other components.
 */
import type {
  Priority,
  Category,
  EnergyLevel,
  RecurrenceFrequency,
  Reminder,
} from "@/lib/types";
import { Bell, Cake, Calendar, Star } from "lucide-react";

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

/* ------------------------------------------------------------------ */
/*  Reminder categories & recurrence                                   */
/* ------------------------------------------------------------------ */

export const REMINDER_CATEGORIES: Record<
  Reminder["category"],
  {
    icon: typeof Bell;
    label: string;
    color: string;
    bg: string;
  }
> = {
  birthday: {
    icon: Cake,
    label: "Birthday",
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
  appointment: {
    icon: Calendar,
    label: "Appointment",
    color: "text-warm-blue",
    bg: "bg-warm-blue-light",
  },
  event: {
    icon: Star,
    label: "Event",
    color: "text-warm-amber",
    bg: "bg-warm-amber-light",
  },
  other: {
    icon: Bell,
    label: "Other",
    color: "text-warm-sage",
    bg: "bg-warm-sage-light",
  },
};

export const REMINDER_RECURRENCE: {
  value: Reminder["recurrence"];
  label: string;
}[] = [
  { value: "none", label: "One-time" },
  { value: "yearly", label: "Yearly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
];

/* ------------------------------------------------------------------ */
/*  Time estimation                                                    */
/* ------------------------------------------------------------------ */

export const ESTIMATED_TIME_PRESETS = [15, 30, 60, 120, 240];

export function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
