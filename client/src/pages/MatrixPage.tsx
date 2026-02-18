/**
 * Eisenhower Matrix Page — Warm Productivity design
 * 4 quadrants with drag-and-drop
 * Side panel for unassigned tasks
 */
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Info, ChevronRight, ChevronLeft, GripVertical } from 'lucide-react';
import type { QuadrantType } from '@/lib/types';

const EMPTY_MATRIX_IMG = 'https://private-us-east-1.manuscdn.com/sessionFile/PlXiEUsi6v4VD1JuecPpX3/sandbox/k4s8ZO93y8NMD02oOYn6TD-img-3_1771447502000_na1fn_ZW1wdHktbWF0cml4.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUGxYaUVVc2k2djRWRDFKdWVjUHBYMy9zYW5kYm94L2s0czhaTzkzeThOTUQwMm9PWW42VEQtaW1nLTNfMTc3MTQ0NzUwMjAwMF9uYTFmbl9aVzF3ZEhrdGJXRjBjbWw0LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=rAeoXHfOL1AQlur01UCUEB5-LTROSoOKnq3Qs7SOkYf3umtWoDqWmtBO1BRZsXP8mFXt8C9ofQqUp2JhAEv0C~dDO4PpJT8jur35ejs6lVF3IWJP5JxFTn-pr9m1Z7zfMcIVaCvV1q9zm3hsP9uvwgaMTabGHdQ5RVz3YOuYX-ZLFXWqJcRoz3D9qPjQBA5tmXs-3e4hhj6dBzPqeJNvOEeTuLsOs2nBmKxtf7y-5ns40Dgp9FAi2S5FEHDLtXb1IzasqjQKK6-iXu6wV7bJLawgEfaYOMXUHBZboobVUm8kmtmQ7ViCzd9xQrfx4aZ6b3KeCR7MeJmqCMAtVo1yIA__';

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
    id: 'do-first',
    title: 'Do First',
    subtitle: 'Urgent & Important',
    description: 'Crises, deadlines, emergencies',
    bgClass: 'bg-warm-terracotta-light',
    borderClass: 'border-warm-terracotta/20',
    iconBg: 'bg-warm-terracotta/20',
  },
  {
    id: 'schedule',
    title: 'Schedule',
    subtitle: 'Important, Not Urgent',
    description: 'Goals, planning, personal growth',
    bgClass: 'bg-warm-sage-light',
    borderClass: 'border-warm-sage/20',
    iconBg: 'bg-warm-sage/20',
  },
  {
    id: 'delegate',
    title: 'Delegate',
    subtitle: 'Urgent, Not Important',
    description: 'Interruptions, some meetings',
    bgClass: 'bg-warm-amber-light',
    borderClass: 'border-warm-amber/20',
    iconBg: 'bg-warm-amber/20',
  },
  {
    id: 'eliminate',
    title: 'Eliminate',
    subtitle: 'Not Urgent, Not Important',
    description: 'Time-wasters, distractions',
    bgClass: 'bg-warm-sand',
    borderClass: 'border-border',
    iconBg: 'bg-warm-charcoal/10',
  },
];

