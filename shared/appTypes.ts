/**
 * Shared types for FocusAssist — SINGLE SOURCE OF TRUTH
 * 
 * All data types are defined as Zod schemas first, then TS types are inferred.
 * This ensures runtime validation (Zod) and compile-time types (TS) never drift.
 * 
 * RULE: When adding a new field, add it to the Zod schema here.
 *       The TS type is auto-inferred. No other file needs a schema update.
 * 
 * RULE: Optional fields MUST use .nullable().optional() because the client
 *       sends `null` for empty optional fields (not `undefined`).
 *       Using just .optional() causes Zod to reject `null` values with a 400 error.
 */
import { z } from 'zod';

// ---- Enum Schemas ----

export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskStatusSchema = z.enum(['active', 'done', 'monitored']);
export const quadrantSchema = z.enum(['do-first', 'schedule', 'delegate', 'eliminate', 'unassigned']);
export const categorySchema = z.enum(['work', 'personal', 'health', 'learning', 'errands', 'other']);
export const energySchema = z.enum(['low', 'medium', 'high']);
export const recurrenceSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'weekdays', 'none']);
export const notificationSoundSchema = z.enum(['gentle-chime', 'bell', 'singing-bowl', 'wood-block', 'digital-beep', 'none']);
export const readingStatusSchema = z.enum(['unread', 'reading', 'read']);
export const reminderRecurrenceSchema = z.enum(['none', 'yearly', 'quarterly', 'monthly', 'weekly']);
export const reminderCategorySchema = z.enum(['birthday', 'appointment', 'event', 'other']);
export const contextFilterSchema = z.enum(['all', 'work', 'personal']);

// ---- Entity Schemas ----

export const subtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  priority: prioritySchema,
  status: taskStatusSchema,
  dueDate: z.string().nullable().optional(),
  category: categorySchema.nullable().optional(),
  energy: energySchema.nullable().optional(),
  quadrant: quadrantSchema,
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  recurrenceParentId: z.string().nullable().optional(),
  recurrenceNextDate: z.string().nullable().optional(),
  recurrenceDayOfMonth: z.number().nullable().optional(),
  recurrenceStartMonth: z.number().nullable().optional(),
  subtasks: z.array(subtaskSchema).nullable().optional(),
  pinnedToday: z.string().nullable().optional(), // YYYY-MM-DD — when set to today's date, task shows in Today view
});

export const pomodoroLinkSchema = z.object({
  taskId: z.string(),
  subtaskId: z.string().nullable().optional(),
});

export const pomodoroSchema = z.object({
  id: z.string(),
  title: z.string(),
  duration: z.number(),
  elapsed: z.number(),
  status: z.enum(['idle', 'running', 'paused', 'completed']),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  accumulatedSeconds: z.number().nullable().optional(),
  linkedTaskId: z.string().nullable().optional(),
  linkedTasks: z.array(pomodoroLinkSchema).nullable().optional(),
});

export const timerSettingsSchema = z.object({
  focusDuration: z.number(),
  shortBreak: z.number(),
  longBreak: z.number(),
  sessionsBeforeLongBreak: z.number(),
});

export const dailyStatsSchema = z.object({
  date: z.string(),
  tasksCompleted: z.number(),
  focusMinutes: z.number(),
  pomodorosCompleted: z.number(),
});

export const templateTaskSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  priority: prioritySchema,
  category: categorySchema.nullable().optional(),
  energy: energySchema.nullable().optional(),
  subtasks: z.array(z.object({ title: z.string() })).nullable().optional(),
});

export const taskTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  tasks: z.array(templateTaskSchema),
  createdAt: z.string(),
});

export const reminderSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  date: z.string(),
  time: z.string().nullable().optional(), // HH:mm format, null/undefined = all-day (e.g., birthdays)
  recurrence: reminderRecurrenceSchema,
  category: reminderCategorySchema,
  acknowledged: z.boolean().nullable().optional(),
  acknowledgedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const readingItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()),
  status: readingStatusSchema,
  notes: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  createdAt: z.string(),
  readAt: z.string().nullable().optional(),
});

export const appPreferencesSchema = z.object({
  notificationSound: notificationSoundSchema.nullable().optional(),
  obsidianVaultPath: z.string().nullable().optional(),
  obsidianAutoSync: z.boolean().nullable().optional(),
  activeContext: contextFilterSchema.nullable().optional(), // 'all' | 'work' | 'personal' — global filter
});

/**
 * The main AppState schema — used for save endpoint validation.
 * .strict() ensures unknown fields cause errors instead of being silently stripped.
 */
export const appStateSchema = z.object({
  tasks: z.array(taskSchema),
  pomodoros: z.array(pomodoroSchema),
  settings: timerSettingsSchema,
  dailyStats: z.array(dailyStatsSchema),
  currentStreak: z.number(),
  templates: z.array(taskTemplateSchema).nullable().optional(),
  preferences: appPreferencesSchema.nullable().optional(),
  readingList: z.array(readingItemSchema).nullable().optional(),
  reminders: z.array(reminderSchema).nullable().optional(),
}).strict();

export const storageConfigSchema = z.object({
  mode: z.enum(['local', 'file', 'sheets']),
  sheetsId: z.string().nullable().optional(),
  sheetsApiKey: z.string().nullable().optional(),
});

// ---- Inferred TypeScript Types ----
// These are auto-derived from the Zod schemas above.
// NEVER define these manually — they stay in sync automatically.

export type Priority = z.infer<typeof prioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type QuadrantType = z.infer<typeof quadrantSchema>;
export type Category = z.infer<typeof categorySchema>;
export type EnergyLevel = z.infer<typeof energySchema>;
export type RecurrenceFrequency = z.infer<typeof recurrenceSchema>;
export type NotificationSound = z.infer<typeof notificationSoundSchema>;
export type ReadingStatus = z.infer<typeof readingStatusSchema>;

export type Subtask = z.infer<typeof subtaskSchema>;
export type Task = z.infer<typeof taskSchema>;
export type PomodoroLink = z.infer<typeof pomodoroLinkSchema>;
export type Pomodoro = z.infer<typeof pomodoroSchema>;
export type TimerSettings = z.infer<typeof timerSettingsSchema>;
export type DailyStats = z.infer<typeof dailyStatsSchema>;
export type TaskTemplate = z.infer<typeof taskTemplateSchema>;
export type Reminder = z.infer<typeof reminderSchema>;
export type ReadingItem = z.infer<typeof readingItemSchema>;
export type AppPreferences = z.infer<typeof appPreferencesSchema>;
export type ContextFilter = z.infer<typeof contextFilterSchema>;
export type AppState = z.infer<typeof appStateSchema>;
export type StorageMode = z.infer<typeof storageConfigSchema>['mode'];
export type StorageConfig = z.infer<typeof storageConfigSchema>;

// ---- Constants ----

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
  activeContext: 'all',
};

/**
 * Maps task categories to context filters.
 * 'work' context = only 'work' category tasks
 * 'personal' context = everything else (personal, health, learning, errands, other, null)
 */
export const WORK_CATEGORIES: Category[] = ['work'];
export const PERSONAL_CATEGORIES: Category[] = ['personal', 'health', 'learning', 'errands', 'other'];

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
