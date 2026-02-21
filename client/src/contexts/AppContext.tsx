import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { nanoid } from "nanoid";
import type {
  Task,
  Pomodoro,
  PomodoroLink,
  TimerSettings,
  DailyStats,
  AppState,
  Priority,
  QuadrantType,
  Category,
  EnergyLevel,
  RecurrenceFrequency,
  Subtask,
  TaskTemplate,
  AppPreferences,
  ReadingItem,
  ReadingStatus,
  Reminder,
  ContextFilter,
} from "@/lib/types";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "@/lib/types";
import {
  loadState,
  saveState,
  pollTimestamp,
  setSaveErrorHandler,
  setSaveSuccessHandler,
} from "@/lib/sheets";

// ---- Actions ----
type Action =
  | { type: "LOAD_STATE"; payload: AppState }
  | {
      type: "ADD_TASK";
      payload: {
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
      };
    }
  | { type: "UPDATE_TASK"; payload: Partial<Task> & { id: string } }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "TOGGLE_TASK"; payload: string }
  | {
      type: "MOVE_TASK_QUADRANT";
      payload: { id: string; quadrant: QuadrantType };
    }
  | { type: "ADD_SUBTASK"; payload: { taskId: string; title: string } }
  | { type: "TOGGLE_SUBTASK"; payload: { taskId: string; subtaskId: string } }
  | { type: "DELETE_SUBTASK"; payload: { taskId: string; subtaskId: string } }
  | {
      type: "UPDATE_SUBTASK";
      payload: { taskId: string; subtaskId: string; title: string };
    }
  | {
      type: "ADD_POMODORO";
      payload: {
        title: string;
        duration: number;
        linkedTaskId?: string;
        linkedTasks?: PomodoroLink[];
      };
    }
  | { type: "UPDATE_POMODORO"; payload: Partial<Pomodoro> & { id: string } }
  | { type: "DELETE_POMODORO"; payload: string }
  | { type: "TICK_POMODORO"; payload: string }
  | { type: "COMPLETE_POMODORO"; payload: string }
  | { type: "UPDATE_SETTINGS"; payload: TimerSettings }
  | { type: "UPDATE_DAILY_STATS"; payload: Partial<DailyStats> }
  | { type: "SET_STREAK"; payload: number }
  | { type: "REORDER_TASKS"; payload: string[] }
  | { type: "ADD_TEMPLATE"; payload: TaskTemplate }
  | { type: "DELETE_TEMPLATE"; payload: string }
  | { type: "APPLY_TEMPLATE"; payload: string }
  | { type: "UPDATE_PREFERENCES"; payload: Partial<AppPreferences> }
  | {
      type: "ADD_READING_ITEM";
      payload: {
        url: string;
        title: string;
        description?: string;
        tags?: string[];
      };
    }
  | {
      type: "UPDATE_READING_ITEM";
      payload: Partial<ReadingItem> & { id: string };
    }
  | { type: "DELETE_READING_ITEM"; payload: string }
  | {
      type: "MARK_READING_STATUS";
      payload: { id: string; status: ReadingStatus };
    }
  | {
      type: "ADD_REMINDER";
      payload: {
        title: string;
        description?: string;
        date: string;
        time?: string;
        recurrence: Reminder["recurrence"];
        category: Reminder["category"];
      };
    }
  | { type: "UPDATE_REMINDER"; payload: Partial<Reminder> & { id: string } }
  | { type: "DELETE_REMINDER"; payload: string }
  | { type: "ACK_REMINDER"; payload: string }
  | { type: "UNACK_REMINDER"; payload: string }
  | { type: "PIN_TO_TODAY"; payload: string }
  | { type: "UNPIN_FROM_TODAY"; payload: string }
  | { type: "SET_CONTEXT"; payload: ContextFilter }
  | { type: "TOGGLE_MONITOR"; payload: string }
  | { type: "UNDO" }
  | { type: "REDO" };

