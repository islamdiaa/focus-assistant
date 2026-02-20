/**
 * Stats Page — Warm Productivity design
 * Streak, daily stats, weekly charts, all-time stats
 * Color-coded stat cards: peach, sage, blue, amber
 */
import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Flame, CheckCircle2, Clock, Target, TrendingUp, Calendar, Eye } from 'lucide-react';
import { filterTasksByContext } from '@/lib/contextFilter';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';

function getWeekDays(): string[] {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

export default function StatsPage() {
  const { state } = useApp();
  const activeContext = state.preferences?.activeContext || 'all';
  const contextTasks = useMemo(() => filterTasksByContext(state.tasks, activeContext), [state.tasks, activeContext]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayStats = state.dailyStats.find(s => s.date === todayStr);

  const taskSummary = useMemo(() => ({
    open: contextTasks.filter(t => t.status === 'active').length,
    monitored: contextTasks.filter(t => t.status === 'monitored').length,
    done: contextTasks.filter(t => t.status === 'done').length,
    total: contextTasks.length,
  }), [contextTasks]);

  const weekDays = useMemo(() => getWeekDays(), []);

  const weeklyTaskData = useMemo(() =>
    weekDays.map(date => {
      const stats = state.dailyStats.find(s => s.date === date);
      return {
        day: formatDayLabel(date),
        value: stats?.tasksCompleted || 0,
      };
    }),
  [weekDays, state.dailyStats]);

  const weeklyFocusData = useMemo(() =>
    weekDays.map(date => {
      const stats = state.dailyStats.find(s => s.date === date);
      return {
        day: formatDayLabel(date),
        value: stats?.focusMinutes || 0,
      };
    }),
  [weekDays, state.dailyStats]);

  const allTimeTasks = useMemo(() =>
    state.dailyStats.reduce((sum, s) => sum + s.tasksCompleted, 0),
  [state.dailyStats]);

  const allTimeFocus = useMemo(() => {
    const mins = state.dailyStats.reduce((sum, s) => sum + s.focusMinutes, 0);
    return `${Math.floor(mins / 60)}h`;
  }, [state.dailyStats]);

  const totalSessions = useMemo(() =>
    state.dailyStats.reduce((sum, s) => sum + s.pomodorosCompleted, 0),
  [state.dailyStats]);

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-serif text-2xl lg:text-3xl text-foreground">Your Progress</h2>
        <p className="text-sm text-muted-foreground mt-1">Track your focus journey and celebrate your wins</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-8">
        {/* Streak */}
        <div className="bg-warm-peach rounded-2xl p-5 border border-warm-peach/50">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-warm-terracotta" />
            <span className="text-xs font-semibold uppercase tracking-wide text-warm-charcoal/70">Current Streak</span>
          </div>
          <p className="font-serif text-2xl lg:text-3xl text-warm-charcoal">{state.currentStreak} days</p>
          <p className="text-xs text-warm-charcoal/60 mt-1">{state.currentStreak === 0 ? 'Start today!' : 'Keep it going!'}</p>
        </div>

        {/* Today's Tasks */}
        <div className="bg-warm-sage-light rounded-2xl p-5 border border-warm-sage/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-warm-sage" />
            <span className="text-xs font-semibold uppercase tracking-wide text-warm-charcoal/70">Today's Tasks</span>
          </div>
          <p className="font-serif text-2xl lg:text-3xl text-warm-charcoal">{todayStats?.tasksCompleted || 0}</p>
          <p className="text-xs text-warm-charcoal/60 mt-1">completed today</p>
        </div>

        {/* Focus Today */}
        <div className="bg-warm-blue-light rounded-2xl p-5 border border-warm-blue/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warm-blue" />
            <span className="text-xs font-semibold uppercase tracking-wide text-warm-charcoal/70">Focus Today</span>
          </div>
          <p className="font-serif text-2xl lg:text-3xl text-warm-charcoal">{todayStats?.focusMinutes || 0}m</p>
          <p className="text-xs text-warm-charcoal/60 mt-1">minutes focused</p>
        </div>

        {/* Total Sessions */}
        <div className="bg-warm-amber-light rounded-2xl p-5 border border-warm-amber/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-warm-amber" />
            <span className="text-xs font-semibold uppercase tracking-wide text-warm-charcoal/70">Total Sessions</span>
          </div>
          <p className="font-serif text-2xl lg:text-3xl text-warm-charcoal">{totalSessions}</p>
          <p className="text-xs text-warm-charcoal/60 mt-1">focus sessions</p>
        </div>
      </div>

      {/* Weekly Charts */}
      <div className="bg-card rounded-2xl border border-border p-4 lg:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-warm-sage" />
          <h3 className="font-semibold text-sm text-foreground">This Week</h3>
        </div>

        {/* Tasks Completed */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3">Tasks Completed</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTaskData}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8B8680' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#FAF7F2', border: '1px solid #E8E2DA', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#8BAA7E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus Minutes */}
        <div>
          <p className="text-xs text-muted-foreground mb-3">Focus Minutes</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyFocusData}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8B8680' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#FAF7F2', border: '1px solid #E8E2DA', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#7BA3C4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task Status Summary */}
      <div className="bg-card rounded-2xl border border-border p-4 lg:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-warm-sage" />
          <h3 className="font-semibold text-sm text-foreground">Task Overview{activeContext !== 'all' ? ` (${activeContext})` : ''}</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-warm-sage-light/50 rounded-xl p-3 text-center">
            <p className="font-serif text-xl text-warm-charcoal">{taskSummary.open}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Open</p>
          </div>
          <div className="bg-warm-amber-light/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Eye className="w-3.5 h-3.5 text-warm-amber" />
              <p className="font-serif text-xl text-warm-charcoal">{taskSummary.monitored}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Monitored</p>
          </div>
          <div className="bg-warm-blue-light/50 rounded-xl p-3 text-center">
            <p className="font-serif text-xl text-warm-charcoal">{taskSummary.done}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Done</p>
          </div>
          <div className="bg-warm-lavender-light/50 rounded-xl p-3 text-center">
            <p className="font-serif text-xl text-warm-charcoal">{taskSummary.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
        </div>
      </div>

      {/* All-Time Stats */}
      <div className="bg-warm-lavender-light rounded-2xl border border-warm-lavender/20 p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-warm-lavender" />
          <h3 className="font-semibold text-sm text-foreground">All-Time Stats</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-serif text-2xl lg:text-3xl text-warm-charcoal">{allTimeTasks}</p>
            <p className="text-xs text-muted-foreground mt-1">Tasks Completed</p>
          </div>
          <div>
            <p className="font-serif text-2xl lg:text-3xl text-warm-charcoal">{allTimeFocus}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Focus Time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
