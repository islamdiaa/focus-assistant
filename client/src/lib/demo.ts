/**
 * Demo mode — a browser-only build for the public demo.
 *
 * Built with VITE_DEMO=true. There is no server: state lives in this
 * visitor's localStorage, starts from sample data, and can be reset.
 */

import type { AppState, Reminder, Task } from "./types";
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from "./types";

export const IS_DEMO = import.meta.env.VITE_DEMO === "true";

const DEMO_STORAGE_KEY = "focus-assist-demo-state";

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoOffset(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function task(id: string, title: string, fields: Partial<Task> = {}): Task {
  return {
    id,
    title,
    priority: "medium",
    status: "active",
    quadrant: "unassigned",
    createdAt: isoOffset(-3),
    ...fields,
  };
}

/** Sample data, with dates relative to today so the demo always looks current. */
export function buildDemoState(): AppState {
  const today = dayOffset(0);

  const tasks: Task[] = [
    task("demo-1", "Write the project proposal", {
      description: "One page: problem, plan, risks, ask.",
      priority: "high",
      quadrant: "do-first",
      category: "work",
      energy: "high",
      dueDate: today,
      pinnedToday: today,
      isFocusGoal: true,
      estimatedMinutes: 90,
      subtasks: [
        { id: "demo-1a", title: "Outline the sections", done: true },
        { id: "demo-1b", title: "Draft the plan and timeline", done: false },
        { id: "demo-1c", title: "Ask a teammate to review", done: false },
      ],
    }),
    task("demo-2", "Review pull requests", {
      priority: "medium",
      quadrant: "do-first",
      category: "work",
      energy: "medium",
      dueDate: today,
      pinnedToday: today,
      isFocusGoal: true,
      estimatedMinutes: 45,
    }),
    task("demo-3", "Book a dentist appointment", {
      priority: "medium",
      quadrant: "schedule",
      category: "health",
      energy: "low",
      dueDate: dayOffset(2),
      estimatedMinutes: 10,
    }),
    task("demo-4", "Plan next week's priorities", {
      priority: "high",
      quadrant: "schedule",
      category: "work",
      energy: "medium",
      dueDate: dayOffset(3),
      recurrence: "weekly",
      estimatedMinutes: 30,
    }),
    task("demo-5", "Read a chapter of a book", {
      priority: "low",
      quadrant: "schedule",
      category: "learning",
      energy: "low",
      recurrence: "daily",
      estimatedMinutes: 25,
    }),
    task("demo-6", "Order printer ink", {
      priority: "low",
      quadrant: "delegate",
      category: "errands",
      energy: "low",
    }),
    task("demo-7", "Waiting on the contractor's quote", {
      priority: "medium",
      status: "monitored",
      quadrant: "unassigned",
      category: "personal",
      statusChangedAt: isoOffset(-1),
    }),
    task("demo-8", "Reorganise old photos", {
      priority: "low",
      quadrant: "eliminate",
      category: "personal",
      energy: "low",
    }),
    task("demo-9", "Send the weekly update", {
      priority: "medium",
      status: "done",
      quadrant: "do-first",
      category: "work",
      completedAt: isoOffset(-1, 16),
      statusChangedAt: isoOffset(-1, 16),
    }),
    task("demo-10", "Go for a run", {
      priority: "medium",
      status: "done",
      quadrant: "schedule",
      category: "health",
      completedAt: isoOffset(0, 8),
      statusChangedAt: isoOffset(0, 8),
    }),
  ];

  const reminders: Reminder[] = [
    {
      id: "demo-r1",
      title: "Team offsite",
      date: dayOffset(4),
      time: "10:00",
      recurrence: "none",
      category: "event",
      createdAt: isoOffset(-5),
    },
    {
      id: "demo-r2",
      title: "Sam's birthday",
      date: dayOffset(6),
      recurrence: "yearly",
      category: "birthday",
      createdAt: isoOffset(-20),
    },
    {
      id: "demo-r3",
      title: "Renew car insurance",
      date: dayOffset(12),
      recurrence: "yearly",
      category: "other",
      createdAt: isoOffset(-10),
    },
  ];

  const dailyStats = [6, 5, 4, 3, 2, 1].map((daysAgo, i) => ({
    date: dayOffset(-daysAgo),
    tasksCompleted: [3, 5, 2, 4, 6, 3][i],
    focusMinutes: [50, 100, 25, 75, 125, 50][i],
    pomodorosCompleted: [2, 4, 1, 3, 5, 2][i],
  }));

  return {
    tasks,
    pomodoros: [],
    settings: { ...DEFAULT_SETTINGS },
    dailyStats,
    currentStreak: 6,
    templates: [
      {
        id: "demo-t1",
        name: "Weekly review",
        description: "A 30-minute reset every Friday.",
        tasks: [
          { title: "Clear the inbox", priority: "medium", category: "work" },
          { title: "Review this week's wins", priority: "low" },
          { title: "Pick next week's top 3", priority: "high" },
        ],
        createdAt: isoOffset(-30),
      },
    ],
    preferences: { ...DEFAULT_PREFERENCES },
    readingList: [
      {
        id: "demo-l1",
        url: "https://en.wikipedia.org/wiki/Pomodoro_Technique",
        title: "The Pomodoro Technique",
        tags: ["focus"],
        status: "unread",
        domain: "en.wikipedia.org",
        createdAt: isoOffset(-2),
      },
      {
        id: "demo-l2",
        url: "https://en.wikipedia.org/wiki/Time_management#The_Eisenhower_Method",
        title: "The Eisenhower Method",
        tags: ["planning"],
        status: "reading",
        domain: "en.wikipedia.org",
        createdAt: isoOffset(-4),
      },
    ],
    reminders,
    scratchPad: [
      {
        id: "demo-s1",
        text: "Idea: block mornings for deep work",
        createdAt: isoOffset(-1, 11),
      },
    ],
    dailyRituals: [{ date: today, morningCompleted: true }],
  };
}

export function loadDemoState(): AppState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return buildDemoState();
}

export function saveDemoState(state: AppState): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function resetDemo(): void {
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  } catch {}
  window.location.reload();
}

/** A simple Markdown export for the demo (the server does this in the real app). */
export function demoMarkdown(state: AppState): string {
  const lines = ["# Focus Assist export (demo)", "", "## Tasks", ""];
  for (const t of state.tasks) {
    lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title}`);
  }
  if (state.reminders?.length) {
    lines.push("", "## Reminders", "");
    for (const r of state.reminders) lines.push(`- ${r.date}: ${r.title}`);
  }
  return lines.join("\n") + "\n";
}
