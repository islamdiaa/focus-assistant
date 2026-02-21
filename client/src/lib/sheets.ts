/**
 * Storage Layer — Server-backed via tRPC
 *
 * The server handles all persistence (MD file or Google Sheets).
 * The client just calls load/save via tRPC and keeps localStorage as a fast cache.
 *
 * This module provides the same loadState/saveState API used by AppContext,
 * but now routes through the server instead of directly accessing files or sheets.
 *
 * V1.8.3: Added save error tracking, retry logic, and error reporting to prevent
 * silent data loss. Save failures are now visible to the user via onSaveError callback.
 */

import type { AppState, StorageConfig, StorageMode } from "./types";
import { DEFAULT_SETTINGS, DEFAULT_PREFERENCES } from "./types";

const STORAGE_KEY = "focus-assist-data";

// ---- Save error tracking ----

type SaveErrorCallback = (error: string, retryCount: number) => void;
type SaveSuccessCallback = () => void;

let onSaveError: SaveErrorCallback | null = null;
let onSaveSuccess: SaveSuccessCallback | null = null;
let consecutiveFailures = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export function setSaveErrorHandler(handler: SaveErrorCallback) {
  onSaveError = handler;
}

export function setSaveSuccessHandler(handler: SaveSuccessCallback) {
  onSaveSuccess = handler;
}

export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}

// ---- Local cache (localStorage) ----

function loadLocal(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    tasks: [],
    pomodoros: [],
    settings: { ...DEFAULT_SETTINGS },
    dailyStats: [],
    currentStreak: 0,
    templates: [],
    preferences: { ...DEFAULT_PREFERENCES },
    readingList: [],
    reminders: [],
  };
}

function saveLocal(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---- Server API calls (raw fetch, no tRPC dependency) ----

async function serverLoad(): Promise<AppState | null> {
  try {
    const res = await fetch("/api/trpc/data.load", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    // tRPC wraps in { result: { data: { json: ... } } }
    return json?.result?.data?.json ?? null;
  } catch (e) {
    console.warn("Failed to load from server:", e);
    return null;
  }
}

async function serverSave(
  state: AppState
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/trpc/data.save", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: state }),
    });
    if (!res.ok) {
      let errorMsg = `Server returned ${res.status}`;
      try {
        const body = await res.json();
        // tRPC error format
        if (body?.error?.json?.message) {
          errorMsg = body.error.json.message;
        } else if (body?.[0]?.error?.json?.message) {
          errorMsg = body[0].error.json.message;
        }
      } catch {}
      return { ok: false, error: errorMsg };
    }
    return { ok: true };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Network error";
    console.warn("Failed to save to server:", e);
    return { ok: false, error: errorMsg };
  }
}

async function serverGetConfig(): Promise<StorageConfig | null> {
  try {
    const res = await fetch("/api/trpc/data.getConfig", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.result?.data?.json ?? null;
  } catch (e) {
    console.warn("Failed to get config from server:", e);
    return null;
  }
}

async function serverSetConfig(config: StorageConfig): Promise<boolean> {
  try {
    const res = await fetch("/api/trpc/data.setConfig", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: config }),
    });
    return res.ok;
  } catch (e) {
    console.warn("Failed to set config on server:", e);
    return false;
  }
}

// ---- Public API (same interface as before) ----

export async function loadState(): Promise<AppState> {
  // Try server first
  const serverState = await serverLoad();
  if (serverState) {
    saveLocal(serverState); // cache locally
    return serverState;
  }
  // Fallback to localStorage cache
  return loadLocal();
}

