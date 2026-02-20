/**
 * Tasks Page — Warm Productivity design
 * Task list with search, filters, sorting, add/edit/delete
 * Category, Energy, Recurrence, button-group Priority
 * Inline edit on task cards with pencil icon
 * Drag-and-drop reordering via dnd-kit
 * V1.2: Subtasks with progress bars, inline add/toggle/delete
 * Keyboard shortcuts: N=new task, /=focus search
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Trash2, Calendar, Flag, ArrowUpDown, Check, Pencil, X, Save, Search, Repeat, GripVertical, ChevronDown, ChevronRight, ListChecks, Bell, Cake, Star } from 'lucide-react';
import type { Reminder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Task, Priority, Category, EnergyLevel, RecurrenceFrequency, Subtask } from '@/lib/types';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { motion, AnimatePresence } from 'framer-motion';

interface TasksPageProps {
  newTaskTrigger?: number;
  searchTrigger?: number;
  reminderTrigger?: number;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'bg-warm-terracotta/15 text-warm-terracotta border-warm-terracotta/30',
  high: 'bg-warm-terracotta-light text-warm-terracotta border-warm-terracotta/20',
  medium: 'bg-warm-amber-light text-warm-amber border-warm-amber/20',
  low: 'bg-warm-sage-light text-warm-sage border-warm-sage/20',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const CATEGORY_CONFIG: Record<Category, { emoji: string; label: string }> = {
  work: { emoji: '💼', label: 'Work' },
  personal: { emoji: '🏠', label: 'Personal' },
  health: { emoji: '💪', label: 'Health' },
  learning: { emoji: '📚', label: 'Learning' },
  errands: { emoji: '🛒', label: 'Errands' },
  other: { emoji: '📌', label: 'Other' },
};

const ENERGY_CONFIG: Record<EnergyLevel, { emoji: string; label: string }> = {
  low: { emoji: '🔋', label: 'Low Energy' },
  medium: { emoji: '⚡', label: 'Medium Energy' },
  high: { emoji: '🔥', label: 'High Energy' },
};

const RECURRENCE_CONFIG: Record<RecurrenceFrequency, { label: string; short: string }> = {
  none: { label: 'No Repeat', short: '' },
  daily: { label: 'Daily', short: 'Daily' },
  weekly: { label: 'Weekly', short: 'Weekly' },
  monthly: { label: 'Monthly', short: 'Monthly' },
  quarterly: { label: 'Quarterly', short: 'Quarterly' },
  weekdays: { label: 'Weekdays', short: 'Weekdays' },
};

type Filter = 'all' | 'active' | 'done';
type Sort = 'newest' | 'priority' | 'dueDate' | 'manual';

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const EMPTY_TASKS_IMG = 'https://private-us-east-1.manuscdn.com/sessionFile/PlXiEUsi6v4VD1JuecPpX3/sandbox/k4s8ZO93y8NMD02oOYn6TD-img-1_1771447504000_na1fn_ZW1wdHktdGFza3M.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGxYaUVVc2k2djRWRDFKdWVjUHBYMy9zYW5kYm94L2s0czhaTzkzeThOTUQwMm9PWW42VEQtaW1nLTFfMTc3MTQ0NzUwNDAwMF9uYTFmbl9aVzF3ZEhrdGRHRnphM00ucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=amTtVIynHBRmIEVQIldvf4-bXMes21S3AX6LLFog5bRL60efcFgUSN3AJ2WmE-HkJPU90jm95LEtxx6105fZKASdQIJuW-o~kYZ43Cueotk~TRv77zsOIaMJg5D3EScTFkU8g1xCMfqaXF1sAzyiP2qRlcRH0HnCtWgS3HcJ1qap46LqW8k2FMkYkC0oTFTQ5FU1NzfHgFl185ayg5i1Xdo0veHJKTyXMGu-S~-w3s423z~GlaEiQ6t1CQyGASCVhshStkv6gNCDwT83Gq604ZbHt8kjenbxl0U327xOWsQvm~9m4J6gX64kQjnHplxs31yis8U4zWkJOKk4oeY6uQ__';

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
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{done}/{total}</span>
    </div>
  );
}

// ---- Inline Subtask List ----
function SubtaskList({ task, dispatch }: { task: Task; dispatch: (action: any) => void }) {
  const [newSubtask, setNewSubtask] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!newSubtask.trim()) return;
    dispatch({ type: 'ADD_SUBTASK', payload: { taskId: task.id, title: newSubtask.trim() } });
    setNewSubtask('');
    inputRef.current?.focus();
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <ListChecks className="w-3.5 h-3.5 text-warm-sage" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subtasks</span>
      </div>
      <AnimatePresence mode="popLayout">
        {(task.subtasks || []).map(sub => (
          <motion.div
            key={sub.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 group/sub"
          >
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SUBTASK', payload: { taskId: task.id, subtaskId: sub.id } })}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                ${sub.done ? 'bg-warm-sage border-warm-sage' : 'border-border hover:border-warm-sage'}`}
            >
              {sub.done && <Check className="w-2.5 h-2.5 text-white" />}
            </button>
            {editingId === sub.id ? (
              <div className="flex-1 flex gap-1">
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      dispatch({ type: 'UPDATE_SUBTASK', payload: { taskId: task.id, subtaskId: sub.id, title: editTitle.trim() } });
                      setEditingId(null);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="h-6 text-xs bg-background"
                  autoFocus
                />
              </div>
            ) : (
              <span
                className={`flex-1 text-xs cursor-pointer ${sub.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                onDoubleClick={() => { setEditingId(sub.id); setEditTitle(sub.title); }}
              >
                {sub.title}
              </span>
            )}
            <button
              onClick={() => dispatch({ type: 'DELETE_SUBTASK', payload: { taskId: task.id, subtaskId: sub.id } })}
              className="p-0.5 rounded text-muted-foreground/40 hover:text-warm-terracotta opacity-0 group-hover/sub:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="flex gap-1.5 mt-1">
        <Input
          ref={inputRef}
          value={newSubtask}
          onChange={e => setNewSubtask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add subtask..."
          className="h-7 text-xs bg-background flex-1"
        />
        <Button onClick={handleAdd} size="sm" variant="ghost" className="h-7 px-2 text-warm-sage hover:bg-warm-sage-light">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---- Inline Edit Form ----
function InlineEditForm({ task, onSave, onCancel }: { task: Task; onSave: (updates: Partial<Task>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [category, setCategory] = useState<Category | ''>(task.category || '');
  const [energy, setEnergy] = useState<EnergyLevel | ''>(task.energy || '');
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(task.recurrence || 'none');

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: desc.trim() || undefined,
      priority,
      category: category || undefined,
      energy: energy || undefined,
      dueDate: dueDate || undefined,
      recurrence: recurrence !== 'none' ? recurrence : undefined,
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Title</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-background" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Description (optional)</label>
        <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add more details..." className="bg-background resize-none" rows={2} />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Priority</label>
        <div className="grid grid-cols-4 gap-2">
          {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => (
            <button key={p} type="button" onClick={() => setPriority(p)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200
                ${priority === p ? `${PRIORITY_COLORS[p]} border-current shadow-sm scale-[1.02]` : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CATEGORY_CONFIG) as Category[]).map(c => (
            <button key={c} type="button" onClick={() => setCategory(category === c ? '' : c)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center gap-1.5
                ${category === c ? 'bg-warm-sage-light text-warm-sage border-warm-sage/40 shadow-sm scale-[1.02]' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
              <span>{CATEGORY_CONFIG[c].emoji}</span><span>{CATEGORY_CONFIG[c].label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Energy Level</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ENERGY_CONFIG) as EnergyLevel[]).map(e => (
            <button key={e} type="button" onClick={() => setEnergy(energy === e ? '' : e)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center gap-1.5
                ${energy === e ? 'bg-warm-amber-light text-warm-amber border-warm-amber/40 shadow-sm scale-[1.02]' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
              <span>{ENERGY_CONFIG[e].emoji}</span><span>{ENERGY_CONFIG[e].label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Repeat</label>
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(RECURRENCE_CONFIG) as RecurrenceFrequency[]).map(r => (
            <button key={r} type="button" onClick={() => setRecurrence(r)}
              className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all duration-200
                ${recurrence === r ? 'bg-warm-blue-light text-warm-blue border-warm-blue/40 shadow-sm scale-[1.02]' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
              {RECURRENCE_CONFIG[r].label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Due Date (optional)</label>
        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-background" />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1 bg-warm-sage hover:bg-warm-sage/90 text-white gap-2">
          <Save className="w-4 h-4" /> Save Changes
        </Button>
        <Button onClick={onCancel} variant="outline" className="gap-2">
          <X className="w-4 h-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ---- Sortable Task Card ----
function SortableTaskCard({
  task,
  index,
  editingId,
  setEditingId,
  dispatch,
  handleInlineSave,
  isDragDisabled,
}: {
  task: Task;
  index: number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  dispatch: (action: any) => void;
  handleInlineSave: (taskId: string, updates: Partial<Task>) => void;
  isDragDisabled: boolean;
}) {
  const { ref, isDragSource } = useSortable({ id: task.id, index, disabled: isDragDisabled });
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
      className={`group bg-card rounded-xl border border-border p-4 transition-all duration-200 hover:shadow-md
        ${task.status === 'done' ? 'opacity-60' : ''}
        ${editingId === task.id ? 'ring-2 ring-warm-sage/30 shadow-md' : ''}
        ${isDragSource ? 'shadow-xl ring-2 ring-warm-sage/40 opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {!isDragDisabled && (
          <div
            className="mt-0.5 p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Checkbox */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
            ${task.status === 'done' ? 'bg-warm-sage border-warm-sage' : 'border-border hover:border-warm-sage'}`}
        >
          {task.status === 'done' && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
          )}
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warm-sage-light/60 text-warm-charcoal border border-warm-sage/15">
                {CATEGORY_CONFIG[task.category].emoji} {CATEGORY_CONFIG[task.category].label}
              </span>
            )}
            {task.energy && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warm-amber-light/60 text-warm-charcoal border border-warm-amber/15">
                {ENERGY_CONFIG[task.energy].emoji} {ENERGY_CONFIG[task.energy].label}
              </span>
            )}
            {task.recurrence && task.recurrence !== 'none' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warm-blue-light/60 text-warm-charcoal border border-warm-blue/15 flex items-center gap-1">
                <Repeat className="w-3 h-3" /> {RECURRENCE_CONFIG[task.recurrence].short}
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {/* Subtask progress bar (always visible if subtasks exist) */}
          {hasSubtasks && <SubtaskProgress subtasks={task.subtasks!} />}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Subtask toggle */}
          <button
            onClick={() => setSubtasksOpen(!subtasksOpen)}
            className={`p-1.5 rounded-md transition-colors ${
              subtasksOpen ? 'text-warm-sage bg-warm-sage-light' : 'text-muted-foreground hover:text-warm-sage hover:bg-warm-sage-light'}`}
            title="Subtasks"
          >
            <ListChecks className="w-4 h-4" />
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-warm-sage hover:bg-warm-sage-light transition-colors"
            title={task.status === 'done' ? 'Mark as active' : 'Mark as done'}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditingId(editingId === task.id ? null : task.id)}
            className={`p-1.5 rounded-md transition-colors ${
              editingId === task.id ? 'text-warm-sage bg-warm-sage-light' : 'text-muted-foreground hover:text-warm-blue hover:bg-warm-blue-light'}`}
            title="Edit task"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-warm-terracotta hover:bg-warm-terracotta-light transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtask list (expandable) */}
      <AnimatePresence>
        {subtasksOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
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
          onSave={(updates) => handleInlineSave(task.id, updates)}
          onCancel={() => setEditingId(null)}
        />
      )}
    </motion.div>
  );
}

// ---- Main Page ----
export default function TasksPage({ newTaskTrigger = 0, searchTrigger = 0, reminderTrigger = 0 }: TasksPageProps) {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState<Filter>('active');
  const [sort, setSort] = useState<Sort>('priority');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newCategory, setNewCategory] = useState<Category | ''>('');
  const [newEnergy, setNewEnergy] = useState<EnergyLevel | ''>('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceFrequency>('none');
  const [newQuarterlyDay, setNewQuarterlyDay] = useState(16);
  const [newQuarterlyStartMonth, setNewQuarterlyStartMonth] = useState(2); // Feb
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

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
  const [remTitle, setRemTitle] = useState('');
  const [remDescription, setRemDescription] = useState('');
  const [remDate, setRemDate] = useState('');
  const [remTime, setRemTime] = useState('');
  const [remRecurrence, setRemRecurrence] = useState<Reminder['recurrence']>('none');
  const [remCategory, setRemCategory] = useState<Reminder['category']>('other');

  const REMINDER_CATEGORIES: Record<Reminder['category'], { icon: typeof Bell; label: string; color: string; bg: string }> = {
    birthday: { icon: Cake, label: 'Birthday', color: 'text-pink-500', bg: 'bg-pink-50' },
    appointment: { icon: Calendar, label: 'Appointment', color: 'text-warm-blue', bg: 'bg-warm-blue-light' },
    event: { icon: Star, label: 'Event', color: 'text-warm-amber', bg: 'bg-warm-amber-light' },
    other: { icon: Bell, label: 'Other', color: 'text-warm-sage', bg: 'bg-warm-sage-light' },
  };

  const REMINDER_RECURRENCE: { value: Reminder['recurrence']; label: string }[] = [
    { value: 'none', label: 'One-time' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'weekly', label: 'Weekly' },
  ];

  // Keyboard shortcut: R opens reminder dialog — skip initial mount
  const prevReminderTrigger = useRef(reminderTrigger);
  useEffect(() => {
    if (reminderTrigger !== prevReminderTrigger.current) {
      prevReminderTrigger.current = reminderTrigger;
      if (reminderTrigger > 0) {
        setRemTitle('');
        setRemDescription('');
        setRemDate('');
        setRemTime('');
        setRemRecurrence('none');
        setRemCategory('other');
        setReminderDialogOpen(true);
      }
    }
  }, [reminderTrigger]);

  function handleAddReminder() {
    if (!remTitle.trim() || !remDate) return;
    dispatch({
      type: 'ADD_REMINDER',
      payload: {
        title: remTitle.trim(),
        description: remDescription.trim() || undefined,
        date: remDate,
        time: remTime || undefined,
        recurrence: remRecurrence,
        category: remCategory,
      },
    });
    setRemTitle('');
    setRemDescription('');
    setRemDate('');
    setRemTime('');
    setRemRecurrence('none');
    setRemCategory('other');
    setReminderDialogOpen(false);
  }

  const isDragDisabled = sort !== 'manual' || !!searchQuery.trim();

  const filteredTasks = useMemo(() => {
    let tasks = [...state.tasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (filter === 'active') tasks = tasks.filter(t => t.status === 'active');
    if (filter === 'done') tasks = tasks.filter(t => t.status === 'done');

    if (sort === 'newest') tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === 'priority') tasks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    if (sort === 'dueDate') tasks.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return tasks;
  }, [state.tasks, filter, sort, searchQuery]);

  const counts = useMemo(() => ({
    all: state.tasks.length,
    active: state.tasks.filter(t => t.status === 'active').length,
    done: state.tasks.filter(t => t.status === 'done').length,
  }), [state.tasks]);

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return state.tasks.filter(t => t.status === 'active' && (!t.dueDate || t.dueDate <= today)).length;
  }, [state.tasks]);

  function handleAddTask() {
    if (!newTitle.trim()) return;
    dispatch({
      type: 'ADD_TASK',
      payload: {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        category: newCategory || undefined,
        energy: newEnergy || undefined,
        recurrence: newRecurrence !== 'none' ? newRecurrence : undefined,
        recurrenceDayOfMonth: newRecurrence === 'quarterly' ? newQuarterlyDay : undefined,
        recurrenceStartMonth: newRecurrence === 'quarterly' ? newQuarterlyStartMonth : undefined,
        subtasks: newSubtasks.length > 0 ? newSubtasks.map(s => ({ title: s })) : undefined,
      },
    });
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewCategory('');
    setNewEnergy('');
    setNewDueDate('');
    setNewRecurrence('none');
    setNewQuarterlyDay(16);
    setNewQuarterlyStartMonth(2);
    setNewSubtasks([]);
    setNewSubtaskInput('');
    setDialogOpen(false);
  }

  function handleInlineSave(taskId: string, updates: Partial<Task>) {
    dispatch({ type: 'UPDATE_TASK', payload: { id: taskId, ...updates } });
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
    dispatch({ type: 'REORDER_TASKS', payload: reordered.map(t => t.id) });
  }

  function addNewSubtask() {
    if (!newSubtaskInput.trim()) return;
    setNewSubtasks([...newSubtasks, newSubtaskInput.trim()]);
    setNewSubtaskInput('');
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">My Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">{todayCount} task{todayCount !== 1 ? 's' : ''} to tackle today</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setReminderDialogOpen(true)} variant="outline" className="gap-2 border-warm-amber/30 text-warm-amber hover:bg-warm-amber-light">
            <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Reminder</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-2">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Task</span><span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">New Task</DialogTitle>
              <DialogDescription className="sr-only">Create a new task</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Title</label>
                <Input placeholder="e.g., Finish the report..." value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()} className="bg-background" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Description (optional)</label>
                <Textarea placeholder="Add more details..." value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  className="bg-background resize-none" rows={2} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => (
                    <button key={p} type="button" onClick={() => setNewPriority(p)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200
                        ${newPriority === p ? `${PRIORITY_COLORS[p]} border-current shadow-sm scale-[1.02]` : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as Category[]).map(c => (
                    <button key={c} type="button" onClick={() => setNewCategory(newCategory === c ? '' : c)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center gap-1.5
                        ${newCategory === c ? 'bg-warm-sage-light text-warm-sage border-warm-sage/40 shadow-sm scale-[1.02]' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                      <span>{CATEGORY_CONFIG[c].emoji}</span><span>{CATEGORY_CONFIG[c].label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Energy Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ENERGY_CONFIG) as EnergyLevel[]).map(e => (
                    <button key={e} type="button" onClick={() => setNewEnergy(newEnergy === e ? '' : e)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center gap-1.5
                        ${newEnergy === e ? 'bg-warm-amber-light text-warm-amber border-warm-amber/40 shadow-sm scale-[1.02]' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                      <span>{ENERGY_CONFIG[e].emoji}</span><span>{ENERGY_CONFIG[e].label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Repeat</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.keys(RECURRENCE_CONFIG) as RecurrenceFrequency[]).map(r => (
                    <button key={r} type="button" onClick={() => setNewRecurrence(r)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all duration-200
                        ${newRecurrence === r ? 'bg-warm-blue-light text-warm-blue border-warm-blue/40 shadow-sm scale-[1.02]' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                      {RECURRENCE_CONFIG[r].label}
                    </button>
                  ))}
                </div>
                {newRecurrence === 'quarterly' && (
                  <div className="mt-3 p-3 bg-warm-blue-light/30 rounded-lg border border-warm-blue/20 space-y-2">
                    <p className="text-xs text-warm-blue font-medium">Quarterly schedule: repeats every 3 months</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">Day of month</label>
                        <Input type="number" min={1} max={28} value={newQuarterlyDay}
                          onChange={e => setNewQuarterlyDay(parseInt(e.target.value) || 16)}
                          className="bg-background h-8 text-xs" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">Starting month</label>
                        <select value={newQuarterlyStartMonth}
                          onChange={e => setNewQuarterlyStartMonth(parseInt(e.target.value))}
                          className="w-full h-8 rounded-md border border-border bg-background text-xs px-2">
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Runs on the {newQuarterlyDay}th of {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][newQuarterlyStartMonth - 1]}, {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(newQuarterlyStartMonth + 2) % 12]}, {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(newQuarterlyStartMonth + 5) % 12]}, {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(newQuarterlyStartMonth + 8) % 12]}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Due Date (optional)</label>
                <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="bg-background" />
              </div>
              {/* Subtasks section in new task dialog */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Subtasks (optional)</label>
                {newSubtasks.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <div className="w-4 h-4 rounded border-2 border-border shrink-0" />
                    <span className="text-sm flex-1">{s}</span>
                    <button onClick={() => setNewSubtasks(newSubtasks.filter((_, j) => j !== i))}
                      className="p-0.5 text-muted-foreground hover:text-warm-terracotta">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input
                    value={newSubtaskInput}
                    onChange={e => setNewSubtaskInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNewSubtask())}
                    placeholder="Add a subtask..."
                    className="bg-background text-sm"
                  />
                  <Button onClick={addNewSubtask} size="sm" variant="outline" className="shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={handleAddTask} className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white font-medium py-2.5">
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
            <DialogTitle className="font-serif text-xl">New Reminder</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Add a birthday, appointment, or event to remember</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Reminder title..." value={remTitle} onChange={e => setRemTitle(e.target.value)} className="bg-background" autoFocus />
            <Input placeholder="Description (optional)" value={remDescription} onChange={e => setRemDescription(e.target.value)} className="bg-background" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date</label>
                <Input type="date" value={remDate} onChange={e => setRemDate(e.target.value)} className="bg-background" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Time <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></label>
                <Input type="time" value={remTime} onChange={e => setRemTime(e.target.value)} className="bg-background" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(REMINDER_CATEGORIES) as Reminder['category'][]).map(c => {
                  const cfg = REMINDER_CATEGORIES[c];
                  return (
                    <button key={c} type="button" onClick={() => setRemCategory(c)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all duration-200 flex flex-col items-center gap-1
                        ${remCategory === c ? `${cfg.bg} ${cfg.color} border-current shadow-sm scale-[1.02]` : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                      <cfg.icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Repeats</label>
              <div className="grid grid-cols-4 gap-2">
                {REMINDER_RECURRENCE.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setRemRecurrence(opt.value)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all duration-200
                      ${remRecurrence === opt.value ? 'bg-warm-blue-light text-warm-blue border-warm-blue/40 shadow-sm scale-[1.02]' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAddReminder} disabled={!remTitle.trim() || !remDate} className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white">Add Reminder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Search tasks... (press / to focus)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex bg-warm-sand/50 rounded-lg p-1 gap-1">
          {(['all', 'active', 'done'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                ${filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="flex bg-warm-sand/50 rounded-lg p-1 gap-1 sm:ml-auto flex-wrap">
          {(['manual', 'newest', 'priority', 'dueDate'] as Sort[]).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                ${sort === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {s === 'manual' && <GripVertical className="w-3.5 h-3.5" />}
              {s === 'newest' && <ArrowUpDown className="w-3.5 h-3.5" />}
              {s === 'priority' && <Flag className="w-3.5 h-3.5" />}
              {s === 'dueDate' && <Calendar className="w-3.5 h-3.5" />}
              {s === 'manual' ? 'Manual' : s === 'newest' ? 'Newest' : s === 'priority' ? 'Priority' : 'Due Date'}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          {searchQuery ? (
            <>
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="font-serif text-xl text-foreground mb-2">No matches</h3>
              <p className="text-sm text-muted-foreground">No tasks match "{searchQuery}". Try a different search.</p>
            </>
          ) : (
            <>
              <img src={EMPTY_TASKS_IMG} alt="All clear" className="w-40 h-40 mx-auto mb-4 rounded-2xl object-cover opacity-90" />
              <h3 className="font-serif text-xl text-foreground mb-2">All clear!</h3>
              <p className="text-sm text-muted-foreground">Add a task to get started. You got this!</p>
            </>
          )}
        </div>
      ) : (
        <DragDropProvider
          onDragEnd={handleDragEnd}
        >
            <div className="space-y-2">
              {sort === 'manual' && !searchQuery && (
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
                    isDragDisabled={isDragDisabled}
                  />
                ))}
              </AnimatePresence>
            </div>
        </DragDropProvider>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground/60">
          <kbd className="px-1.5 py-0.5 bg-warm-sand/50 rounded text-[10px] font-mono">N</kbd> new task
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-warm-sand/50 rounded text-[10px] font-mono">R</kbd> new reminder
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-warm-sand/50 rounded text-[10px] font-mono">/</kbd> search
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-warm-sand/50 rounded text-[10px] font-mono">Ctrl+Z</kbd> undo
        </p>
      </div>
    </div>
  );
}
