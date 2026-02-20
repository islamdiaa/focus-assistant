import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState, type ReactNode } from 'react';
import { nanoid } from 'nanoid';
import type { Task, Pomodoro, TimerSettings, DailyStats, AppState, Priority, QuadrantType, Category, EnergyLevel, RecurrenceFrequency } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { loadState, saveState, pollTimestamp } from '@/lib/sheets';

// ---- Actions ----
type Action =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_TASK'; payload: { title: string; description?: string; priority: Priority; dueDate?: string; category?: Category; energy?: EnergyLevel; recurrence?: RecurrenceFrequency } }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> & { id: string } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'MOVE_TASK_QUADRANT'; payload: { id: string; quadrant: QuadrantType } }
  | { type: 'ADD_POMODORO'; payload: { title: string; duration: number } }
  | { type: 'UPDATE_POMODORO'; payload: Partial<Pomodoro> & { id: string } }
  | { type: 'DELETE_POMODORO'; payload: string }
  | { type: 'TICK_POMODORO'; payload: string }
  | { type: 'COMPLETE_POMODORO'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: TimerSettings }
  | { type: 'UPDATE_DAILY_STATS'; payload: Partial<DailyStats> }
  | { type: 'SET_STREAK'; payload: number }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const initialState: AppState = {
  tasks: [],
  pomodoros: [],
  settings: { ...DEFAULT_SETTINGS },
  dailyStats: [],
  currentStreak: 0,
};

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getTodayStats(stats: DailyStats[]): DailyStats {
  const today = getToday();
  return stats.find(s => s.date === today) || {
    date: today,
    tasksCompleted: 0,
    focusMinutes: 0,
    pomodorosCompleted: 0,
  };
}

function updateTodayStats(stats: DailyStats[], update: Partial<DailyStats>): DailyStats[] {
  const today = getToday();
  const existing = stats.find(s => s.date === today);
  if (existing) {
    return stats.map(s => s.date === today ? { ...s, ...update } : s);
  }
  return [...stats, { date: today, tasksCompleted: 0, focusMinutes: 0, pomodorosCompleted: 0, ...update }];
}

// Compute next recurrence date
function computeNextDate(freq: RecurrenceFrequency, from: Date): string | undefined {
  const d = new Date(from);
  switch (freq) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      return d.toISOString();
    case 'weekly':
      d.setDate(d.getDate() + 7);
      return d.toISOString();
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    case 'weekdays': {
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    default:
      return undefined;
  }
}

// ---- Undo/Redo state wrapper ----
interface UndoableState {
  current: AppState;
  past: AppState[];
  future: AppState[];
}

const MAX_HISTORY = 50;

