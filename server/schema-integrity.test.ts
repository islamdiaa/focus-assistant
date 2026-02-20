/**
 * Schema Integrity & Persistence Round-Trip Tests
 * 
 * These tests ensure:
 * 1. The Zod schema (appStateSchema) accepts every field from the TS types
 * 2. Every key mutation persists correctly through serialize → deserialize
 * 3. .strict() catches unknown fields (prevents silent stripping)
 * 
 * If any of these tests fail, it means a new field was added to the TS type
 * but not to the Zod schema (or vice versa), which would cause data loss.
 */
import { describe, expect, it } from 'vitest';
import {
  appStateSchema,
  taskSchema,
  pomodoroSchema,
  reminderSchema,
  readingItemSchema,
  taskTemplateSchema,
  appPreferencesSchema,
  type AppState,
  type Task,
  type Pomodoro,
  type Reminder,
  type ReadingItem,
  DEFAULT_SETTINGS,
  DEFAULT_PREFERENCES,
} from '../shared/appTypes';
import { stateToMarkdown, markdownToState } from './mdStorage';

// ---- Helpers ----

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test task',
  priority: 'medium',
  status: 'active',
  quadrant: 'do-first',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makePomodoro = (overrides: Partial<Pomodoro> = {}): Pomodoro => ({
  id: 'pomo-1',
  title: 'Focus session',
  duration: 25,
  elapsed: 0,
  status: 'idle',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'rem-1',
  title: 'Test reminder',
  date: '2026-03-15',
  recurrence: 'none',
  category: 'event',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeReadingItem = (overrides: Partial<ReadingItem> = {}): ReadingItem => ({
  id: 'read-1',
  url: 'https://example.com/article',
  title: 'Test Article',
  tags: ['tech'],
  status: 'unread',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeFullState = (overrides: Partial<AppState> = {}): AppState => ({
  tasks: [],
  pomodoros: [],
  settings: { ...DEFAULT_SETTINGS },
  dailyStats: [],
  currentStreak: 0,
  templates: [],
  preferences: { ...DEFAULT_PREFERENCES },
  readingList: [],
  reminders: [],
  ...overrides,
});

/** Serialize to MD and back, then verify round-trip */
const roundTrip = (state: AppState): AppState => {
  const md = stateToMarkdown(state);
  return markdownToState(md);
};

// ---- Schema Drift Detection ----

describe('Schema Drift Detection', () => {
  it('appStateSchema accepts a full state with all fields populated', () => {
    const fullState = makeFullState({
      tasks: [makeTask({
        description: 'A description',
        dueDate: '2026-02-20',
        category: 'work',
        energy: 'high',
        completedAt: '2026-02-20T12:00:00Z',
        recurrence: 'quarterly',
        recurrenceParentId: 'parent-1',
        recurrenceNextDate: '2026-05-16',
        recurrenceDayOfMonth: 16,
        recurrenceStartMonth: 2,
        subtasks: [{ id: 'sub-1', title: 'Subtask 1', done: false }],
      })],
      pomodoros: [makePomodoro({
        completedAt: '2026-01-01T00:25:00Z',
        startedAt: '2026-01-01T00:00:00Z',
        accumulatedSeconds: 300,
        linkedTaskId: 'task-1',
        linkedTasks: [
          { taskId: 'task-1' },
          { taskId: 'task-1', subtaskId: 'sub-1' },
        ],
      })],
      dailyStats: [{
        date: '2026-01-01',
        tasksCompleted: 5,
        focusMinutes: 120,
        pomodorosCompleted: 4,
      }],
      currentStreak: 7,
      templates: [{
        id: 'tmpl-1',
        name: 'Morning Routine',
        description: 'Daily morning tasks',
        tasks: [{
          title: 'Meditate',
          description: '10 min meditation',
          priority: 'high',
          category: 'health',
          energy: 'low',
          subtasks: [{ title: 'Set timer' }],
        }],
        createdAt: '2026-01-01T00:00:00Z',
      }],
      preferences: {
        notificationSound: 'singing-bowl',
        obsidianVaultPath: '/vault/path',
        obsidianAutoSync: true,
      },
      readingList: [makeReadingItem({
        description: 'Great article',
        notes: 'Key insight here',
        imageUrl: 'https://example.com/img.png',
        domain: 'example.com',
        readAt: '2026-02-01T00:00:00Z',
      })],
      reminders: [makeReminder({
        description: 'Birthday party',
        recurrence: 'yearly',
        category: 'birthday',
        acknowledged: true,
        acknowledgedAt: '2026-03-15T10:00:00Z',
      })],
    });

    const result = appStateSchema.safeParse(fullState);
    expect(result.success).toBe(true);
  });

  it('appStateSchema.strict() rejects unknown top-level fields', () => {
    const stateWithExtra = {
      ...makeFullState(),
      unknownField: 'should fail',
    };
    const result = appStateSchema.safeParse(stateWithExtra);
    expect(result.success).toBe(false);
  });

  it('taskSchema accepts all task fields', () => {
    const task = makeTask({
      description: 'desc',
      dueDate: '2026-02-20',
      category: 'work',
      energy: 'high',
      completedAt: '2026-02-20T12:00:00Z',
      recurrence: 'quarterly',
      recurrenceParentId: 'parent-1',
      recurrenceNextDate: '2026-05-16',
      recurrenceDayOfMonth: 16,
      recurrenceStartMonth: 2,
      subtasks: [{ id: 'sub-1', title: 'Subtask', done: true }],
    });
    const result = taskSchema.safeParse(task);
    expect(result.success).toBe(true);
  });

  it('pomodoroSchema accepts linkedTasks field', () => {
    const pomo = makePomodoro({
      linkedTasks: [
        { taskId: 'task-1' },
        { taskId: 'task-2', subtaskId: 'sub-1' },
      ],
    });
    const result = pomodoroSchema.safeParse(pomo);
    expect(result.success).toBe(true);
  });

  it('reminderSchema accepts all reminder fields', () => {
    const reminder = makeReminder({
      description: 'desc',
      recurrence: 'yearly',
      category: 'birthday',
      acknowledged: true,
      acknowledgedAt: '2026-03-15T10:00:00Z',
    });
    const result = reminderSchema.safeParse(reminder);
    expect(result.success).toBe(true);
  });

  it('readingItemSchema accepts all reading item fields', () => {
    const item = makeReadingItem({
      description: 'desc',
      notes: 'notes',
      imageUrl: 'https://img.com/a.png',
      domain: 'img.com',
      readAt: '2026-02-01T00:00:00Z',
    });
    const result = readingItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it('all recurrence frequencies are accepted by taskSchema', () => {
    const frequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'weekdays', 'none'] as const;
    for (const freq of frequencies) {
      const task = makeTask({ recurrence: freq });
      const result = taskSchema.safeParse(task);
      expect(result.success, `frequency '${freq}' should be accepted`).toBe(true);
    }
  });

  it('all reminder categories are accepted', () => {
    const categories = ['birthday', 'appointment', 'event', 'other'] as const;
    for (const cat of categories) {
      const reminder = makeReminder({ category: cat });
      const result = reminderSchema.safeParse(reminder);
      expect(result.success, `category '${cat}' should be accepted`).toBe(true);
    }
  });

  it('all reminder recurrences are accepted', () => {
    const recurrences = ['none', 'yearly', 'monthly', 'weekly'] as const;
    for (const rec of recurrences) {
      const reminder = makeReminder({ recurrence: rec });
      const result = reminderSchema.safeParse(reminder);
      expect(result.success, `recurrence '${rec}' should be accepted`).toBe(true);
    }
  });
});

// ---- Full Persistence Round-Trip Tests ----

describe('Persistence Round-Trip: Tasks', () => {
  it('basic task survives round-trip', () => {
    const state = makeFullState({ tasks: [makeTask()] });
    const restored = roundTrip(state);
    expect(restored.tasks).toHaveLength(1);
    expect(restored.tasks[0].id).toBe('task-1');
    expect(restored.tasks[0].title).toBe('Test task');
    expect(restored.tasks[0].priority).toBe('medium');
    expect(restored.tasks[0].status).toBe('active');
  });

  it('completed task preserves status and completedAt', () => {
    const state = makeFullState({
      tasks: [makeTask({
        status: 'done',
        completedAt: '2026-02-20T12:00:00.000Z',
      })],
    });
    const restored = roundTrip(state);
    expect(restored.tasks[0].status).toBe('done');
    expect(restored.tasks[0].completedAt).toBe('2026-02-20T12:00:00.000Z');
  });

  it('task with all optional fields survives round-trip', () => {
    const state = makeFullState({
      tasks: [makeTask({
        description: 'Full description',
        dueDate: '2026-03-01',
        category: 'work',
        energy: 'high',
        recurrence: 'weekly',
        recurrenceParentId: 'parent-1',
        recurrenceNextDate: '2026-03-08',
      })],
    });
    const restored = roundTrip(state);
    const t = restored.tasks[0];
    expect(t.description).toBe('Full description');
    expect(t.dueDate).toBe('2026-03-01');
    expect(t.category).toBe('work');
    expect(t.energy).toBe('high');
    expect(t.recurrence).toBe('weekly');
    expect(t.recurrenceParentId).toBe('parent-1');
    expect(t.recurrenceNextDate).toBe('2026-03-08');
  });

  it('task with subtasks survives round-trip', () => {
    const state = makeFullState({
      tasks: [makeTask({
        subtasks: [
          { id: 'sub-1', title: 'First subtask', done: false },
          { id: 'sub-2', title: 'Second subtask', done: true },
        ],
      })],
    });
    const restored = roundTrip(state);
    expect(restored.tasks[0].subtasks).toHaveLength(2);
    expect(restored.tasks[0].subtasks![0].title).toBe('First subtask');
    expect(restored.tasks[0].subtasks![0].done).toBe(false);
    expect(restored.tasks[0].subtasks![1].title).toBe('Second subtask');
    expect(restored.tasks[0].subtasks![1].done).toBe(true);
  });

  it('quarterly recurring task preserves day and start month', () => {
    const state = makeFullState({
      tasks: [makeTask({
        recurrence: 'quarterly',
        recurrenceDayOfMonth: 16,
        recurrenceStartMonth: 2,
        recurrenceNextDate: '2026-05-16',
      })],
    });
    const restored = roundTrip(state);
    const t = restored.tasks[0];
    expect(t.recurrence).toBe('quarterly');
    expect(t.recurrenceDayOfMonth).toBe(16);
    expect(t.recurrenceStartMonth).toBe(2);
    expect(t.recurrenceNextDate).toBe('2026-05-16');
  });

  it('multiple tasks with mixed statuses survive round-trip', () => {
    const state = makeFullState({
      tasks: [
        makeTask({ id: 't1', title: 'Active task', status: 'active' }),
        makeTask({ id: 't2', title: 'Done task', status: 'done', completedAt: '2026-02-20T12:00:00Z' }),
        makeTask({ id: 't3', title: 'Urgent task', priority: 'urgent', status: 'active' }),
      ],
    });
    const restored = roundTrip(state);
    expect(restored.tasks).toHaveLength(3);
    expect(restored.tasks[0].status).toBe('active');
    expect(restored.tasks[1].status).toBe('done');
    expect(restored.tasks[2].priority).toBe('urgent');
  });
});

describe('Persistence Round-Trip: Pomodoros', () => {
  it('basic pomodoro survives round-trip', () => {
    const state = makeFullState({ pomodoros: [makePomodoro()] });
    const restored = roundTrip(state);
    expect(restored.pomodoros).toHaveLength(1);
    expect(restored.pomodoros[0].title).toBe('Focus session');
    expect(restored.pomodoros[0].duration).toBe(25);
  });

  it('completed pomodoro preserves all fields', () => {
    const state = makeFullState({
      pomodoros: [makePomodoro({
        status: 'completed',
        elapsed: 1500,
        completedAt: '2026-01-01T00:25:00Z',
        startedAt: '2026-01-01T00:00:00Z',
        accumulatedSeconds: 1500,
      })],
    });
    const restored = roundTrip(state);
    const p = restored.pomodoros[0];
    expect(p.status).toBe('completed');
    expect(p.elapsed).toBe(1500);
    expect(p.completedAt).toBe('2026-01-01T00:25:00Z');
  });

  it('pomodoro with legacy linkedTaskId survives round-trip', () => {
    const state = makeFullState({
      pomodoros: [makePomodoro({ linkedTaskId: 'task-1' })],
    });
    const restored = roundTrip(state);
    expect(restored.pomodoros[0].linkedTaskId).toBe('task-1');
  });

  it('pomodoro with linkedTasks (multi-task) survives round-trip', () => {
    const state = makeFullState({
      pomodoros: [makePomodoro({
        linkedTasks: [
          { taskId: 'task-1' },
          { taskId: 'task-2', subtaskId: 'sub-1' },
        ],
      })],
    });
    const restored = roundTrip(state);
    const links = restored.pomodoros[0].linkedTasks;
    expect(links).toHaveLength(2);
    expect(links![0].taskId).toBe('task-1');
    expect(links![0].subtaskId).toBeUndefined();
    expect(links![1].taskId).toBe('task-2');
    expect(links![1].subtaskId).toBe('sub-1');
  });
});

describe('Persistence Round-Trip: Reminders', () => {
  it('basic reminder survives round-trip', () => {
    const state = makeFullState({ reminders: [makeReminder()] });
    const restored = roundTrip(state);
    expect(restored.reminders).toHaveLength(1);
    expect(restored.reminders![0].title).toBe('Test reminder');
    expect(restored.reminders![0].date).toBe('2026-03-15');
    expect(restored.reminders![0].category).toBe('event');
  });

  it('yearly birthday reminder survives round-trip', () => {
    const state = makeFullState({
      reminders: [makeReminder({
        title: "Mom's Birthday",
        recurrence: 'yearly',
        category: 'birthday',
        description: 'Buy flowers',
      })],
    });
    const restored = roundTrip(state);
    const r = restored.reminders![0];
    expect(r.title).toBe("Mom's Birthday");
    expect(r.recurrence).toBe('yearly');
    expect(r.category).toBe('birthday');
    expect(r.description).toBe('Buy flowers');
  });

  it('acknowledged reminder preserves ack state', () => {
    const state = makeFullState({
      reminders: [makeReminder({
        acknowledged: true,
        acknowledgedAt: '2026-03-15T10:00:00Z',
      })],
    });
    const restored = roundTrip(state);
    const r = restored.reminders![0];
    expect(r.acknowledged).toBe(true);
    expect(r.acknowledgedAt).toBe('2026-03-15T10:00:00Z');
  });

  it('unacknowledged reminder stays unacknowledged', () => {
    const state = makeFullState({
      reminders: [makeReminder({ acknowledged: false })],
    });
    const restored = roundTrip(state);
    expect(restored.reminders![0].acknowledged).toBe(false);
  });

  it('multiple reminders with different categories survive', () => {
    const state = makeFullState({
      reminders: [
        makeReminder({ id: 'r1', category: 'birthday', recurrence: 'yearly' }),
        makeReminder({ id: 'r2', category: 'appointment', recurrence: 'none' }),
        makeReminder({ id: 'r3', category: 'event', recurrence: 'monthly' }),
        makeReminder({ id: 'r4', category: 'other', recurrence: 'weekly' }),
      ],
    });
    const restored = roundTrip(state);
    expect(restored.reminders).toHaveLength(4);
    expect(restored.reminders![0].category).toBe('birthday');
    expect(restored.reminders![1].category).toBe('appointment');
    expect(restored.reminders![2].category).toBe('event');
    expect(restored.reminders![3].category).toBe('other');
  });
});

describe('Persistence Round-Trip: Reading List', () => {
  it('basic reading item survives round-trip', () => {
    const state = makeFullState({ readingList: [makeReadingItem()] });
    const restored = roundTrip(state);
    expect(restored.readingList).toHaveLength(1);
    expect(restored.readingList![0].title).toBe('Test Article');
    expect(restored.readingList![0].url).toBe('https://example.com/article');
    expect(restored.readingList![0].status).toBe('unread');
  });

  it('reading item with notes and all fields survives round-trip', () => {
    const state = makeFullState({
      readingList: [makeReadingItem({
        description: 'A great read',
        notes: 'Key takeaway: focus matters',
        imageUrl: 'https://example.com/thumb.png',
        domain: 'example.com',
        status: 'read',
        readAt: '2026-02-15T00:00:00Z',
        tags: ['productivity', 'focus'],
      })],
    });
    const restored = roundTrip(state);
    const r = restored.readingList![0];
    expect(r.description).toBe('A great read');
    expect(r.notes).toBe('Key takeaway: focus matters');
    expect(r.status).toBe('read');
    expect(r.tags).toContain('productivity');
    expect(r.tags).toContain('focus');
  });
});

describe('Persistence Round-Trip: Templates', () => {
  it('task template with subtasks survives round-trip', () => {
    const state = makeFullState({
      templates: [{
        id: 'tmpl-1',
        name: 'Morning Routine',
        description: 'Daily tasks',
        tasks: [
          {
            title: 'Meditate',
            description: '10 min',
            priority: 'high' as const,
            category: 'health' as const,
            energy: 'low' as const,
            subtasks: [{ title: 'Set timer' }, { title: 'Find quiet spot' }],
          },
          {
            title: 'Exercise',
            priority: 'medium' as const,
          },
        ],
        createdAt: '2026-01-01T00:00:00Z',
      }],
    });
    const restored = roundTrip(state);
    expect(restored.templates).toHaveLength(1);
    expect(restored.templates![0].name).toBe('Morning Routine');
    expect(restored.templates![0].tasks).toHaveLength(2);
    expect(restored.templates![0].tasks[0].subtasks).toHaveLength(2);
  });
});

describe('Persistence Round-Trip: Settings & Preferences', () => {
  it('custom timer settings survive round-trip', () => {
    const state = makeFullState({
      settings: {
        focusDuration: 50,
        shortBreak: 10,
        longBreak: 30,
        sessionsBeforeLongBreak: 3,
      },
    });
    const restored = roundTrip(state);
    expect(restored.settings.focusDuration).toBe(50);
    expect(restored.settings.shortBreak).toBe(10);
    expect(restored.settings.longBreak).toBe(30);
    expect(restored.settings.sessionsBeforeLongBreak).toBe(3);
  });

  it('preferences survive round-trip', () => {
    const state = makeFullState({
      preferences: {
        notificationSound: 'singing-bowl',
        obsidianVaultPath: '/home/user/vault',
        obsidianAutoSync: true,
      },
    });
    const restored = roundTrip(state);
    expect(restored.preferences?.notificationSound).toBe('singing-bowl');
    expect(restored.preferences?.obsidianVaultPath).toBe('/home/user/vault');
    expect(restored.preferences?.obsidianAutoSync).toBe(true);
  });
});

describe('Persistence Round-Trip: Daily Stats', () => {
  it('daily stats survive round-trip', () => {
    const state = makeFullState({
      dailyStats: [
        { date: '2026-02-18', tasksCompleted: 5, focusMinutes: 120, pomodorosCompleted: 4 },
        { date: '2026-02-19', tasksCompleted: 3, focusMinutes: 75, pomodorosCompleted: 3 },
      ],
      currentStreak: 7,
    });
    const restored = roundTrip(state);
    expect(restored.dailyStats).toHaveLength(2);
    expect(restored.dailyStats[0].tasksCompleted).toBe(5);
    expect(restored.dailyStats[1].focusMinutes).toBe(75);
    expect(restored.currentStreak).toBe(7);
  });
});

describe('Persistence Round-Trip: Full State', () => {
  it('complex state with all entity types survives round-trip', () => {
    const state = makeFullState({
      tasks: [
        makeTask({ id: 't1', status: 'active', subtasks: [{ id: 's1', title: 'Sub', done: false }] }),
        makeTask({ id: 't2', status: 'done', completedAt: '2026-02-20T12:00:00Z', recurrence: 'quarterly', recurrenceDayOfMonth: 16, recurrenceStartMonth: 2 }),
      ],
      pomodoros: [
        makePomodoro({ id: 'p1', linkedTasks: [{ taskId: 't1', subtaskId: 's1' }] }),
      ],
      reminders: [
        makeReminder({ id: 'r1', category: 'birthday', recurrence: 'yearly' }),
      ],
      readingList: [
        makeReadingItem({ id: 'rl1', tags: ['ai', 'ml'], notes: 'Great paper' }),
      ],
      templates: [{
        id: 'tmpl-1',
        name: 'Sprint Planning',
        tasks: [{ title: 'Review backlog', priority: 'high' as const }],
        createdAt: '2026-01-01T00:00:00Z',
      }],
      dailyStats: [
        { date: '2026-02-20', tasksCompleted: 2, focusMinutes: 50, pomodorosCompleted: 2 },
      ],
      currentStreak: 3,
      preferences: { notificationSound: 'bell', obsidianVaultPath: '/vault', obsidianAutoSync: true },
    });

    const restored = roundTrip(state);

    // Verify all entity counts
    expect(restored.tasks).toHaveLength(2);
    expect(restored.pomodoros).toHaveLength(1);
    expect(restored.reminders).toHaveLength(1);
    expect(restored.readingList).toHaveLength(1);
    expect(restored.templates).toHaveLength(1);
    expect(restored.dailyStats).toHaveLength(1);

    // Verify key fields didn't get lost
    expect(restored.tasks[1].recurrence).toBe('quarterly');
    expect(restored.tasks[1].recurrenceDayOfMonth).toBe(16);
    expect(restored.tasks[1].status).toBe('done');
    expect(restored.pomodoros[0].linkedTasks![0].subtaskId).toBe('s1');
    expect(restored.reminders![0].category).toBe('birthday');
    expect(restored.readingList![0].notes).toBe('Great paper');
    expect(restored.preferences?.notificationSound).toBe('bell');
    expect(restored.currentStreak).toBe(3);
  });

  it('Zod schema validates the round-tripped state', () => {
    const state = makeFullState({
      tasks: [makeTask({ recurrence: 'quarterly', recurrenceDayOfMonth: 16, recurrenceStartMonth: 2 })],
      pomodoros: [makePomodoro({ linkedTasks: [{ taskId: 'task-1' }] })],
      reminders: [makeReminder({ acknowledged: true, acknowledgedAt: '2026-03-15T10:00:00Z' })],
      readingList: [makeReadingItem({ notes: 'Important', tags: ['a', 'b'] })],
    });

    const restored = roundTrip(state);
    const result = appStateSchema.safeParse(restored);
    expect(result.success).toBe(true);
  });
});
