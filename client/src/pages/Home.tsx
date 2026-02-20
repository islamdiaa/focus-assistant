/**
 * Home — Main layout with sidebar navigation
 * Desktop: fixed sidebar + content
 * Mobile: hamburger menu + full-width content
 * 
 * Keyboard shortcuts:
 * - Ctrl/Cmd+Z: Undo
 * - Ctrl/Cmd+Shift+Z: Redo
 * - 1-5: Switch pages (when no input focused)
 * - N: Open new task dialog (when on tasks page, no input focused)
 * - /: Focus search (when on tasks page, no input focused)
 * - Esc: Close sidebar on mobile
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TasksPage from './TasksPage';
import TimerPage from './TimerPage';
import MatrixPage from './MatrixPage';
import StatsPage from './StatsPage';
import SettingsPage from './SettingsPage';
import { useApp } from '@/contexts/AppContext';
import { Smile, Clock, Menu, Undo2, Redo2 } from 'lucide-react';

type Page = 'tasks' | 'timer' | 'matrix' | 'stats' | 'settings';

const MOTIVATIONAL = [
  'Your brain is powerful!',
  'You can do hard things.',
  'One step at a time.',
  'Progress, not perfection.',
  'Stay curious, stay focused.',
];

const PAGE_MAP: Record<string, Page> = {
  '1': 'tasks',
  '2': 'timer',
  '3': 'matrix',
  '4': 'stats',
  '5': 'settings',
};

export default function Home() {
  const [activePage, setActivePage] = useState<Page>('tasks');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { state, canUndo, canRedo, undo, redo } = useApp();

  // Expose setActivePage and page for keyboard shortcuts in child components
  const [newTaskTrigger, setNewTaskTrigger] = useState(0);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const subtitle = useMemo(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)], []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayStats = state.dailyStats.find(s => s.date === todayStr);
  const completedToday = todayStats?.tasksCompleted || 0;
  const focusToday = todayStats?.focusMinutes || 0;

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    const isMod = e.metaKey || e.ctrlKey;

    // Undo/Redo always works
    if (isMod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (isMod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    // Skip remaining shortcuts if typing in an input
    if (isInput) return;

    // Page switching: 1-5
    if (PAGE_MAP[e.key]) {
      e.preventDefault();
      setActivePage(PAGE_MAP[e.key]);
      return;
    }

    // N: New task (only on tasks page)
    if (e.key === 'n' || e.key === 'N') {
      if (activePage === 'tasks') {
        e.preventDefault();
        setNewTaskTrigger(t => t + 1);
      }
      return;
    }

    // /: Focus search (only on tasks page)
    if (e.key === '/') {
      if (activePage === 'tasks') {
        e.preventDefault();
        setSearchTrigger(t => t + 1);
      }
      return;
    }

    // Esc: Close mobile sidebar
    if (e.key === 'Escape') {
      setSidebarOpen(false);
      return;
    }
  }, [activePage, undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger - mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-warm-sand/50 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-serif text-base lg:text-lg text-foreground leading-tight">Your Focus Assistant</h1>
              <p className="text-xs text-muted-foreground -mt-0.5 hidden sm:block">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-warm-sand/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-warm-sand/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 bg-warm-sage-light px-2.5 lg:px-3 py-1.5 rounded-full border border-warm-sage/20">
              <Smile className="w-3.5 h-3.5 text-warm-sage" />
              <span className="text-xs font-medium text-warm-charcoal">{completedToday}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-warm-blue-light px-2.5 lg:px-3 py-1.5 rounded-full border border-warm-blue/20">
              <Clock className="w-3.5 h-3.5 text-warm-blue" />
              <span className="text-xs font-medium text-warm-charcoal">{focusToday}m</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {activePage === 'tasks' && <TasksPage newTaskTrigger={newTaskTrigger} searchTrigger={searchTrigger} />}
          {activePage === 'timer' && <TimerPage />}
          {activePage === 'matrix' && <MatrixPage />}
          {activePage === 'stats' && <StatsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
