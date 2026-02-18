/**
 * Tasks Page — Warm Productivity design
 * Task list with filters, sorting, add/edit/delete
 * Category, Energy, button-group Priority
 */
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Trash2, Calendar, Flag, ArrowUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Priority, TaskStatus, Category, EnergyLevel } from '@/lib/types';

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
  low: { emoji: '🔋', label: 'Low' },
  medium: { emoji: '⚡', label: 'Medium' },
  high: { emoji: '🔥', label: 'High' },
};

type Filter = 'all' | 'active' | 'done';
type Sort = 'newest' | 'priority' | 'dueDate';

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const EMPTY_TASKS_IMG = 'https://private-us-east-1.manuscdn.com/sessionFile/PlXiEUsi6v4VD1JuecPpX3/sandbox/k4s8ZO93y8NMD02oOYn6TD-img-1_1771447504000_na1fn_ZW1wdHktdGFza3M.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGxYaUVVc2k2djRWRDFKdWVjUHBYMy9zYW5kYm94L2s0czhaTzkzeThOTUQwMm9PWW42VEQtaW1nLTFfMTc3MTQ0NzUwNDAwMF9uYTFmbl9aVzF3ZEhrdGRHRnphM00ucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=amTtVIynHBRmIEVQIldvf4-bXMes21S3AX6LLFog5bRL60efcFgUSN3AJ2WmE-HkJPU90jm95LEtxx6105fZKASdQIJuW-o~kYZ43Cueotk~TRv77zsOIaMJg5D3EScTFkU8g1xCMfqaXF1sAzyiP2qRlcRH0HnCtWgS3HcJ1qap46LqW8k2FMkYkC0oTFTQ5FU1NzfHgFl185ayg5i1Xdo0veHJKTyXMGu-S~-w3s423z~GlaEiQ6t1CQyGASCVhshStkv6gNCDwT83Gq604ZbHt8kjenbxl0U327xOWsQvm~9m4J6gX64kQjnHplxs31yis8U4zWkJOKk4oeY6uQ__';

export default function TasksPage() {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newCategory, setNewCategory] = useState<Category | ''>('');
  const [newEnergy, setNewEnergy] = useState<EnergyLevel | ''>('');
  const [newDueDate, setNewDueDate] = useState('');

  const filteredTasks = useMemo(() => {
    let tasks = [...state.tasks];

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
  }, [state.tasks, filter, sort]);

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
      },
    });
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
    setNewCategory('');
    setNewEnergy('');
    setNewDueDate('');
    setDialogOpen(false);
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-3xl text-foreground">My Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">{todayCount} tasks to tackle today</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-2">
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">New Task</DialogTitle>
              <DialogDescription className="sr-only">Create a new task</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">What needs to be done?</label>
                <Input
                  placeholder="e.g., Finish the report..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                  className="bg-background"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Details (optional)</label>
                <Textarea
                  placeholder="Add any notes or context..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="bg-background resize-none"
                  rows={2}
                />
              </div>

              {/* Priority - Button Group */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200
                        ${newPriority === p
                          ? `${PRIORITY_COLORS[p]} border-current shadow-sm scale-[1.02]`
                          : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'
                        }`}
                    >
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category - Button Group */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as Category[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCategory(newCategory === c ? '' : c)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center gap-1.5
                        ${newCategory === c
                          ? 'bg-warm-sage-light text-warm-sage border-warm-sage/40 shadow-sm scale-[1.02]'
                          : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'
                        }`}
                    >
                      <span>{CATEGORY_CONFIG[c].emoji}</span>
                      <span>{CATEGORY_CONFIG[c].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy Required - Button Group */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Energy Required</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ENERGY_CONFIG) as EnergyLevel[]).map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setNewEnergy(newEnergy === e ? '' : e)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center gap-1.5
                        ${newEnergy === e
                          ? 'bg-warm-amber-light text-warm-amber border-warm-amber/40 shadow-sm scale-[1.02]'
                          : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'
                        }`}
                    >
                      <span>{ENERGY_CONFIG[e].emoji}</span>
                      <span>{ENERGY_CONFIG[e].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Due Date (optional)</label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="bg-background"
                />
              </div>

              <Button onClick={handleAddTask} className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white font-medium py-2.5">
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex bg-warm-sand/50 rounded-lg p-1 gap-1">
          {(['all', 'active', 'done'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                ${filter === f
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="flex bg-warm-sand/50 rounded-lg p-1 gap-1 ml-auto">
          {(['newest', 'priority', 'dueDate'] as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                ${sort === s
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {s === 'newest' && <ArrowUpDown className="w-3.5 h-3.5" />}
              {s === 'priority' && <Flag className="w-3.5 h-3.5" />}
              {s === 'dueDate' && <Calendar className="w-3.5 h-3.5" />}
              {s === 'newest' ? 'Newest' : s === 'priority' ? 'Priority' : 'Due Date'}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <img src={EMPTY_TASKS_IMG} alt="All clear" className="w-40 h-40 mx-auto mb-4 rounded-2xl object-cover opacity-90" />
          <h3 className="font-serif text-xl text-foreground mb-2">All clear!</h3>
          <p className="text-sm text-muted-foreground">Add a task to get started. You got this!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`group bg-card rounded-xl border border-border p-4 flex items-start gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
                ${task.status === 'done' ? 'opacity-60' : ''}`}
            >
              {/* Checkbox */}
              <button
                onClick={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                  ${task.status === 'done'
                    ? 'bg-warm-sage border-warm-sage'
                    : 'border-border hover:border-warm-sage'
                  }`}
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
                <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-warm-terracotta p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
