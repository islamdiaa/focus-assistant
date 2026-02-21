/**
 * Daily Planner — "Today" page
 * Shows due tasks, focus blocks, timeline, quick stats, and a motivational quote
 * V1.8.5: Full task actions (monitor/complete/edit/delete), full reminder actions,
 *         "Actioned Today" section, no monitoring section (focus-only view)
 */
import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  CheckCircle2,
  Circle,
  Clock,
  Sun,
  Sunset,
  Moon,
  Target,
  Zap,
  Calendar,
  ChevronRight,
  Check,
  ListChecks,
  Quote,
  BookOpen,
  ExternalLink,
  Globe,
  Bell,
  Cake,
  Star,
  AlertCircle,
  Plus,
  Pin,
  PinOff,
  Search,
  X,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Undo2,
  ChevronDown,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Task, EnergyLevel, Reminder } from "@/lib/types";
import {
  filterTasksByContext,
  filterRemindersByContext,
} from "@/lib/contextFilter";
import { motion, AnimatePresence } from "framer-motion";

const ENERGY_EMOJI: Record<EnergyLevel, string> = {
  low: "🔋",
  medium: "⚡",
  high: "🔥",
};

// ---- Curated motivational quotes ----
const QUOTES: { text: string; author: string; source?: string }[] = [
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "It is not that we have a short time to live, but that we waste a good deal of it.",
    author: "Seneca",
    source: "On the Shortness of Life",
  },
  {
    text: "Focus is a matter of deciding what things you're not going to do.",
    author: "John Carmack",
  },
  {
    text: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: "James Clear",
    source: "Atomic Habits",
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
  },
  {
    text: "Deep work is the ability to focus without distraction on a cognitively demanding task.",
    author: "Cal Newport",
    source: "Deep Work",
  },
  {
    text: "What we fear doing most is usually what we most need to do.",
    author: "Tim Ferriss",
    source: "The 4-Hour Workweek",
  },
  {
    text: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
  },
  {
    text: "Until we can manage time, we can manage nothing else.",
    author: "Peter Drucker",
  },
  {
    text: "Discipline equals freedom.",
    author: "Jocko Willink",
    source: "Discipline Equals Freedom",
  },
  {
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.",
    author: "Stephen King",
    source: "On Writing",
  },
  {
    text: "Start where you are. Use what you have. Do what you can.",
    author: "Arthur Ashe",
  },
  {
    text: "Done is better than perfect.",
    author: "Sheryl Sandberg",
    source: "Lean In",
  },
  {
    text: "People think focus means saying yes to the thing you've got to focus on. It means saying no to the hundred other good ideas.",
    author: "Steve Jobs",
  },
  {
    text: "You don't have to see the whole staircase, just take the first step.",
    author: "Martin Luther King Jr.",
  },
  {
    text: "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort.",
    author: "Paul J. Meyer",
  },
  {
    text: "If you spend too much time thinking about a thing, you'll never get it done.",
    author: "Bruce Lee",
  },
  {
    text: "Small daily improvements over time lead to stunning results.",
    author: "Robin Sharma",
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Will Durant",
    source: "The Story of Philosophy",
  },
  {
    text: "Your mind is for having ideas, not holding them.",
    author: "David Allen",
    source: "Getting Things Done",
  },
  {
    text: "Simplicity boils down to two steps: identify the essential, eliminate the rest.",
    author: "Leo Babauta",
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Courage is not the absence of fear, but rather the judgment that something else is more important than fear.",
    author: "Ambrose Redmoon",
  },
  {
    text: "Progress is not achieved by luck or accident, but by working on yourself daily.",
    author: "Epictetus",
  },
  {
    text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.",
    author: "Alexander Graham Bell",
  },
  {
    text: "The most dangerous risk of all — the risk of spending your life not doing what you want on the bet you can buy yourself the freedom to do it later.",
    author: "Randy Komisar",
  },
  {
    text: "Be tolerant with others and strict with yourself.",
    author: "Marcus Aurelius",
    source: "Meditations",
  },
  {
    text: "You will never change your life until you change something you do daily.",
    author: "John C. Maxwell",
  },
  {
    text: "The successful warrior is the average man, with laser-like focus.",
    author: "Bruce Lee",
  },
  {
    text: "Where your attention goes, your time goes.",
    author: "Idowu Koyenikan",
  },
  {
    text: "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.",
    author: "Zig Ziglar",
  },
  { text: "Think of many things; do one.", author: "Portuguese Proverb" },
  {
    text: "A year from now you may wish you had started today.",
    author: "Karen Lamb",
  },
  {
    text: "The mind is not a vessel to be filled, but a fire to be kindled.",
    author: "Plutarch",
  },
  {
    text: "He who has a why to live can bear almost any how.",
    author: "Friedrich Nietzsche",
  },
  {
    text: "Perfection is not attainable, but if we chase perfection we can catch excellence.",
    author: "Vince Lombardi",
  },
  {
    text: "Do the hard jobs first. The easy jobs will take care of themselves.",
    author: "Dale Carnegie",
  },
  {
    text: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
  },
];

function formatReminderTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const TIME_GREETING: Record<string, { icon: typeof Sun; text: string }> = {
  morning: { icon: Sun, text: "Good morning" },
  afternoon: { icon: Sunset, text: "Good afternoon" },
  evening: { icon: Moon, text: "Good evening" },
};

// ---- Task card with full actions ----
interface TodayTaskCardProps {
  task: Task;
  dispatch: ReturnType<typeof useApp>["dispatch"];
  showUnpin?: boolean;
}

function TodayTaskCard({ task, dispatch, showUnpin }: TodayTaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || "");
  const [editPriority, setEditPriority] = useState(task.priority);
  const subtasksDone = task.subtasks?.filter(s => s.done).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;

  function handleEditSave() {
    if (!editTitle.trim()) return;
    dispatch({
      type: "UPDATE_TASK",
      payload: {
        id: task.id,
        title: editTitle.trim(),
        dueDate: editDueDate || undefined,
        priority: editPriority,
      },
    });
    setEditing(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border border-border/50 bg-background/50 hover:bg-background transition-colors group ${
        task.status === "done" ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Status checkbox */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_TASK", payload: task.id })}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
            ${task.status === "done" ? "bg-warm-sage border-warm-sage" : "border-border hover:border-warm-sage"}`}
        >
          {task.status === "done" && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.energy && (
              <span className="text-[10px] text-muted-foreground">
                {ENERGY_EMOJI[task.energy]} {task.energy}
              </span>
            )}
            {task.dueDate && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {subtasksTotal > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <ListChecks className="w-2.5 h-2.5" /> {subtasksDone}/
                {subtasksTotal}
              </span>
            )}
            {task.category && (
              <span className="text-[10px] text-muted-foreground/70">
                {task.category}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Monitor toggle (only for active tasks) */}
          {task.status === "active" && (
            <button
              onClick={() =>
                dispatch({ type: "TOGGLE_MONITOR", payload: task.id })
              }
              className="p-1.5 rounded-md text-muted-foreground hover:text-warm-amber hover:bg-warm-amber-light transition-colors"
              title="Monitor task (waiting)"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Complete/reopen */}
          <button
            onClick={() => dispatch({ type: "TOGGLE_TASK", payload: task.id })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-warm-sage hover:bg-warm-sage-light transition-colors"
            title={task.status === "done" ? "Reopen task" : "Mark as done"}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          {/* Edit */}
          <button
            onClick={() => {
              setEditTitle(task.title);
              setEditDueDate(task.dueDate || "");
              setEditPriority(task.priority);
              setEditing(!editing);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              editing
                ? "text-warm-blue bg-warm-blue-light"
                : "text-muted-foreground hover:text-warm-blue hover:bg-warm-blue-light"
            }`}
            title="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Unpin (only for pinned tasks) */}
          {showUnpin && (
            <button
              onClick={() =>
                dispatch({ type: "UNPIN_FROM_TODAY", payload: task.id })
              }
              title="Remove from Today"
              className="p-1.5 rounded-md text-muted-foreground hover:text-warm-terracotta hover:bg-warm-terracotta/10 transition-colors"
            >
              <PinOff className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Delete */}
          <button
            onClick={() => dispatch({ type: "DELETE_TASK", payload: task.id })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-warm-terracotta hover:bg-warm-terracotta-light transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact inline edit form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 border-t border-border/50 space-y-2">
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleEditSave();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="Task title"
                className="h-8 text-sm bg-background"
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="h-8 text-xs bg-background flex-1"
                />
                <select
                  value={editPriority}
                  onChange={e => setEditPriority(e.target.value as any)}
                  className="h-8 text-xs bg-background border border-border rounded-md px-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleEditSave}
                  size="sm"
                  className="h-7 text-xs bg-warm-sage hover:bg-warm-sage/90 text-white flex-1"
                >
                  Save
                </Button>
                <Button
                  onClick={() => setEditing(false)}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---- Reminder card with full actions ----
interface TodayReminderCardProps {
  reminder: Reminder;
  dispatch: ReturnType<typeof useApp>["dispatch"];
  variant?: "overdue" | "today" | "upcoming";
}

const REMINDER_CATEGORY_ICON: Record<Reminder["category"], typeof Bell> = {
  birthday: Cake,
  appointment: Calendar,
  event: Star,
  other: Bell,
};

const REMINDER_CATEGORY_COLOR: Record<
  Reminder["category"],
  { color: string; bg: string }
> = {
  birthday: { color: "text-pink-500", bg: "bg-pink-50" },
  appointment: { color: "text-warm-blue", bg: "bg-warm-blue-light" },
  event: { color: "text-warm-amber", bg: "bg-warm-amber-light" },
  other: { color: "text-warm-sage", bg: "bg-warm-sage-light" },
};

function TodayReminderCard({
  reminder,
  dispatch,
  variant = "today",
}: TodayReminderCardProps) {
  const Icon = REMINDER_CATEGORY_ICON[reminder.category];
  const colors = REMINDER_CATEGORY_COLOR[reminder.category];
  const today = new Date().toISOString().split("T")[0];

  const borderClass =
    variant === "overdue"
      ? "border-red-200/50"
      : variant === "today"
        ? "border-warm-amber/20"
        : "border-warm-blue/10";

  const daysOverdue =
    variant === "overdue"
      ? Math.floor(
          (new Date(today).getTime() - new Date(reminder.date).getTime()) /
            86400000
        )
      : 0;
  const daysUntil =
    variant === "upcoming"
      ? Math.floor(
          (new Date(reminder.date).getTime() - new Date(today).getTime()) /
            86400000
        )
      : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg border ${borderClass} bg-white/50 group`}
    >
      <div
        className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}
      >
        <Icon className={`w-4 h-4 ${colors.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{reminder.title}</p>
        {reminder.description && (
          <p className="text-[10px] text-muted-foreground">
            {reminder.description}
          </p>
        )}
        <p
          className={`text-[10px] font-medium ${
            variant === "overdue"
              ? "text-red-500"
              : variant === "today"
                ? "text-warm-amber"
                : "text-warm-blue"
          }`}
        >
          {variant === "overdue" && (
            <>
              {daysOverdue}d overdue •{" "}
              {new Date(reminder.date + "T00:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              )}
            </>
          )}
          {variant === "today" && <>Today</>}
          {variant === "upcoming" && (
            <>
              In {daysUntil}d •{" "}
              {new Date(reminder.date + "T00:00:00").toLocaleDateString(
                "en-US",
                { weekday: "short", month: "short", day: "numeric" }
              )}
            </>
          )}
          {reminder.time ? ` at ${formatReminderTime(reminder.time)}` : ""}
          {reminder.recurrence !== "none" ? ` • ${reminder.recurrence}` : ""}
        </p>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!reminder.acknowledged ? (
          <button
            onClick={() =>
              dispatch({ type: "ACK_REMINDER", payload: reminder.id })
            }
            title={
              reminder.recurrence !== "none"
                ? "Acknowledge & advance to next"
                : "Acknowledge"
            }
            className="p-1.5 rounded-md text-muted-foreground hover:text-warm-sage hover:bg-warm-sage-light transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() =>
              dispatch({ type: "UNACK_REMINDER", payload: reminder.id })
            }
            title="Undo acknowledge"
            className="p-1.5 rounded-md text-muted-foreground hover:text-warm-amber hover:bg-warm-amber-light transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() =>
            dispatch({ type: "DELETE_REMINDER", payload: reminder.id })
          }
          className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
          title="Delete reminder"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function DailyPlannerPage() {
  const { state, dispatch } = useApp();
  const activeContext = state.preferences?.activeContext || "all";
  const timeOfDay = getTimeOfDay();
  const greeting = TIME_GREETING[timeOfDay];
  const GreetingIcon = greeting.icon;

  const today = new Date().toISOString().split("T")[0];

  // Pick a random quote on mount (changes on every page load/refresh)
  const quote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    []
  );

  const todayStats = useMemo(() => {
    return (
      state.dailyStats.find(s => s.date === today) || {
        date: today,
        tasksCompleted: 0,
        focusMinutes: 0,
        pomodorosCompleted: 0,
      }
    );
  }, [state.dailyStats, today]);

  // Context-filtered tasks
  const contextTasks = useMemo(
    () => filterTasksByContext(state.tasks, activeContext),
    [state.tasks, activeContext]
  );

  // Pinned tasks (manually added to Today)
  const pinnedTasks = useMemo(() => {
    return contextTasks
      .filter(t => t.status === "active" && t.pinnedToday === today)
      .sort((a, b) => {
        const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return pOrder[a.priority] - pOrder[b.priority];
      });
  }, [contextTasks, today]);

  // Tasks due today or overdue (excluding already pinned)
  const dueTasks = useMemo(() => {
    return contextTasks
      .filter(
        t =>
          t.status === "active" &&
          t.dueDate &&
          t.dueDate <= today &&
          t.pinnedToday !== today
      )
      .sort((a, b) => {
        // Overdue first, then by priority
        const aOverdue = a.dueDate! < today;
        const bOverdue = b.dueDate! < today;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return pOrder[a.priority] - pOrder[b.priority];
      });
  }, [contextTasks, today]);

  // High-priority tasks (not due today but urgent/high, excluding pinned)
  const highPriorityTasks = useMemo(() => {
    return contextTasks.filter(
      t =>
        t.status === "active" &&
        (t.priority === "urgent" || t.priority === "high") &&
        (!t.dueDate || t.dueDate > today) &&
        t.pinnedToday !== today
    );
  }, [contextTasks, today]);

  // Task picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const pickableTasks = useMemo(() => {
    return contextTasks
      .filter(
        t =>
          t.status === "active" &&
          t.pinnedToday !== today &&
          !(t.dueDate && t.dueDate <= today)
      )
      .filter(t => {
        if (!pickerSearch.trim()) return true;
        const q = pickerSearch.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return pOrder[a.priority] - pOrder[b.priority];
      });
  }, [contextTasks, today, pickerSearch]);

  // Energy-matched suggestions
  const energySuggestions = useMemo(() => {
    const energyMap: Record<string, EnergyLevel> = {
      morning: "high",
      afternoon: "medium",
      evening: "low",
    };
    const suggestedEnergy = energyMap[timeOfDay];
    return contextTasks
      .filter(
        t =>
          t.status === "active" &&
          t.energy === suggestedEnergy &&
          t.pinnedToday !== today &&
          !(t.dueDate && t.dueDate <= today)
      )
      .slice(0, 5);
  }, [contextTasks, timeOfDay]);

  // Actioned Today: tasks completed or moved to monitored today (using statusChangedAt)
  const actionedToday = useMemo(() => {
    return contextTasks.filter(
      t =>
        t.statusChangedAt &&
        t.statusChangedAt.startsWith(today) &&
        (t.status === "done" || t.status === "monitored")
    );
  }, [contextTasks, today]);

  const [actionedExpanded, setActionedExpanded] = useState(false);

  // Reminders: overdue, today, upcoming (5 days)
  const reminders = useMemo(
    () => filterRemindersByContext(state.reminders || [], activeContext),
    [state.reminders, activeContext]
  );
  const overdueReminders = useMemo(() => {
    return reminders
      .filter(r => !r.acknowledged && r.date < today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reminders, today]);

  const todayReminders = useMemo(() => {
    return reminders.filter(r => !r.acknowledged && r.date === today);
  }, [reminders, today]);

  const upcomingReminders = useMemo(() => {
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
    const cutoff = fiveDaysLater.toISOString().split("T")[0];
    return reminders
      .filter(r => !r.acknowledged && r.date > today && r.date <= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reminders, today]);

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
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">
            {greeting.text}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
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
              {quote.source && (
                <span className="font-normal text-muted-foreground/60">
                  {" "}
                  — {quote.source}
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Today's Progress */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          {
            icon: CheckCircle2,
            label: "Done",
            value: todayStats.tasksCompleted,
            color: "text-warm-sage",
            bg: "bg-warm-sage-light",
          },
          {
            icon: Clock,
            label: "Focus",
            value: `${todayStats.focusMinutes}m`,
            color: "text-warm-blue",
            bg: "bg-warm-blue-light",
          },
          {
            icon: Target,
            label: "Pomodoros",
            value: todayStats.pomodorosCompleted,
            color: "text-warm-amber",
            bg: "bg-warm-amber-light",
          },
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

      {/* My Today — Pinned Tasks */}
      <div className="bg-card rounded-xl border border-border p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg text-foreground flex items-center gap-2">
            <Pin className="w-5 h-5 text-warm-sage" />
            My Today ({pinnedTasks.length})
          </h3>
          <Button
            onClick={() => {
              setPickerSearch("");
              setPickerOpen(true);
            }}
            size="sm"
            variant="outline"
            className="gap-1.5 text-warm-sage border-warm-sage/30 hover:bg-warm-sage-light"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </Button>
        </div>
        {pinnedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks pinned to today. Click "Add Task" to pick tasks you want to
            focus on.
          </p>
        ) : (
          <div className="space-y-2">
            {pinnedTasks.map(t => (
              <TodayTaskCard
                key={t.id}
                task={t}
                dispatch={dispatch}
                showUnpin
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Picker Dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="bg-card max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Add to Today
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Pick tasks to focus on today
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              className="pl-10 bg-background"
              autoFocus
            />
            {pickerSearch && (
              <button
                onClick={() => setPickerSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {pickableTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {pickerSearch
                  ? "No matching tasks found."
                  : "All active tasks are already in Today or due today."}
              </p>
            ) : (
              pickableTasks.map(t => {
                const PRIORITY_COLORS: Record<string, string> = {
                  urgent: "bg-warm-terracotta/15 text-warm-terracotta",
                  high: "bg-warm-terracotta-light text-warm-terracotta",
                  medium: "bg-warm-amber-light text-warm-amber",
                  low: "bg-warm-sage-light text-warm-sage",
                };
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      dispatch({ type: "PIN_TO_TODAY", payload: t.id });
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-warm-sage-light/30 hover:border-warm-sage/30 transition-colors text-left group"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-warm-sage transition-colors shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority]}`}
                        >
                          {t.priority}
                        </span>
                        {t.category && (
                          <span className="text-[10px] text-muted-foreground">
                            {t.category}
                          </span>
                        )}
                        {t.dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(t.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Overdue Reminders */}
      {overdueReminders.length > 0 && (
        <div className="bg-red-50/50 rounded-xl border border-red-200/50 p-5 mb-4">
          <h3 className="font-serif text-lg text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Overdue Reminders ({overdueReminders.length})
          </h3>
          <div className="space-y-2">
            {overdueReminders.map(r => (
              <TodayReminderCard
                key={r.id}
                reminder={r}
                dispatch={dispatch}
                variant="overdue"
              />
            ))}
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
            {todayReminders.map(r => (
              <TodayReminderCard
                key={r.id}
                reminder={r}
                dispatch={dispatch}
                variant="today"
              />
            ))}
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
            {upcomingReminders.map(r => (
              <TodayReminderCard
                key={r.id}
                reminder={r}
                dispatch={dispatch}
                variant="upcoming"
              />
            ))}
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
          <p className="text-sm text-muted-foreground">
            No tasks due today. Check your task list for things to work on.
          </p>
        ) : (
          <div className="space-y-2">
            {dueTasks.map(t => (
              <TodayTaskCard key={t.id} task={t} dispatch={dispatch} />
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
              <TodayTaskCard key={t.id} task={t} dispatch={dispatch} />
            ))}
            {highPriorityTasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                + {highPriorityTasks.length - 5} more
              </p>
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
              <TodayTaskCard key={t.id} task={t} dispatch={dispatch} />
            ))}
          </div>
        </div>
      )}

      {/* Reading Queue — Daily Digest */}
      {(state.readingList || []).filter(
        r => r.status === "unread" || r.status === "reading"
      ).length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-4">
          <h3 className="font-serif text-lg text-foreground mb-1 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-warm-lavender" />
            Reading Queue
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {
              (state.readingList || []).filter(r => r.status === "unread")
                .length
            }{" "}
            unread links waiting for you
          </p>
          <div className="space-y-2">
            {(state.readingList || [])
              .filter(r => r.status === "unread" || r.status === "reading")
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
                  <div
                    className={`shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center ${
                      item.status === "reading"
                        ? "bg-warm-blue/10"
                        : "bg-warm-lavender/10"
                    }`}
                  >
                    {item.status === "reading" ? (
                      <BookOpen className="w-3.5 h-3.5 text-warm-blue" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-warm-lavender" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-warm-lavender transition-colors line-clamp-1 flex items-center gap-1.5">
                      {item.title}
                      <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {item.domain || "link"}
                      </span>
                      {item.tags.length > 0 && (
                        <span className="text-[10px] text-warm-lavender/70">
                          {item.tags.slice(0, 2).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.a>
              ))}
            {(state.readingList || []).filter(
              r => r.status === "unread" || r.status === "reading"
            ).length > 5 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                +{" "}
                {(state.readingList || []).filter(
                  r => r.status === "unread" || r.status === "reading"
                ).length - 5}{" "}
                more in Read Later
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actioned Today — tasks completed or sent to monitoring today */}
      {actionedToday.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <button
            onClick={() => setActionedExpanded(!actionedExpanded)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-serif text-lg text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-warm-sage" />
              Actioned Today ({actionedToday.length})
            </h3>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform ${
                actionedExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence>
            {actionedExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 mt-3">
                  {actionedToday.map(t => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 text-sm opacity-70"
                    >
                      {t.status === "done" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-warm-sage shrink-0" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-warm-amber shrink-0" />
                      )}
                      <span
                        className={`text-foreground ${t.status === "done" ? "line-through" : ""}`}
                      >
                        {t.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {t.status === "done" ? "Completed" : "Monitoring"}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
