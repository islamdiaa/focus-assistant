/**
 * Server-side Google Sheets storage
 * 
 * Reads/writes app state to Google Sheets via the Sheets API.
 * Requires a Sheet ID and API key configured in storage config.
 */
import type { Task, Pomodoro, TimerSettings, DailyStats, AppState } from '../shared/appTypes';
import { DEFAULT_SETTINGS } from '../shared/appTypes';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function readSheet(sheetId: string, apiKey: string, sheetName: string): Promise<string[][]> {
  try {
    const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheet read failed: ${res.status}`);
    const data = await res.json();
    return data.values || [];
  } catch (e) {
    console.warn(`Failed to read sheet "${sheetName}":`, e);
    return [];
  }
}

async function writeSheet(sheetId: string, apiKey: string, sheetName: string, values: string[][]): Promise<boolean> {
  try {
    const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(sheetName)}?valueInputOption=RAW&key=${apiKey}`;
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

// ---- Row converters ----

function tasksToRows(tasks: Task[]): string[][] {
  const header = ['id', 'title', 'description', 'priority', 'status', 'dueDate', 'category', 'energy', 'quadrant', 'createdAt', 'completedAt'];
  return [header, ...tasks.map(t => [
    t.id, t.title, t.description || '', t.priority, t.status,
    t.dueDate || '', t.category || '', t.energy || '', t.quadrant, t.createdAt, t.completedAt || '',
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
    category: (r[6] as Task['category']) || undefined,
    energy: (r[7] as Task['energy']) || undefined,
    quadrant: (r[8] as Task['quadrant']) || 'unassigned',
    createdAt: r[9] || new Date().toISOString(),
    completedAt: r[10] || undefined,
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

export async function loadFromSheets(sheetId: string, apiKey: string): Promise<AppState | null> {
  try {
    const [taskRows, pomRows, settingsRows, statsRows] = await Promise.all([
      readSheet(sheetId, apiKey, 'Tasks'),
      readSheet(sheetId, apiKey, 'Pomodoros'),
      readSheet(sheetId, apiKey, 'Settings'),
      readSheet(sheetId, apiKey, 'DailyStats'),
    ]);

    const tasks = taskRows.length > 1 ? rowsToTasks(taskRows) : [];
    const pomodoros = pomRows.length > 1 ? rowsToPomodoros(pomRows) : [];
    const { settings, streak } = settingsRows.length > 1
      ? rowsToSettings(settingsRows)
      : { settings: DEFAULT_SETTINGS, streak: 0 };
    const dailyStats = statsRows.length > 1 ? rowsToStats(statsRows) : [];

    return { tasks, pomodoros, settings, dailyStats, currentStreak: streak };
  } catch (e) {
    console.warn('Failed to load from Google Sheets:', e);
    return null;
  }
}

export async function saveToSheets(sheetId: string, apiKey: string, state: AppState): Promise<boolean> {
  try {
    const results = await Promise.all([
      writeSheet(sheetId, apiKey, 'Tasks', tasksToRows(state.tasks)),
      writeSheet(sheetId, apiKey, 'Pomodoros', pomodorosToRows(state.pomodoros)),
      writeSheet(sheetId, apiKey, 'Settings', settingsToRows(state.settings, state.currentStreak)),
      writeSheet(sheetId, apiKey, 'DailyStats', statsToRows(state.dailyStats)),
    ]);
    return results.every(Boolean);
  } catch (e) {
    console.warn('Failed to save to Google Sheets:', e);
    return false;
  }
}
