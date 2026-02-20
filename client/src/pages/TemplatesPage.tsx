/**
 * Templates Page — Save and reuse task sets
 * Create templates from scratch or from existing tasks
 * Apply templates to create new tasks instantly
 */
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { nanoid } from 'nanoid';
import { Plus, Trash2, Copy, FileText, X, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Priority, Category, EnergyLevel, TaskTemplate } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'bg-warm-terracotta/15 text-warm-terracotta',
  high: 'bg-warm-terracotta-light text-warm-terracotta',
  medium: 'bg-warm-amber-light text-warm-amber',
  low: 'bg-warm-sage-light text-warm-sage',
};

interface TemplateTaskDraft {
  title: string;
  description?: string | null;
  priority: Priority;
  category?: Category | null;
  energy?: EnergyLevel | null;
  subtasks?: Array<{ title: string }> | null;
}

export default function TemplatesPage() {
  const { state, dispatch } = useApp();
  const templates = state.templates || [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New template form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState<TemplateTaskDraft[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');

  function resetForm() {
    setName('');
    setDescription('');
    setTasks([]);
    setTaskTitle('');
    setTaskPriority('medium');
  }

  function addTaskToTemplate() {
    if (!taskTitle.trim()) return;
    setTasks([...tasks, { title: taskTitle.trim(), priority: taskPriority }]);
    setTaskTitle('');
    setTaskPriority('medium');
  }

  function handleCreate() {
    if (!name.trim() || tasks.length === 0) return;
    const template: TaskTemplate = {
      id: nanoid(),
      name: name.trim(),
      description: description.trim() || undefined,
      tasks,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TEMPLATE', payload: template });
    resetForm();
    setDialogOpen(false);
  }

  function handleApply(id: string) {
    dispatch({ type: 'APPLY_TEMPLATE', payload: id });
  }

  function handleDelete(id: string) {
    dispatch({ type: 'DELETE_TEMPLATE', payload: id });
  }

  // Create template from current active tasks
  function createFromCurrentTasks() {
    const activeTasks = state.tasks.filter(t => t.status === 'active');
    if (activeTasks.length === 0) return;
    setTasks(activeTasks.map(t => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: t.category,
      energy: t.energy,
      subtasks: t.subtasks?.map(s => ({ title: s.title })),
    })));
    setName('From current tasks');
    setDialogOpen(true);
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl text-foreground">Task Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">Save and reuse task sets for recurring workflows</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={createFromCurrentTasks} variant="outline" className="gap-2 text-sm"
            disabled={state.tasks.filter(t => t.status === 'active').length === 0}>
            <Copy className="w-4 h-4" /> <span className="hidden sm:inline">From Tasks</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-2">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Template</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Create Template</DialogTitle>
                <DialogDescription className="sr-only">Create a new task template</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Template Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Sprint Planning" className="bg-background" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Description (optional)</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this template for?" className="bg-background resize-none" rows={2} />
                </div>

                {/* Tasks in template */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Tasks ({tasks.length})</label>
                  <div className="space-y-1.5 mb-3">
                    {tasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority][0]}</span>
                        <span className="text-sm flex-1 truncate">{t.title}</span>
                        {t.subtasks && t.subtasks.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">{t.subtasks.length} sub</span>
                        )}
                        <button onClick={() => setTasks(tasks.filter((_, j) => j !== i))} className="p-0.5 text-muted-foreground hover:text-warm-terracotta">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTaskToTemplate())}
                      placeholder="Task title..." className="bg-background text-sm flex-1" />
                    <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as Priority)}
                      className="bg-background border border-border rounded-md px-2 text-xs">
                      <option value="low">Low</option>
                      <option value="medium">Med</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <Button onClick={addTaskToTemplate} size="sm" variant="outline"><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>

                <Button onClick={handleCreate} className="w-full bg-warm-sage hover:bg-warm-sage/90 text-white font-medium py-2.5"
                  disabled={!name.trim() || tasks.length === 0}>
                  <Save className="w-4 h-4 mr-2" /> Save Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Template List */}
      {templates.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-serif text-xl text-foreground mb-2">No templates yet</h3>
          <p className="text-sm text-muted-foreground">Create a template to save a reusable set of tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {templates.map(tmpl => (
              <motion.div
                key={tmpl.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <button onClick={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)}
                    className="mt-0.5 p-0.5 text-muted-foreground hover:text-foreground">
                    {expandedId === tmpl.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{tmpl.name}</h3>
                    {tmpl.description && <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{tmpl.tasks.length} task{tmpl.tasks.length !== 1 ? 's' : ''} · Created {new Date(tmpl.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleApply(tmpl.id)} size="sm" className="bg-warm-sage hover:bg-warm-sage/90 text-white gap-1.5 text-xs">
                      <Copy className="w-3.5 h-3.5" /> Apply
                    </Button>
                    <Button onClick={() => handleDelete(tmpl.id)} size="sm" variant="ghost" className="text-muted-foreground hover:text-warm-terracotta">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded task list */}
                <AnimatePresence>
                  {expandedId === tmpl.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border/50 space-y-1.5"
                    >
                      {tmpl.tasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority][0]}</span>
                          <span className="text-foreground">{t.title}</span>
                          {t.subtasks && t.subtasks.length > 0 && (
                            <span className="text-[10px] text-muted-foreground bg-warm-sand/30 px-1.5 py-0.5 rounded">{t.subtasks.length} subtasks</span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