const initialState: AppState = {
  tasks: [],
  pomodoros: [],
  settings: { ...DEFAULT_SETTINGS },
  dailyStats: [],
  currentStreak: 0,
  templates: [],
  preferences: { ...DEFAULT_PREFERENCES },
  readingList: [],
  reminders: [],
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getTodayStats(stats: DailyStats[]): DailyStats {
  const today = getToday();
  return (
    stats.find(s => s.date === today) || {
      date: today,
      tasksCompleted: 0,
      focusMinutes: 0,
      pomodorosCompleted: 0,
    }
  );
}

function updateTodayStats(
  stats: DailyStats[],
  update: Partial<DailyStats>
): DailyStats[] {
  const today = getToday();
  const existing = stats.find(s => s.date === today);
  if (existing) {
    return stats.map(s => (s.date === today ? { ...s, ...update } : s));
  }
  return [
    ...stats,
    {
      date: today,
      tasksCompleted: 0,
      focusMinutes: 0,
      pomodorosCompleted: 0,
      ...update,
    },
  ];
}

function computeNextDate(
  freq: RecurrenceFrequency,
  from: Date,
  task?: {
    recurrenceDayOfMonth?: number | null;
    recurrenceStartMonth?: number | null;
  }
): string | undefined {
  const d = new Date(from);
  switch (freq) {
    case "daily":
      d.setDate(d.getDate() + 1);
      return d.toISOString();
    case "weekly":
      d.setDate(d.getDate() + 7);
      return d.toISOString();
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    case "quarterly": {
      // Quarterly: advance to the next quarter month (every 3 months)
      // Uses recurrenceStartMonth to determine the quarter cycle and recurrenceDayOfMonth for the day
      const dayOfMonth = task?.recurrenceDayOfMonth || d.getDate();
      const startMonth = task?.recurrenceStartMonth || d.getMonth() + 1; // 1-indexed
      // Quarter months based on start: e.g., start=2 → [2, 5, 8, 11]
      const quarterMonths = [0, 3, 6, 9].map(
        offset => ((startMonth - 1 + offset) % 12) + 1
      );
      const currentMonth = d.getMonth() + 1; // 1-indexed
      const currentDay = d.getDate();
      // Find the next quarter month after current date
      let nextMonth = quarterMonths.find(
        m => m > currentMonth || (m === currentMonth && dayOfMonth > currentDay)
      );
      let nextYear = d.getFullYear();
      if (!nextMonth) {
        // Wrap to next year's first quarter month
        nextMonth = quarterMonths[0];
        nextYear += 1;
      }
      const next = new Date(nextYear, nextMonth - 1, dayOfMonth);
      return next.toISOString();
    }
    case "weekdays": {
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    default:
      return undefined;
  }
}

interface UndoableState {
  current: AppState;
  past: AppState[];
  future: AppState[];
}

const MAX_HISTORY = 50;
const NON_UNDOABLE_ACTIONS = new Set([
  "LOAD_STATE",
  "TICK_POMODORO",
  "UNDO",
  "REDO",
  "UPDATE_DAILY_STATS",
  "SET_STREAK",
]);

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD_STATE":
      return {
        ...action.payload,
        templates: action.payload.templates || [],
        preferences: { ...DEFAULT_PREFERENCES, ...action.payload.preferences },
        readingList: action.payload.readingList || [],
        reminders: action.payload.reminders || [],
      };

    case "ADD_TASK": {
      const subtasks: Subtask[] = (action.payload.subtasks || []).map(s => ({
        id: nanoid(),
        title: s.title,
        done: false,
      }));
      const task: Task = {
        id: nanoid(),
        title: action.payload.title,
        description: action.payload.description,
        priority: action.payload.priority,
        status: "active",
        dueDate: action.payload.dueDate,
        category: action.payload.category,
        energy: action.payload.energy,
        quadrant: "unassigned",
        createdAt: new Date().toISOString(),
        recurrence: action.payload.recurrence,
        recurrenceDayOfMonth: action.payload.recurrenceDayOfMonth,
        recurrenceStartMonth: action.payload.recurrenceStartMonth,
        recurrenceNextDate:
          action.payload.recurrence && action.payload.recurrence !== "none"
            ? computeNextDate(action.payload.recurrence, new Date(), {
                recurrenceDayOfMonth: action.payload.recurrenceDayOfMonth,
                recurrenceStartMonth: action.payload.recurrenceStartMonth,
              })
            : undefined,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload } : t
        ),
      };

    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
      };

    case "TOGGLE_TASK": {
      const task = state.tasks.find(t => t.id === action.payload);
      if (!task) return state;
      const newStatus = task.status === "active" ? "done" : "active";
      const todayStats = getTodayStats(state.dailyStats);
      const delta = newStatus === "done" ? 1 : -1;

      let tasks = state.tasks.map(t =>
        t.id === action.payload
          ? {
              ...t,
              status: newStatus as Task["status"],
              completedAt:
                newStatus === "done" ? new Date().toISOString() : undefined,
              statusChangedAt: new Date().toISOString(),
              pinnedToday: newStatus === "done" ? null : t.pinnedToday, // Clear pin on completion
              subtasks:
                newStatus === "done" && t.subtasks
                  ? t.subtasks.map(s => ({ ...s, done: true }))
                  : newStatus === "active" && t.subtasks
                    ? t.subtasks.map(s => ({ ...s, done: false }))
                    : t.subtasks,
            }
          : t
      );

      // H7 fix: Check for existing pending recurrence before spawning duplicate
      const hasPendingRecurrence = tasks.some(
        t => t.recurrenceParentId === task.id && t.status === "active"
      );
      if (
        newStatus === "done" &&
        task.recurrence &&
        task.recurrence !== "none" &&
        !hasPendingRecurrence
      ) {
        const nextDate = computeNextDate(task.recurrence, new Date(), {
          recurrenceDayOfMonth: task.recurrenceDayOfMonth,
          recurrenceStartMonth: task.recurrenceStartMonth,
        });
        const newTask: Task = {
          id: nanoid(),
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: "active",
          dueDate: nextDate?.split("T")[0],
          category: task.category,
          energy: task.energy,
          quadrant: task.quadrant,
          createdAt: new Date().toISOString(),
          recurrence: task.recurrence,
          recurrenceDayOfMonth: task.recurrenceDayOfMonth,
          recurrenceStartMonth: task.recurrenceStartMonth,
          recurrenceParentId: task.id,
          recurrenceNextDate: nextDate,
          subtasks: task.subtasks?.map(s => ({
            id: nanoid(),
            title: s.title,
            done: false,
          })),
        };
        tasks = [newTask, ...tasks];
      }

      return {
        ...state,
        tasks,
        dailyStats: updateTodayStats(state.dailyStats, {
          tasksCompleted: Math.max(0, todayStats.tasksCompleted + delta),
        }),
      };
    }

    case "TOGGLE_MONITOR": {
      const task = state.tasks.find(t => t.id === action.payload);
      if (!task) return state;
      // Toggle between active and monitored. If done, move to monitored.
      const newStatus = task.status === "monitored" ? "active" : "monitored";
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload
            ? {
                ...t,
                status: newStatus as Task["status"],
                statusChangedAt: new Date().toISOString(),
                // Clear pin when moving to monitored (not actionable)
                pinnedToday: newStatus === "monitored" ? null : t.pinnedToday,
              }
            : t
        ),
      };
    }

    case "MOVE_TASK_QUADRANT":
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id
            ? { ...t, quadrant: action.payload.quadrant }
            : t
        ),
      };

    case "ADD_SUBTASK": {
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id !== action.payload.taskId) return t;
          const newSubtask: Subtask = {
            id: nanoid(),
            title: action.payload.title,
            done: false,
          };
          return { ...t, subtasks: [...(t.subtasks || []), newSubtask] };
        }),
      };
    }

    case "TOGGLE_SUBTASK": {
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id !== action.payload.taskId) return t;
          return {
            ...t,
            subtasks: (t.subtasks || []).map(s =>
              s.id === action.payload.subtaskId ? { ...s, done: !s.done } : s
            ),
          };
        }),
      };
    }

    case "DELETE_SUBTASK": {
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id !== action.payload.taskId) return t;
          return {
            ...t,
            subtasks: (t.subtasks || []).filter(
              s => s.id !== action.payload.subtaskId
            ),
          };
        }),
      };
    }

    case "UPDATE_SUBTASK": {
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id !== action.payload.taskId) return t;
          return {
            ...t,
            subtasks: (t.subtasks || []).map(s =>
              s.id === action.payload.subtaskId
                ? { ...s, title: action.payload.title }
                : s
            ),
          };
        }),
      };
    }

    case "ADD_POMODORO": {
      const pom: Pomodoro = {
        id: nanoid(),
        title: action.payload.title,
        duration: action.payload.duration,
        elapsed: 0,
        status: "idle",
        createdAt: new Date().toISOString(),
        linkedTaskId: action.payload.linkedTaskId,
        linkedTasks: action.payload.linkedTasks,
      };
      return { ...state, pomodoros: [pom, ...state.pomodoros] };
    }

    case "UPDATE_POMODORO":
      return {
        ...state,
        pomodoros: state.pomodoros.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      };

    case "DELETE_POMODORO":
      return {
        ...state,
        pomodoros: state.pomodoros.filter(p => p.id !== action.payload),
      };

    case "TICK_POMODORO":
      return {
        ...state,
        pomodoros: state.pomodoros.map(p =>
          p.id === action.payload && p.status === "running"
            ? { ...p, elapsed: p.elapsed + 1 }
            : p
        ),
      };

    case "COMPLETE_POMODORO": {
      const pom = state.pomodoros.find(p => p.id === action.payload);
      if (!pom) return state;
      const todayStats = getTodayStats(state.dailyStats);
      return {
        ...state,
        pomodoros: state.pomodoros.map(p =>
          p.id === action.payload
            ? {
                ...p,
                status: "completed",
                completedAt: new Date().toISOString(),
                startedAt: undefined,
                accumulatedSeconds: undefined,
              }
            : p
        ),
        dailyStats: updateTodayStats(state.dailyStats, {
          // H9 fix: Use actual elapsed time, not planned duration
          focusMinutes:
            todayStats.focusMinutes + Math.round((pom.elapsed || 0) / 60),
          pomodorosCompleted: todayStats.pomodorosCompleted + 1,
        }),
      };
    }

    case "UPDATE_SETTINGS":
      return { ...state, settings: action.payload };

    case "UPDATE_DAILY_STATS":
      return {
        ...state,
        dailyStats: updateTodayStats(state.dailyStats, action.payload),
      };

    case "SET_STREAK":
      return { ...state, currentStreak: action.payload };

    case "REORDER_TASKS": {
      const orderedIds = action.payload;
      const taskMap = new Map(state.tasks.map(t => [t.id, t]));
      const reordered = orderedIds
        .map(id => taskMap.get(id))
        .filter(Boolean) as Task[];
      const remaining = state.tasks.filter(t => !orderedIds.includes(t.id));
      return { ...state, tasks: [...reordered, ...remaining] };
    }

    case "ADD_TEMPLATE": {
      const templates = [...(state.templates || []), action.payload];
      return { ...state, templates };
    }

    case "DELETE_TEMPLATE": {
      return {
        ...state,
        templates: (state.templates || []).filter(t => t.id !== action.payload),
      };
    }

    case "APPLY_TEMPLATE": {
      const template = (state.templates || []).find(
        t => t.id === action.payload
      );
      if (!template) return state;
      const newTasks: Task[] = template.tasks.map(t => ({
        id: nanoid(),
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: "active" as const,
        category: t.category,
        energy: t.energy,
        quadrant: "unassigned" as const,
        createdAt: new Date().toISOString(),
        subtasks: t.subtasks?.map(s => ({
          id: nanoid(),
          title: s.title,
          done: false,
        })),
      }));
      return { ...state, tasks: [...newTasks, ...state.tasks] };
    }

    case "UPDATE_PREFERENCES": {
      return {
        ...state,
        preferences: {
          ...(state.preferences || DEFAULT_PREFERENCES),
          ...action.payload,
        },
      };
    }

    case "ADD_READING_ITEM": {
      let domain = "";
      try {
        domain = new URL(action.payload.url).hostname.replace("www.", "");
      } catch {
        /* ignore */
      }
      const item: ReadingItem = {
        id: nanoid(),
        url: action.payload.url,
        title: action.payload.title,
        description: action.payload.description,
        tags: action.payload.tags || [],
        status: "unread",
        domain,
        createdAt: new Date().toISOString(),
      };
      return { ...state, readingList: [item, ...(state.readingList || [])] };
    }

    case "UPDATE_READING_ITEM": {
      return {
        ...state,
        readingList: (state.readingList || []).map(r =>
          r.id === action.payload.id ? { ...r, ...action.payload } : r
        ),
      };
    }

    case "DELETE_READING_ITEM": {
      return {
        ...state,
        readingList: (state.readingList || []).filter(
          r => r.id !== action.payload
        ),
      };
    }

    case "MARK_READING_STATUS": {
      return {
        ...state,
        readingList: (state.readingList || []).map(r =>
          r.id === action.payload.id
            ? {
                ...r,
                status: action.payload.status,
                readAt:
                  action.payload.status === "read"
                    ? new Date().toISOString()
                    : r.readAt,
              }
            : r
        ),
      };
    }

    case "ADD_REMINDER": {
      const reminder: Reminder = {
        id: nanoid(),
        title: action.payload.title,
        description: action.payload.description,
        date: action.payload.date,
        time: action.payload.time,
        recurrence: action.payload.recurrence,
        category: action.payload.category,
        createdAt: new Date().toISOString(),
      };
      return { ...state, reminders: [reminder, ...(state.reminders || [])] };
    }

    case "UPDATE_REMINDER": {
      return {
        ...state,
        reminders: (state.reminders || []).map(r =>
          r.id === action.payload.id ? { ...r, ...action.payload } : r
        ),
      };
    }

    case "DELETE_REMINDER": {
      return {
        ...state,
        reminders: (state.reminders || []).filter(r => r.id !== action.payload),
      };
    }

    case "ACK_REMINDER": {
      const reminder = (state.reminders || []).find(
        r => r.id === action.payload
      );
      if (!reminder) return state;
      if (reminder.recurrence === "none") {
        // One-off: mark acknowledged
        return {
          ...state,
          reminders: (state.reminders || []).map(r =>
            r.id === action.payload
              ? {
                  ...r,
                  acknowledged: true,
                  acknowledgedAt: new Date().toISOString(),
                }
              : r
          ),
        };
      }
      // Recurring: advance to next occurrence
      const d = new Date(reminder.date);
      if (reminder.recurrence === "yearly") d.setFullYear(d.getFullYear() + 1);
      else if (reminder.recurrence === "quarterly")
        d.setMonth(d.getMonth() + 3);
      else if (reminder.recurrence === "monthly") d.setMonth(d.getMonth() + 1);
      else if (reminder.recurrence === "weekly") d.setDate(d.getDate() + 7);
      return {
        ...state,
        reminders: (state.reminders || []).map(r =>
          r.id === action.payload
            ? {
                ...r,
                date: d.toISOString().split("T")[0],
                acknowledged: false,
                acknowledgedAt: undefined,
              }
            : r
        ),
      };
    }

    case "UNACK_REMINDER": {
      const reminder = (state.reminders || []).find(
        r => r.id === action.payload
      );
      if (!reminder) return state;
      return {
        ...state,
        reminders: (state.reminders || []).map(r =>
          r.id === action.payload
            ? { ...r, acknowledged: false, acknowledgedAt: undefined }
            : r
        ),
      };
    }

    case "PIN_TO_TODAY": {
      const todayDate = new Date().toISOString().split("T")[0];
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload ? { ...t, pinnedToday: todayDate } : t
        ),
      };
    }

    case "SET_CONTEXT": {
      return {
        ...state,
        preferences: {
          ...(state.preferences || DEFAULT_PREFERENCES),
          activeContext: action.payload,
        },
      };
    }

    case "UNPIN_FROM_TODAY": {
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload ? { ...t, pinnedToday: null } : t
        ),
      };
    }

    default:
      return state;
  }
}

