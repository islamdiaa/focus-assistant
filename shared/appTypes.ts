/**
 * Shared types for FocusAssist — used by both server and client
 */

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'active' | 'done';
export type QuadrantType = 'do-first' | 'schedule' | 'delegate' | 'eliminate' | 'unassigned';
export type Category = 'work' | 'personal' | 'health' | 'learning' | 'errands' | 'other';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'none';
export type NotificationSound = 'gentle-chime' | 'bell' | 'singing-bowl' | 'wood-block' | 'digital-beep' | 'none';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  category?: Category;
  energy?: EnergyLevel;
  quadrant: QuadrantType;
  createdAt: string;
  completedAt?: string;
  /** Recurring task settings */
  recurrence?: RecurrenceFrequency;
  /** For recurring tasks: the template task ID this was spawned from */
  recurrenceParentId?: string;
  /** For recurring tasks: next scheduled creation date (ISO string) */
  recurrenceNextDate?: string;
  /** Subtasks (checklist items within a task) */
  subtasks?: Subtask[];
}

export interface Pomodoro {
  id: string;
  title: string;
  duration: number; // minutes
  elapsed: number; // seconds
  status: 'idle' | 'running' | 'paused' | 'completed';
  createdAt: string;
  completedAt?: string;
  /** Timer persistence: when the timer was started/resumed (ISO string) */
  startedAt?: string;
  /** Timer persistence: accumulated seconds before the current run */
  accumulatedSeconds?: number;
  /** Optional: linked task ID for focus mode */
  linkedTaskId?: string;
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

/** Task template — a reusable set of tasks */
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  tasks: Array<{
    title: string;
    description?: string;
    priority: Priority;
    category?: Category;
    energy?: EnergyLevel;
    subtasks?: Array<{ title: string }>;
  }>;
  createdAt: string;
}

export interface AppState {
  tasks: Task[];
  pomodoros: Pomodoro[];
  settings: TimerSettings;
  dailyStats: DailyStats[];
  currentStreak: number;
  /** Saved task templates */
  templates?: TaskTemplate[];
  /** User preferences */
  preferences?: AppPreferences;
}

export interface AppPreferences {
  notificationSound?: NotificationSound;
  obsidianVaultPath?: string;
  obsidianAutoSync?: boolean;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsBeforeLongBreak: 4,
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  notificationSound: 'gentle-chime',
  obsidianVaultPath: '',
  obsidianAutoSync: false,
};

export type StorageMode = 'local' | 'file' | 'sheets';

export interface StorageConfig {
  mode: StorageMode;
  sheetsId?: string;
  sheetsApiKey?: string;
}

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

export const NOTIFICATION_SOUNDS: { id: NotificationSound; label: string; description: string }[] = [
  { id: 'gentle-chime', label: 'Gentle Chime', description: 'Soft two-tone chime (default)' },
  { id: 'bell', label: 'Bell', description: 'Classic bell ring' },
  { id: 'singing-bowl', label: 'Singing Bowl', description: 'Warm resonant tone' },
  { id: 'wood-block', label: 'Wood Block', description: 'Crisp percussive tap' },
  { id: 'digital-beep', label: 'Digital Beep', description: 'Modern electronic beep' },
  { id: 'none', label: 'Silent', description: 'No sound (notification only)' },
];
