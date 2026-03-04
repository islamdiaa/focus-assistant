/**
 * Focus Timer Page — Warm Productivity design
 * Pomodoro timers with circular progress
 * Create multiple, start individually
 * Timer persistence: running timers resume after page refresh using startedAt timestamp
 * V1.8.1: Task-linked pomodoros — select multiple tasks/subtasks when creating
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import type { PomodoroLink, Task } from "@/lib/types";
import {
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Info,
  Volume2,
  ChevronDown,
  ChevronRight,
  Check,
  ListChecks,
  Coffee,
  AlertTriangle,
  X,
  Link2,
  Minus,
} from "lucide-react";
import {
  checkBreakReminder,
  getBreakSeverityStyles,
  BREAK_THRESHOLDS,
  type BreakReminder,
} from "@/lib/breakReminder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const EMPTY_TIMER_IMG = "/images/empty-timer.webp";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 6,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-warm-sand dark:text-[oklch(0.3_0.02_75)]"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-warm-sage transition-[stroke-dashoffset] duration-1000"
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
      // Close AudioContext after second tone finishes to prevent leak (H1 fix)
      setTimeout(() => ctx.close().catch(() => {}), 1200);
    }, 300);
  } catch {
    // Audio not available
  }
}

/**
 * Calculate effective elapsed seconds for a pomodoro,
 * accounting for timer persistence via startedAt/accumulatedSeconds.
 */
function getEffectiveElapsed(pom: {
  status: string;
  elapsed: number;
  startedAt?: string | null | undefined;
  accumulatedSeconds?: number | null | undefined;
}): number {
  if (pom.status === "running" && pom.startedAt) {
    const accumulated = pom.accumulatedSeconds || 0;
    const sinceStart = Math.floor(
      (Date.now() - new Date(pom.startedAt).getTime()) / 1000
    );
    return accumulated + sinceStart;
  }
  return pom.elapsed;
}