export async function saveState(state: AppState): Promise<boolean> {
  // Always cache locally first (safety net)
  saveLocal(state);

  // Try to save to server with retry
  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await serverSave(state);
    if (result.ok) {
      if (consecutiveFailures > 0) {
        console.log(`[Save] Recovered after ${consecutiveFailures} failures`);
        consecutiveFailures = 0;
        onSaveSuccess?.();
      }
      return true;
    }
    lastError = result.error || "Unknown error";
    console.warn(
      `[Save] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${lastError}`
    );

    if (attempt < MAX_RETRIES) {
      await new Promise(resolve =>
        setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1))
      );
    }
  }

  // All retries exhausted
  consecutiveFailures++;
  console.error(
    `[Save] FAILED after ${MAX_RETRIES + 1} attempts. Consecutive failures: ${consecutiveFailures}. Error: ${lastError}`
  );
  console.error(
    "[Save] Data is cached in localStorage but NOT persisted to server."
  );
  onSaveError?.(lastError, consecutiveFailures);
  return false;
}

// ---- Config API ----

export async function getStorageConfig(): Promise<StorageConfig> {
  const config = await serverGetConfig();
  return config || { mode: "file" };
}

export async function setStorageConfig(
  config: StorageConfig
): Promise<boolean> {
  return serverSetConfig(config);
}

// ---- Legacy exports for backward compatibility ----

export type { StorageMode };

export function getStorageMode(): StorageMode {
  // This is now just a local cache hint; real mode is on server
  const saved = localStorage.getItem("focus-assist-storage-mode");
  if (saved === "sheets" || saved === "file") return saved;
  return "file";
}

export function setStorageMode(mode: StorageMode) {
  localStorage.setItem("focus-assist-storage-mode", mode);
}

// File system API stubs (no longer needed, server handles files)
export function isFileSystemSupported(): boolean {
  return false;
}
export function hasFileHandle(): boolean {
  return false;
}
export async function pickFile(): Promise<boolean> {
  return false;
}
export function disconnectFile(): void {}
export function getFileName(): string | null {
  return null;
}

// Google Sheets config (now managed server-side)
export function setSheetConfig(sheetId: string, apiKey: string) {
  localStorage.setItem("focus-assist-sheet-id", sheetId);
  localStorage.setItem("focus-assist-api-key", apiKey);
}

export function getSheetConfig() {
  return {
    sheetId: localStorage.getItem("focus-assist-sheet-id") || "",
    apiKey: localStorage.getItem("focus-assist-api-key") || "",
  };
}

export function isSheetConfigured(): boolean {
  const { sheetId, apiKey } = getSheetConfig();
  return !!(sheetId && apiKey);
}

// ---- Polling for multi-tab sync ----

export async function pollTimestamp(): Promise<number> {
  try {
    const res = await fetch("/api/trpc/data.poll", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return json?.result?.data?.json?.timestamp ?? 0;
  } catch {
    return 0;
  }
}

// ---- Export functions ----

export async function exportAsMarkdown(): Promise<string> {
  try {
    const res = await fetch("/api/trpc/data.exportMarkdown", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return "";
    const json = await res.json();
    return json?.result?.data?.json?.markdown ?? "";
  } catch {
    return "";
  }
}

export async function exportAsJson(): Promise<string> {
  try {
    const res = await fetch("/api/trpc/data.exportJson", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return "";
    const json = await res.json();
    return json?.result?.data?.json?.json ?? "";
  } catch {
    return "";
  }
}

// ---- Unified export function ----

export async function exportData(format: "md" | "json"): Promise<string> {
  if (format === "md") return exportAsMarkdown();
  return exportAsJson();
}

// ---- Data integrity check ----

export async function runIntegrityCheck(): Promise<{
  ok: boolean;
  issues: string[];
  fixed: string[];
}> {
  try {
    const res = await fetch("/api/trpc/data.integrityCheck", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return { ok: false, issues: ["Server error"], fixed: [] };
    const json = await res.json();
    return (
      json?.result?.data?.json ?? {
        ok: false,
        issues: ["Unknown error"],
        fixed: [],
      }
    );
  } catch {
    return { ok: false, issues: ["Network error"], fixed: [] };
  }
}
