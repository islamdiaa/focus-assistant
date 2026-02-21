/**
 * Client-side types — re-exported from the single source of truth.
 *
 * DO NOT define types here. All types live in shared/appTypes.ts.
 * This file exists only for backward compatibility with @/lib/types imports.
 */
export {
  // Enum types
  type Priority,
  type TaskStatus,
  type QuadrantType,
  type Category,
  type EnergyLevel,
  type RecurrenceFrequency,
  type NotificationSound,
  type ReadingStatus,

  // Entity types
  type Subtask,
  type Task,
  type PomodoroLink,
  type Pomodoro,
  type TimerSettings,
  type DailyStats,
  type TaskTemplate,
  type Reminder,
  type ReadingItem,
  type AppPreferences,
  type ContextFilter,
  type AppState,
  type StorageMode,
  type StorageConfig,

  // Constants
  DEFAULT_SETTINGS,
  DEFAULT_PREFERENCES,
  DAILY_TIPS,
  NOTIFICATION_SOUNDS,
  WORK_CATEGORIES,
  PERSONAL_CATEGORIES,
} from "@shared/appTypes";
