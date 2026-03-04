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

import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import type { Pomodoro, PomodoroLink, TimerSettings } from "@/lib/types";

/** Fields accepted when creating a new pomodoro session. */
export interface NewPomodoroInput {
  title: string;
  duration: number;
  linkedTaskId?: string;
  linkedTasks?: PomodoroLink[];
}

export function useTimerActions() {
  const { dispatch } = useApp();

  return useMemo(
    () => ({
      addPomodoro: (pomodoro: NewPomodoroInput) =>
        dispatch({ type: "ADD_POMODORO", payload: pomodoro }),

      updatePomodoro: (pomodoro: Partial<Pomodoro> & { id: string }) =>
        dispatch({ type: "UPDATE_POMODORO", payload: pomodoro }),

      deletePomodoro: (id: string) =>
        dispatch({ type: "DELETE_POMODORO", payload: id }),

      tickPomodoro: (id: string) =>
        dispatch({ type: "TICK_POMODORO", payload: id }),

      completePomodoro: (id: string) =>
        dispatch({ type: "COMPLETE_POMODORO", payload: id }),

      updateSettings: (settings: TimerSettings) =>
        dispatch({ type: "UPDATE_SETTINGS", payload: settings }),
    }),
    [dispatch]
  );
}
