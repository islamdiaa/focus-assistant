/**
 * tRPC router for data storage operations
 * 
 * Provides load/save endpoints that route to the correct backend
 * based on the current storage configuration (MD file or Google Sheets).
 */
import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { loadFromMdFile, saveToMdFile } from './mdStorage';
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
  })),
  pomodoros: z.array(z.object({
    id: z.string(),
    title: z.string(),
    duration: z.number(),
    elapsed: z.number(),
    status: z.enum(['idle', 'running', 'paused', 'completed']),
    createdAt: z.string(),
    completedAt: z.string().optional(),
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
});
