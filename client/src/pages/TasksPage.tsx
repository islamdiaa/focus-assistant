/**
 * Tasks Page — Warm Productivity design
 * Task list with filters, sorting, add/edit/delete
 * Warm earth tones, paper-like cards
 */
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Trash2, Calendar, Flag, ArrowUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Priority, TaskStatus } from '@/lib/types';

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
  const [newDueDate, setNewDueDate] = useState('');

  const filteredTasks = useMemo(() => {
    let tasks = [...state.tasks];

    // Filter
    if (filter === 'active') tasks = tasks.filter(t => t.status === 'active');
    if (filter === 'done') tasks = tasks.filter(t => t.status === 'done');

    // Sort
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
      },
    });
    setNewTitle('');
    setNewDesc('');
    setNewPriority('medium');
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
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">New Task</DialogTitle>
              <DialogDescription className="sr-only">Create a new task</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                className="bg-background"
              />
              <Textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="bg-background resize-none"
                rows={2}
              />
              <div className="flex gap-3">
                <Select value={newPriority} onValueChange={v => setNewPriority(v as Priority)}>
                  <SelectTrigger className="bg-background flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="bg-background flex-1"
                />
              </div>
              <Button onClick={handleAddTask} className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white">
                Add Task
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
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
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
