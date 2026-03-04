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

/**
 * Returns stable action functions for creating, reading, updating,
 * deleting, and reordering tasks.
 *
 * Note: `addTask` does not require `id` or `createdAt` — the reducer
 * generates those automatically using nanoid().
 *
 * Note: `reorderTasks` accepts an ordered array of task IDs. The
 * reducer will preserve any tasks whose IDs are not in the list by
 * appending them after the explicitly ordered ones.
 */
export function useTaskActions() {
  const { dispatch } = useApp();

  return {
    /**
     * Create a new task. The reducer assigns id, createdAt, status,
     * and quadrant automatically.
     */
    addTask: (task: NewTaskInput) =>
      dispatch({ type: "ADD_TASK", payload: task }),

    /**
     * Create a new task and pin it to today's view in one operation.
     */
    addTaskAndPinToday: (task: NewTaskInput) =>
      dispatch({ type: "ADD_TASK_AND_PIN_TODAY", payload: task }),

    /** Toggle a task's completion status by id. */
    toggleTask: (id: string) => dispatch({ type: "TOGGLE_TASK", payload: id }),

    /**
     * Apply a partial update to an existing task.
     * `id` is required; all other Task fields are optional.
     */
    updateTask: (task: Partial<Task> & { id: string }) =>
      dispatch({ type: "UPDATE_TASK", payload: task }),

    /** Permanently delete a task by id. */
    deleteTask: (id: string) => dispatch({ type: "DELETE_TASK", payload: id }),

    /**
     * Reorder tasks by providing an ordered array of task IDs.
     * Tasks not included in the array are appended after the ordered set.
     */
    reorderTasks: (taskIds: string[]) =>
      dispatch({ type: "REORDER_TASKS", payload: taskIds }),

    /** Move a task to a different Eisenhower matrix quadrant. */
    moveTaskQuadrant: (id: string, quadrant: QuadrantType) =>
      dispatch({ type: "MOVE_TASK_QUADRANT", payload: { id, quadrant } }),

    /** Pin a task to today's view. */
    pinToToday: (id: string) => dispatch({ type: "PIN_TO_TODAY", payload: id }),

    /** Remove a task's today pin. */
    unpinFromToday: (id: string) =>
      dispatch({ type: "UNPIN_FROM_TODAY", payload: id }),

    /** Toggle a task's focus-goal status (max 3 per day). */
    toggleFocusGoal: (id: string) =>
      dispatch({ type: "TOGGLE_FOCUS_GOAL", payload: id }),

    /** Complete multiple tasks at once by their IDs. */
    bulkCompleteTasks: (ids: string[]) =>
      dispatch({ type: "BULK_COMPLETE_TASKS", payload: ids }),

    /** Delete multiple tasks at once by their IDs. */
    bulkDeleteTasks: (ids: string[]) =>
      dispatch({ type: "BULK_DELETE_TASKS", payload: ids }),

    /** Pin multiple tasks to today at once. */
    bulkPinToday: (ids: string[]) =>
      dispatch({ type: "BULK_PIN_TODAY", payload: ids }),

    /** Move multiple tasks to a quadrant at once. */
    bulkSetQuadrant: (taskIds: string[], quadrant: QuadrantType) =>
      dispatch({ type: "BULK_SET_QUADRANT", payload: { taskIds, quadrant } }),

    // ---- Subtask actions ----

    /** Add a new subtask to an existing task. */
    addSubtask: (taskId: string, title: string) =>
      dispatch({ type: "ADD_SUBTASK", payload: { taskId, title } }),

    /** Toggle a subtask's completion status. */
    toggleSubtask: (taskId: string, subtaskId: string) =>
      dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId } }),

    /** Update a subtask's title. */
    updateSubtask: (taskId: string, subtaskId: string, title: string) =>
      dispatch({
        type: "UPDATE_SUBTASK",
        payload: { taskId, subtaskId, title },
      }),

    /** Delete a subtask from a task. */
    deleteSubtask: (taskId: string, subtaskId: string) =>
      dispatch({ type: "DELETE_SUBTASK", payload: { taskId, subtaskId } }),
  };
}
