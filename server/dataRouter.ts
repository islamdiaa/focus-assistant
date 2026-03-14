/**
 * tRPC router for data storage operations
 *
 * Provides load/save endpoints that route to the correct backend
 * based on the current storage configuration (MD file or Google Sheets).
 *
 * IMPORTANT: All Zod schemas are imported from shared/appTypes.ts (single source of truth).
 * Do NOT define inline schemas here — that's how the V1.8.0 persistence bug happened.
 */
import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  loadFromMdFile,
  saveToMdFile,
  getMdFileTimestamp,
  stateToMarkdown,
  checkDataIntegrity,
} from "./mdStorage";
import { loadFromSheets, saveToSheets } from "./sheetsStorage";
import { loadConfig, saveConfig } from "./storageConfig";
import {
  appStateSchema,
  storageConfigSchema,
  DEFAULT_SETTINGS,
  DEFAULT_PREFERENCES,
} from "../shared/appTypes";
import type { AppState, StorageConfig } from "../shared/appTypes";

const emptyState: AppState = {
  tasks: [],
  pomodoros: [],
  settings: { ...DEFAULT_SETTINGS },
  dailyStats: [],
  currentStreak: 0,
  templates: [],
  preferences: { ...DEFAULT_PREFERENCES },
  readingList: [],
  reminders: [],
  canvas: [],
  scratchPad: [],
  dailyRituals: [],
};

export const dataRouter = router({
  load: protectedProcedure.query(async () => {
    const config = await loadConfig();
    if (config.mode === "sheets" && config.sheetsId && config.sheetsApiKey) {
      const state = await loadFromSheets(config.sheetsId, config.sheetsApiKey);
      return state || emptyState;
    }
    // H5 fix: loadFromMdFile now throws on corrupt files instead of returning null
    // Let the error propagate — the client should show an error state, not silently use empty data
    const state = await loadFromMdFile();
    return state || emptyState;
  }),

  save: protectedProcedure.input(appStateSchema).mutation(async ({ input }) => {
    const config = await loadConfig();
    if (config.mode === "sheets" && config.sheetsId && config.sheetsApiKey) {
      const ok = await saveToSheets(
        config.sheetsId,
        config.sheetsApiKey,
        input
      );
      return { success: ok, backend: "sheets" as const };
    }
    const ok = await saveToMdFile(input);
    return { success: ok, backend: "file" as const };
  }),

  getConfig: protectedProcedure.query(async () => {
    return await loadConfig();
  }),

  setConfig: adminProcedure
    .input(storageConfigSchema)
    .mutation(async ({ input }) => {
      const ok = await saveConfig(input as StorageConfig);
      return { success: ok };
    }),

  poll: protectedProcedure.query(async () => {
    const timestamp = await getMdFileTimestamp();
    return { timestamp };
  }),

  exportMarkdown: protectedProcedure.query(async () => {
    const config = await loadConfig();
    let state: AppState;
    if (config.mode === "sheets" && config.sheetsId && config.sheetsApiKey) {
      state =
        (await loadFromSheets(config.sheetsId, config.sheetsApiKey)) ||
        emptyState;
    } else {
      state = (await loadFromMdFile()) || emptyState;
    }
    return { markdown: stateToMarkdown(state) };
  }),

  exportJson: protectedProcedure.query(async () => {
    const config = await loadConfig();
    let state: AppState;
    if (config.mode === "sheets" && config.sheetsId && config.sheetsApiKey) {
      state =
        (await loadFromSheets(config.sheetsId, config.sheetsApiKey)) ||
        emptyState;
    } else {
      state = (await loadFromMdFile()) || emptyState;
    }
    return { json: JSON.stringify(state, null, 2) };
  }),

  importData: adminProcedure
    .input(
      z.object({
        content: z.string(),
        format: z.enum(["md", "json"]),
      })
    )
    .mutation(async ({ input }) => {
      let state: AppState;
      if (input.format === "json") {
        try {
          const parsed = JSON.parse(input.content);
          // C3 fix: validate JSON against Zod schema before accepting
          const result = appStateSchema.safeParse(parsed);
          if (!result.success) {
            return {
              success: false,
              error: `Invalid data structure: ${result.error.issues.map(i => i.message).join(", ")}`,
            };
          }
          state = result.data;
        } catch {
          return { success: false, error: "Invalid JSON" };
        }
      } else {
        const { markdownToState } = await import("./mdStorage");
        state = markdownToState(input.content);
      }
      const config = await loadConfig();
      if (config.mode === "sheets" && config.sheetsId && config.sheetsApiKey) {
        const ok = await saveToSheets(
          config.sheetsId,
          config.sheetsApiKey,
          state
        );
        return { success: ok };
      }
      const ok = await saveToMdFile(state);
      return { success: ok };
    }),

  /** Data integrity check — verify and optionally fix MD file structure */
  integrityCheck: adminProcedure.query(async () => {
    return await checkDataIntegrity();
  }),
});
