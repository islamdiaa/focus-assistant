/**
 * Weekly Review Page — End-of-week summary
 * Shows completed tasks, carried-over tasks, focus stats
 * Allows planning for next week
 */
import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

function getWeekRange(offset: number = 0) {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateRange(start: Date, end: Date) {
  return `${formatDate(start)} — ${formatDate(end)}`;
}

export default function WeeklyReviewPage() {
  const { state } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
  const week = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const isCurrentWeek = weekOffset === 0;

  const weekStats = useMemo(() => {
    const startStr = week.start.toISOString().split("T")[0];
    const endStr = week.end.toISOString().split("T")[0];

    const stats = state.dailyStats.filter(
      s => s.date >= startStr && s.date <= endStr
    );
    const totalCompleted = stats.reduce((sum, s) => sum + s.tasksCompleted, 0);
    const totalFocusMin = stats.reduce((sum, s) => sum + s.focusMinutes, 0);
    const totalPomodoros = stats.reduce(
      (sum, s) => sum + s.pomodorosCompleted,
      0
    );
    const activeDays = stats.filter(
      s => s.tasksCompleted > 0 || s.focusMinutes > 0
    ).length;

    // Tasks completed this week
    const completedTasks = state.tasks.filter(
      t =>
        t.status === "done" &&
        t.completedAt &&
        t.completedAt >= week.start.toISOString() &&
        t.completedAt <= week.end.toISOString()
    );

    // Carry-over: active tasks that were created before this week's end
    const carryOverTasks = state.tasks.filter(
      t => t.status === "active" && t.createdAt <= week.end.toISOString()
    );

    // Overdue tasks
    const overdueTasks = state.tasks.filter(
      t => t.status === "active" && t.dueDate && t.dueDate < startStr
    );

    return {
      totalCompleted,
      totalFocusMin,
      totalPomodoros,
      activeDays,
      completedTasks,
      carryOverTasks,
      overdueTasks,
      dailyBreakdown: stats,
    };
  }, [state, week]);

  const focusHours = Math.floor(weekStats.totalFocusMin / 60);
  const focusMins = weekStats.totalFocusMin % 60;

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">
            Weekly Review
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateRange(week.start, week.end)}
            {isCurrentWeek && (
              <span className="ml-2 text-warm-sage font-medium">This week</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setWeekOffset(w => w - 1)}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {!isCurrentWeek && (
            <Button
              onClick={() => setWeekOffset(0)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Today
            </Button>
          )}
          <Button
            onClick={() => setWeekOffset(w => w + 1)}
            variant="outline"
            size="sm"
            disabled={weekOffset >= 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          {
            icon: CheckCircle2,
            label: "Tasks Done",
            value: weekStats.totalCompleted,
            color: "text-warm-sage",
            bg: "bg-warm-sage-light",
          },
          {
            icon: Clock,
            label: "Focus Time",
            value:
              focusHours > 0 ? `${focusHours}h ${focusMins}m` : `${focusMins}m`,
            color: "text-warm-blue",
            bg: "bg-warm-blue-light",
          },
          {
            icon: Target,
            label: "Pomodoros",
            value: weekStats.totalPomodoros,
            color: "text-warm-amber",
            bg: "bg-warm-amber-light",
          },
          {
            icon: Flame,
            label: "Active Days",
            value: `${weekStats.activeDays}/7`,
            color: "text-warm-terracotta",
            bg: "bg-warm-terracotta-light",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${card.bg} rounded-xl p-4 border border-border/30`}
          >
            <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Daily Breakdown */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <h3 className="font-serif text-lg text-foreground mb-4">
          Daily Breakdown
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
            const d = new Date(week.start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split("T")[0];
            const dayStat = weekStats.dailyBreakdown.find(
              s => s.date === dateStr
            );
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const hasActivity =
              dayStat &&
              (dayStat.tasksCompleted > 0 || dayStat.focusMinutes > 0);

            return (
              <div
                key={day}
                className={`text-center p-2 rounded-lg ${isToday ? "ring-2 ring-warm-sage/30" : ""} ${hasActivity ? "bg-warm-sage-light/50" : "bg-background"}`}
              >
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {day}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.getDate()}
                </p>
                {dayStat ? (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      {dayStat.tasksCompleted}✓
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {dayStat.focusMinutes}m
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/40 mt-1.5">—</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed Tasks */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-warm-sage" />
          Completed ({weekStats.completedTasks.length})
        </h3>
        {weekStats.completedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks completed this week.
          </p>
        ) : (
          <div className="space-y-1.5">
            {weekStats.completedTasks.slice(0, 20).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-warm-sage shrink-0" />
                <span className="text-foreground line-through opacity-70">
                  {t.title}
                </span>
                {t.completedAt && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(t.completedAt).toLocaleDateString("en-US", {
                      weekday: "short",
                    })}
                  </span>
                )}
              </div>
            ))}
            {weekStats.completedTasks.length > 20 && (
              <p className="text-xs text-muted-foreground">
                + {weekStats.completedTasks.length - 20} more
              </p>
            )}
          </div>
        )}
      </div>

      {/* Carry-Over & Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Carry-over */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-warm-amber" />
            Carry Over ({weekStats.carryOverTasks.length})
          </h3>
          {weekStats.carryOverTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">All caught up!</p>
          ) : (
            <div className="space-y-1.5">
              {weekStats.carryOverTasks.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <Circle className="w-3.5 h-3.5 text-warm-amber shrink-0" />
                  <span className="text-foreground truncate">{t.title}</span>
                </div>
              ))}
              {weekStats.carryOverTasks.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  + {weekStats.carryOverTasks.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Overdue */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-warm-terracotta" />
            Overdue ({weekStats.overdueTasks.length})
          </h3>
          {weekStats.overdueTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue tasks!</p>
          ) : (
            <div className="space-y-1.5">
              {weekStats.overdueTasks.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-warm-terracotta shrink-0" />
                  <span className="text-foreground truncate">{t.title}</span>
                  <span className="text-[10px] text-warm-terracotta ml-auto whitespace-nowrap">
                    Due{" "}
                    {new Date(t.dueDate!).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
              {weekStats.overdueTasks.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  + {weekStats.overdueTasks.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