export default function MatrixPage() {
  const { state, dispatch } = useApp();
  const [showPanel, setShowPanel] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<QuadrantType | null>(null);

  const activeTasks = state.tasks.filter(t => t.status === 'active');
  const unassigned = useMemo(() => activeTasks.filter(t => t.quadrant === 'unassigned'), [activeTasks]);
  const assigned = useMemo(() => activeTasks.filter(t => t.quadrant !== 'unassigned'), [activeTasks]);

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
      dispatch({ type: 'MOVE_TASK_QUADRANT', payload: { id: draggingId, quadrant } });
    }
    setDraggingId(null);
    setDragOverQuadrant(null);
  }

  function handleDropUnassigned(e: React.DragEvent) {
    e.preventDefault();
    if (draggingId) {
      dispatch({ type: 'MOVE_TASK_QUADRANT', payload: { id: draggingId, quadrant: 'unassigned' } });
    }
    setDraggingId(null);
    setDragOverQuadrant(null);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-serif text-3xl text-foreground">Eisenhower Matrix</h2>
        <p className="text-sm text-muted-foreground mt-1">Drag tasks into quadrants to prioritize by urgency and importance</p>
      </div>

      {/* Info banner */}
      <div className="bg-warm-sage-light rounded-xl border border-warm-sage/20 p-4 mb-6 flex gap-3">
        <Info className="w-4 h-4 text-warm-sage mt-0.5 shrink-0" />
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>How it works:</strong> Categorize your tasks based on two dimensions — <strong>Urgency</strong> (time-sensitive)
          and <strong>Importance</strong> (contributes to long-term goals). Focus on Q1 first, then invest time in Q2 to prevent future crises.
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

      <div className="flex gap-6">
        {/* Matrix Grid */}
        <div className="flex-1">
          {/* Axis labels */}
          <div className="flex items-center justify-center gap-4 mb-2 text-xs text-muted-foreground">
            <span>&larr; URGENT</span>
            <span>|</span>
            <span>NOT URGENT &rarr;</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {QUADRANTS.map(q => {
              const quadrantTasks = activeTasks.filter(t => t.quadrant === q.id);
              const isOver = dragOverQuadrant === q.id;

              return (
                <div
                  key={q.id}
                  onDragOver={e => handleDragOver(e, q.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(q.id)}
                  className={`${q.bgClass} rounded-xl border ${q.borderClass} p-4 min-h-[180px] transition-all duration-200
                    ${isOver ? 'ring-2 ring-warm-sage/40 scale-[1.01]' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-6 h-6 rounded-lg ${q.iconBg} flex items-center justify-center`}>
                      <span className="text-xs">
                        {q.id === 'do-first' ? '🔥' : q.id === 'schedule' ? '📅' : q.id === 'delegate' ? '🤝' : '🪶'}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{q.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{q.subtitle}</p>

                  {quadrantTasks.length === 0 ? (
                    <div className="border-2 border-dashed border-current/10 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground/60">{q.description}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {quadrantTasks.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          className="bg-card/80 rounded-lg px-3 py-2 text-xs font-medium text-foreground flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-card shadow-sm"
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Axis labels bottom */}
          <div className="flex mt-2">
            <span className="text-xs text-muted-foreground/60 uppercase tracking-wider writing-mode-vertical transform -rotate-0">
              IMPORTANT ↑ · NOT IMPORTANT ↓
            </span>
          </div>
        </div>

        {/* Unassigned panel */}
        {showPanel && (
          <div
            className="w-64 shrink-0"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDropUnassigned}
          >
            <div className="bg-card rounded-xl border border-border p-4 sticky top-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Unassigned
                  <span className="text-xs bg-warm-sand px-2 py-0.5 rounded-full text-muted-foreground">{unassigned.length}</span>
                </h4>
                <button onClick={() => setShowPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {unassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-4">
                  All tasks have been assigned to quadrants! Add new tasks from the Tasks tab.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {unassigned.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className="bg-warm-sand/50 rounded-lg px-3 py-2 text-xs font-medium text-foreground flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-warm-sand"
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground/50 mt-3 text-center">Drag tasks into quadrants above</p>
            </div>
          </div>
        )}

        {!showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="shrink-0 bg-card border border-border rounded-xl px-2 py-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Empty state when no tasks at all */}
      {state.tasks.filter(t => t.status === 'active').length === 0 && (
        <div className="mt-8 bg-card rounded-2xl border border-border p-12 text-center">
          <img src={EMPTY_MATRIX_IMG} alt="No tasks" className="w-40 h-40 mx-auto mb-4 rounded-2xl object-cover opacity-90" />
          <h3 className="font-serif text-xl text-foreground mb-2">No tasks to prioritize</h3>
          <p className="text-sm text-muted-foreground">
            Add some tasks in the Tasks tab first, then come back here to organize them by urgency and importance!
          </p>
        </div>
      )}
    </div>
  );
}
