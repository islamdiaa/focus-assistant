/**
 * Google Sheets Integration
 * 
 * This module handles reading/writing data to a Google Sheet.
 * The sheet acts as a simple cloud database.
 * 
 * Setup:
 * 1. Create a Google Sheet
 * 2. Share it as "Anyone with the link can edit"
 * 3. Get the Sheet ID from the URL
 * 4. Create a Google API key (or use a service account)
 * 5. Set SHEET_ID and API_KEY in the config
 * 
 * Sheet structure:
 * - Sheet "Tasks": id, title, description, priority, status, dueDate, quadrant, createdAt, completedAt
 * - Sheet "Pomodoros": id, title, duration, elapsed, status, createdAt, completedAt
 * - Sheet "Settings": key, value
 * - Sheet "DailyStats": date, tasksCompleted, focusMinutes, pomodorosCompleted
 */

import type { Task, Pomodoro, TimerSettings, DailyStats, AppState } from './types';
import { DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'focus-assist-data';

// Google Sheets config - users will set these
let SHEET_ID = localStorage.getItem('focus-assist-sheet-id') || '';
let API_KEY = localStorage.getItem('focus-assist-api-key') || '';

export function setSheetConfig(sheetId: string, apiKey: string) {
  SHEET_ID = sheetId;
  API_KEY = apiKey;
  localStorage.setItem('focus-assist-sheet-id', sheetId);
  localStorage.setItem('focus-assist-api-key', apiKey);
}

export function getSheetConfig() {
  return { sheetId: SHEET_ID, apiKey: API_KEY };
}

export function isSheetConfigured(): boolean {
  return !!(SHEET_ID && API_KEY);
}

// ---- Google Sheets API helpers ----

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function readSheet(sheetName: string): Promise<string[][]> {
  if (!isSheetConfigured()) return [];
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheet read failed: ${res.status}`);
    const data = await res.json();
    return data.values || [];
  } catch (e) {
    console.warn(`Failed to read sheet "${sheetName}":`, e);
    return [];
  }
}

async function writeSheet(sheetName: string, values: string[][]): Promise<boolean> {
  if (!isSheetConfigured()) return false;
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?valueInputOption=RAW&key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });
    return res.ok;
  } catch (e) {
    console.warn(`Failed to write sheet "${sheetName}":`, e);
    return false;
  }
}

// ---- Local storage fallback ----

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
  };
}

function saveLocal(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---- Sync logic ----

function tasksToRows(tasks: Task[]): string[][] {
  const header = ['id', 'title', 'description', 'priority', 'status', 'dueDate', 'quadrant', 'createdAt', 'completedAt'];
  return [header, ...tasks.map(t => [
    t.id, t.title, t.description || '', t.priority, t.status,
    t.dueDate || '', t.quadrant, t.createdAt, t.completedAt || '',
  ])];
}

function rowsToTasks(rows: string[][]): Task[] {
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({
    id: r[0] || '',
    title: r[1] || '',
    description: r[2] || undefined,
    priority: (r[3] as Task['priority']) || 'medium',
    status: (r[4] as Task['status']) || 'active',
    dueDate: r[5] || undefined,
    quadrant: (r[6] as Task['quadrant']) || 'unassigned',
    createdAt: r[7] || new Date().toISOString(),
    completedAt: r[8] || undefined,
  })).filter(t => t.id);
}

function pomodorosToRows(pomodoros: Pomodoro[]): string[][] {
  const header = ['id', 'title', 'duration', 'elapsed', 'status', 'createdAt', 'completedAt'];
  return [header, ...pomodoros.map(p => [
    p.id, p.title, String(p.duration), String(p.elapsed), p.status,
    p.createdAt, p.completedAt || '',
  ])];
}

function rowsToPomodoros(rows: string[][]): Pomodoro[] {
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({
    id: r[0] || '',
    title: r[1] || '',
    duration: parseInt(r[2]) || 25,
    elapsed: parseInt(r[3]) || 0,
    status: (r[4] as Pomodoro['status']) || 'idle',
    createdAt: r[5] || new Date().toISOString(),
    completedAt: r[6] || undefined,
  })).filter(p => p.id);
}

function statsToRows(stats: DailyStats[]): string[][] {
  const header = ['date', 'tasksCompleted', 'focusMinutes', 'pomodorosCompleted'];
  return [header, ...stats.map(s => [
    s.date, String(s.tasksCompleted), String(s.focusMinutes), String(s.pomodorosCompleted),
  ])];
}

function rowsToStats(rows: string[][]): DailyStats[] {
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({
    date: r[0] || '',
    tasksCompleted: parseInt(r[1]) || 0,
    focusMinutes: parseInt(r[2]) || 0,
    pomodorosCompleted: parseInt(r[3]) || 0,
  })).filter(s => s.date);
}

function settingsToRows(settings: TimerSettings, streak: number): string[][] {
  return [
    ['key', 'value'],
    ['focusDuration', String(settings.focusDuration)],
    ['shortBreak', String(settings.shortBreak)],
    ['longBreak', String(settings.longBreak)],
    ['sessionsBeforeLongBreak', String(settings.sessionsBeforeLongBreak)],
    ['currentStreak', String(streak)],
  ];
}

function rowsToSettings(rows: string[][]): { settings: TimerSettings; streak: number } {
  const map: Record<string, string> = {};
  if (rows.length >= 2) {
    rows.slice(1).forEach(r => { if (r[0]) map[r[0]] = r[1] || ''; });
  }
  return {
    settings: {
      focusDuration: parseInt(map.focusDuration) || DEFAULT_SETTINGS.focusDuration,
      shortBreak: parseInt(map.shortBreak) || DEFAULT_SETTINGS.shortBreak,
      longBreak: parseInt(map.longBreak) || DEFAULT_SETTINGS.longBreak,
      sessionsBeforeLongBreak: parseInt(map.sessionsBeforeLongBreak) || DEFAULT_SETTINGS.sessionsBeforeLongBreak,
    },
    streak: parseInt(map.currentStreak) || 0,
  };
}

// ---- Public API ----

export async function loadState(): Promise<AppState> {
  const local = loadLocal();

  if (!isSheetConfigured()) return local;

  try {
    const [taskRows, pomRows, settingsRows, statsRows] = await Promise.all([
      readSheet('Tasks'),
      readSheet('Pomodoros'),
      readSheet('Settings'),
      readSheet('DailyStats'),
    ]);

    const tasks = taskRows.length > 1 ? rowsToTasks(taskRows) : local.tasks;
    const pomodoros = pomRows.length > 1 ? rowsToPomodoros(pomRows) : local.pomodoros;
    const { settings, streak } = settingsRows.length > 1
      ? rowsToSettings(settingsRows)
      : { settings: local.settings, streak: local.currentStreak };
    const dailyStats = statsRows.length > 1 ? rowsToStats(statsRows) : local.dailyStats;

    const state: AppState = { tasks, pomodoros, settings, dailyStats, currentStreak: streak };
    saveLocal(state);
    return state;
  } catch {
    return local;
  }
}

export async function saveState(state: AppState): Promise<void> {
  saveLocal(state);

  if (!isSheetConfigured()) return;

  try {
    await Promise.all([
      writeSheet('Tasks', tasksToRows(state.tasks)),
      writeSheet('Pomodoros', pomodorosToRows(state.pomodoros)),
      writeSheet('Settings', settingsToRows(state.settings, state.currentStreak)),
      writeSheet('DailyStats', statsToRows(state.dailyStats)),
    ]);
  } catch (e) {
    console.warn('Failed to sync to Google Sheets:', e);
  }
}
