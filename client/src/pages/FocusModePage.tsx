/**
 * Focus Mode — Full-screen distraction-free view
 * Shows current task + Pomodoro timer in a minimal, centered layout
 * Can be triggered from any task or used standalone
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  ChevronDown,
  ListChecks,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface FocusModePageProps {
  onExit?: () => void;
}

export default function FocusModePage({ onExit }: FocusModePageProps) {
  const { state, dispatch } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(
    state.settings.focusDuration * 60
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPhase, setTimerPhase] = useState<"focus" | "break">("focus");
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const activeTasks = useMemo(
    () => state.tasks.filter(t => t.status === "active"),
    [state.tasks]
  );

  const selectedTask = selectedTaskId
    ? state.tasks.find(t => t.id === selectedTaskId)
    : null;

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      // Timer completed
      if (timerPhase === "focus") {
        // Record pomodoro completion
        dispatch({
          type: "UPDATE_DAILY_STATS",
          payload: {
            focusMinutes:
              (state.dailyStats.find(
                s => s.date === new Date().toISOString().split("T")[0]
              )?.focusMinutes || 0) + state.settings.focusDuration,
            pomodorosCompleted:
              (state.dailyStats.find(
                s => s.date === new Date().toISOString().split("T")[0]
              )?.pomodorosCompleted || 0) + 1,
          },
        });
        // Switch to break
        setTimerPhase("break");
        setTimerSeconds(state.settings.shortBreak * 60);
      } else {
        // Break over, back to focus
        setTimerPhase("focus");
        setTimerSeconds(state.settings.focusDuration * 60);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [
    timerRunning,
    timerSeconds,
    timerPhase,
    state.settings,
    dispatch,
    state.dailyStats,
  ]);

  function toggleTimer() {
    setTimerRunning(!timerRunning);
  }

  function resetTimer() {
    setTimerRunning(false);
    setTimerPhase("focus");
    setTimerSeconds(state.settings.focusDuration * 60);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  function completeTask() {
    if (selectedTaskId) {
      dispatch({ type: "TOGGLE_TASK", payload: selectedTaskId });
      setSelectedTaskId(null);
    }
  }

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const totalSeconds =
    timerPhase === "focus"
      ? state.settings.focusDuration * 60
      : state.settings.shortBreak * 60;
  const progress =
    totalSeconds > 0 ? ((totalSeconds - timerSeconds) / totalSeconds) * 100 : 0;

  // Circle SVG dimensions
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Button
          onClick={onExit}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <X className="w-4 h-4" /> Exit Focus
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Phase indicator */}
      <motion.div
        key={timerPhase}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <span
          className={`text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full ${
            timerPhase === "focus"
              ? "bg-warm-sage-light text-warm-sage"
              : "bg-warm-blue-light text-warm-blue"
          }`}
        >
          {timerPhase === "focus" ? "Focus Time" : "Break Time"}
        </span>
      </motion.div>

      {/* Timer Circle */}
      <div className="relative w-64 h-64 lg:w-72 lg:h-72 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
          {/* Background circle */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-border"
          />
          {/* Progress circle */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={
              timerPhase === "focus" ? "text-warm-sage" : "text-warm-blue"
            }
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        {/* Timer text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-5xl lg:text-6xl font-light text-foreground tabular-nums">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          onClick={resetTimer}
          variant="outline"
          size="lg"
          className="rounded-full w-12 h-12 p-0"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button
          onClick={toggleTimer}
          size="lg"
          className={`rounded-full w-16 h-16 p-0 ${
            timerPhase === "focus"
              ? "bg-warm-sage hover:bg-warm-sage/90"
              : "bg-warm-blue hover:bg-warm-blue/90"
          } text-white`}
        >
          {timerRunning ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>
        {selectedTask && (
          <Button
            onClick={completeTask}
            variant="outline"
            size="lg"
            className="rounded-full w-12 h-12 p-0 text-warm-sage hover:bg-warm-sage-light"
          >
            <Check className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Current Task */}
      <div className="w-full max-w-md">
        {selectedTask ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-xl border border-border p-4 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Working on
            </p>
            <p className="text-lg font-medium text-foreground">
              {selectedTask.title}
            </p>
            {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
              <div className="mt-3 space-y-1">
                {selectedTask.subtasks.map(sub => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 justify-center"
                  >
                    <button
                      onClick={() =>
                        dispatch({
                          type: "TOGGLE_SUBTASK",
                          payload: {
                            taskId: selectedTask.id,
                            subtaskId: sub.id,
                          },
                        })
                      }
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all
                        ${sub.done ? "bg-warm-sage border-warm-sage" : "border-border hover:border-warm-sage"}`}
                    >
                      {sub.done && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span
                      className={`text-sm ${sub.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setSelectedTaskId(null)}
              className="text-xs text-muted-foreground hover:text-foreground mt-3 inline-block"
            >
              Change task
            </button>
          </motion.div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Select a task to focus on
            </p>
            <div className="relative">
              <Button
                onClick={() => setTaskPickerOpen(!taskPickerOpen)}
                variant="outline"
                className="gap-2"
              >
                Choose Task <ChevronDown className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {taskPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-lg z-10"
                  >
                    {activeTasks.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        No active tasks
                      </p>
                    ) : (
                      activeTasks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedTaskId(t.id);
                            setTaskPickerOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-warm-sand/30 transition-colors border-b border-border/30 last:border-0"
                        >
                          <p className="text-sm font-medium text-foreground truncate">
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {t.subtasks && t.subtasks.length > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <ListChecks className="w-2.5 h-2.5" />
                                {t.subtasks.filter(s => s.done).length}/
                                {t.subtasks.length}
                              </span>
                            )}
                            {t.energy && (
                              <span className="text-[10px] text-muted-foreground">
                                {t.energy} energy
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
