/**
 * Settings Page — Warm Productivity design
 * Timer presets, custom sliders, storage mode toggle, Google Sheets config
 * V1.2: Notification sounds, Obsidian vault sync, data integrity check
 */
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Save, RotateCcw, Cloud, CloudOff, Timer, Link2,
  FileText, HardDrive, Unplug, Download, Upload, Sun, Moon,
  Bell, Volume2, VolumeX, FolderSync, ShieldCheck, Loader2,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getStorageConfig, setStorageConfig, exportData, runIntegrityCheck,
} from '@/lib/sheets';
import { DEFAULT_SETTINGS, NOTIFICATION_SOUNDS } from '@/lib/types';
import type { TimerSettings, StorageMode, StorageConfig, NotificationSound } from '@/lib/types';
import { toast } from 'sonner';

interface Preset {
  name: string;
  description: string;
  settings: TimerSettings;
}

const PRESETS: Preset[] = [
  { name: 'Classic Pomodoro', description: '25m focus / 5m break', settings: { focusDuration: 25, shortBreak: 5, longBreak: 15, sessionsBeforeLongBreak: 4 } },
  { name: 'Short Sprints', description: '15m focus / 3m break', settings: { focusDuration: 15, shortBreak: 3, longBreak: 10, sessionsBeforeLongBreak: 4 } },
  { name: 'Deep Work', description: '50m focus / 10m break', settings: { focusDuration: 50, shortBreak: 10, longBreak: 20, sessionsBeforeLongBreak: 3 } },
  { name: 'Gentle Start', description: '10m focus / 5m break', settings: { focusDuration: 10, shortBreak: 5, longBreak: 10, sessionsBeforeLongBreak: 4 } },
];

