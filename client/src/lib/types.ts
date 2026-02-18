export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'active' | 'done';
export type QuadrantType = 'do-first' | 'schedule' | 'delegate' | 'eliminate' | 'unassigned';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  quadrant: QuadrantType;
  createdAt: string;
  completedAt?: string;
}

export interface Pomodoro {
  id: string;
  title: string;
  duration: number; // minutes
  elapsed: number; // seconds
  status: 'idle' | 'running' | 'paused' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export interface TimerSettings {
  focusDuration: number;
  shortBreak: number;
  longBreak: number;
  sessionsBeforeLongBreak: number;
}

export interface DailyStats {
  date: string;
  tasksCompleted: number;
  focusMinutes: number;
  pomodorosCompleted: number;
}

export interface AppState {
  tasks: Task[];
  pomodoros: Pomodoro[];
  settings: TimerSettings;
  dailyStats: DailyStats[];
  currentStreak: number;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsBeforeLongBreak: 4,
};

export const DAILY_TIPS = [
  "Break big tasks into small steps. Your brain loves checking things off!",
  "Focus on one thing at a time. Multitasking is a myth.",
  "Take breaks. Your brain needs rest to perform at its best.",
  "Start with the hardest task first. Everything else will feel easier.",
  "Celebrate small wins. Progress is progress, no matter how small.",
  "Set clear goals for each focus session. Clarity drives action.",
  "Eliminate distractions before starting. Your future self will thank you.",
  "Review your priorities daily. What matters most right now?",
  "Done is better than perfect. Ship it, then iterate.",
  "Your energy matters more than your time. Protect it wisely.",
];
