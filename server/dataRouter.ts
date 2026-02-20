/**
 * tRPC router for data storage operations
 * 
 * Provides load/save endpoints that route to the correct backend
 * based on the current storage configuration (MD file or Google Sheets).
 */
import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { loadFromMdFile, saveToMdFile, getMdFileTimestamp, stateToMarkdown } from './mdStorage';
import { loadFromSheets, saveToSheets } from './sheetsStorage';
import { loadConfig, saveConfig } from './storageConfig';
import { DEFAULT_SETTINGS } from '../shared/appTypes';
import type { AppState, StorageConfig } from '../shared/appTypes';

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
};

export const dataRouter = router({
  /**
   * Load app state from the configured backend
   */
  load: publicProcedure.query(async () => {
    const config = await loadConfig();

    if (config.mode === 'sheets' && config.sheetsId && config.sheetsApiKey) {
      const state = await loadFromSheets(config.sheetsId, config.sheetsApiKey);
      return state || emptyState;
    }

    // Default: MD file
    const state = await loadFromMdFile();
    return state || emptyState;
  }),

  /**
   * Save app state to the configured backend
   */
  save: publicProcedure
    .input(appStateSchema)
    .mutation(async ({ input }) => {
      const config = await loadConfig();

      if (config.mode === 'sheets' && config.sheetsId && config.sheetsApiKey) {
        const ok = await saveToSheets(config.sheetsId, config.sheetsApiKey, input);
        return { success: ok, backend: 'sheets' as const };
      }

      // Default: MD file
      const ok = await saveToMdFile(input);
      return { success: ok, backend: 'file' as const };
    }),

  /**
   * Get current storage configuration
   */
  getConfig: publicProcedure.query(async () => {
    return await loadConfig();
  }),

  /**
   * Update storage configuration
   */
  setConfig: publicProcedure
    .input(storageConfigSchema)
    .mutation(async ({ input }) => {
      const ok = await saveConfig(input as StorageConfig);
      return { success: ok };
    }),

  /**
   * Poll for changes — returns the file's last modified timestamp.
   * Client compares with its last known timestamp to detect external changes.
   */
  poll: publicProcedure.query(async () => {
    const timestamp = await getMdFileTimestamp();
    return { timestamp };
  }),

  /**
   * Export data as Markdown string (for download)
   */
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

  /**
   * Export data as JSON string (for Obsidian / programmatic use)
   */
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

  /**
   * Import data from uploaded file content (MD or JSON)
   */
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
        // Parse as MD — reuse the internal parser
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
});
