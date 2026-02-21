/**
 * Reminders Page — Manage birthdays, appointments, events
 * Separate from Tasks. Shows in Today view alongside tasks.
 * R keyboard shortcut opens the new reminder dialog.
 * Supports create, edit, acknowledge, and delete.
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import type { Reminder } from "@/lib/types";
import { filterRemindersByContext } from "@/lib/contextFilter";
import {
  Plus,
  Bell,
  Cake,
  Calendar,
  Star,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Pencil,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_CONFIG: Record<
  Reminder["category"],
  { icon: typeof Bell; label: string; color: string; bg: string }
> = {
  birthday: {
    icon: Cake,
    label: "Birthday",
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
  appointment: {
    icon: Calendar,
    label: "Appointment",
    color: "text-warm-blue",
    bg: "bg-warm-blue-light",
  },
  event: {
    icon: Star,
    label: "Event",
    color: "text-warm-amber",
    bg: "bg-warm-amber-light",
  },
  other: {
    icon: Bell,
    label: "Other",
    color: "text-warm-sage",
    bg: "bg-warm-sage-light",
  },
};

const RECURRENCE_OPTIONS: { value: Reminder["recurrence"]; label: string }[] = [
  { value: "none", label: "One-time" },
  { value: "yearly", label: "Yearly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
];

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getStatusLabel(
  daysUntil: number,
  acknowledged?: boolean | null
): { label: string; color: string } {
  if (acknowledged) return { label: "Acknowledged", color: "text-warm-sage" };
  if (daysUntil < 0)
    return { label: `${Math.abs(daysUntil)}d overdue`, color: "text-red-500" };
  if (daysUntil === 0) return { label: "Today", color: "text-warm-amber" };
  if (daysUntil <= 5)
    return { label: `In ${daysUntil}d`, color: "text-warm-blue" };
  return {
    label: new Date(Date.now() + daysUntil * 86400000).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" }
    ),
    color: "text-muted-foreground",
  };
}

type FilterView = "all" | "upcoming" | "past";

interface RemindersPageProps {
  reminderTrigger?: number;
}

export default function RemindersPage({
  reminderTrigger = 0,
}: RemindersPageProps) {
  const { state, dispatch } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [filter, setFilter] = useState<FilterView>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState<Reminder["recurrence"]>("none");
  const [category, setCategory] = useState<Reminder["category"]>("other");

  // R keyboard shortcut trigger from parent — skip initial mount
  const prevTriggerRef = useRef(reminderTrigger);
  useEffect(() => {
    if (reminderTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = reminderTrigger;
      if (reminderTrigger > 0) openCreateDialog();
    }
  }, [reminderTrigger]);

  const activeContext = state.preferences?.activeContext || "all";
  const reminders = filterRemindersByContext(
    state.reminders || [],
    activeContext
  );

  const filteredReminders = useMemo(() => {
    let items = [...reminders];
    if (filter === "upcoming") {
      items = items.filter(r => !r.acknowledged && getDaysUntil(r.date) >= 0);
    } else if (filter === "past") {
      items = items.filter(r => r.acknowledged || getDaysUntil(r.date) < 0);
    }
    items.sort((a, b) => {
      const dA = getDaysUntil(a.date);
      const dB = getDaysUntil(b.date);
      if (dA < 0 && dB >= 0) return -1;
      if (dA >= 0 && dB < 0) return 1;
      return dA - dB;
    });
    return items;
  }, [reminders, filter]);

  const stats = useMemo(
    () => ({
      total: reminders.length,
      overdue: reminders.filter(
        r => !r.acknowledged && getDaysUntil(r.date) < 0
      ).length,
      today: reminders.filter(
        r => !r.acknowledged && getDaysUntil(r.date) === 0
      ).length,
      upcoming: reminders.filter(
        r =>
          !r.acknowledged &&
          getDaysUntil(r.date) > 0 &&
          getDaysUntil(r.date) <= 5
      ).length,
    }),
    [reminders]
  );

  function resetForm() {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setRecurrence("none");
    setCategory("other");
  }

  function openCreateDialog() {
    setEditingReminder(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(reminder: Reminder) {
    setEditingReminder(reminder);
    setTitle(reminder.title);
    setDescription(reminder.description || "");
    setDate(reminder.date);
    setTime(reminder.time || "");
    setRecurrence(reminder.recurrence);
    setCategory(reminder.category);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setEditingReminder(null);
      resetForm();
    }
    setDialogOpen(open);
  }

  function handleAdd() {
    if (!title.trim() || !date) return;
    dispatch({
      type: "ADD_REMINDER",
      payload: {
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        time: time || undefined,
        recurrence,
        category,
      },
    });
    resetForm();
    setDialogOpen(false);
  }

  function handleUpdate() {
    if (!editingReminder || !title.trim() || !date) return;
    dispatch({
      type: "UPDATE_REMINDER",
      payload: {
        id: editingReminder.id,
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        time: time || undefined,
        recurrence,
        category,
      },
    });
    setEditingReminder(null);
    resetForm();
    setDialogOpen(false);
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">
            Reminders
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Birthdays, appointments, and events · Press{" "}
            <kbd className="px-1 py-0.5 rounded bg-warm-sand/50 text-[10px] font-mono border border-border">
              R
            </kbd>{" "}
            to add
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> New Reminder
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingReminder ? "Edit Reminder" : "New Reminder"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingReminder
                ? "Update the reminder details below"
                : "Add a birthday, appointment, or event to remember"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder="Reminder title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-background"
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-background"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Time{" "}
                  <span className="text-muted-foreground/60 normal-case font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Category
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(CATEGORY_CONFIG) as Reminder["category"][]).map(
                  c => {
                    const cfg = CATEGORY_CONFIG[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all duration-200 flex flex-col items-center gap-1
                        ${category === c ? `${cfg.bg} ${cfg.color} border-current shadow-sm scale-[1.02]` : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                      >
                        <cfg.icon className="w-4 h-4" />
                        {cfg.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Repeats
              </label>
              <div className="grid grid-cols-4 gap-2">
                {RECURRENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrence(opt.value)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all duration-200
                      ${recurrence === opt.value ? "bg-warm-blue-light text-warm-blue border-warm-blue/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={editingReminder ? handleUpdate : handleAdd}
              disabled={!title.trim() || !date}
              className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white"
            >
              {editingReminder ? "Save Changes" : "Add Reminder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick stats */}
      {reminders.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {stats.overdue > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-500 border border-red-200 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {stats.overdue} overdue
            </span>
          )}
          {stats.today > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-warm-amber-light text-warm-amber border border-warm-amber/20 font-medium">
              {stats.today} today
            </span>
          )}
          {stats.upcoming > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-warm-blue-light text-warm-blue border border-warm-blue/20 font-medium">
              {stats.upcoming} upcoming
            </span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-warm-sand/30 rounded-lg p-1 w-fit">
        {[
          { id: "all" as FilterView, label: `All (${reminders.length})` },
          { id: "upcoming" as FilterView, label: "Upcoming" },
          { id: "past" as FilterView, label: "Past" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${filter === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reminder list */}
      {filteredReminders.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-serif text-xl text-foreground mb-2">
            {reminders.length === 0
              ? "No reminders yet"
              : "No matching reminders"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {reminders.length === 0
              ? "Add birthdays, appointments, and events to never forget."
              : "Try a different filter."}
          </p>
          {reminders.length === 0 && (
            <Button
              onClick={openCreateDialog}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Add Your First Reminder
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredReminders.map(reminder => {
              const daysUntil = getDaysUntil(reminder.date);
              const status = getStatusLabel(daysUntil, reminder.acknowledged);
              const cfg = CATEGORY_CONFIG[reminder.category];
              const isOverdue = daysUntil < 0 && !reminder.acknowledged;
              const isToday = daysUntil === 0 && !reminder.acknowledged;

              return (
                <motion.div
                  key={reminder.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`bg-card rounded-xl border p-4 transition-all
                    ${isOverdue ? "border-red-200 bg-red-50/30" : isToday ? "border-warm-amber/30 bg-warm-amber-light/20" : "border-border"}
                    ${reminder.acknowledged ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}
                    >
                      <cfg.icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-medium ${reminder.acknowledged ? "line-through text-muted-foreground" : "text-foreground"}`}
                        >
                          {reminder.title}
                        </h4>
                        <span
                          className={`text-[10px] font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {reminder.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(
                            reminder.date + "T00:00:00"
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {reminder.time && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(reminder.time)}
                          </span>
                        )}
                        {reminder.recurrence !== "none" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-warm-blue-light/50 text-warm-blue">
                            {reminder.recurrence}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditDialog(reminder)}
                        title="Edit reminder"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-warm-blue hover:bg-warm-blue-light transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {!reminder.acknowledged ? (
                        <button
                          onClick={() =>
                            dispatch({
                              type: "ACK_REMINDER",
                              payload: reminder.id,
                            })
                          }
                          title={
                            reminder.recurrence !== "none"
                              ? "Acknowledge & advance to next"
                              : "Acknowledge"
                          }
                          className="p-1.5 rounded-md text-muted-foreground hover:text-warm-sage hover:bg-warm-sage-light transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            dispatch({
                              type: "UNACK_REMINDER",
                              payload: reminder.id,
                            })
                          }
                          title="Undo acknowledge"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-warm-amber hover:bg-warm-amber-light transition-colors"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          dispatch({
                            type: "DELETE_REMINDER",
                            payload: reminder.id,
                          })
                        }
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
