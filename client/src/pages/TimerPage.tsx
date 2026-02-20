/**
 * Focus Timer Page — Warm Productivity design
 * Pomodoro timers with circular progress
 * Create multiple, start individually
 * Timer persistence: running timers resume after page refresh using startedAt timestamp
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Play, Pause, RotateCcw, Trash2, Info, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const EMPTY_TIMER_IMG = 'https://private-us-east-1.manuscdn.com/sessionFile/PlXiEUsi6v4VD1JuecPpX3/sandbox/k4s8ZO93y8NMD02oOYn6TD-img-2_1771447500000_na1fn_ZW1wdHktdGltZXI.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGxYaUVVc2k2djRWRDFKdWVjUHBYMy9zYW5kYm94L2s0czhaTzkzeThOTUQwMm9PWW42VEQtaW1nLTJfMTc3MTQ0NzUwMDAwMF9uYTFmbl9aVzF3ZEhrdGRHbHRaWEkucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=RInlaK~ffLRpeH0v-NOAy3TMtbQeDKkq2BENNQlE9mmClHhYlWOQYyUzWJEyJTKeTL3eDIznVJ4wHd8LtO3yr5fXZwH~ivqzbEu9LMZRmR~rg5EL8rCYI~LYNiJuNb7X2BMtM5CX5LF-wT7ePyELY8KtBirEI7POK6iqpOMvfuasH8vSxUM0OrdlvbcwaoP5C4fO4CZGKlGDtUF3lZ1yI0garPhxHz39K9Xo~OB9~wdBXUIu~nIrC5XG5kE1v2j2N6kWsZzQGjJonL80GmRbydGc2r088HdfTBJya6OeYMC6xzslIdyIqIgLT-1WbuYohOi5evnYV-TxO958smCvKw__';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function CircularProgress({ progress, size = 120, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-warm-sand"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-warm-sage transition-all duration-1000"
      />
    </svg>
  );
}

// Play a completion sound using Web Audio API
function playCompletionSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 523.25; // C5
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.stop(ctx.currentTime + 0.8);
    // Second tone
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 659.25; // E5
      gain2.gain.value = 0.3;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc2.stop(ctx.currentTime + 1);
    }, 300);
  } catch {
    // Audio not available
  }
}

/**
 * Calculate effective elapsed seconds for a pomodoro,
 * accounting for timer persistence via startedAt/accumulatedSeconds.
 */
function getEffectiveElapsed(pom: { status: string; elapsed: number; startedAt?: string; accumulatedSeconds?: number }): number {
  if (pom.status === 'running' && pom.startedAt) {
    const accumulated = pom.accumulatedSeconds || 0;
    const sinceStart = Math.floor((Date.now() - new Date(pom.startedAt).getTime()) / 1000);
    return accumulated + sinceStart;
  }
  return pom.elapsed;
}

