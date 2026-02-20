/**
 * tRPC router for data storage operations
 * 
 * Provides load/save endpoints that route to the correct backend
 * based on the current storage configuration (MD file or Google Sheets).
 * V1.2: Added subtasks, templates, preferences, integrity check
 */
import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { loadFromMdFile, saveToMdFile, getMdFileTimestamp, stateToMarkdown, checkDataIntegrity } from './mdStorage';
import { loadFromSheets, saveToSheets } from './sheetsStorage';
import { loadConfig, saveConfig } from './storageConfig';
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from '../shared/appTypes';
import type { AppState, StorageConfig } from '../shared/appTypes';

const subtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

const appStateSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    status: z.enum(['active', 'done']),
    dueDate: z.string().optional(),
    category: z.enum(['work', 'personal', 'health', 'learning', 'errands', 'other']).optional(),
    energy: z.enum(['low', 'medium', 'high']).optional(),
    quadrant: z.enum(['do-first', 'schedule', 'delegate', 'eliminate', 'unassigned']),
    createdAt: z.string(),
    completedAt: z.string().optional(),
    recurrence: z.enum(['daily', 'weekly', 'monthly', 'weekdays', 'none']).optional(),
    recurrenceParentId: z.string().optional(),
    recurrenceNextDate: z.string().optional(),
    subtasks: z.array(subtaskSchema).optional(),
  })),
  pomodoros: z.array(z.object({
    id: z.string(),
    title: z.string(),
    duration: z.number(),
    elapsed: z.number(),
    status: z.enum(['idle', 'running', 'paused', 'completed']),
    createdAt: z.string(),
    completedAt: z.string().optional(),
    startedAt: z.string().optional(),
    accumulatedSeconds: z.number().optional(),
    linkedTaskId: z.string().optional(),
  })),
  settings: z.object({
    focusDuration: z.number(),
    shortBreak: z.number(),
    longBreak: z.number(),
    sessionsBeforeLongBreak: z.number(),
  }),
  dailyStats: z.array(z.object({
    date: z.string(),
    tasksCompleted: z.number(),
    focusMinutes: z.number(),
    pomodorosCompleted: z.number(),
  })),
  currentStreak: z.number(),
  templates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    tasks: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      category: z.enum(['work', 'personal', 'health', 'learning', 'errands', 'other']).optional(),
      energy: z.enum(['low', 'medium', 'high']).optional(),
      subtasks: z.array(z.object({ title: z.string() })).optional(),
    })),
    createdAt: z.string(),
  })).optional(),
  preferences: z.object({
    notificationSound: z.enum(['gentle-chime', 'bell', 'singing-bowl', 'wood-block', 'digital-beep', 'none']).optional(),
    obsidianVaultPath: z.string().optional(),
    obsidianAutoSync: z.boolean().optional(),
  }).optional(),
  readingList: z.array(z.object({
    id: z.string(),
    url: z.string(),
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    status: z.enum(['unread', 'reading', 'read']),
    notes: z.string().optional(),
    imageUrl: z.string().optional(),
    domain: z.string().optional(),
    createdAt: z.string(),
    readAt: z.string().optional(),
  })).optional(),
});

const storageConfigSchema = z.object({
  mode: z.enum(['local', 'file', 'sheets']),
  sheetsId: z.string().optional(),
  sheetsApiKey: z.string().optional(),
});

const emptyState: AppState = {
  tasks: [],
  pomodoros: [],
  settings: { ...DEFAULT_SETTINGS },
  dailyStats: [],
  currentStreak: 0,
  templates: [],
  preferences: { ...DEFAULT_PREFERENCES },
  readingList: [],
};

export const dataRouter = router({
  load: publicProcedure.query(async () => {
    const config = await loadConfig();
    if (config.mode === 'sheets' && config.sheetsId && config.sheetsApiKey) {
      const state = await loadFromSheets(config.sheetsId, config.sheetsApiKey);
      return state || emptyState;
    }
    const state = await loadFromMdFile();
    return state || emptyState;
  }),

  save: publicProcedure
    .input(appStateSchema)
    .mutation(async ({ input }) => {
      const config = await loadConfig();
      if (config.mode === 'sheets' && config.sheetsId && config.sheetsApiKey) {
        const ok = await saveToSheets(config.sheetsId, config.sheetsApiKey, input);
        return { success: ok, backend: 'sheets' as const };
      }
      const ok = await saveToMdFile(input);
      return { success: ok, backend: 'file' as const };
    }),

  getConfig: publicProcedure.query(async () => {
    return await loadConfig();
  }),

  setConfig: publicProcedure
    .input(storageConfigSchema)
    .mutation(async ({ input }) => {
      const ok = await saveConfig(input as StorageConfig);
      return { success: ok };
    }),

  poll: publicProcedure.query(async () => {
    const timestamp = await getMdFileTimestamp();
    return { timestamp };
  }),

  exportMarkdown: publicProcedure.query(async () => {
    const config = await loadConfig();
    let state: AppState;
    if (config.mode === 'sheets' && config.sheetsId && config.sheetsApiKey) {
      state = (await loadFromSheets(config.sheetsId, config.sheetsApiKey)) || emptyState;
    } else {
      state = (await loadFromMdFile()) || emptyState;
    }
    return { markdown: stateToMarkdown(state) };
  }),

  exportJson: publicProcedure.query(async () => {
    const config = await loadConfig();
    let state: AppState;
    if (config.mode === 'sheets' && config.sheetsId && config.sheetsApiKey) {
      state = (await loadFromSheets(config.sheetsId, config.sheetsApiKey)) || emptyState;
    } else {
      state = (await loadFromMdFile()) || emptyState;
    }
    return { json: JSON.stringify(state, null, 2) };
  }),

  importData: publicProcedure
    .input(z.object({
      content: z.string(),
      format: z.enum(['md', 'json']),
    }))
    .mutation(async ({ input }) => {
      let state: AppState;
      if (input.format === 'json') {
        try {
          state = JSON.parse(input.content);
        } catch {
          return { success: false, error: 'Invalid JSON' };
        }
      } else {
        const { markdownToState } = await import('./mdStorage');
        state = markdownToState(input.content);
      }
      const config = await loadConfig();
      if (config.mode === 'sheets' && config.sheetsId && config.sheetsApiKey) {
        const ok = await saveToSheets(config.sheetsId, config.sheetsApiKey, state);
        return { success: ok };
      }
      const ok = await saveToMdFile(state);
      return { success: ok };
    }),

  /** Data integrity check — verify and optionally fix MD file structure */
  integrityCheck: publicProcedure.query(async () => {
    return await checkDataIntegrity();
  }),
});
