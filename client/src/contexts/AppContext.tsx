import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { nanoid } from 'nanoid';
import type { Task, Pomodoro, TimerSettings, DailyStats, AppState, Priority, QuadrantType } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { loadState, saveState } from '@/lib/sheets';

// ---- Actions ----
type Action =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_TASK'; payload: { title: string; description?: string; priority: Priority; dueDate?: string } }
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
  | { type: 'SET_STREAK'; payload: number };

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

function reducer(state: AppState, action: Action): AppState {
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
        quadrant: 'unassigned',
        createdAt: new Date().toISOString(),
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
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload
            ? { ...t, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : undefined }
            : t
        ),
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
            ? { ...p, status: 'completed', completedAt: new Date().toISOString() }
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

// ---- Context ----
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  syncToCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextType>(null as unknown as AppContextType);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const loadedRef = useRef(false);

  stateRef.current = state;

  // Load state on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadState().then(loaded => {
      dispatch({ type: 'LOAD_STATE', payload: loaded });
    });
  }, []);

  // Auto-save on state change (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!loadedRef.current) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveState(stateRef.current);
    }, 500);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [state]);

  const syncToCloud = useCallback(async () => {
    await saveState(stateRef.current);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, syncToCloud }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
