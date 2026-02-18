/**
 * Settings Page — Warm Productivity design
 * Timer presets, custom sliders, Google Sheets config
 */
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Save, RotateCcw, Cloud, CloudOff, Timer, Link2 } from 'lucide-react';
import { setSheetConfig, getSheetConfig, isSheetConfigured } from '@/lib/sheets';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { TimerSettings } from '@/lib/types';
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
  const { state, dispatch, syncToCloud } = useApp();
  const [settings, setSettings] = useState<TimerSettings>({ ...state.settings });
  const [sheetId, setSheetId] = useState(getSheetConfig().sheetId);
  const [apiKey, setApiKey] = useState(getSheetConfig().apiKey);
  const configured = isSheetConfigured();

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

  function handleSaveSheetConfig() {
    setSheetConfig(sheetId, apiKey);
    syncToCloud();
    toast.success('Google Sheets connected! Data will sync automatically.');
  }

  function handleDisconnectSheet() {
    setSheetConfig('', '');
    setSheetId('');
    setApiKey('');
    toast.info('Disconnected from Google Sheets. Using local storage only.');
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-serif text-3xl text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize your focus experience</p>
      </div>

      {/* Quick Presets */}
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

      {/* Custom Timer Settings */}
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

      {/* Google Sheets Config */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          {configured ? <Cloud className="w-4 h-4 text-warm-sage" /> : <CloudOff className="w-4 h-4 text-muted-foreground" />}
          <h3 className="font-semibold text-sm text-foreground">Cloud Sync (Google Sheets)</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Connect a Google Sheet to sync your data across devices. Your data is always saved locally too.
        </p>

        {configured ? (
          <div>
            <div className="bg-warm-sage-light rounded-lg p-3 mb-3 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-warm-sage" />
              <span className="text-xs text-warm-sage font-medium">Connected to Google Sheets</span>
            </div>
            <Button onClick={handleDisconnectSheet} variant="outline" size="sm" className="text-warm-terracotta border-warm-terracotta/30 hover:bg-warm-terracotta-light">
              Disconnect
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
            <Button onClick={handleSaveSheetConfig} className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-2 w-full" disabled={!sheetId || !apiKey}>
              <Link2 className="w-4 h-4" /> Connect Sheet
            </Button>
          </div>
        )}
      </div>

      {/* About */}
      <div className="bg-warm-sand/50 rounded-2xl border border-border p-6">
        <h3 className="font-serif text-lg text-foreground mb-2">About Your Focus Assistant</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Built with ADHD-friendly design principles in mind. This app uses color-coding, chunky interactive elements,
          and satisfying feedback to help you stay focused and motivated. Your data is stored locally in your browser
          — it's private and always available, even offline. Optionally sync to Google Sheets for cloud persistence.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">v1.0</span>
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">Local Storage</span>
          <span className="text-xs px-3 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium">ADHD-Friendly</span>
          <span className="text-xs px-3 py-1 rounded-full bg-warm-sage-light border border-warm-sage/20 text-warm-sage font-medium">Google Sheets Sync</span>
        </div>
      </div>
    </div>
  );
}
