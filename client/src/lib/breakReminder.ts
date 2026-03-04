/**
 * Hyperfocus Guard — tracks cumulative work time and provides break reminders.
 * ADHD users often lose track of time during hyperfocus. This provides
 * escalating reminders to take breaks.
 */

const BREAK_THRESHOLDS = [
  {
    minutes: 25,
    message:
      "You've been focused for 25 minutes — nice! Consider a quick stretch.",
    severity: "gentle" as const,
  },
  {
    minutes: 50,
    message: "50 minutes of focus! Time for a 5-10 minute break.",
    severity: "moderate" as const,
  },
  {
    minutes: 90,
    message:
      "90 minutes without a break — your brain needs rest to stay sharp!",
    severity: "urgent" as const,
  },
  {
    minutes: 120,
    message: "2 hours straight! Please take a real break — walk, water, snack.",
    severity: "urgent" as const,
  },
];

export type BreakSeverity = "gentle" | "moderate" | "urgent";

export interface BreakReminder {
  message: string;
  severity: BreakSeverity;
  minutesWorked: number;
}

/**
 * Check if a break reminder should be shown based on cumulative session minutes.
 * Returns the highest-threshold reminder that hasn't been dismissed yet.
 */
export function checkBreakReminder(
  cumulativeMinutes: number,
  dismissedThresholds: number[]
): BreakReminder | null {
  // Find the highest threshold that's been reached but not dismissed
  for (let i = BREAK_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = BREAK_THRESHOLDS[i];
    if (
      cumulativeMinutes >= threshold.minutes &&
      !dismissedThresholds.includes(threshold.minutes)
    ) {
      return {
        message: threshold.message,
        severity: threshold.severity,
        minutesWorked: Math.floor(cumulativeMinutes),
      };
    }
  }
  return null;
}

/**
 * Get severity-based styling classes
 */
export function getBreakSeverityStyles(severity: BreakSeverity) {
  switch (severity) {
    case "gentle":
      return {
        bg: "bg-warm-sage/10 dark:bg-warm-sage/15",
        border: "border-warm-sage/30",
        text: "text-warm-sage",
        icon: "text-warm-sage",
      };
    case "moderate":
      return {
        bg: "bg-warm-amber/10 dark:bg-warm-amber/15",
        border: "border-warm-amber/30",
        text: "text-warm-amber",
        icon: "text-warm-amber",
      };
    case "urgent":
      return {
        bg: "bg-warm-terracotta/10 dark:bg-warm-terracotta/15",
        border: "border-warm-terracotta/30",
        text: "text-warm-terracotta",
        icon: "text-warm-terracotta",
      };
  }
}

export { BREAK_THRESHOLDS };
