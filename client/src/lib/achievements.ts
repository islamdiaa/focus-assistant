/**
 * Achievement definitions and computation logic.
 *
 * Achievements are derived entirely from existing app data — no new storage needed.
 * They are computed on-the-fly from AchievementStats, which are calculated from
 * AppState (tasks, pomodoros, dailyStats, currentStreak).
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  category: "tasks" | "focus" | "streaks" | "habits";
  check: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalTasksCompleted: number;
  totalPomodorosCompleted: number;
  currentStreak: number;
  totalFocusMinutes: number;
  tasksCompletedToday: number;
}

// ---- Achievement Definitions ----

export const ACHIEVEMENTS: Achievement[] = [
  // Tasks
  {
    id: "first-steps",
    title: "First Steps",
    description: "Complete your first task",
    icon: "CheckCircle2",
    category: "tasks",
    check: s => s.totalTasksCompleted >= 1,
  },
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Complete 5 tasks",
    icon: "ListChecks",
    category: "tasks",
    check: s => s.totalTasksCompleted >= 5,
  },
  {
    id: "double-digits",
    title: "Double Digits",
    description: "Complete 10 tasks",
    icon: "Zap",
    category: "tasks",
    check: s => s.totalTasksCompleted >= 10,
  },
  {
    id: "task-master",
    title: "Task Master",
    description: "Complete 50 tasks",
    icon: "Trophy",
    category: "tasks",
    check: s => s.totalTasksCompleted >= 50,
  },
  {
    id: "century",
    title: "Century",
    description: "Complete 100 tasks",
    icon: "Star",
    category: "tasks",
    check: s => s.totalTasksCompleted >= 100,
  },
  // Focus
  {
    id: "focus-apprentice",
    title: "Focus Apprentice",
    description: "Complete 5 pomodoros",
    icon: "Target",
    category: "focus",
    check: s => s.totalPomodorosCompleted >= 5,
  },
  {
    id: "focus-pro",
    title: "Focus Pro",
    description: "Complete 25 pomodoros",
    icon: "Flame",
    category: "focus",
    check: s => s.totalPomodorosCompleted >= 25,
  },
  {
    id: "deep-work",
    title: "Deep Work",
    description: "Accumulate 60 minutes of focus time",
    icon: "Brain",
    category: "focus",
    check: s => s.totalFocusMinutes >= 60,
  },
  {
    id: "flow-state",
    title: "Flow State",
    description: "Accumulate 5 hours of total focus time",
    icon: "Sparkles",
    category: "focus",
    check: s => s.totalFocusMinutes >= 300,
  },
  // Streaks
  {
    id: "streak-starter",
    title: "Streak Starter",
    description: "Reach a 3-day streak",
    icon: "Flame",
    category: "streaks",
    check: s => s.currentStreak >= 3,
  },
  {
    id: "week-warrior",
    title: "Week Warrior",
    description: "Reach a 7-day streak",
    icon: "Calendar",
    category: "streaks",
    check: s => s.currentStreak >= 7,
  },
  {
    id: "month-master",
    title: "Month Master",
    description: "Reach a 30-day streak",
    icon: "Award",
    category: "streaks",
    check: s => s.currentStreak >= 30,
  },
  // Habits
  {
    id: "daily-hero",
    title: "Daily Hero",
    description: "Complete 5 tasks in a single day",
    icon: "Sparkles",
    category: "habits",
    check: s => s.tasksCompletedToday >= 5,
  },
  {
    id: "power-day",
    title: "Power Day",
    description: "Complete 10 tasks in a single day",
    icon: "Zap",
    category: "habits",
    check: s => s.tasksCompletedToday >= 10,
  },
];

// ---- Public API ----

/**
 * Returns all achievements that have been unlocked given the current stats.
 */
export function getUnlockedAchievements(
  stats: AchievementStats
): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.check(stats));
}

/**
 * Returns achievements that are newly unlocked compared to a previous set.
 * Used to trigger toast notifications.
 *
 * @param stats          Current achievement stats
 * @param previouslyUnlocked IDs of achievements already seen/notified
 */
export function getNewlyUnlocked(
  stats: AchievementStats,
  previouslyUnlocked: string[]
): Achievement[] {
  const prevSet = new Set(previouslyUnlocked);
  return getUnlockedAchievements(stats).filter(a => !prevSet.has(a.id));
}

/**
 * Builds AchievementStats from raw AppState values.
 * Centralises the mapping so callers don't need to know the shape.
 */
export function buildAchievementStats(params: {
  tasks: { status: string; completedAt?: string | null }[];
  dailyStats: {
    date: string;
    tasksCompleted: number;
    pomodorosCompleted: number;
    focusMinutes: number;
  }[];
  currentStreak: number;
  today: string;
}): AchievementStats {
  const { tasks, dailyStats, currentStreak, today } = params;

  const totalTasksCompleted = tasks.filter(t => t.status === "done").length;

  const totalPomodorosCompleted = dailyStats.reduce(
    (sum, d) => sum + (d.pomodorosCompleted ?? 0),
    0
  );

  const totalFocusMinutes = dailyStats.reduce(
    (sum, d) => sum + (d.focusMinutes ?? 0),
    0
  );

  const todayStat = dailyStats.find(d => d.date === today);
  const tasksCompletedToday = todayStat?.tasksCompleted ?? 0;

  return {
    totalTasksCompleted,
    totalPomodorosCompleted,
    currentStreak,
    totalFocusMinutes,
    tasksCompletedToday,
  };
}