export default function SettingsPage() {
  const { state, dispatch, syncToCloud, reloadState } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<TimerSettings>({ ...state.settings });
  const [sheetId, setSheetId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<StorageMode>('file');
  const [configLoaded, setConfigLoaded] = useState(false);

  // Notification sound
  const currentSound = state.preferences?.notificationSound || 'gentle-chime';

  // Obsidian sync
  const obsidianPath = state.preferences?.obsidianVaultPath || '';
  const obsidianAutoSync = state.preferences?.obsidianAutoSync || false;
  const [obsidianInput, setObsidianInput] = useState(obsidianPath);

  // Integrity check
  const [integrityResult, setIntegrityResult] = useState<{ ok: boolean; issues: string[]; fixed: string[] } | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);

  // Load storage config from server on mount
  useEffect(() => {
    getStorageConfig().then(config => {
      setMode(config.mode);
      setSheetId(config.sheetsId || '');
      setApiKey(config.sheetsApiKey || '');
      setConfigLoaded(true);
    });
  }, []);

  useEffect(() => {
    setObsidianInput(state.preferences?.obsidianVaultPath || '');
  }, [state.preferences?.obsidianVaultPath]);

  function applyPreset(preset: Preset) {
    setSettings({ ...preset.settings });
    toast.success(`Applied "${preset.name}" preset`);
  }

  function handleSave() {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    toast.success('Settings saved');
  }

  function handleReset() {
    setSettings({ ...DEFAULT_SETTINGS });
    toast.info('Reset to defaults');
  }

  function handleSoundChange(sound: NotificationSound) {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: { notificationSound: sound } });
    toast.success(`Notification sound: ${NOTIFICATION_SOUNDS.find(s => s.id === sound)?.label || sound}`);
  }

  function handleSaveObsidian() {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { obsidianVaultPath: obsidianInput.trim() },
    });
    toast.success('Obsidian vault path saved');
  }

  function handleToggleObsidianAutoSync(checked: boolean) {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { obsidianAutoSync: checked },
    });
  }

  async function handleIntegrityCheck() {
    setIntegrityLoading(true);
    try {
      const result = await runIntegrityCheck();
      setIntegrityResult(result);
      if (result.ok) {
        toast.success('Data integrity check passed!');
      } else {
        toast.warning(`Found ${result.issues.length} issue(s)`);
      }
      if (result.fixed.length > 0) {
        await reloadState();
      }
    } catch {
      toast.error('Integrity check failed');
    } finally {
      setIntegrityLoading(false);
    }
  }

  // ---- Storage mode handlers ----

  const handleSwitchToSheets = useCallback(async (checked: boolean) => {
    if (checked) {
      setMode('sheets');
      toast.info('Switched to Google Sheets mode. Configure your Sheet below.');
    } else {
      setMode('file');
      const config: StorageConfig = { mode: 'file' };
      await setStorageConfig(config);
      await reloadState();
      toast.info('Switched back to local Markdown file.');
    }
  }, [reloadState]);

  const handleSaveSheetConfig = useCallback(async () => {
    const config: StorageConfig = {
      mode: 'sheets',
      sheetsId: sheetId,
      sheetsApiKey: apiKey,
    };
    const ok = await setStorageConfig(config);
    if (ok) {
      setMode('sheets');
      await syncToCloud();
      toast.success('Google Sheets connected! Data will sync automatically.');
    } else {
      toast.error('Failed to save configuration.');
    }
  }, [sheetId, apiKey, syncToCloud]);

  const handleDisconnectSheet = useCallback(async () => {
    const config: StorageConfig = { mode: 'file' };
    await setStorageConfig(config);
    setSheetId('');
    setApiKey('');
    setMode('file');
    toast.info('Disconnected from Google Sheets. Using local Markdown file.');
  }, []);

  const sheetsConfigured = mode === 'sheets' && !!sheetId && !!apiKey;

  const handleExport = useCallback(async (format: 'md' | 'json') => {
    try {
      const data = await exportData(format);
      const blob = new Blob([data], { type: format === 'md' ? 'text/markdown' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focus-assist-data.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as .${format}`);
    } catch {
      toast.error('Export failed');
    }
  }, []);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const res = await fetch('/api/trpc/data.importData', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json: { content: text, format: file.name.endsWith('.json') ? 'json' : 'md' } }),
          credentials: 'include',
        });
        if (res.ok) {
          await reloadState();
          toast.success('Data imported successfully!');
        } else {
          toast.error('Import failed');
        }
      } catch {
        toast.error('Import failed');
      }
    };
    input.click();
  }, [reloadState]);

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl lg:text-3xl text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize your focus experience</p>
      </div>

      {/* ========== NOTIFICATION SOUNDS ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-warm-amber" />
          <h3 className="font-semibold text-sm text-foreground">Notification Sound</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Choose the sound that plays when a Pomodoro timer completes.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {NOTIFICATION_SOUNDS.map(sound => (
            <button
              key={sound.id}
              onClick={() => handleSoundChange(sound.id)}
              className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all duration-200
                ${currentSound === sound.id
                  ? 'bg-warm-amber-light border-warm-amber/40 shadow-sm'
                  : 'bg-background border-border hover:border-warm-amber/20'}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                {sound.id === 'none' ? (
                  <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-warm-amber" />
                )}
                <span className="text-sm font-medium text-foreground">{sound.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{sound.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ========== DATA STORAGE ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-4 h-4 text-warm-sage" />
          <h3 className="font-semibold text-sm text-foreground">Data Storage</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Choose where your data lives. Local Markdown file is the default — your data is stored on the server in a readable <code className="bg-warm-sand/60 px-1 py-0.5 rounded">.md</code> file.
        </p>

        {/* Current status badge */}
        <div className="mb-5">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            mode === 'sheets'
              ? 'bg-warm-blue-light text-warm-blue border border-warm-blue/20'
              : 'bg-warm-sage-light text-warm-sage border border-warm-sage/20'
          }`}>
            {mode === 'sheets' ? (
              <><Cloud className="w-3.5 h-3.5" /> Google Sheets</>
            ) : (
              <><FileText className="w-3.5 h-3.5" /> Local Markdown File</>
            )}
          </div>
        </div>

        {/* ---- Local Markdown File Section ---- */}
        <div className={`rounded-xl border p-4 mb-4 transition-all ${
          mode === 'file' || mode === 'local'
            ? 'border-warm-sage/40 bg-warm-sage-light/20'
            : 'border-border bg-background'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-warm-sage" />
            <h4 className="text-sm font-medium text-foreground">Local Markdown File</h4>
            {(mode === 'file' || mode === 'local') && (
              <span className="ml-auto text-xs bg-warm-sage/10 text-warm-sage px-2 py-0.5 rounded-full font-medium">Active</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Data is saved as a human-readable <code className="bg-warm-sand/60 px-1 py-0.5 rounded">focus-assist-data.md</code> file. Auto-saves on every change.
          </p>
          {(mode === 'file' || mode === 'local') && (
            <div className="flex items-center gap-2 bg-warm-sage-light/50 rounded-lg p-3">
              <FileText className="w-4 h-4 text-warm-sage shrink-0" />
              <span className="text-xs text-warm-sage font-medium">focus-assist-data.md</span>
            </div>
          )}
        </div>

        {/* ---- Google Sheets Section ---- */}
        <div className={`rounded-xl border p-4 transition-all ${
          mode === 'sheets'
            ? 'border-warm-blue/40 bg-warm-blue-light/20'
            : 'border-border bg-background'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {mode === 'sheets' ? (
              <Cloud className="w-4 h-4 text-warm-blue" />
            ) : (
              <CloudOff className="w-4 h-4 text-muted-foreground" />
            )}
            <h4 className="text-sm font-medium text-foreground">Google Sheets Cloud Sync</h4>
            <div className="ml-auto flex items-center gap-2">
              {mode === 'sheets' && sheetsConfigured && (
                <span className="text-xs bg-warm-blue/10 text-warm-blue px-2 py-0.5 rounded-full font-medium">Active</span>
              )}
              <Switch
                checked={mode === 'sheets'}
                onCheckedChange={handleSwitchToSheets}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Sync to a Google Sheet for cross-device access.
          </p>

          {mode === 'sheets' && (
            sheetsConfigured ? (
              <div>
                <div className="bg-warm-blue-light/50 rounded-lg p-3 mb-3 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-warm-blue" />
                  <span className="text-xs text-warm-blue font-medium">Connected to Google Sheets</span>
                </div>
                <Button onClick={handleDisconnectSheet} variant="outline" size="sm" className="text-warm-terracotta border-warm-terracotta/30 hover:bg-warm-terracotta-light gap-1.5 text-xs">
                  <Unplug className="w-3.5 h-3.5" /> Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Google Sheet ID</label>
                  <Input
                    placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    value={sheetId}
                    onChange={e => setSheetId(e.target.value)}
                    className="bg-background text-sm"
                  />
                  <p className="text-xs text-muted-foreground/60 mt-1">Found in the Sheet URL after /d/</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Google API Key</label>
                  <Input
                    placeholder="Your Google API key"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="bg-background text-sm"
                    type="password"
                  />
                </div>
                <Button onClick={handleSaveSheetConfig} className="bg-warm-blue hover:bg-warm-blue/90 text-white gap-2 w-full text-xs" disabled={!sheetId || !apiKey}>
                  <Link2 className="w-4 h-4" /> Connect Sheet
                </Button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ========== OBSIDIAN VAULT SYNC ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FolderSync className="w-4 h-4 text-warm-lavender" />
          <h3 className="font-semibold text-sm text-foreground">Obsidian Vault Sync</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Export your tasks and focus data to an Obsidian vault. Set the vault path and enable auto-sync to keep your notes updated.
          The server will write a <code className="bg-warm-sand/60 px-1 py-0.5 rounded">FocusAssist.md</code> file to the specified directory.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Vault Path</label>
            <div className="flex gap-2">
              <Input
                value={obsidianInput}
                onChange={e => setObsidianInput(e.target.value)}
                placeholder="/path/to/obsidian/vault"
                className="bg-background text-sm flex-1"
              />
              <Button onClick={handleSaveObsidian} size="sm" className="bg-warm-lavender hover:bg-warm-lavender/90 text-white gap-1.5 shrink-0">
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            </div>
            {obsidianPath && (
              <p className="text-xs text-warm-lavender mt-1.5">Current: {obsidianPath}</p>
            )}
          </div>
          <div className="flex items-center justify-between bg-background rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-Sync</p>
              <p className="text-xs text-muted-foreground">Automatically export on every data change</p>
            </div>
            <Switch
              checked={obsidianAutoSync}
              onCheckedChange={handleToggleObsidianAutoSync}
            />
          </div>
        </div>
      </div>

      {/* ========== APPEARANCE ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-warm-lavender" /> : <Sun className="w-4 h-4 text-warm-amber" />}
          <h3 className="font-semibold text-sm text-foreground">Appearance</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Switch between light and dark themes.
        </p>
        <div className="flex items-center justify-between bg-background rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-warm-lavender/10' : 'bg-warm-amber-light'}`}>
              {theme === 'dark' ? <Moon className="w-4 h-4 text-warm-lavender" /> : <Sun className="w-4 h-4 text-warm-amber" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
              <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Warm dark palette for low-light environments' : 'Warm cream palette for daytime use'}</p>
            </div>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={() => toggleTheme?.()}
          />
        </div>
      </div>

      {/* ========== QUICK PRESETS ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="w-4 h-4 text-warm-sage" />
          <h3 className="font-semibold text-sm text-foreground">Quick Presets</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="text-left bg-background rounded-xl border border-border p-4 hover:border-warm-sage/40 hover:bg-warm-sage-light/30 transition-all duration-200"
            >
              <p className="text-sm font-medium text-foreground">{preset.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ========== CUSTOM TIMER SETTINGS ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Timer className="w-4 h-4 text-warm-sage" />
          <h3 className="font-semibold text-sm text-foreground">Custom Timer Settings</h3>
        </div>

        <div className="space-y-6">
          {/* Focus Duration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Focus Duration: {settings.focusDuration} min</label>
            </div>
            <Slider
              value={[settings.focusDuration]}
              onValueChange={([v]) => setSettings(s => ({ ...s, focusDuration: v }))}
              min={5}
              max={90}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground/50 mt-1">
              <span>5 min</span>
              <span>90 min</span>
            </div>
          </div>

          {/* Short Break */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Short Break: {settings.shortBreak} min</label>
            </div>
            <Slider
              value={[settings.shortBreak]}
              onValueChange={([v]) => setSettings(s => ({ ...s, shortBreak: v }))}
              min={1}
              max={15}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground/50 mt-1">
              <span>1 min</span>
              <span>15 min</span>
            </div>
          </div>

          {/* Long Break */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Long Break: {settings.longBreak} min</label>
            </div>
            <Slider
              value={[settings.longBreak]}
              onValueChange={([v]) => setSettings(s => ({ ...s, longBreak: v }))}
              min={5}
              max={45}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground/50 mt-1">
              <span>5 min</span>
              <span>45 min</span>
            </div>
          </div>

          {/* Sessions Before Long Break */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions Before Long Break: {settings.sessionsBeforeLongBreak}</label>
            </div>
            <Slider
              value={[settings.sessionsBeforeLongBreak]}
              onValueChange={([v]) => setSettings(s => ({ ...s, sessionsBeforeLongBreak: v }))}
              min={2}
              max={8}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground/50 mt-1">
              <span>2</span>
              <span>8</span>
            </div>
          </div>
        </div>

        {/* Save / Reset */}
        <div className="flex gap-3 mt-6">
          <Button onClick={handleSave} className="flex-1 bg-warm-sage hover:bg-warm-sage/90 text-white gap-2">
            <Save className="w-4 h-4" /> Save Settings
          </Button>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
        </div>
      </div>

      {/* ========== EXPORT / IMPORT ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-4 h-4 text-warm-sage" />
          <h3 className="font-semibold text-sm text-foreground">Export & Import</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Download your data as a Markdown or JSON file for backup, or import a previously exported file to restore.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleExport('md')} variant="outline" className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Download .md
          </Button>
          <Button onClick={() => handleExport('json')} variant="outline" className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Download .json
          </Button>
          <Button onClick={handleImport} variant="outline" className="gap-2 text-xs">
            <Upload className="w-3.5 h-3.5" /> Import File
          </Button>
        </div>
      </div>

      {/* ========== DATA INTEGRITY CHECK ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-warm-blue" />
          <h3 className="font-semibold text-sm text-foreground">Data Integrity Check</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Scan your data for inconsistencies (orphaned references, missing fields, duplicate IDs) and auto-fix what can be repaired.
        </p>
        <Button
          onClick={handleIntegrityCheck}
          variant="outline"
          className="gap-2 text-xs"
          disabled={integrityLoading}
        >
          {integrityLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          Run Check
        </Button>
        {integrityResult && (
          <div className={`mt-4 rounded-xl border p-4 ${
            integrityResult.ok
              ? 'border-warm-sage/40 bg-warm-sage-light/20'
              : 'border-warm-terracotta/40 bg-warm-terracotta-light/20'
          }`}>
            <p className={`text-sm font-medium ${integrityResult.ok ? 'text-warm-sage' : 'text-warm-terracotta'}`}>
              {integrityResult.ok ? '✓ All checks passed' : `⚠ Found ${integrityResult.issues.length} issue(s)`}
            </p>
            {integrityResult.issues.length > 0 && (
              <ul className="mt-2 space-y-1">
                {integrityResult.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {issue}</li>
                ))}
              </ul>
            )}
            {integrityResult.fixed.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-warm-sage">Auto-fixed:</p>
                <ul className="mt-1 space-y-0.5">
                  {integrityResult.fixed.map((fix, i) => (
                    <li key={i} className="text-xs text-muted-foreground">✓ {fix}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== ABOUT ========== */}
      <div className="bg-warm-sand/50 rounded-2xl border border-border p-6">
        <h3 className="font-serif text-lg text-foreground mb-2">About Your Focus Assistant</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Built with ADHD-friendly design principles in mind. This app uses color-coding, chunky interactive elements,
          and satisfying feedback to help you stay focused and motivated.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">v1.7.0</span>
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">ADHD-Friendly</span>
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">Subtasks</span>
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">Focus Mode</span>
          <span className="text-xs px-3 py-1 rounded-full bg-warm-sage-light border border-warm-sage/20 text-warm-sage font-medium">Local .md File</span>
          <span className="text-xs px-3 py-1 rounded-full bg-warm-blue-light border border-warm-blue/20 text-warm-blue font-medium">Google Sheets Sync</span>
          <span className="text-xs px-3 py-1 rounded-full bg-warm-lavender/10 border border-warm-lavender/20 text-warm-lavender font-medium">Obsidian Sync</span>
        </div>
      </div>
    </div>
  );
}
