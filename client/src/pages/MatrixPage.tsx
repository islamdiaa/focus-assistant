/**
 * Eisenhower Matrix Page — Warm Productivity design
 * 4 quadrants with drag-and-drop
 * Side panel for unassigned tasks
 * Inline task editing: click a task to edit title, priority, due date
 * Mobile: stacked layout, unassigned panel below matrix
 * Desktop: side-by-side layout
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { QuadrantType, Priority } from "@/lib/types";
import { filterTasksByContext } from "@/lib/contextFilter";

const EMPTY_MATRIX_IMG = "/images/empty-matrix.webp";

interface QuadrantConfig {
  id: QuadrantType;
  title: string;
  subtitle: string;
  description: string;
  bgClass: string;
  borderClass: string;
  iconBg: string;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    id: "do-first",
    title: "Do First",
    subtitle: "Urgent & Important",
    description: "Crises, deadlines, emergencies",
    bgClass: "bg-warm-terracotta-light",
    borderClass: "border-warm-terracotta/20",
    iconBg: "bg-warm-terracotta/20",
  },
  {
    id: "schedule",
    title: "Schedule",
    subtitle: "Important, Not Urgent",
    description: "Goals, planning, personal growth",
    bgClass: "bg-warm-sage-light",
    borderClass: "border-warm-sage/20",
    iconBg: "bg-warm-sage/20",
  },
  {
    id: "delegate",
    title: "Delegate",
    subtitle: "Urgent, Not Important",
    description: "Interruptions, some meetings",
    bgClass: "bg-warm-amber-light",
    borderClass: "border-warm-amber/20",
    iconBg: "bg-warm-amber/20",
  },
  {
    id: "eliminate",
    title: "Eliminate",
    subtitle: "Not Urgent, Not Important",
    description: "Time-wasters, distractions",
    bgClass: "bg-warm-sand",
    borderClass: "border-border",
    iconBg: "bg-warm-charcoal/10",
  },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  {
    value: "low",
    label: "Low",
    color: "bg-warm-sage-light text-warm-sage border-warm-sage/30",
  },
  {
    value: "medium",
    label: "Med",
    color: "bg-warm-blue-light text-warm-blue border-warm-blue/30",
  },
  {
    value: "high",
    label: "High",
    color: "bg-warm-amber-light text-warm-amber border-warm-amber/30",
  },
  {
    value: "urgent",
    label: "Urgent",
    color: "bg-red-50 text-red-500 border-red-200",
  },
];

function getPriorityBadge(priority: Priority) {
  const opt = PRIORITY_OPTIONS.find(p => p.value === priority);
  if (!opt) return null;
  return (
    <span
      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${opt.color}`}
    >
      {opt.label}
    </span>
  );
}

/** Inline edit form shown when clicking a task in the matrix */
function InlineEditForm({
  taskId,
  initialTitle,
  initialPriority,
  initialDueDate,
  onSave,
  onCancel,
}: {
  taskId: string;
  initialTitle: string;
  initialPriority: Priority;
  initialDueDate: string;
  onSave: (data: {
    id: string;
    title: string;
    priority: Priority;
    dueDate: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [priority, setPriority] = useState<Priority>(initialPriority);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      id: taskId,
      title: title.trim(),
      priority,
      dueDate: dueDate || null,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  }

  return (
    <div
      className="bg-card rounded-xl border border-warm-sage/30 shadow-lg p-3 space-y-2.5 animate-in fade-in-0 zoom-in-95 duration-150"
      onClick={e => e.stopPropagation()}
    >
      <Input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-background text-xs h-8"
        placeholder="Task title..."
      />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground mr-1">
          Priority:
        </span>
        {PRIORITY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPriority(opt.value)}
            className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-all
              ${priority === opt.value ? `${opt.color} scale-105 shadow-sm` : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">
          Due date
        </label>
        <Input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-background text-xs h-8"
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 text-xs gap-1 text-muted-foreground"
        >
          <X className="w-3 h-3" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!title.trim()}
          className="h-7 text-xs gap-1 bg-warm-sage hover:bg-warm-sage/90 text-white"
        >
          <Check className="w-3 h-3" /> Save
        </Button>
      </div>
    </div>
  );
}

export default function MatrixPage() {
  const { state, dispatch } = useApp();
  const [showPanel, setShowPanel] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<QuadrantType | null>(
    null
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const activeContext = state.preferences?.activeContext || "all";
  const activeTasks = filterTasksByContext(state.tasks, activeContext).filter(
    t => t.status === "active"
  );
  const unassigned = useMemo(
    () => activeTasks.filter(t => t.quadrant === "unassigned"),
    [activeTasks]
  );
  const assigned = useMemo(
    () => activeTasks.filter(t => t.quadrant !== "unassigned"),
    [activeTasks]
  );

  function handleDragStart(taskId: string) {
    setDraggingId(taskId);
  }

  function handleDragOver(e: React.DragEvent, quadrant: QuadrantType) {
    e.preventDefault();
    setDragOverQuadrant(quadrant);
  }

  function handleDragLeave() {
    setDragOverQuadrant(null);
  }

  function handleDrop(quadrant: QuadrantType) {
    if (draggingId) {
      dispatch({
        type: "MOVE_TASK_QUADRANT",
        payload: { id: draggingId, quadrant },
      });
    }
    setDraggingId(null);
    setDragOverQuadrant(null);
  }

  function handleDropUnassigned(e: React.DragEvent) {
    e.preventDefault();
    if (draggingId) {
      dispatch({
        type: "MOVE_TASK_QUADRANT",
        payload: { id: draggingId, quadrant: "unassigned" },
      });
    }
    setDraggingId(null);
    setDragOverQuadrant(null);
  }

  // Mobile: tap to assign via select
  function handleMobileAssign(taskId: string, quadrant: QuadrantType) {
    dispatch({ type: "MOVE_TASK_QUADRANT", payload: { id: taskId, quadrant } });
  }

  function handleInlineSave(data: {
    id: string;
    title: string;
    priority: Priority;
    dueDate: string | null;
  }) {
    dispatch({
      type: "UPDATE_TASK",
      payload: {
        id: data.id,
        title: data.title,
        priority: data.priority,
        dueDate: data.dueDate,
      },
    });
    setEditingTaskId(null);
  }

  function renderTaskCard(
    task: (typeof activeTasks)[0],
    showMobileAssign = false
  ) {
    if (editingTaskId === task.id) {
      return (
        <InlineEditForm
          key={task.id}
          taskId={task.id}
          initialTitle={task.title}
          initialPriority={task.priority}
          initialDueDate={task.dueDate || ""}
          onSave={handleInlineSave}
          onCancel={() => setEditingTaskId(null)}
        />
      );
    }

    return (
      <div
        key={task.id}
        draggable
        onDragStart={() => handleDragStart(task.id)}
        className="bg-card/80 rounded-lg px-3 py-2 text-xs font-medium text-foreground flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-card shadow-sm group"
      >
        <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="truncate">{task.title}</span>
          {getPriorityBadge(task.priority)}
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            setEditingTaskId(task.id);
          }}
          title="Edit task"
          className="p-2 rounded text-muted-foreground/40 hover:text-warm-blue hover:bg-warm-blue-light/50 transition-colors opacity-0 group-hover:opacity-100 hover-action"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {showMobileAssign && (
          <select
            className="lg:hidden text-xs bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground"
            value=""
            onChange={e => {
              if (e.target.value)
                handleMobileAssign(task.id, e.target.value as QuadrantType);
            }}
          >
            <option value="">Move to...</option>
            <option value="do-first">Do First</option>
            <option value="schedule">Schedule</option>
            <option value="delegate">Delegate</option>
            <option value="eliminate">Eliminate</option>
            {task.quadrant !== "unassigned" && (
              <option value="unassigned">Unassigned</option>
            )}
          </select>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-serif text-2xl lg:text-3xl text-foreground">
          Eisenhower Matrix
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="hidden lg:inline">
            Drag tasks into quadrants to prioritize
          </span>
          <span className="lg:hidden">Use "Move to..." to organize tasks</span>{" "}
          · Click <Pencil className="w-3 h-3 inline" /> to edit inline
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-warm-sage-light rounded-xl border border-warm-sage/20 p-4 mb-6 flex gap-3">
        <Info className="w-4 h-4 text-warm-sage mt-0.5 shrink-0" />
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>How it works:</strong> Categorize your tasks based on two
          dimensions — <strong>Urgency</strong> (time-sensitive) and{" "}
          <strong>Importance</strong> (contributes to long-term goals). Focus on
          Q1 first, then invest time in Q2 to prevent future crises.
        </p>
      </div>

      {/* Counts */}
      <div className="flex gap-3 mb-6">
        <span className="text-xs px-3 py-1 rounded-full bg-warm-sage-light text-warm-sage border border-warm-sage/20 font-medium">
          {assigned.length} assigned
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-warm-sand text-muted-foreground border border-border font-medium">
          {unassigned.length} unassigned
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Matrix Grid */}
        <div className="flex-1 min-w-0">
          {/* Axis labels - hidden on very small screens */}
          <div className="hidden sm:flex items-center justify-center gap-4 mb-2 text-xs text-muted-foreground">
            <span>&larr; URGENT</span>
            <span>|</span>
            <span>NOT URGENT &rarr;</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUADRANTS.map(q => {
              const quadrantTasks = activeTasks.filter(
                t => t.quadrant === q.id
              );
              const isOver = dragOverQuadrant === q.id;

              return (
                <div
                  key={q.id}
                  onDragOver={e => handleDragOver(e, q.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(q.id)}
                  className={`${q.bgClass} rounded-xl border ${q.borderClass} p-3 lg:p-4 min-h-[120px] lg:min-h-[180px] transition-all duration-200
                    ${isOver ? "ring-2 ring-warm-sage/40 scale-[1.01]" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-6 h-6 rounded-lg ${q.iconBg} flex items-center justify-center`}
                    >
                      <span className="text-xs">
                        {q.id === "do-first"
                          ? "🔥"
                          : q.id === "schedule"
                            ? "📅"
                            : q.id === "delegate"
                              ? "🤝"
                              : "🪶"}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {q.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {q.subtitle}
                  </p>

                  {quadrantTasks.length === 0 ? (
                    <div className="border-2 border-dashed border-current/10 rounded-lg p-3 lg:p-4 text-center">
                      <p className="text-xs text-muted-foreground/60">
                        {q.description}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {quadrantTasks.map(task => renderTaskCard(task, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Axis labels bottom - hidden on very small screens */}
          <div className="hidden sm:flex mt-2">
            <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">
              IMPORTANT ↑ · NOT IMPORTANT ↓
            </span>
          </div>
        </div>

        {/* Unassigned panel - Desktop: side panel, Mobile: collapsible section below */}
        {showPanel && (
          <div
            className="w-full lg:w-64 shrink-0"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDropUnassigned}
          >
            <div className="bg-card rounded-xl border border-border p-4 lg:sticky lg:top-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Unassigned
                  <span className="text-xs bg-warm-sand px-2 py-0.5 rounded-full text-muted-foreground">
                    {unassigned.length}
                  </span>
                </h4>
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <span className="hidden lg:block">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                  <span className="lg:hidden">
                    <ChevronUp className="w-4 h-4" />
                  </span>
                </button>
              </div>

              {unassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-4">
                  All tasks have been assigned to quadrants! Add new tasks from
                  the Tasks tab.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {unassigned.map(task => renderTaskCard(task, true))}
                </div>
              )}
              <p className="text-xs text-muted-foreground/50 mt-3 text-center hidden lg:block">
                Drag tasks into quadrants above
              </p>
              <p className="text-xs text-muted-foreground/50 mt-3 text-center lg:hidden">
                Use "Move to..." to assign tasks
              </p>
            </div>
          </div>
        )}

        {!showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="shrink-0 bg-card border border-border rounded-xl px-2 py-4 lg:flex items-center text-muted-foreground hover:text-foreground transition-colors hidden"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile: show unassigned toggle when panel is hidden */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="mt-4 w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ChevronDown className="w-4 h-4" />
          Show Unassigned ({unassigned.length})
        </button>
      )}

      {/* Empty state when no tasks at all */}
      {activeTasks.length === 0 && (
        <div className="mt-8 bg-card rounded-2xl border border-border p-8 lg:p-12 text-center">
          <img
            src={EMPTY_MATRIX_IMG}
            alt="No tasks"
            className="w-32 lg:w-40 h-32 lg:h-40 mx-auto mb-4 rounded-2xl object-cover opacity-90"
          />
          <h3 className="font-serif text-lg lg:text-xl text-foreground mb-2">
            No tasks to prioritize
          </h3>
          <p className="text-sm text-muted-foreground">
            Add some tasks in the Tasks tab first, then come back here to
            organize them by urgency and importance!
          </p>
        </div>
      )}
    </div>
  );
}