function undoableReducer(state: UndoableState, action: Action): UndoableState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      current: previous,
      past: state.past.slice(0, -1),
      future: [state.current, ...state.future].slice(0, MAX_HISTORY),
    };
  }

  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      current: next,
      past: [...state.past, state.current].slice(-MAX_HISTORY),
      future: state.future.slice(1),
    };
  }

  const newCurrent = appReducer(state.current, action);
  if (newCurrent === state.current) return state;

  if (NON_UNDOABLE_ACTIONS.has(action.type)) {
    return { ...state, current: newCurrent };
  }

  return {
    current: newCurrent,
    past: [...state.past, state.current].slice(-MAX_HISTORY),
    future: [],
  };
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  syncToCloud: () => Promise<void>;
  reloadState: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveStatus: "ok" | "saving" | "error";
  saveError: string | null;
}

const AppContext = createContext<AppContextType | null>(null);

const POLL_INTERVAL = 5000;

export function AppProvider({ children }: { children: ReactNode }) {
  const [undoState, rawDispatch] = useReducer(undoableReducer, {
    current: initialState,
    past: [],
    future: [],
  });

  const state = undoState.current;
  const stateRef = useRef(state);
  const loadedRef = useRef(false);
  const lastTimestampRef = useRef(0);
  const dirtyRef = useRef(false);

  stateRef.current = state;

  const [saveStatus, setSaveStatus] = useState<"ok" | "saving" | "error">("ok");
  const [saveError, setSaveError] = useState<string | null>(null);

  const dispatch = useCallback((action: Action) => {
    // Mark state as dirty for user-initiated actions (not loads/system actions)
    if (!NON_UNDOABLE_ACTIONS.has(action.type)) {
      dirtyRef.current = true;
    }
    rawDispatch(action);
  }, []);

  // Register save error/success handlers
  useEffect(() => {
    setSaveErrorHandler((error, failures) => {
      setSaveStatus("error");
      setSaveError(`Save failed (${failures}x): ${error}`);
    });
    setSaveSuccessHandler(() => {
      setSaveStatus("ok");
      setSaveError(null);
    });
  }, []);

  const loadStartedRef = useRef(false);
  useEffect(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    // C1 fix: set loadedRef AFTER load completes, not before
    loadState().then(loaded => {
      dispatch({ type: "LOAD_STATE", payload: loaded });
      loadedRef.current = true;
      pollTimestamp()
        .then(ts => {
          lastTimestampRef.current = ts;
        })
        .catch(() => {});
    });
  }, [dispatch]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!loadedRef.current) return;
    clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(() => {
      saveState(stateRef.current).then(ok => {
        if (ok) {
          // C2 fix: clear dirty flag after successful save
          dirtyRef.current = false;
          setSaveStatus("ok");
          setSaveError(null);
          pollTimestamp()
            .then(ts => {
              lastTimestampRef.current = ts;
            })
            .catch(() => {});
        }
        // Error state is set by the error handler in sheets.ts
      });
    }, 500);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [state]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const serverTs = await pollTimestamp();
        if (
          serverTs > 0 &&
          lastTimestampRef.current > 0 &&
          serverTs > lastTimestampRef.current + 1000
        ) {
          // C2 fix: skip poll reload if local changes are unsaved
          if (dirtyRef.current) return;
          const loaded = await loadState();
          dispatch({ type: "LOAD_STATE", payload: loaded });
          lastTimestampRef.current = serverTs;
        }
      } catch {
        // Polling failed, ignore
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [dispatch]);

  const syncToCloud = useCallback(async () => {
    await saveState(stateRef.current);
  }, []);

  const reloadState = useCallback(async () => {
    const loaded = await loadState();
    dispatch({ type: "LOAD_STATE", payload: loaded });
  }, [dispatch]);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "REDO" }), [dispatch]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        syncToCloud,
        reloadState,
        canUndo: undoState.past.length > 0,
        canRedo: undoState.future.length > 0,
        undo,
        redo,
        saveStatus,
        saveError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    // During Vite HMR, the context can temporarily be null when modules are invalidated.
    // Return a safe fallback instead of crashing — the component will re-render once HMR settles.
    if (import.meta.hot) {
      console.warn(
        "[AppContext] Context unavailable during HMR, returning fallback state"
      );
      const noop = () => {};
      return {
        state: initialState,
        dispatch: noop as any,
        syncToCloud: async () => {},
        reloadState: async () => {},
        canUndo: false,
        canRedo: false,
        undo: noop,
        redo: noop,
        saveStatus: "ok" as const,
        saveError: null,
      };
    }
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
