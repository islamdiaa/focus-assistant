/**
 * Daily Planner — "Today" page
 * Shows due tasks, focus blocks, timeline, quick stats, and a motivational quote
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { CheckCircle2, Circle, Clock, Sun, Sunset, Moon, Target, Zap, Calendar, ChevronRight, Check, ListChecks, Quote, BookOpen, ExternalLink, Globe, Bell, Cake, Star, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task, EnergyLevel, Reminder } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const ENERGY_EMOJI: Record<EnergyLevel, string> = { low: '🔋', medium: '⚡', high: '🔥' };

// ---- Curated motivational quotes ----
const QUOTES: { text: string; author: string; source?: string }[] = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It is not that we have a short time to live, but that we waste a good deal of it.", author: "Seneca", source: "On the Shortness of Life" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear", source: "Atomic Habits" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Cal Newport", source: "Deep Work" },
  { text: "What we fear doing most is usually what we most need to do.", author: "Tim Ferriss", source: "The 4-Hour Workweek" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Until we can manage time, we can manage nothing else.", author: "Peter Drucker" },
  { text: "Discipline equals freedom.", author: "Jocko Willink", source: "Discipline Equals Freedom" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King", source: "On Writing" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg", source: "Lean In" },
  { text: "People think focus means saying yes to the thing you've got to focus on. It means saying no to the hundred other good ideas.", author: "Steve Jobs" },
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
  { text: "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort.", author: "Paul J. Meyer" },
  { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", source: "The Story of Philosophy" },
  { text: "Your mind is for having ideas, not holding them.", author: "David Allen", source: "Getting Things Done" },
  { text: "Simplicity boils down to two steps: identify the essential, eliminate the rest.", author: "Leo Babauta" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Courage is not the absence of fear, but rather the judgment that something else is more important than fear.", author: "Ambrose Redmoon" },
  { text: "Progress is not achieved by luck or accident, but by working on yourself daily.", author: "Epictetus" },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "The most dangerous risk of all — the risk of spending your life not doing what you want on the bet you can buy yourself the freedom to do it later.", author: "Randy Komisar" },
  { text: "Be tolerant with others and strict with yourself.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "You will never change your life until you change something you do daily.", author: "John C. Maxwell" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Where your attention goes, your time goes.", author: "Idowu Koyenikan" },
  { text: "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.", author: "Zig Ziglar" },
  { text: "Think of many things; do one.", author: "Portuguese Proverb" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Perfection is not attainable, but if we chase perfection we can catch excellence.", author: "Vince Lombardi" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
];

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const TIME_GREETING: Record<string, { icon: typeof Sun; text: string }> = {
  morning: { icon: Sun, text: 'Good morning' },
  afternoon: { icon: Sunset, text: 'Good afternoon' },
  evening: { icon: Moon, text: 'Good evening' },
};

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
}

function TaskItem({ task, onToggle }: TaskItemProps) {
  const subtasksDone = task.subtasks?.filter(s => s.done).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background transition-colors ${
        task.status === 'done' ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
          ${task.status === 'done' ? 'bg-warm-sage border-warm-sage' : 'border-border hover:border-warm-sage'}`}
      >
        {task.status === 'done' && <Check className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.energy && (
            <span className="text-[10px] text-muted-foreground">{ENERGY_EMOJI[task.energy]} {task.energy}</span>
          )}
          {task.dueDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {subtasksTotal > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <ListChecks className="w-2.5 h-2.5" /> {subtasksDone}/{subtasksTotal}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function DailyPlannerPage() {
  const { state, dispatch } = useApp();
  const timeOfDay = getTimeOfDay();
  const greeting = TIME_GREETING[timeOfDay];
  const GreetingIcon = greeting.icon;

  const today = new Date().toISOString().split('T')[0];

  // Pick a random quote on mount (changes on every page load/refresh)
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  const todayStats = useMemo(() => {
    return state.dailyStats.find(s => s.date === today) || {
      date: today,
      tasksCompleted: 0,
      focusMinutes: 0,
      pomodorosCompleted: 0,
    };
  }, [state.dailyStats, today]);

  // Tasks due today or overdue
  const dueTasks = useMemo(() => {
    return state.tasks.filter(t =>
      t.status === 'active' && t.dueDate && t.dueDate <= today
    ).sort((a, b) => {
      // Overdue first, then by priority
      const aOverdue = a.dueDate! < today;
      const bOverdue = b.dueDate! < today;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
  }, [state.tasks, today]);

  // High-priority tasks (not due today but urgent/high)
  const highPriorityTasks = useMemo(() => {
    return state.tasks.filter(t =>
      t.status === 'active' &&
      (t.priority === 'urgent' || t.priority === 'high') &&
      (!t.dueDate || t.dueDate > today)
    );
  }, [state.tasks, today]);

  // Energy-matched suggestions
  const energySuggestions = useMemo(() => {
    const energyMap: Record<string, EnergyLevel> = {
      morning: 'high',
      afternoon: 'medium',
      evening: 'low',
    };
    const suggestedEnergy = energyMap[timeOfDay];
    return state.tasks.filter(t =>
      t.status === 'active' && t.energy === suggestedEnergy
    ).slice(0, 5);
  }, [state.tasks, timeOfDay]);

  // Recently completed today
  const completedToday = useMemo(() => {
    return state.tasks.filter(t =>
      t.status === 'done' && t.completedAt && t.completedAt.startsWith(today)
    );
  }, [state.tasks, today]);

  // Reminders: overdue, today, upcoming (5 days)
  const reminders = state.reminders || [];
  const overdueReminders = useMemo(() => {
    return reminders.filter(r => !r.acknowledged && r.date < today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reminders, today]);

  const todayReminders = useMemo(() => {
    return reminders.filter(r => !r.acknowledged && r.date === today);
  }, [reminders, today]);

  const upcomingReminders = useMemo(() => {
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
    const cutoff = fiveDaysLater.toISOString().split('T')[0];
    return reminders.filter(r => !r.acknowledged && r.date > today && r.date <= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reminders, today]);

  const REMINDER_CATEGORY_ICON: Record<Reminder['category'], typeof Bell> = {
    birthday: Cake,
    appointment: Calendar,
    event: Star,
    other: Bell,
  };

  const REMINDER_CATEGORY_COLOR: Record<Reminder['category'], { color: string; bg: string }> = {
    birthday: { color: 'text-pink-500', bg: 'bg-pink-50' },
    appointment: { color: 'text-warm-blue', bg: 'bg-warm-blue-light' },
    event: { color: 'text-warm-amber', bg: 'bg-warm-amber-light' },
    other: { color: 'text-warm-sage', bg: 'bg-warm-sage-light' },
  };

  function toggleTask(id: string) {
    dispatch({ type: 'TOGGLE_TASK', payload: id });
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <GreetingIcon className="w-6 h-6 text-warm-amber" />
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">{greeting.text}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </motion.div>

      {/* Motivational Quote */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 relative overflow-hidden rounded-2xl border border-warm-lavender/20 bg-gradient-to-br from-warm-lavender/5 via-card to-warm-blue-light/30 p-5 lg:p-6"
      >
        <Quote className="absolute top-3 right-3 w-10 h-10 text-warm-lavender/10 rotate-180" />
        <div className="relative">
          <p className="font-serif text-base lg:text-lg text-foreground leading-relaxed italic">
            "{quote.text}"
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-6 h-0.5 bg-warm-lavender/40 rounded-full" />
            <p className="text-xs text-muted-foreground font-medium">
              {quote.author}
              {quote.source && <span className="font-normal text-muted-foreground/60"> — {quote.source}</span>}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Today's Progress */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: CheckCircle2, label: 'Done', value: todayStats.tasksCompleted, color: 'text-warm-sage', bg: 'bg-warm-sage-light' },
          { icon: Clock, label: 'Focus', value: `${todayStats.focusMinutes}m`, color: 'text-warm-blue', bg: 'bg-warm-blue-light' },
          { icon: Target, label: 'Pomodoros', value: todayStats.pomodorosCompleted, color: 'text-warm-amber', bg: 'bg-warm-amber-light' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className={`${card.bg} rounded-xl p-3 border border-border/30 text-center`}
          >
            <card.icon className={`w-4 h-4 ${card.color} mx-auto mb-1`} />
            <p className="text-xl font-bold text-foreground">{card.value}</p>
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Overdue Reminders */}
      {overdueReminders.length > 0 && (
        <div className="bg-red-50/50 rounded-xl border border-red-200/50 p-5 mb-4">
          <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Overdue Reminders ({overdueReminders.length})
          </h3>
          <div className="space-y-2">
            {overdueReminders.map(r => {
              const Icon = REMINDER_CATEGORY_ICON[r.category];
              const colors = REMINDER_CATEGORY_COLOR[r.category];
              const daysOverdue = Math.floor((new Date(today).getTime() - new Date(r.date).getTime()) / 86400000);
              return (
                <motion.div key={r.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-red-200/50 bg-white/50">
                  <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${colors.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-[10px] text-red-500">{daysOverdue}d overdue • {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <button onClick={() => dispatch({ type: 'ACK_REMINDER', payload: r.id })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-warm-sage hover:bg-warm-sage-light transition-colors" title="Acknowledge">
                    <Check className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Reminders */}
      {todayReminders.length > 0 && (
        <div className="bg-warm-amber-light/30 rounded-xl border border-warm-amber/20 p-5 mb-4">
          <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-warm-amber" />
            Today's Reminders ({todayReminders.length})
          </h3>
          <div className="space-y-2">
            {todayReminders.map(r => {
              const Icon = REMINDER_CATEGORY_ICON[r.category];
              const colors = REMINDER_CATEGORY_COLOR[r.category];
              return (
                <motion.div key={r.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-warm-amber/20 bg-white/50">
                  <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${colors.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    {r.description && <p className="text-[10px] text-muted-foreground">{r.description}</p>}
                    <p className="text-[10px] text-warm-amber font-medium">Today{r.recurrence !== 'none' ? ` • ${r.recurrence}` : ''}</p>
                  </div>
                  <button onClick={() => dispatch({ type: 'ACK_REMINDER', payload: r.id })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-warm-sage hover:bg-warm-sage-light transition-colors" title="Acknowledge">
                    <Check className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Reminders (5 days) */}
      {upcomingReminders.length > 0 && (
        <div className="bg-warm-blue-light/20 rounded-xl border border-warm-blue/10 p-5 mb-4">
          <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-warm-blue" />
            Upcoming Reminders ({upcomingReminders.length})
          </h3>
          <div className="space-y-2">
            {upcomingReminders.map(r => {
              const Icon = REMINDER_CATEGORY_ICON[r.category];
              const colors = REMINDER_CATEGORY_COLOR[r.category];
              const daysUntil = Math.floor((new Date(r.date).getTime() - new Date(today).getTime()) / 86400000);
              return (
                <motion.div key={r.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-warm-blue/10 bg-white/50">
                  <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${colors.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-[10px] text-warm-blue">In {daysUntil}d • {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Due Today / Overdue */}
      <div className="bg-card rounded-xl border border-border p-5 mb-4">
        <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-warm-terracotta" />
          Due Today ({dueTasks.length})
        </h3>
        {dueTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks due today. Check your task list for things to work on.</p>
        ) : (
          <div className="space-y-2">
            {dueTasks.map(t => (
              <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
            ))}
          </div>
        )}
      </div>

      {/* High Priority */}
      {highPriorityTasks.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-4">
          <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-warm-amber" />
            High Priority ({highPriorityTasks.length})
          </h3>
          <div className="space-y-2">
            {highPriorityTasks.slice(0, 5).map(t => (
              <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
            ))}
            {highPriorityTasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center mt-2">+ {highPriorityTasks.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Energy-Matched Suggestions */}
      {energySuggestions.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-4">
          <h3 className="font-serif text-lg text-foreground mb-1 flex items-center gap-2">
            <GreetingIcon className="w-5 h-5 text-warm-blue" />
            Suggested for {timeOfDay}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Tasks matching your typical {timeOfDay} energy level
          </p>
          <div className="space-y-2">
            {energySuggestions.map(t => (
              <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Reading Queue — Daily Digest */}
      {(state.readingList || []).filter(r => r.status === 'unread' || r.status === 'reading').length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-4">
          <h3 className="font-serif text-lg text-foreground mb-1 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-warm-lavender" />
            Reading Queue
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {(state.readingList || []).filter(r => r.status === 'unread').length} unread links waiting for you
          </p>
          <div className="space-y-2">
            {(state.readingList || [])
              .filter(r => r.status === 'unread' || r.status === 'reading')
              .slice(0, 5)
              .map(item => (
                <motion.a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background hover:border-warm-lavender/30 transition-colors group"
                >
                  <div className={`shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center ${
                    item.status === 'reading' ? 'bg-warm-blue/10' : 'bg-warm-lavender/10'
                  }`}>
                    {item.status === 'reading'
                      ? <BookOpen className="w-3.5 h-3.5 text-warm-blue" />
                      : <Globe className="w-3.5 h-3.5 text-warm-lavender" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-warm-lavender transition-colors line-clamp-1 flex items-center gap-1.5">
                      {item.title}
                      <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{item.domain || 'link'}</span>
                      {item.tags.length > 0 && (
                        <span className="text-[10px] text-warm-lavender/70">{item.tags.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                  </div>
                </motion.a>
              ))}
            {(state.readingList || []).filter(r => r.status === 'unread' || r.status === 'reading').length > 5 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                + {(state.readingList || []).filter(r => r.status === 'unread' || r.status === 'reading').length - 5} more in Read Later
              </p>
            )}
          </div>
        </div>
      )}

      {/* Completed Today */}
      {completedToday.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-warm-sage" />
            Done Today ({completedToday.length})
          </h3>
          <div className="space-y-1.5">
            {completedToday.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm opacity-60">
                <CheckCircle2 className="w-3.5 h-3.5 text-warm-sage shrink-0" />
                <span className="text-foreground line-through">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
