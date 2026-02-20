/**
 * Settings Page — Warm Productivity design
 * Timer presets, custom sliders, storage mode toggle, Google Sheets config
 * 
 * Storage is now server-backed:
 * - Local Markdown File (.md) — default, server reads/writes to data/ directory
 * - Google Sheets — optional, toggle to enable (server proxies all API calls)
 */
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Save, RotateCcw, Cloud, CloudOff, Timer, Link2,
  FileText, HardDrive, Unplug,
} from 'lucide-react';
import {
  getStorageConfig, setStorageConfig,
} from '@/lib/sheets';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { TimerSettings, StorageMode, StorageConfig } from '@/lib/types';
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
  const [settings, setSettings] = useState<TimerSettings>({ ...state.settings });
  const [sheetId, setSheetId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<StorageMode>('file');
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load storage config from server on mount
  useEffect(() => {
    getStorageConfig().then(config => {
      setMode(config.mode);
      setSheetId(config.sheetsId || '');
      setApiKey(config.sheetsApiKey || '');
      setConfigLoaded(true);
    });
  }, []);

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

  // ---- Storage mode handlers ----

  const handleSwitchToSheets = useCallback(async (checked: boolean) => {
    if (checked) {
      setMode('sheets');
      // Don't save config yet — wait for user to enter credentials
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

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl lg:text-3xl text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize your focus experience</p>
      </div>

      {/* ========== DATA STORAGE ========== */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-4 h-4 text-warm-sage" />
          <h3 className="font-semibold text-sm text-foreground">Data Storage</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Choose where your data lives. Local Markdown file is the default — your data is stored on the server in a readable <code className="bg-warm-sand/60 px-1 py-0.5 rounded">.md</code> file. Mount the <code className="bg-warm-sand/60 px-1 py-0.5 rounded">/app/data</code> directory as a Docker volume to persist it.
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
            Data is saved as a human-readable <code className="bg-warm-sand/60 px-1 py-0.5 rounded">focus-assist-data.md</code> file in the server's <code className="bg-warm-sand/60 px-1 py-0.5 rounded">data/</code> directory. Auto-saves on every change.
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
            Sync to a Google Sheet for cross-device access. When enabled, the local Markdown file is ignored.
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

      {/* ========== ABOUT ========== */}
      <div className="bg-warm-sand/50 rounded-2xl border border-border p-6">
        <h3 className="font-serif text-lg text-foreground mb-2">About Your Focus Assistant</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Built with ADHD-friendly design principles in mind. This app uses color-coding, chunky interactive elements,
          and satisfying feedback to help you stay focused and motivated. Your data is stored as a Markdown file on the server
          — mount the data directory as a Docker volume for persistence. Optionally sync to Google Sheets for cloud access.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">v2.0</span>
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">ADHD-Friendly</span>
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">Docker Ready</span>
          <span className="text-xs px-3 py-1 rounded-full bg-warm-sage-light border border-warm-sage/20 text-warm-sage font-medium">Local .md File</span>
          <span className="text-xs px-3 py-1 rounded-full bg-warm-blue-light border border-warm-blue/20 text-warm-blue font-medium">Google Sheets Sync</span>
        </div>
      </div>
    </div>
  );
}
