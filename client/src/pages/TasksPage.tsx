/**
 * Tasks Page — Warm Productivity design
 * Task list with search, filters, sorting, add/edit/delete
 * Category, Energy, Recurrence, button-group Priority
 * Inline edit on task cards with pencil icon
 * Drag-and-drop reordering via dnd-kit
 * V1.2: Subtasks with progress bars, inline add/toggle/delete
 * Keyboard shortcuts: N=new task, /=focus search
 */
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  Plus,
  Trash2,
  Calendar,
  Flag,
  ArrowUpDown,
  Check,
  Pencil,
  X,
  Save,
  Search,
  Repeat,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Bell,
  Cake,
  Star,
  Eye,
  EyeOff,
  Clock,
  Pin,
  Sparkles,
} from "lucide-react";
import type { Reminder } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  Task,
  Priority,
  Category,
  EnergyLevel,
  RecurrenceFrequency,
  Subtask,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CATEGORY_CONFIG,
  ENERGY_CONFIG,
  RECURRENCE_CONFIG,
  REMINDER_CATEGORIES,
  REMINDER_RECURRENCE,
  formatEstimatedTime,
} from "@/lib/constants";
import { filterTasksByContext } from "@/lib/contextFilter";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { fireConfetti, getMilestoneMessage } from "@/components/Confetti";

interface TasksPageProps {
  newTaskTrigger?: number;
  searchTrigger?: number;
  reminderTrigger?: number;
}

type Filter = "all" | "active" | "monitored" | "done";
type Sort = "newest" | "priority" | "dueDate" | "manual";

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const EMPTY_TASKS_IMG = "/images/empty-tasks.webp";

// ---- Subtask Progress Bar ----
function SubtaskProgress({ subtasks }: { subtasks: Subtask[] }) {
  if (!subtasks || subtasks.length === 0) return null;
  const done = subtasks.filter(s => s.done).length;
  const total = subtasks.length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-warm-sand/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-warm-sage rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
        {done}/{total}
      </span>
    </div>
  );
}

