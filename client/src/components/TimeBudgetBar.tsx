/**
 * TimeBudgetBar — Shows total estimated work time vs available hours
 * and calculates "you'll be done by X:XX PM"
 *
 * Designed for ADHD time blindness — makes invisible time visible.
 */
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Task } from "@/lib/types";

interface TimeBudgetBarProps {
  tasks: Task[];
  availableHours: number;
}

export default function TimeBudgetBar({
  tasks,
  availableHours,
}: TimeBudgetBarProps) {
  // Calculate total estimated minutes from active (not done) tasks
  const activeTasks = tasks.filter(t => t.status === "active");
  const totalMinutes = activeTasks.reduce((sum, t) => {
    const mins =
      typeof t.estimatedMinutes === "number" ? t.estimatedMinutes : 0;
    return sum + mins;
  }, 0);

  const tasksWithEstimate = activeTasks.filter(
    t => typeof t.estimatedMinutes === "number" && t.estimatedMinutes > 0
  ).length;
  const tasksWithoutEstimate = activeTasks.length - tasksWithEstimate;

  const availableMinutes = availableHours * 60;
  const fillPercent =
    availableMinutes > 0
      ? Math.min((totalMinutes / availableMinutes) * 100, 100)
      : 0;
  const isOverBudget = totalMinutes > availableMinutes;

  // Calculate "finish by" time
  const now = new Date();
  const finishBy = new Date(now.getTime() + totalMinutes * 60 * 1000);
  const finishTimeStr = finishBy.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // Format hours/minutes display
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (activeTasks.length === 0) return null;

  return (
    <div className="glass-subtle rounded-2xl p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-warm-sage" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">
            Time Budget
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isOverBudget ? (
            <AlertTriangle
              className="h-3.5 w-3.5 text-warm-terracotta"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="h-3.5 w-3.5 text-warm-sage"
              aria-hidden="true"
            />
          )}
          <span
            className={`text-xs font-medium ${isOverBudget ? "text-warm-terracotta" : "text-warm-sage"}`}
          >
            {formatDuration(totalMinutes)} / {availableHours}h available
            {isOverBudget ? " (over budget)" : ""}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="mb-2 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(fillPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Time budget: ${formatDuration(totalMinutes)} of ${availableHours} hours used${isOverBudget ? ", over budget" : ""}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            isOverBudget
              ? "bg-warm-terracotta"
              : fillPercent > 80
                ? "bg-warm-amber"
                : "bg-warm-sage"
          }`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      {/* Finish by time */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {tasksWithoutEstimate > 0 &&
            `${tasksWithoutEstimate} task${tasksWithoutEstimate > 1 ? "s" : ""} unestimated \u00b7 `}
          {tasksWithEstimate} task{tasksWithEstimate !== 1 ? "s" : ""} estimated
        </span>
        {totalMinutes > 0 && (
          <span
            className={`text-xs font-semibold ${isOverBudget ? "text-warm-terracotta" : "text-foreground"}`}
          >
            Done by ~{finishTimeStr}
          </span>
        )}
      </div>
    </div>
  );
}
