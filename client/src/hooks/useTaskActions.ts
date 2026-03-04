/**
 * useTaskActions — domain hook for task-related state mutations.
 *
 * Wraps AppContext dispatch calls into a clean task API so callers
 * never need to know about action type strings or payload shapes.
 * This hook is purely additive: it does not modify AppContext or
 * change the provider tree. Existing code using dispatch directly
 * continues to work unchanged.
 *
 * Usage:
 *   const { addTask, toggleTask, deleteTask } = useTaskActions();
 */

import { useCallback, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import type {
  Task,
  Priority,
  Category,
  EnergyLevel,
  RecurrenceFrequency,
  QuadrantType,
} from "@/lib/types";

/** Fields accepted when creating a new task. Mirrors the ADD_TASK action payload. */
export interface NewTaskInput {
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  category?: Category;
  energy?: EnergyLevel;
  recurrence?: RecurrenceFrequency;
  recurrenceDayOfMonth?: number;
  recurrenceStartMonth?: number;
  subtasks?: Array<{ title: string }>;
  estimatedMinutes?: number;
}

export function useTaskActions() {
  const { dispatch } = useApp();

  return useMemo(
    () => ({
      addTask: (task: NewTaskInput) =>
        dispatch({ type: "ADD_TASK", payload: task }),

      addTaskAndPinToday: (task: NewTaskInput) =>
        dispatch({ type: "ADD_TASK_AND_PIN_TODAY", payload: task }),

      toggleTask: (id: string) =>
        dispatch({ type: "TOGGLE_TASK", payload: id }),

      updateTask: (task: Partial<Task> & { id: string }) =>
        dispatch({ type: "UPDATE_TASK", payload: task }),

      deleteTask: (id: string) =>
        dispatch({ type: "DELETE_TASK", payload: id }),

      reorderTasks: (taskIds: string[]) =>
        dispatch({ type: "REORDER_TASKS", payload: taskIds }),

      moveTaskQuadrant: (id: string, quadrant: QuadrantType) =>
        dispatch({ type: "MOVE_TASK_QUADRANT", payload: { id, quadrant } }),

      pinToToday: (id: string) =>
        dispatch({ type: "PIN_TO_TODAY", payload: id }),

      unpinFromToday: (id: string) =>
        dispatch({ type: "UNPIN_FROM_TODAY", payload: id }),

      toggleFocusGoal: (id: string) =>
        dispatch({ type: "TOGGLE_FOCUS_GOAL", payload: id }),

      bulkCompleteTasks: (ids: string[]) =>
        dispatch({ type: "BULK_COMPLETE_TASKS", payload: ids }),

      bulkDeleteTasks: (ids: string[]) =>
        dispatch({ type: "BULK_DELETE_TASKS", payload: ids }),

      bulkPinToday: (ids: string[]) =>
        dispatch({ type: "BULK_PIN_TODAY", payload: ids }),

      bulkSetQuadrant: (taskIds: string[], quadrant: QuadrantType) =>
        dispatch({
          type: "BULK_SET_QUADRANT",
          payload: { taskIds, quadrant },
        }),

      addSubtask: (taskId: string, title: string) =>
        dispatch({ type: "ADD_SUBTASK", payload: { taskId, title } }),

      toggleSubtask: (taskId: string, subtaskId: string) =>
        dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId } }),

      updateSubtask: (taskId: string, subtaskId: string, title: string) =>
        dispatch({
          type: "UPDATE_SUBTASK",
          payload: { taskId, subtaskId, title },
        }),

      deleteSubtask: (taskId: string, subtaskId: string) =>
        dispatch({ type: "DELETE_SUBTASK", payload: { taskId, subtaskId } }),
    }),
    [dispatch]
  );
}