export default function TimerPage() {
  const { state, dispatch } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState(state.settings.focusDuration);
  const [tick, setTick] = useState(0);
  const completedRef = useRef<Set<string>>(new Set());

  const activeCount = state.pomodoros.filter(p => p.status === 'running').length;

  // Single tick interval for all running timers
  useEffect(() => {
    const hasRunning = state.pomodoros.some(p => p.status === 'running');
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.pomodoros]);

  // Check for completed pomodoros on each tick
  useEffect(() => {
    state.pomodoros.forEach(pom => {
      if (pom.status === 'running' && !completedRef.current.has(pom.id)) {
        const elapsed = getEffectiveElapsed(pom);
        if (elapsed >= pom.duration * 60) {
          completedRef.current.add(pom.id);
          dispatch({ type: 'COMPLETE_POMODORO', payload: pom.id });
          playCompletionSound();
          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Complete!', { body: `"${pom.title}" is done. Great work!` });
          }
        }
      }
    });
  }, [tick, state.pomodoros, dispatch]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim()) return;
    dispatch({ type: 'ADD_POMODORO', payload: { title: newTitle.trim(), duration: newDuration } });
    setNewTitle('');
    setNewDuration(state.settings.focusDuration);
    setDialogOpen(false);
  }, [newTitle, newDuration, dispatch, state.settings.focusDuration]);

  const togglePomodoro = useCallback((id: string) => {
    const pom = state.pomodoros.find(p => p.id === id);
    if (!pom) return;
    if (pom.status === 'idle' || pom.status === 'paused') {
      // Start/resume: set startedAt to now, save accumulatedSeconds
      dispatch({
        type: 'UPDATE_POMODORO',
        payload: {
          id,
          status: 'running',
          startedAt: new Date().toISOString(),
          accumulatedSeconds: pom.elapsed,
        },
      });
    } else if (pom.status === 'running') {
      // Pause: calculate elapsed and clear startedAt
      const elapsed = getEffectiveElapsed(pom);
      dispatch({
        type: 'UPDATE_POMODORO',
        payload: {
          id,
          status: 'paused',
          elapsed,
          startedAt: undefined,
          accumulatedSeconds: elapsed,
        },
      });
    }
  }, [state.pomodoros, dispatch]);

  const resetPomodoro = useCallback((id: string) => {
    completedRef.current.delete(id);
    dispatch({
      type: 'UPDATE_POMODORO',
      payload: { id, elapsed: 0, status: 'idle', startedAt: undefined, accumulatedSeconds: 0 },
    });
  }, [dispatch]);

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">Focus Timer</h2>
          <p className="text-sm text-muted-foreground mt-1">Create multiple Pomodoros · Timers persist across refreshes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-2">
              <Plus className="w-4 h-4" /> New Pomodoro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">New Pomodoro</DialogTitle>
              <DialogDescription className="sr-only">Create a new pomodoro timer</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input
                placeholder="What will you focus on?"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="bg-background"
              />
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Duration (minutes)</label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={newDuration}
                  onChange={e => setNewDuration(parseInt(e.target.value) || 25)}
                  className="bg-background"
                />
              </div>
              <Button onClick={handleAdd} className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white">
                Create Pomodoro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active count */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs px-3 py-1 rounded-full bg-warm-sage-light text-warm-sage border border-warm-sage/20 font-medium">
          {activeCount} active
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-warm-blue-light text-warm-blue border border-warm-blue/20 font-medium flex items-center gap-1">
          <Volume2 className="w-3 h-3" /> Sound on complete
        </span>
      </div>

      {/* Pomodoro list */}
      {state.pomodoros.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <img src={EMPTY_TIMER_IMG} alt="No pomodoros" className="w-40 h-40 mx-auto mb-4 rounded-2xl object-cover opacity-90" />
          <h3 className="font-serif text-xl text-foreground mb-2">No Pomodoros yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first Pomodoro with a specific goal.</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Create Your First Pomodoro
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {state.pomodoros.map(pom => {
            const totalSeconds = pom.duration * 60;
            const elapsed = getEffectiveElapsed(pom);
            const remaining = Math.max(0, totalSeconds - elapsed);
            const progress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;
            const isCompleted = pom.status === 'completed';
            const isRunning = pom.status === 'running';

            return (
              <div
                key={pom.id}
                className={`bg-card rounded-2xl border border-border p-6 transition-all duration-200 hover:shadow-md
                  ${isCompleted ? 'opacity-60' : ''} ${isRunning ? 'ring-2 ring-warm-sage/30' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{pom.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{pom.duration} min</p>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_POMODORO', payload: pom.id })}
                    className="text-muted-foreground hover:text-warm-terracotta p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Timer circle */}
                <div className="flex items-center justify-center mb-4 relative">
                  <CircularProgress progress={progress} size={100} strokeWidth={5} />
                  <span className="absolute text-lg font-mono font-medium text-foreground">
                    {formatTime(remaining)}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2">
                  {!isCompleted && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => togglePomodoro(pom.id)}
                        className={isRunning
                          ? 'bg-warm-amber hover:bg-warm-amber/90 text-white'
                          : 'bg-warm-sage hover:bg-warm-sage/90 text-white'
                        }
                      >
                        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resetPomodoro(pom.id)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {isCompleted && (
                    <span className="text-xs text-warm-sage font-medium">Completed!</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="mt-8 bg-warm-peach-light rounded-2xl border border-warm-peach/30 p-5 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-warm-peach/30 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-warm-terracotta" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">How it works</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Create a Pomodoro for each task or goal you want to focus on. Set the duration (default {state.settings.focusDuration}min),
            then start each one when you're ready. Running timers persist across page refreshes — close the tab and come back later!
            You'll hear a chime and get a browser notification when a timer completes.
          </p>
        </div>
      </div>
    </div>
  );
}