// Actions that should NOT create undo history (high-frequency or non-user-initiated)
const NON_UNDOABLE_ACTIONS = new Set(['LOAD_STATE', 'TICK_POMODORO', 'UNDO', 'REDO', 'UPDATE_DAILY_STATS', 'SET_STREAK']);

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'ADD_TASK': {
      const task: Task = {
        id: nanoid(),
        title: action.payload.title,
        description: action.payload.description,
        priority: action.payload.priority,
        status: 'active',
        dueDate: action.payload.dueDate,
        category: action.payload.category,
        energy: action.payload.energy,
        quadrant: 'unassigned',
        createdAt: new Date().toISOString(),
        recurrence: action.payload.recurrence,
        recurrenceNextDate: action.payload.recurrence && action.payload.recurrence !== 'none'
          ? computeNextDate(action.payload.recurrence, new Date())
          : undefined,
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t),
      };

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };

    case 'TOGGLE_TASK': {
      const task = state.tasks.find(t => t.id === action.payload);
      if (!task) return state;
      const newStatus = task.status === 'active' ? 'done' : 'active';
      const todayStats = getTodayStats(state.dailyStats);
      const delta = newStatus === 'done' ? 1 : -1;

      let tasks = state.tasks.map(t =>
        t.id === action.payload
          ? { ...t, status: newStatus as Task['status'], completedAt: newStatus === 'done' ? new Date().toISOString() : undefined }
          : t
      );

      // If completing a recurring task, spawn the next occurrence
      if (newStatus === 'done' && task.recurrence && task.recurrence !== 'none') {
        const nextDate = computeNextDate(task.recurrence, new Date());
        const newTask: Task = {
          id: nanoid(),
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'active',
          dueDate: nextDate?.split('T')[0],
          category: task.category,
          energy: task.energy,
          quadrant: task.quadrant,
          createdAt: new Date().toISOString(),
          recurrence: task.recurrence,
          recurrenceParentId: task.id,
          recurrenceNextDate: nextDate,
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

    case 'MOVE_TASK_QUADRANT':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id ? { ...t, quadrant: action.payload.quadrant } : t
        ),
      };

    case 'ADD_POMODORO': {
      const pom: Pomodoro = {
        id: nanoid(),
        title: action.payload.title,
        duration: action.payload.duration,
        elapsed: 0,
        status: 'idle',
        createdAt: new Date().toISOString(),
      };
      return { ...state, pomodoros: [pom, ...state.pomodoros] };
    }

    case 'UPDATE_POMODORO':
      return {
        ...state,
        pomodoros: state.pomodoros.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p),
      };

    case 'DELETE_POMODORO':
      return { ...state, pomodoros: state.pomodoros.filter(p => p.id !== action.payload) };

    case 'TICK_POMODORO':
      return {
        ...state,
        pomodoros: state.pomodoros.map(p =>
          p.id === action.payload && p.status === 'running'
            ? { ...p, elapsed: p.elapsed + 1 }
            : p
        ),
      };

    case 'COMPLETE_POMODORO': {
      const pom = state.pomodoros.find(p => p.id === action.payload);
      if (!pom) return state;
      const todayStats = getTodayStats(state.dailyStats);
      return {
        ...state,
        pomodoros: state.pomodoros.map(p =>
          p.id === action.payload
            ? { ...p, status: 'completed', completedAt: new Date().toISOString(), startedAt: undefined, accumulatedSeconds: undefined }
            : p
        ),
        dailyStats: updateTodayStats(state.dailyStats, {
          focusMinutes: todayStats.focusMinutes + pom.duration,
          pomodorosCompleted: todayStats.pomodorosCompleted + 1,
        }),
      };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload };

    case 'UPDATE_DAILY_STATS':
      return { ...state, dailyStats: updateTodayStats(state.dailyStats, action.payload) };

    case 'SET_STREAK':
      return { ...state, currentStreak: action.payload };

    default:
      return state;
  }
}

function undoableReducer(state: UndoableState, action: Action): UndoableState {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      current: previous,
      past: state.past.slice(0, -1),
      future: [state.current, ...state.future].slice(0, MAX_HISTORY),
    };
  }

  if (action.type === 'REDO') {
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

  // Non-undoable actions don't create history
  if (NON_UNDOABLE_ACTIONS.has(action.type)) {
    return { ...state, current: newCurrent };
  }

  return {
    current: newCurrent,
    past: [...state.past, state.current].slice(-MAX_HISTORY),
    future: [], // Clear redo stack on new action
  };
}

// ---- Context ----
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  syncToCloud: () => Promise<void>;
  reloadState: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const AppContext = createContext<AppContextType>(null as unknown as AppContextType);

const POLL_INTERVAL = 5000; // 5 seconds

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

  stateRef.current = state;

  // Wrapped dispatch that works with the undoable reducer
  const dispatch = useCallback((action: Action) => {
    rawDispatch(action);
  }, []);

  // Load state on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadState().then(loaded => {
      dispatch({ type: 'LOAD_STATE', payload: loaded });
      // Set initial timestamp
      pollTimestamp().then(ts => { lastTimestampRef.current = ts; }).catch(() => {});
    });
  }, [dispatch]);

  // Auto-save on state change (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!loadedRef.current) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveState(stateRef.current).then(() => {
        // Update our timestamp after save so polling doesn't trigger reload
        pollTimestamp().then(ts => { lastTimestampRef.current = ts; }).catch(() => {});
      });
    }, 500);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [state]);

  // Multi-tab polling: check for external changes every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const serverTs = await pollTimestamp();
        if (serverTs > 0 && lastTimestampRef.current > 0 && serverTs > lastTimestampRef.current + 1000) {
          // File was modified externally — reload
          const loaded = await loadState();
          dispatch({ type: 'LOAD_STATE', payload: loaded });
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
    dispatch({ type: 'LOAD_STATE', payload: loaded });
  }, [dispatch]);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      syncToCloud,
      reloadState,
      canUndo: undoState.past.length > 0,
      canRedo: undoState.future.length > 0,
      undo,
      redo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
