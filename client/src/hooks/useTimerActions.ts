/**
 * useTimerActions — domain hook for timer and pomodoro state mutations.
 *
 * Wraps AppContext dispatch calls into a clean pomodoro/timer API so
 * callers never need to know about action type strings or payload shapes.
 * This hook is purely additive: it does not modify AppContext or change
 * the provider tree. Existing code using dispatch directly continues to
 * work unchanged.
 *
 * Usage:
 *   const { addPomodoro, updatePomodoro, updateSettings } = useTimerActions();
 */

import { useApp } from "@/contexts/AppContext";
import type { Pomodoro, PomodoroLink, TimerSettings } from "@/lib/types";

/** Fields accepted when creating a new pomodoro session. */
export interface NewPomodoroInput {
  title: string;
  duration: number;
  linkedTaskId?: string;
  linkedTasks?: PomodoroLink[];
}

/**
 * Returns stable action functions for managing pomodoro sessions and
 * timer settings.
 *
 * Note: `addPomodoro` does not require `id`, `elapsed`, `status`, or
 * `createdAt` — the reducer generates those automatically using nanoid().
 */
export function useTimerActions() {
  const { dispatch } = useApp();

  return {
    /**
     * Create a new pomodoro session. The reducer assigns id, elapsed,
     * status ("idle"), and createdAt automatically.
     */
    addPomodoro: (pomodoro: NewPomodoroInput) =>
      dispatch({ type: "ADD_POMODORO", payload: pomodoro }),

    /**
     * Apply a partial update to an existing pomodoro session.
     * `id` is required; all other Pomodoro fields are optional.
     */
    updatePomodoro: (pomodoro: Partial<Pomodoro> & { id: string }) =>
      dispatch({ type: "UPDATE_POMODORO", payload: pomodoro }),

    /** Permanently delete a pomodoro session by id. */
    deletePomodoro: (id: string) =>
      dispatch({ type: "DELETE_POMODORO", payload: id }),

    /**
     * Advance the elapsed counter on a running pomodoro by one second.
     * No-ops if the pomodoro is not in "running" status.
     */
    tickPomodoro: (id: string) =>
      dispatch({ type: "TICK_POMODORO", payload: id }),

    /**
     * Mark a pomodoro session as completed and record its completedAt
     * timestamp.
     */
    completePomodoro: (id: string) =>
      dispatch({ type: "COMPLETE_POMODORO", payload: id }),

    /**
     * Replace the global timer settings (focus duration, break lengths,
     * sessions before long break).
     */
    updateSettings: (settings: TimerSettings) =>
      dispatch({ type: "UPDATE_SETTINGS", payload: settings }),
  };
}