// ---- Inline Subtask List ----
function SubtaskList({
  task,
  dispatch,
}: {
  task: Task;
  dispatch: (action: any) => void;
}) {
  const [newSubtask, setNewSubtask] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!newSubtask.trim()) return;
    dispatch({
      type: "ADD_SUBTASK",
      payload: { taskId: task.id, title: newSubtask.trim() },
    });
    setNewSubtask("");
    inputRef.current?.focus();
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/15 dark:border-white/10 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <ListChecks className="w-3.5 h-3.5 text-warm-sage" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Subtasks
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {(task.subtasks || []).map(sub => (
          <motion.div
            key={sub.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 group/sub"
          >
            <button
              onClick={() =>
                dispatch({
                  type: "TOGGLE_SUBTASK",
                  payload: { taskId: task.id, subtaskId: sub.id },
                })
              }
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                ${sub.done ? "bg-warm-sage border-warm-sage" : "border-border hover:border-warm-sage"}`}
            >
              {sub.done && <Check className="w-3 h-3 text-white" />}
            </button>
            {editingId === sub.id ? (
              <div className="flex-1 flex gap-1">
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      if (!editTitle.trim()) return;
                      dispatch({
                        type: "UPDATE_SUBTASK",
                        payload: {
                          taskId: task.id,
                          subtaskId: sub.id,
                          title: editTitle.trim(),
                        },
                      });
                      setEditingId(null);
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-7 text-xs bg-background"
                  autoFocus
                />
              </div>
            ) : (
              <span
                className={`flex-1 text-xs ${sub.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                onDoubleClick={() => {
                  setEditingId(sub.id);
                  setEditTitle(sub.title);
                }}
              >
                {sub.title}
              </span>
            )}
            {editingId !== sub.id && (
              <button
                onClick={() => {
                  setEditingId(sub.id);
                  setEditTitle(sub.title);
                }}
                className="p-1 rounded text-muted-foreground/40 hover:text-warm-blue hover:bg-warm-blue-light/50 transition-colors opacity-0 group-hover/sub:opacity-100 group-focus-within/sub:opacity-100 hover-action"
                title="Edit subtask"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() =>
                dispatch({
                  type: "DELETE_SUBTASK",
                  payload: { taskId: task.id, subtaskId: sub.id },
                })
              }
              className="p-1 rounded text-muted-foreground/40 hover:text-warm-terracotta opacity-0 group-hover/sub:opacity-100 group-focus-within/sub:opacity-100 hover-action transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="flex gap-1.5 mt-1">
        <Input
          ref={inputRef}
          value={newSubtask}
          onChange={e => setNewSubtask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Add subtask..."
          className="h-7 text-xs bg-background flex-1"
        />
        <Button
          onClick={handleAdd}
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-warm-sage hover:bg-warm-sage-light"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---- Inline Edit Form ----
function InlineEditForm({
  task,
  onSave,
  onCancel,
}: {
  task: Task;
  onSave: (updates: Partial<Task>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [category, setCategory] = useState<Category | "">(task.category || "");
  const [energy, setEnergy] = useState<EnergyLevel | "">(task.energy || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(
    task.recurrence || "none"
  );

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: desc.trim() || undefined,
      priority,
      category: category || undefined,
      energy: energy || undefined,
      dueDate: dueDate || undefined,
      recurrence: recurrence !== "none" ? recurrence : undefined,
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/15 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div>
        <label
          htmlFor="task-edit-title"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
        >
          Title
        </label>
        <Input
          id="task-edit-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="bg-background"
        />
      </div>
      <div>
        <label
          htmlFor="task-edit-description"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
        >
          Description (optional)
        </label>
        <Textarea
          id="task-edit-description"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Add more details..."
          className="bg-background resize-none"
          rows={2}
        />
      </div>
      <div>
        <label
          id="task-edit-priority-label"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
        >
          Priority
        </label>
        <div
          className="grid grid-cols-4 gap-2"
          role="radiogroup"
          aria-labelledby="task-edit-priority-label"
        >
          {(["low", "medium", "high", "urgent"] as Priority[]).map(p => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={priority === p}
              onClick={() => setPriority(p)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200
                ${priority === p ? `${PRIORITY_COLORS[p]} border-current shadow-sm scale-[1.02]` : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label
          id="task-edit-category-label"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
        >
          Category
        </label>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-labelledby="task-edit-category-label"
        >
          {(Object.keys(CATEGORY_CONFIG) as Category[]).map(c => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? "" : c)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200 flex items-center gap-1.5
                ${category === c ? "bg-warm-sage-light text-warm-sage border-warm-sage/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
            >
              <span>{CATEGORY_CONFIG[c].emoji}</span>
              <span>{CATEGORY_CONFIG[c].label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label
          id="task-edit-energy-label"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
        >
          Energy Level
        </label>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-labelledby="task-edit-energy-label"
        >
          {(Object.keys(ENERGY_CONFIG) as EnergyLevel[]).map(e => (
            <button
              key={e}
              type="button"
              aria-pressed={energy === e}
              onClick={() => setEnergy(energy === e ? "" : e)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200 flex items-center gap-1.5
                ${energy === e ? "bg-warm-amber-light text-warm-amber border-warm-amber/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
            >
              <span>{ENERGY_CONFIG[e].emoji}</span>
              <span>{ENERGY_CONFIG[e].label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label
          id="task-edit-recurrence-label"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
        >
          Repeat
        </label>
        <div
          className="grid grid-cols-5 gap-2"
          role="radiogroup"
          aria-labelledby="task-edit-recurrence-label"
        >
          {(Object.keys(RECURRENCE_CONFIG) as RecurrenceFrequency[]).map(r => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={recurrence === r}
              onClick={() => setRecurrence(r)}
              className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200
                ${recurrence === r ? "bg-warm-blue-light text-warm-blue border-warm-blue/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
            >
              {RECURRENCE_CONFIG[r].label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label
          htmlFor="task-edit-due-date"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
        >
          Due Date (optional)
        </label>
        <Input
          id="task-edit-due-date"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="bg-background"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          className="flex-1 bg-warm-sage hover:bg-warm-sage/90 text-white gap-2"
        >
          <Save className="w-4 h-4" /> Save Changes
        </Button>
        <Button onClick={onCancel} variant="outline" className="gap-2">
          <X className="w-4 h-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ---- Format estimated minutes helper ----
// ---- Sortable Task Card ----
function SortableTaskCard({
  task,
  index,
  editingId,
  setEditingId,
  dispatch,
  handleInlineSave,
  isDragDisabled,
  selectionMode,
  selected,
  onToggleSelect,
  onTaskComplete,
}: {
  task: Task;
  index: number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  dispatch: (action: any) => void;
  handleInlineSave: (taskId: string, updates: Partial<Task>) => void;
  isDragDisabled: boolean;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onTaskComplete: (taskId: string) => void;
}) {
  const { ref, isDragSource } = useSortable({
    id: task.id,
    index,
    disabled: isDragDisabled,
  });
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      role="listitem"
      aria-roledescription="sortable"
      aria-label={`Task: ${task.title}`}
      className={`group backdrop-blur-xl bg-white/60 dark:bg-[oklch(0.22_0.02_155)] rounded-2xl border p-4 transition-[opacity,transform,box-shadow] duration-150 shadow-card hover:shadow-card-hover hover:bg-white/70 dark:hover:bg-[oklch(0.25_0.025_155)]
        ${task.status === "done" ? "opacity-60 border-white/15 dark:border-white/10" : ""}
        ${task.status === "monitored" ? "opacity-75 border-dashed border-warm-amber/40 bg-warm-amber-light/20" : "border-white/30 dark:border-white/10"}
        ${task.status === "active" ? "border-white/30 dark:border-white/10" : ""}
        ${editingId === task.id ? "ring-2 ring-warm-sage/30 shadow-card-hover" : ""}
        ${isDragSource ? "opacity-60 scale-[1.02] shadow-card-active ring-2 ring-warm-sage/30 z-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Selection indicator */}
        {selectionMode && (
          <button
            role="checkbox"
            aria-checked={selected}
            onClick={e => {
              e.stopPropagation();
              onToggleSelect(task.id);
            }}
            className="mt-0.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-sage/50 rounded-full"
            aria-label={`Select task: ${task.title}`}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                selected
                  ? "bg-warm-sage border-warm-sage text-white"
                  : "border-muted-foreground/30 hover:border-warm-sage/60"
              )}
            >
              {selected && <Check className="w-3 h-3" />}
            </div>
          </button>
        )}

        {/* Drag handle */}
        {!isDragDisabled && !selectionMode && (
          <div
            aria-hidden="true"
            className="mt-0.5 p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Checkbox */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={() => {
            dispatch({ type: "TOGGLE_TASK", payload: task.id });
            if (task.status !== "done") {
              toast.success("Task completed");
              onTaskComplete(task.id);
            }
          }}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
            ${task.status === "done" ? "bg-warm-sage border-warm-sage" : ""}
            ${task.status === "monitored" ? "bg-warm-amber/20 border-warm-amber/50" : ""}
            ${task.status === "active" ? "border-border hover:border-warm-sage" : ""}`}
        >
          <AnimatePresence>
            {task.status === "done" && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.span>
            )}
          </AnimatePresence>
          {task.status === "monitored" && (
            <Eye className="w-3 h-3 text-warm-amber" />
          )}
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : task.status === "monitored" ? "text-muted-foreground" : "text-foreground"}`}
            >
              {task.title}
            </p>
            {task.status === "monitored" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-amber/15 text-warm-amber border border-warm-amber/20 flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" /> Monitoring
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {task.description}
            </p>
          )}
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warm-sage-light/60 text-warm-charcoal border border-warm-sage/15">
                {CATEGORY_CONFIG[task.category].emoji}{" "}
                {CATEGORY_CONFIG[task.category].label}
              </span>
            )}
            {task.energy && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warm-amber-light/60 text-warm-charcoal border border-warm-amber/15">
                {ENERGY_CONFIG[task.energy].emoji}{" "}
                {ENERGY_CONFIG[task.energy].label}
              </span>
            )}
            {task.recurrence && task.recurrence !== "none" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warm-blue-light/60 text-warm-charcoal border border-warm-blue/15 flex items-center gap-1">
                <Repeat className="w-3 h-3" />{" "}
                {RECURRENCE_CONFIG[task.recurrence].short}
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {task.estimatedMinutes && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatEstimatedTime(task.estimatedMinutes)}
              </span>
            )}
          </div>
          {/* Subtask progress bar (always visible if subtasks exist) */}
          {hasSubtasks && <SubtaskProgress subtasks={task.subtasks!} />}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          {/* Always-visible primary actions */}
          <button
            onClick={() => {
              dispatch({ type: "TOGGLE_TASK", payload: task.id });
              if (task.status !== "done") {
                toast.success("Task completed");
                onTaskComplete(task.id);
              }
            }}
            className="p-1.5 rounded-md text-muted-foreground/50 hover:text-warm-sage hover:bg-warm-sage-light transition-colors"
            title={task.status === "done" ? "Reopen task" : "Mark as done"}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditingId(editingId === task.id ? null : task.id)}
            className={`p-1.5 rounded-md transition-colors ${
              editingId === task.id
                ? "text-warm-sage bg-warm-sage-light"
                : "text-muted-foreground/50 hover:text-warm-blue hover:bg-warm-blue-light"
            }`}
            title="Edit task"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {/* Hover-revealed secondary actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover-action transition-opacity">
            <button
              onClick={() => setSubtasksOpen(!subtasksOpen)}
              className={`p-1.5 rounded-md transition-colors ${
                subtasksOpen
                  ? "text-warm-sage bg-warm-sage-light"
                  : "text-muted-foreground hover:text-warm-sage hover:bg-warm-sage-light"
              }`}
              title="Subtasks"
            >
              <ListChecks className="w-4 h-4" />
            </button>
            {task.status !== "done" && (
              <button
                onClick={() =>
                  dispatch({ type: "TOGGLE_MONITOR", payload: task.id })
                }
                className={`p-1.5 rounded-md transition-colors ${
                  task.status === "monitored"
                    ? "text-warm-amber bg-warm-amber-light"
                    : "text-muted-foreground hover:text-warm-amber hover:bg-warm-amber-light"
                }`}
                title={
                  task.status === "monitored"
                    ? "Reactivate task"
                    : "Monitor task (waiting)"
                }
              >
                {task.status === "monitored" ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={() => {
                dispatch({ type: "DELETE_TASK", payload: task.id });
                toast("Task deleted", {
                  action: {
                    label: "Undo",
                    onClick: () => dispatch({ type: "UNDO" }),
                  },
                });
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-warm-terracotta hover:bg-warm-terracotta-light transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtask list (expandable) */}
      <AnimatePresence>
        {subtasksOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SubtaskList task={task} dispatch={dispatch} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Edit Form */}
      {editingId === task.id && (
        <InlineEditForm
          task={task}
          onSave={updates => handleInlineSave(task.id, updates)}
          onCancel={() => setEditingId(null)}
        />
      )}
    </motion.div>
  );
}

// ---- Main Page ----
export default function TasksPage({
  newTaskTrigger = 0,
  searchTrigger = 0,
  reminderTrigger = 0,
}: TasksPageProps) {
  const { state, dispatch } = useApp();
  const activeContext = state.preferences?.activeContext || "all";
  const [filter, setFilter] = useState<Filter>("active");
  const [sort, setSort] = useState<Sort>("priority");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const defaultCategory: Category | "" =
    activeContext === "work" || activeContext === "personal"
      ? activeContext
      : "";
  const [newCategory, setNewCategory] = useState<Category | "">(
    defaultCategory
  );
  useEffect(() => {
    setNewCategory(defaultCategory);
  }, [defaultCategory]);
  const [newEnergy, setNewEnergy] = useState<EnergyLevel | "">("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newRecurrence, setNewRecurrence] =
    useState<RecurrenceFrequency>("none");
  const [newQuarterlyDay, setNewQuarterlyDay] = useState(16);
  const [newQuarterlyStartMonth, setNewQuarterlyStartMonth] = useState(2); // Feb
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState<number | "">(
    ""
  );

  // Keyboard shortcut triggers — skip initial mount to prevent auto-open on navigate
  const prevNewTaskTrigger = useRef(newTaskTrigger);
  const prevSearchTrigger = useRef(searchTrigger);
  useEffect(() => {
    if (newTaskTrigger !== prevNewTaskTrigger.current) {
      prevNewTaskTrigger.current = newTaskTrigger;
      if (newTaskTrigger > 0) setDialogOpen(true);
    }
  }, [newTaskTrigger]);

  useEffect(() => {
    if (searchTrigger !== prevSearchTrigger.current) {
      prevSearchTrigger.current = searchTrigger;
      if (searchTrigger > 0) searchInputRef.current?.focus();
    }
  }, [searchTrigger]);

  // Reminder dialog state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remDescription, setRemDescription] = useState("");
  const [remDate, setRemDate] = useState("");
  const [remTime, setRemTime] = useState("");
  const [remRecurrence, setRemRecurrence] =
    useState<Reminder["recurrence"]>("none");
  const [remCategory, setRemCategory] = useState<Reminder["category"]>("other");

  // Keyboard shortcut: R opens reminder dialog — skip initial mount
  const prevReminderTrigger = useRef(reminderTrigger);
  useEffect(() => {
    if (reminderTrigger !== prevReminderTrigger.current) {
      prevReminderTrigger.current = reminderTrigger;
      if (reminderTrigger > 0) {
        setRemTitle("");
        setRemDescription("");
        setRemDate("");
        setRemTime("");
        setRemRecurrence("none");
        setRemCategory("other");
        setReminderDialogOpen(true);
      }
    }
  }, [reminderTrigger]);

  // Escape key exits selection mode
  useEffect(() => {
    if (!selectionMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectionMode(false);
        setSelectedIds(new Set());
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectionMode]);

  function handleToggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkAction(
    type: "BULK_COMPLETE_TASKS" | "BULK_DELETE_TASKS" | "BULK_PIN_TODAY",
    payload?: any
  ) {
    const count = selectedIds.size;
    dispatch({ type, payload: payload ?? Array.from(selectedIds) });
    if (type === "BULK_COMPLETE_TASKS") {
      toast.success(`${count} tasks completed`);
      fireConfetti();
    } else if (type === "BULK_DELETE_TASKS") {
      toast(`${count} tasks deleted`, {
        action: { label: "Undo", onClick: () => dispatch({ type: "UNDO" }) },
      });
    } else if (type === "BULK_PIN_TODAY") {
      toast.success(`${count} tasks pinned to today`);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
  }

  function handleAddReminder() {
    if (!remTitle.trim() || !remDate) return;
    dispatch({
      type: "ADD_REMINDER",
      payload: {
        title: remTitle.trim(),
        description: remDescription.trim() || undefined,
        date: remDate,
        time: remTime || undefined,
        recurrence: remRecurrence,
        category: remCategory,
      },
    });
    setRemTitle("");
    setRemDescription("");
    setRemDate("");
    setRemTime("");
    setRemRecurrence("none");
    setRemCategory("other");
    setReminderDialogOpen(false);
  }

  const isDragDisabled = sort !== "manual" || !!searchQuery.trim();

  const filteredTasks = useMemo(() => {
    let tasks = filterTasksByContext([...state.tasks], activeContext);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (filter === "active") tasks = tasks.filter(t => t.status === "active");
    if (filter === "monitored")
      tasks = tasks.filter(t => t.status === "monitored");
    if (filter === "done") tasks = tasks.filter(t => t.status === "done");

    if (sort === "newest")
      tasks.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    if (sort === "priority")
      tasks.sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      );
    if (sort === "dueDate")
      tasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    return tasks;
  }, [state.tasks, filter, sort, searchQuery, activeContext]);

  const contextTasks = useMemo(
    () => filterTasksByContext(state.tasks, activeContext),
    [state.tasks, activeContext]
  );

  const counts = useMemo(
    () => ({
      all: contextTasks.length,
      active: contextTasks.filter(t => t.status === "active").length,
      monitored: contextTasks.filter(t => t.status === "monitored").length,
      done: contextTasks.filter(t => t.status === "done").length,
    }),
    [contextTasks]
  );

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return contextTasks.filter(
      t => t.status === "active" && (!t.dueDate || t.dueDate <= today)
    ).length;
  }, [contextTasks]);

  // Milestone celebration state
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);
  const milestoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTaskComplete = useCallback(() => {
    fireConfetti();
    // Count tasks completed today (including the one just toggled)
    const today = new Date().toISOString().split("T")[0];
    const completedToday =
      state.tasks.filter(
        t => t.status === "done" && t.completedAt?.startsWith(today)
      ).length + 1; // +1 because state hasn't updated yet
    const msg = getMilestoneMessage(completedToday);
    if (msg) {
      setMilestoneMsg(msg);
      if (milestoneTimer.current) clearTimeout(milestoneTimer.current);
      milestoneTimer.current = setTimeout(() => setMilestoneMsg(null), 3000);
    }
  }, [state.tasks]);

  // Cleanup milestone timer on unmount
  useEffect(() => {
    return () => {
      if (milestoneTimer.current) clearTimeout(milestoneTimer.current);
    };
  }, []);

  function handleAddTask() {
    if (!newTitle.trim()) return;
    dispatch({
      type: "ADD_TASK",
      payload: {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        category: newCategory || undefined,
        energy: newEnergy || undefined,
        recurrence: newRecurrence !== "none" ? newRecurrence : undefined,
        recurrenceDayOfMonth:
          newRecurrence === "quarterly" ? newQuarterlyDay : undefined,
        recurrenceStartMonth:
          newRecurrence === "quarterly" ? newQuarterlyStartMonth : undefined,
        subtasks:
          newSubtasks.length > 0
            ? newSubtasks.map(s => ({ title: s }))
            : undefined,
        estimatedMinutes: newEstimatedMinutes || undefined,
      },
    });
    toast.success("Task created");
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setNewCategory(defaultCategory);
    setNewEnergy("");
    setNewDueDate("");
    setNewRecurrence("none");
    setNewQuarterlyDay(16);
    setNewQuarterlyStartMonth(2);
    setNewSubtasks([]);
    setNewSubtaskInput("");
    setNewEstimatedMinutes("");
    setDialogOpen(false);
  }

  function handleInlineSave(taskId: string, updates: Partial<Task>) {
    dispatch({ type: "UPDATE_TASK", payload: { id: taskId, ...updates } });
    setEditingId(null);
  }

  function handleDragEnd(event: any) {
    const { source, target } = event.operation;
    if (!source || !target || source.id === target.id) return;

    const oldIndex = filteredTasks.findIndex(t => t.id === source.id);
    const newIndex = filteredTasks.findIndex(t => t.id === target.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...filteredTasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    dispatch({ type: "REORDER_TASKS", payload: reordered.map(t => t.id) });
  }

  function addNewSubtask() {
    if (!newSubtaskInput.trim()) return;
    setNewSubtasks([...newSubtasks, newSubtaskInput.trim()]);
    setNewSubtaskInput("");
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">
            My Tasks
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {todayCount} task{todayCount !== 1 ? "s" : ""} to tackle today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSelectionMode(m => !m);
              if (selectionMode) setSelectedIds(new Set());
            }}
            variant={selectionMode ? "default" : "outline"}
            className={cn(
              "gap-1.5",
              selectionMode
                ? "bg-warm-blue text-white hover:bg-warm-blue/90 border-warm-blue shadow-md"
                : "border-border text-muted-foreground hover:text-foreground hover:border-warm-blue/40"
            )}
          >
            <ListChecks className="w-4 h-4" />
            {selectionMode ? "Cancel" : "Select"}
          </Button>
          <Button
            onClick={() => setReminderDialogOpen(true)}
            variant="outline"
            className="gap-2 border-warm-amber/30 text-warm-amber hover:bg-warm-amber-light"
          >
            <Bell className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">Reminder</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-2">
                <Plus className="w-4 h-4" />{" "}
                <span className="hidden sm:inline">Add Task</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-semibold text-xl">
                  New Task
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Create a new task
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 mt-2">
                <div>
                  <label
                    htmlFor="tasks-new-title"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
                  >
                    Title
                  </label>
                  <Input
                    id="tasks-new-title"
                    placeholder="e.g., Finish the report..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddTask()}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tasks-new-description"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
                  >
                    Description (optional)
                  </label>
                  <Textarea
                    id="tasks-new-description"
                    placeholder="Add more details..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="bg-background resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label
                    id="tasks-new-priority-label"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
                  >
                    Priority
                  </label>
                  <div
                    className="grid grid-cols-4 gap-2"
                    role="radiogroup"
                    aria-labelledby="tasks-new-priority-label"
                  >
                    {(["low", "medium", "high", "urgent"] as Priority[]).map(
                      p => (
                        <button
                          key={p}
                          type="button"
                          role="radio"
                          aria-checked={newPriority === p}
                          onClick={() => setNewPriority(p)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200
                        ${newPriority === p ? `${PRIORITY_COLORS[p]} border-current shadow-sm scale-[1.02]` : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                        >
                          {PRIORITY_LABELS[p]}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <label
                    id="tasks-new-category-label"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
                  >
                    Category
                  </label>
                  <div
                    className="grid grid-cols-3 gap-2"
                    role="group"
                    aria-labelledby="tasks-new-category-label"
                  >
                    {(Object.keys(CATEGORY_CONFIG) as Category[]).map(c => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={newCategory === c}
                        onClick={() =>
                          setNewCategory(newCategory === c ? "" : c)
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200 flex items-center gap-1.5
                        ${newCategory === c ? "bg-warm-sage-light text-warm-sage border-warm-sage/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                      >
                        <span>{CATEGORY_CONFIG[c].emoji}</span>
                        <span>{CATEGORY_CONFIG[c].label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    id="tasks-new-energy-label"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
                  >
                    Energy Level
                  </label>
                  <div
                    className="grid grid-cols-3 gap-2"
                    role="group"
                    aria-labelledby="tasks-new-energy-label"
                  >
                    {(Object.keys(ENERGY_CONFIG) as EnergyLevel[]).map(e => (
                      <button
                        key={e}
                        type="button"
                        aria-pressed={newEnergy === e}
                        onClick={() => setNewEnergy(newEnergy === e ? "" : e)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200 flex items-center gap-1.5
                        ${newEnergy === e ? "bg-warm-amber-light text-warm-amber border-warm-amber/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                      >
                        <span>{ENERGY_CONFIG[e].emoji}</span>
                        <span>{ENERGY_CONFIG[e].label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    id="tasks-new-recurrence-label"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
                  >
                    Repeat
                  </label>
                  <div
                    className="grid grid-cols-3 sm:grid-cols-6 gap-2"
                    role="radiogroup"
                    aria-labelledby="tasks-new-recurrence-label"
                  >
                    {(
                      Object.keys(RECURRENCE_CONFIG) as RecurrenceFrequency[]
                    ).map(r => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={newRecurrence === r}
                        onClick={() => setNewRecurrence(r)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200
                        ${newRecurrence === r ? "bg-warm-blue-light text-warm-blue border-warm-blue/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                      >
                        {RECURRENCE_CONFIG[r].label}
                      </button>
                    ))}
                  </div>
                  {newRecurrence === "quarterly" && (
                    <div className="mt-3 p-3 bg-warm-blue-light/30 rounded-lg border border-warm-blue/20 space-y-2">
                      <p className="text-xs text-warm-blue font-medium">
                        Quarterly schedule: repeats every 3 months
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label
                            htmlFor="tasks-new-quarterly-day"
                            className="text-[10px] text-muted-foreground mb-0.5 block"
                          >
                            Day of month
                          </label>
                          <Input
                            id="tasks-new-quarterly-day"
                            type="number"
                            min={1}
                            max={28}
                            value={newQuarterlyDay}
                            onChange={e => {
                              const n = parseInt(e.target.value, 10);
                              setNewQuarterlyDay(isNaN(n) ? 16 : n);
                            }}
                            className="bg-background h-8 text-xs"
                          />
                        </div>
                        <div className="flex-1">
                          <label
                            htmlFor="tasks-new-quarterly-month"
                            className="text-[10px] text-muted-foreground mb-0.5 block"
                          >
                            Starting month
                          </label>
                          <select
                            id="tasks-new-quarterly-month"
                            value={newQuarterlyStartMonth}
                            onChange={e =>
                              setNewQuarterlyStartMonth(
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full h-8 rounded-md border border-border bg-background text-xs px-2"
                          >
                            {[
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sep",
                              "Oct",
                              "Nov",
                              "Dec",
                            ].map((m, i) => (
                              <option key={i} value={i + 1}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Runs on the {newQuarterlyDay}th of{" "}
                        {
                          [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ][newQuarterlyStartMonth - 1]
                        }
                        ,{" "}
                        {
                          [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ][(newQuarterlyStartMonth + 2) % 12]
                        }
                        ,{" "}
                        {
                          [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ][(newQuarterlyStartMonth + 5) % 12]
                        }
                        ,{" "}
                        {
                          [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ][(newQuarterlyStartMonth + 8) % 12]
                        }
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label
                    id="tasks-new-estimated-time-label"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
                  >
                    Estimated Time
                  </label>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-labelledby="tasks-new-estimated-time-label"
                  >
                    {[15, 30, 60, 120, 240].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        aria-pressed={newEstimatedMinutes === mins}
                        onClick={() =>
                          setNewEstimatedMinutes(
                            newEstimatedMinutes === mins ? "" : mins
                          )
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200
                          ${
                            newEstimatedMinutes === mins
                              ? "bg-warm-blue-light border-warm-blue text-warm-blue shadow-sm scale-[1.02]"
                              : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"
                          }`}
                      >
                        {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="tasks-new-due-date"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
                  >
                    Due Date (optional)
                  </label>
                  <Input
                    id="tasks-new-due-date"
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="bg-background"
                  />
                </div>
                {/* Subtasks section in new task dialog */}
                <div>
                  <label
                    htmlFor="tasks-new-subtask-input"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
                  >
                    Subtasks (optional)
                  </label>
                  {newSubtasks.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                      <div className="w-4 h-4 rounded border-2 border-border shrink-0" />
                      <span className="text-sm flex-1">{s}</span>
                      <button
                        onClick={() =>
                          setNewSubtasks(newSubtasks.filter((_, j) => j !== i))
                        }
                        className="p-0.5 text-muted-foreground hover:text-warm-terracotta"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1.5">
                    <Input
                      id="tasks-new-subtask-input"
                      value={newSubtaskInput}
                      onChange={e => setNewSubtaskInput(e.target.value)}
                      onKeyDown={e =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addNewSubtask())
                      }
                      placeholder="Add a subtask..."
                      className="bg-background text-sm"
                    />
                    <Button
                      onClick={addNewSubtask}
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleAddTask}
                  className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white font-medium py-2.5"
                >
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold text-xl">
              New Reminder
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Add a birthday, appointment, or event to remember
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label htmlFor="tasks-rem-title" className="sr-only">
                Reminder title
              </label>
              <Input
                id="tasks-rem-title"
                placeholder="Reminder title..."
                value={remTitle}
                onChange={e => setRemTitle(e.target.value)}
                className="bg-background"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="tasks-rem-description" className="sr-only">
                Description
              </label>
              <Input
                id="tasks-rem-description"
                placeholder="Description (optional)"
                value={remDescription}
                onChange={e => setRemDescription(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tasks-rem-date"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
                >
                  Date
                </label>
                <Input
                  id="tasks-rem-date"
                  type="date"
                  value={remDate}
                  onChange={e => setRemDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div>
                <label
                  htmlFor="tasks-rem-time"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
                >
                  Time{" "}
                  <span className="text-muted-foreground/60 normal-case font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  id="tasks-rem-time"
                  type="time"
                  value={remTime}
                  onChange={e => setRemTime(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
            <div>
              <label
                id="tasks-rem-category-label"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
              >
                Category
              </label>
              <div
                className="grid grid-cols-4 gap-2"
                role="radiogroup"
                aria-labelledby="tasks-rem-category-label"
              >
                {(
                  Object.keys(REMINDER_CATEGORIES) as Reminder["category"][]
                ).map(c => {
                  const cfg = REMINDER_CATEGORIES[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={remCategory === c}
                      onClick={() => setRemCategory(c)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200 flex flex-col items-center gap-1
                        ${remCategory === c ? `${cfg.bg} ${cfg.color} border-current shadow-sm scale-[1.02]` : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                    >
                      <cfg.icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label
                id="tasks-rem-recurrence-label"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
              >
                Repeats
              </label>
              <div
                className="grid grid-cols-4 gap-2"
                role="radiogroup"
                aria-labelledby="tasks-rem-recurrence-label"
              >
                {REMINDER_RECURRENCE.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={remRecurrence === opt.value}
                    onClick={() => setRemRecurrence(opt.value)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-[color,background-color,border-color,box-shadow,transform] duration-200
                      ${remRecurrence === opt.value ? "bg-warm-blue-light text-warm-blue border-warm-blue/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleAddReminder}
              disabled={!remTitle.trim() || !remDate}
              className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white"
            >
              Add Reminder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Milestone celebration banner */}
      <AnimatePresence>
        {milestoneMsg && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 backdrop-blur-sm bg-warm-sage/90 dark:bg-warm-sage/80 text-white shadow-lg border border-warm-sage/30"
            role="status"
            aria-live="polite"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{milestoneMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex gap-1.5">
          {(["all", "active", "monitored", "done"] as Filter[]).map(f => {
            const labels: Record<Filter, string> = {
              all: "All",
              active: "Open",
              monitored: "Monitored",
              done: "Done",
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-200 border
                  ${filter === f ? "bg-warm-sage/15 text-foreground border-warm-sage/30 backdrop-blur-md shadow-md" : "text-muted-foreground hover:text-foreground border-transparent hover:border-white/15 dark:hover:border-white/10 hover:bg-warm-sand/30"}`}
              >
                {labels[f]} ({counts[f]})
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5 sm:ml-auto flex-wrap">
          {(["manual", "newest", "priority", "dueDate"] as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-200 flex items-center gap-1.5 border
                ${sort === s ? "bg-warm-blue/10 text-foreground border-warm-blue/25 shadow-sm" : "text-muted-foreground hover:text-foreground border-transparent hover:border-white/15 dark:hover:border-white/10 hover:bg-warm-sand/30"}`}
            >
              {s === "manual" && <GripVertical className="w-3.5 h-3.5" />}
              {s === "newest" && <ArrowUpDown className="w-3.5 h-3.5" />}
              {s === "priority" && <Flag className="w-3.5 h-3.5" />}
              {s === "dueDate" && <Calendar className="w-3.5 h-3.5" />}
              {s === "manual"
                ? "Manual"
                : s === "newest"
                  ? "Newest"
                  : s === "priority"
                    ? "Priority"
                    : "Due Date"}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="glass rounded-2xl p-12 lg:p-16 text-center">
          {searchQuery ? (
            <>
              <Search className="w-16 h-16 mx-auto mb-6 text-muted-foreground/30" />
              <h3 className="font-semibold text-xl text-foreground mb-2">
                No matches
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                No tasks match "{searchQuery}". Try a different search.
              </p>
            </>
          ) : (
            <>
              <img
                src={EMPTY_TASKS_IMG}
                alt="All clear"
                loading="lazy"
                className="w-48 h-48 mx-auto mb-6 rounded-2xl object-cover opacity-80"
              />
              <h3 className="font-semibold text-xl text-foreground mb-2">
                All clear!
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Add a task to get started. You got this!
              </p>
            </>
          )}
        </div>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div
            className="space-y-2"
            role="list"
            aria-label="Sortable task list"
          >
            {sort === "manual" && !searchQuery && (
              <p className="text-xs text-muted-foreground/60 mb-2 flex items-center gap-1.5">
                <GripVertical className="w-3.5 h-3.5" /> Drag tasks to reorder
              </p>
            )}
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task, idx) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  index={idx}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  dispatch={dispatch}
                  handleInlineSave={handleInlineSave}
                  isDragDisabled={isDragDisabled || selectionMode}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(task.id)}
                  onToggleSelect={handleToggleSelect}
                  onTaskComplete={handleTaskComplete}
                />
              ))}
            </AnimatePresence>
          </div>
        </DragDropProvider>
      )}

      {/* Bulk action floating bar */}
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 glass-heavy border rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3 z-50"
            role="toolbar"
            aria-label={`Bulk actions for ${selectedIds.size} selected tasks`}
          >
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground whitespace-nowrap">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warm-sage text-white text-xs font-bold">
                {selectedIds.size}
              </span>
              selected
            </span>
            <div className="h-5 w-px bg-border" />
            <button
              onClick={() =>
                setSelectedIds(new Set(filteredTasks.map(t => t.id)))
              }
              className="text-xs text-warm-blue hover:underline whitespace-nowrap"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground hover:underline whitespace-nowrap"
            >
              Deselect All
            </button>
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-warm-sage hover:bg-warm-sage-light"
              onClick={() => handleBulkAction("BULK_COMPLETE_TASKS")}
              title="Complete selected"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Complete</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-warm-blue hover:bg-warm-blue-light"
              onClick={() => handleBulkAction("BULK_PIN_TODAY")}
              title="Pin to Today"
            >
              <Pin className="w-4 h-4" />
              <span className="hidden sm:inline">Pin Today</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-warm-terracotta hover:bg-warm-terracotta-light"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${selectedIds.size} task${selectedIds.size === 1 ? "" : "s"}? You can undo with Ctrl+Z.`
                  )
                ) {
                  handleBulkAction("BULK_DELETE_TASKS");
                }
              }}
              title="Delete selected"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts hint */}
      <div className="mt-8 text-center keyboard-hint">
        <p className="text-xs text-muted-foreground/60">
          <kbd className="px-1.5 py-0.5 bg-warm-sand/50 rounded text-[10px] font-mono">
            N
          </kbd>{" "}
          new task
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-warm-sand/50 rounded text-[10px] font-mono">
            R
          </kbd>{" "}
          new reminder
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-warm-sand/50 rounded text-[10px] font-mono">
            /
          </kbd>{" "}
          search
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-warm-sand/50 rounded text-[10px] font-mono">
            Ctrl+Z
          </kbd>{" "}
          undo
        </p>
      </div>
    </div>
  );
}