/** Helper to get a display label for linked tasks */
function getLinkedTasksLabel(
  linkedTasks: PomodoroLink[],
  tasks: Task[]
): string {
  if (linkedTasks.length === 0) return "";
  const labels = linkedTasks.map(link => {
    const task = tasks.find(t => t.id === link.taskId);
    if (!task) return "(deleted task)";
    if (link.subtaskId) {
      const subtask = task.subtasks?.find(s => s.id === link.subtaskId);
      return subtask ? `${task.title} → ${subtask.title}` : task.title;
    }
    return task.title;
  });
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]} +${labels.length - 1} more`;
}

/** Task/subtask picker for the new pomodoro dialog */
function TaskPicker({
  tasks,
  selectedLinks,
  onToggle,
}: {
  tasks: Task[];
  selectedLinks: PomodoroLink[];
  onToggle: (link: PomodoroLink) => void;
}) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const activeTasks = tasks.filter(t => t.status === "active");

  const isSelected = (taskId: string, subtaskId?: string) =>
    selectedLinks.some(l => l.taskId === taskId && l.subtaskId === subtaskId);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (activeTasks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No active tasks. Create tasks first to link them.
      </p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-0.5 border border-border rounded-lg p-2 bg-background">
      {activeTasks.map(task => {
        const hasSubtasks = task.subtasks && task.subtasks.length > 0;
        const isExpanded = expandedTasks.has(task.id);
        const taskSelected = isSelected(task.id);

        return (
          <div key={task.id}>
            <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-warm-sand/30 dark:hover:bg-muted/50 transition-colors">
              {hasSubtasks && (
                <button
                  type="button"
                  onClick={() => toggleExpand(task.id)}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {!hasSubtasks && <div className="w-4.5" />}
              <button
                type="button"
                onClick={() => onToggle({ taskId: task.id })}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                  ${taskSelected ? "bg-warm-sage border-warm-sage" : "border-border hover:border-warm-sage"}`}
              >
                {taskSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <span className="text-sm text-foreground truncate flex-1">
                {task.title}
              </span>
              {hasSubtasks && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <ListChecks className="w-3 h-3" /> {task.subtasks!.length}
                </span>
              )}
            </div>
            {hasSubtasks && isExpanded && (
              <div className="ml-8 space-y-0.5">
                {task
                  .subtasks!.filter(s => !s.done)
                  .map(subtask => {
                    const subSelected = isSelected(task.id, subtask.id);
                    return (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-warm-sand/20 dark:hover:bg-muted/40 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onToggle({ taskId: task.id, subtaskId: subtask.id })
                          }
                          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-all
                          ${subSelected ? "bg-warm-blue border-warm-blue" : "border-border hover:border-warm-blue"}`}
                        >
                          {subSelected && (
                            <Check className="w-2.5 h-2.5 text-white" />
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground truncate">
                          {subtask.title}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TimerPage() {
  const { state, dispatch } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(state.settings.focusDuration);
  const [selectedLinks, setSelectedLinks] = useState<PomodoroLink[]>([]);
  const [tick, setTick] = useState(0);
  const completedRef = useRef<Set<string>>(new Set());

  // Auto-chain / session queue state
  const [sessionQueue, setSessionQueue] = useState<number>(0);
  const [autoChain, setAutoChain] = useState(false);
  const [breakCountdown, setBreakCountdown] = useState<number | null>(null);
  const breakCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track settings from the last completed pomodoro so the next queued session inherits them
  const lastCompletedSettingsRef = useRef<{
    title: string;
    duration: number;
    linkedTasks?: PomodoroLink[];
    linkedTaskId?: string;
  } | null>(null);

  // Hyperfocus Guard — break reminder state
  const [dismissedBreaks, setDismissedBreaks] = useState<number[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [breakReminder, setBreakReminder] = useState<BreakReminder | null>(
    null
  );

  const hasRunningPomodoro = useMemo(
    () => state.pomodoros.some(p => p.status === "running"),
    [state.pomodoros]
  );

  const activeCount = state.pomodoros.filter(
    p => p.status === "running"
  ).length;

  // Auto-generate title from selected tasks
  const autoTitle = useMemo(() => {
    if (selectedLinks.length === 0) return "";
    return getLinkedTasksLabel(selectedLinks, state.tasks);
  }, [selectedLinks, state.tasks]);

  // Single tick interval for all running timers
  useEffect(() => {
    const hasRunning = state.pomodoros.some(p => p.status === "running");
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.pomodoros]);

  // Start break countdown before auto-starting the next queued session
  const startBreakCountdown = useCallback(() => {
    setBreakCountdown(5);
    if (breakCountdownRef.current) clearInterval(breakCountdownRef.current);
    breakCountdownRef.current = setInterval(() => {
      setBreakCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (breakCountdownRef.current)
            clearInterval(breakCountdownRef.current);
          breakCountdownRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // When breakCountdown reaches null (finished) after having been active,
  // auto-create and start the next session from the queue
  const breakCountdownActiveRef = useRef(false);
  useEffect(() => {
    if (breakCountdown !== null) {
      breakCountdownActiveRef.current = true;
    } else if (breakCountdownActiveRef.current) {
      breakCountdownActiveRef.current = false;
      // Countdown just finished — create and start the next queued session
      const settings = lastCompletedSettingsRef.current;
      if (!settings || sessionQueue <= 0) return;
      const id = crypto.randomUUID();
      dispatch({
        type: "ADD_POMODORO",
        payload: {
          title: settings.title,
          duration: settings.duration,
          linkedTasks: settings.linkedTasks,
          linkedTaskId: settings.linkedTaskId,
        },
      });
      setSessionQueue(q => Math.max(0, q - 1));
      // We need to start the newly created pomodoro; we do that in a follow-up
      // effect once it appears in state.pomodoros (keyed by title+duration match).
      // Instead, dispatch ADD_POMODORO then immediately start via a one-shot ref.
      pendingAutoStartRef.current = {
        title: settings.title,
        duration: settings.duration,
      };
      void id; // suppress unused warning
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakCountdown]);

  // One-shot ref: if set, we auto-start the first matching idle pomodoro with that title/duration
  const pendingAutoStartRef = useRef<{
    title: string;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (!pendingAutoStartRef.current) return;
    const { title, duration } = pendingAutoStartRef.current;
    // Find the most recently added idle pom matching title+duration
    const match = [...state.pomodoros]
      .reverse()
      .find(
        p => p.status === "idle" && p.title === title && p.duration === duration
      );
    if (!match) return;
    pendingAutoStartRef.current = null;
    dispatch({
      type: "UPDATE_POMODORO",
      payload: {
        id: match.id,
        status: "running",
        startedAt: new Date().toISOString(),
        accumulatedSeconds: 0,
      },
    });
  }, [state.pomodoros, dispatch]);

  // Check for completed pomodoros on each tick
  useEffect(() => {
    state.pomodoros.forEach(pom => {
      if (pom.status === "running" && !completedRef.current.has(pom.id)) {
        const elapsed = getEffectiveElapsed(pom);
        if (elapsed >= pom.duration * 60) {
          completedRef.current.add(pom.id);
          dispatch({ type: "COMPLETE_POMODORO", payload: pom.id });
          playCompletionSound();
          // Browser notification
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Pomodoro Complete!", {
              body: `"${pom.title}" is done. Great work!`,
            });
          }
          // Auto-chain: if enabled and queue has sessions, save settings and start break countdown
          if (autoChain && sessionQueue > 0) {
            lastCompletedSettingsRef.current = {
              title: pom.title,
              duration: pom.duration,
              linkedTasks: pom.linkedTasks ?? undefined,
              linkedTaskId: pom.linkedTaskId ?? undefined,
            };
            startBreakCountdown();
          }
        }
      }
    });
  }, [
    tick,
    state.pomodoros,
    dispatch,
    autoChain,
    sessionQueue,
    startBreakCountdown,
  ]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Track session start time — set when any timer starts running
  useEffect(() => {
    const hasRunning = state.pomodoros.some(p => p.status === "running");
    if (hasRunning && !sessionStartTime) {
      setSessionStartTime(new Date());
    } else if (!hasRunning && sessionStartTime) {
      // All timers stopped — keep sessionStartTime so cumulative tracking persists
    }
  }, [state.pomodoros, sessionStartTime]);

  // Hyperfocus Guard — check for break reminders every 30 seconds
  useEffect(() => {
    if (!sessionStartTime) return;
    if (!hasRunningPomodoro) return;

    function checkReminder() {
      if (!sessionStartTime) return;
      const elapsedMs = Date.now() - sessionStartTime.getTime();
      const elapsedMinutes = elapsedMs / 60000;
      const reminder = checkBreakReminder(elapsedMinutes, dismissedBreaks);
      setBreakReminder(reminder);
    }

    // Check immediately and then every 30 seconds
    checkReminder();
    const interval = setInterval(checkReminder, 30000);
    return () => clearInterval(interval);
  }, [sessionStartTime, dismissedBreaks, hasRunningPomodoro]);

  const handleToggleLink = useCallback((link: PomodoroLink) => {
    setSelectedLinks(prev => {
      const exists = prev.some(
        l => l.taskId === link.taskId && l.subtaskId === link.subtaskId
      );
      if (exists)
        return prev.filter(
          l => !(l.taskId === link.taskId && l.subtaskId === link.subtaskId)
        );
      return [...prev, link];
    });
  }, []);

  const handleAdd = useCallback(() => {
    const title = newTitle.trim() || autoTitle || "Focus Session";
    dispatch({
      type: "ADD_POMODORO",
      payload: {
        title,
        duration: newDuration,
        linkedTasks: selectedLinks.length > 0 ? selectedLinks : undefined,
        // Keep legacy linkedTaskId for backward compat if single task selected
        linkedTaskId:
          selectedLinks.length === 1 && !selectedLinks[0].subtaskId
            ? selectedLinks[0].taskId
            : undefined,
      },
    });
    setNewTitle("");
    setNewDuration(state.settings.focusDuration);
    setSelectedLinks([]);
    setDialogOpen(false);
  }, [
    newTitle,
    autoTitle,
    newDuration,
    selectedLinks,
    dispatch,
    state.settings.focusDuration,
  ]);

  const togglePomodoro = useCallback(
    (id: string) => {
      const pom = state.pomodoros.find(p => p.id === id);
      if (!pom) return;
      if (pom.status === "idle" || pom.status === "paused") {
        // Start/resume: set startedAt to now, save accumulatedSeconds
        dispatch({
          type: "UPDATE_POMODORO",
          payload: {
            id,
            status: "running",
            startedAt: new Date().toISOString(),
            accumulatedSeconds: pom.elapsed,
          },
        });
      } else if (pom.status === "running") {
        // Pause: calculate elapsed and clear startedAt
        const elapsed = getEffectiveElapsed(pom);
        dispatch({
          type: "UPDATE_POMODORO",
          payload: {
            id,
            status: "paused",
            elapsed,
            startedAt: undefined,
            accumulatedSeconds: elapsed,
          },
        });
      }
    },
    [state.pomodoros, dispatch]
  );

  const resetPomodoro = useCallback(
    (id: string) => {
      completedRef.current.delete(id);
      dispatch({
        type: "UPDATE_POMODORO",
        payload: {
          id,
          elapsed: 0,
          status: "idle",
          startedAt: undefined,
          accumulatedSeconds: 0,
        },
      });
      // Reset break reminders when resetting a pomodoro
      setDismissedBreaks([]);
      setSessionStartTime(null);
      setBreakReminder(null);
    },
    [dispatch]
  );

  /** Dismiss current break reminder */
  const dismissBreakReminder = useCallback(() => {
    if (breakReminder) {
      // Dismiss at the threshold level, not exact minutes
      const thresholdMinutes = BREAK_THRESHOLDS.map(t => t.minutes).filter(
        t => t <= breakReminder.minutesWorked
      );
      const currentThreshold = thresholdMinutes[thresholdMinutes.length - 1];
      if (currentThreshold) {
        setDismissedBreaks(prev =>
          prev.includes(currentThreshold) ? prev : [...prev, currentThreshold]
        );
      }
      setBreakReminder(null);
    }
  }, [breakReminder]);

  /** Take a break — pause all running timers */
  const takeBreak = useCallback(() => {
    state.pomodoros.forEach(pom => {
      if (pom.status === "running") {
        const elapsed = getEffectiveElapsed(pom);
        dispatch({
          type: "UPDATE_POMODORO",
          payload: {
            id: pom.id,
            status: "paused",
            elapsed,
            startedAt: undefined,
            accumulatedSeconds: elapsed,
          },
        });
      }
    });
    dismissBreakReminder();
  }, [state.pomodoros, dispatch, dismissBreakReminder]);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">
            Focus Timer
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Link tasks to pomodoros · Track focus time per task
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={open => {
            setDialogOpen(open);
            if (!open) {
              setSelectedLinks([]);
              setNewTitle("");
              setNewDuration(state.settings.focusDuration);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-2">
              <Plus className="w-4 h-4" /> New Pomodoro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader>
              <DialogTitle className="font-semibold text-xl">
                New Pomodoro
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Select tasks to focus on during this session
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Task/Subtask picker */}
              <div>
                <label
                  id="link-tasks-label"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  Link Tasks (optional)
                </label>
                <div aria-labelledby="link-tasks-label">
                  <TaskPicker
                    tasks={state.tasks}
                    selectedLinks={selectedLinks}
                    onToggle={handleToggleLink}
                  />
                </div>
                {selectedLinks.length > 0 && (
                  <p className="text-xs text-warm-sage mt-1.5">
                    {selectedLinks.length} item
                    {selectedLinks.length > 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="new-pomodoro-title"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  Title
                </label>
                <Input
                  id="new-pomodoro-title"
                  placeholder={autoTitle || "What will you focus on?"}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  className="bg-background"
                />
              </div>
              <div>
                <label
                  htmlFor="new-pomodoro-duration"
                  className="text-sm text-muted-foreground mb-1 block"
                >
                  Duration (minutes)
                </label>
                <Input
                  id="new-pomodoro-duration"
                  type="number"
                  min={1}
                  max={120}
                  value={newDuration}
                  onChange={e => {
                    const n = parseInt(e.target.value, 10);
                    setNewDuration(isNaN(n) ? 25 : n);
                  }}
                  className="bg-background"
                />
              </div>
              <Button
                onClick={handleAdd}
                className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white"
              >
                Create Pomodoro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active count */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs px-3 py-1 rounded-full bg-warm-sage-light dark:bg-warm-sage/15 text-warm-sage border border-warm-sage/20 font-medium">
          {activeCount} active
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-warm-blue-light dark:bg-warm-blue/15 text-warm-blue border border-warm-blue/20 font-medium flex items-center gap-1">
          <Volume2 className="w-3 h-3" /> Sound on complete
        </span>
      </div>

      {/* Hyperfocus Guard — break reminder banner */}
      <AnimatePresence>
        {breakReminder && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{ overflow: "hidden" }}
          >
            {(() => {
              const styles = getBreakSeverityStyles(breakReminder.severity);
              const Icon =
                breakReminder.severity === "gentle" ? Coffee : AlertTriangle;
              return (
                <div
                  className={`flex items-start gap-3 rounded-xl border p-4 ${styles.bg} ${styles.border}`}
                  role="alert"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${styles.bg}`}
                  >
                    <Icon
                      className={`w-4 h-4 ${styles.icon}`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${styles.text}`}>
                      Hyperfocus Guard
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {breakReminder.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={takeBreak}
                      className={`text-xs h-7 gap-1 ${styles.text} border-current/20 ${styles.hoverBg}`}
                    >
                      <Pause className="w-3 h-3" aria-hidden="true" /> Take a
                      break
                    </Button>
                    <button
                      onClick={dismissBreakReminder}
                      className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      aria-label="Dismiss break reminder"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pomodoro list */}
      {state.pomodoros.length === 0 ? (
        <div className="glass rounded-2xl p-12 lg:p-16 text-center">
          <img
            src={EMPTY_TIMER_IMG}
            alt="No pomodoros"
            loading="lazy"
            className="w-48 h-48 mx-auto mb-6 rounded-2xl object-cover opacity-80 dark:opacity-70 dark:brightness-90"
          />
          <h3 className="font-semibold text-xl text-foreground mb-2">
            No Pomodoros yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Create your first Pomodoro and link it to your tasks.
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Create Your First Pomodoro
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {state.pomodoros.map(pom => {
            const totalSeconds = pom.duration * 60;
            const elapsed = getEffectiveElapsed(pom);
            const remaining = Math.max(0, totalSeconds - elapsed);
            const progress =
              totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;
            const isCompleted = pom.status === "completed";
            const isRunning = pom.status === "running";
            const linkedLabel =
              pom.linkedTasks && pom.linkedTasks.length > 0
                ? getLinkedTasksLabel(pom.linkedTasks, state.tasks)
                : pom.linkedTaskId
                  ? state.tasks.find(t => t.id === pom.linkedTaskId)?.title ||
                    ""
                  : "";

            return (
              <div
                key={pom.id}
                className={`glass rounded-2xl p-6 transition-colors duration-200 hover:shadow-md
                  ${isCompleted ? "opacity-60" : ""} ${isRunning ? "ring-2 ring-warm-sage/40 bg-warm-sage/5 dark:bg-warm-sage/10" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate flex items-center gap-1.5">
                      {isRunning && (
                        <span
                          className="w-2 h-2 rounded-full bg-warm-sage shrink-0 motion-safe:animate-pulse"
                          role="img"
                          aria-label="Timer running"
                        />
                      )}
                      {pom.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pom.duration} min
                    </p>
                    {linkedLabel && (
                      <p className="text-[10px] text-warm-sage mt-1 truncate flex items-center gap-1">
                        <ListChecks className="w-3 h-3 shrink-0" />
                        {linkedLabel}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      dispatch({ type: "DELETE_POMODORO", payload: pom.id })
                    }
                    className="text-muted-foreground hover:text-warm-terracotta p-1 transition-colors motion-safe:active:scale-[0.97]"
                    aria-label={`Delete "${pom.title}" pomodoro`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Timer circle */}
                <div className="flex flex-col items-center mb-4">
                  <div
                    className={`flex items-center justify-center relative rounded-full p-1 transition-shadow duration-300
                    ${isRunning ? "shadow-[0_0_16px_oklch(0.65_0.11_155/0.25)]" : ""}`}
                  >
                    <CircularProgress
                      progress={progress}
                      size={100}
                      strokeWidth={5}
                    />
                    <span className="absolute text-lg font-mono font-medium text-foreground">
                      {formatTime(remaining)}
                    </span>
                  </div>
                  <AnimatePresence>
                    {isRunning && !linkedLabel && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden" }}
                        className="text-xs text-muted-foreground/70 italic mt-2 text-center"
                      >
                        Tip: Link a task for better tracking
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2">
                  {!isCompleted && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => togglePomodoro(pom.id)}
                        className={
                          isRunning
                            ? "bg-warm-amber hover:bg-warm-amber/90 text-white"
                            : "bg-warm-sage hover:bg-warm-sage/90 text-white"
                        }
                        aria-label={isRunning ? "Pause timer" : "Start timer"}
                      >
                        {isRunning ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resetPomodoro(pom.id)}
                        aria-label="Reset timer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {isCompleted && (
                    <span className="text-xs text-warm-sage font-medium">
                      Completed!
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Break countdown overlay — shown between auto-chained sessions */}
      <AnimatePresence>
        {breakCountdown !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6 glass rounded-2xl p-6 flex flex-col items-center gap-3 border border-warm-sage/30 bg-warm-sage/5 dark:bg-warm-sage/10"
            role="status"
            aria-live="polite"
            aria-label={`Break time. Next session starts in ${breakCountdown} seconds`}
          >
            <Coffee className="w-6 h-6 text-warm-sage" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Break time! Next session starting in…
            </p>
            <span className="font-serif text-5xl text-warm-sage tabular-nums leading-none">
              {breakCountdown}
            </span>
            <button
              onClick={() => {
                if (breakCountdownRef.current)
                  clearInterval(breakCountdownRef.current);
                breakCountdownRef.current = null;
                breakCountdownActiveRef.current = false;
                setBreakCountdown(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
              aria-label="Cancel auto-start"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Queue */}
      <div className="mt-6 glass-subtle rounded-2xl p-5">
        {/* Header row: toggle + label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2
              className="w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-foreground">
              Auto-Chain Sessions
            </span>
          </div>
          <button
            onClick={() => {
              setAutoChain(v => !v);
              // If turning off, clear any active countdown
              if (autoChain) {
                if (breakCountdownRef.current)
                  clearInterval(breakCountdownRef.current);
                breakCountdownRef.current = null;
                breakCountdownActiveRef.current = false;
                setBreakCountdown(null);
              }
            }}
            role="switch"
            aria-checked={autoChain}
            aria-label="Toggle auto-chain sessions"
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-sage/60 motion-safe:active:scale-[0.97]
              ${autoChain ? "bg-warm-sage" : "bg-muted"}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform
                ${autoChain ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-1.5 mb-4">
          When enabled, the next queued session starts automatically after a
          5-second break.
        </p>

        {/* Queue controls — only shown when auto-chain is on */}
        <AnimatePresence>
          {autoChain && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Sessions in queue
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Will repeat with the same settings as the completed session
                  </p>
                </div>

                {/* Counter +/- */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSessionQueue(q => Math.max(0, q - 1))}
                    disabled={sessionQueue === 0}
                    aria-label="Remove one session from queue"
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none motion-safe:active:scale-[0.97]"
                  >
                    <Minus
                      className="w-3.5 h-3.5 text-foreground"
                      aria-hidden="true"
                    />
                  </button>

                  <span
                    className="w-8 text-center text-sm font-semibold text-foreground tabular-nums"
                    aria-label={`${sessionQueue} sessions queued`}
                  >
                    {sessionQueue}
                  </span>

                  <button
                    onClick={() => setSessionQueue(q => Math.min(10, q + 1))}
                    disabled={sessionQueue >= 10}
                    aria-label="Add one session to queue"
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none motion-safe:active:scale-[0.97]"
                  >
                    <Plus
                      className="w-3.5 h-3.5 text-foreground"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              {/* Queue badges */}
              <AnimatePresence>
                {sessionQueue > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap gap-2 mt-3"
                    aria-label="Queued sessions"
                  >
                    {Array.from({ length: sessionQueue }, (_, i) => (
                      <span
                        key={i}
                        className="bg-muted/30 rounded-lg px-3 py-1.5 text-xs text-muted-foreground font-medium"
                      >
                        Session {i + 1}
                      </span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How it works */}
      <div className="mt-8 bg-warm-peach-light dark:bg-warm-terracotta/10 rounded-2xl border border-warm-peach/30 dark:border-warm-terracotta/20 p-5 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-warm-peach/30 dark:bg-warm-terracotta/20 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-warm-terracotta" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            How it works
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Create a Pomodoro and link it to one or more tasks (or specific
            subtasks) you want to focus on. Set the duration (default{" "}
            {state.settings.focusDuration}min), then start when you're ready.
            Running timers persist across page refreshes. You'll hear a chime
            and get a browser notification when done.
          </p>
        </div>
      </div>
    </div>
  );
}
