/**
 * Home — Main layout with sidebar navigation
 * Desktop: fixed sidebar + content
 * Mobile: hamburger menu + full-width content
 * V1.2: Added Daily Planner, Templates, Weekly Review, Focus Mode
 * 
 * Keyboard shortcuts:
 * - Ctrl/Cmd+Z: Undo
 * - Ctrl/Cmd+Shift+Z: Redo
 * - 1-8: Switch pages (when no input focused)
 * - N: Open new task dialog (when on tasks page, no input focused)
 * - /: Focus search (when on tasks page, no input focused)
 * - F: Enter Focus Mode
 * - Esc: Close sidebar on mobile / Exit focus mode
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import Sidebar, { type Page } from '@/components/Sidebar';
import TasksPage from './TasksPage';
import TimerPage from './TimerPage';
import MatrixPage from './MatrixPage';
import StatsPage from './StatsPage';
import SettingsPage from './SettingsPage';
import DailyPlannerPage from './DailyPlannerPage';
import TemplatesPage from './TemplatesPage';
import WeeklyReviewPage from './WeeklyReviewPage';
import ReadLaterPage from './ReadLaterPage';
import RemindersPage from './RemindersPage';
import FocusModePage from './FocusModePage';
import { useApp } from '@/contexts/AppContext';
import { Smile, Clock, Menu, Undo2, Redo2, AlertTriangle, Cloud, CloudOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const MOTIVATIONAL = [
  'Your brain is powerful!',
  'You can do hard things.',
  'One step at a time.',
  'Progress, not perfection.',
  'Stay curious, stay focused.',
];

const PAGE_MAP: Record<string, Page> = {
  '1': 'planner',
  '2': 'tasks',
  '3': 'timer',
  '4': 'matrix',
  '5': 'stats',
  '6': 'reading',
  '7': 'templates',
  '8': 'review',
  '9': 'settings',
};

export default function Home() {
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [activePage, setActivePage] = useState<Page>('planner');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const { state, dispatch, canUndo, canRedo, undo, redo, saveStatus, saveError } = useApp();
  const activeContext = state.preferences?.activeContext || 'all';

  // Expose triggers for keyboard shortcuts in child components
  const [newTaskTrigger, setNewTaskTrigger] = useState(0);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [reminderTrigger, setReminderTrigger] = useState(0);

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

    // Esc: Exit focus mode or close sidebar
    if (e.key === 'Escape') {
      if (focusMode) {
        setFocusMode(false);
        return;
      }
      setSidebarOpen(false);
      return;
    }

    // Skip remaining shortcuts if typing in an input
    if (isInput) return;

    // F: Enter focus mode — skip if Cmd/Ctrl held (browser Find)
    if ((e.key === 'f' || e.key === 'F') && !isMod) {
      if (!focusMode) {
        e.preventDefault();
        setFocusMode(true);
      }
      return;
    }

    // Page switching: 1-8
    if (PAGE_MAP[e.key]) {
      e.preventDefault();
      setActivePage(PAGE_MAP[e.key]);
      return;
    }

    // N: New task (only on tasks page) — skip if Cmd/Ctrl held (new window)
    if ((e.key === 'n' || e.key === 'N') && !isMod) {
      if (activePage === 'tasks') {
        e.preventDefault();
        setNewTaskTrigger(t => t + 1);
      }
      return;
    }

    // R: New reminder (on tasks or reminders page) — skip if Cmd/Ctrl held (browser refresh)
    if ((e.key === 'r' || e.key === 'R') && !isMod) {
      if (activePage === 'tasks' || activePage === 'reminders') {
        e.preventDefault();
        setReminderTrigger(t => t + 1);
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
  }, [activePage, undo, redo, focusMode, setReminderTrigger]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Focus Mode Overlay */}
      {focusMode && (
        <FocusModePage onExit={() => setFocusMode(false)} />
      )}

      {/* Main Layout */}
      <div className={`flex min-h-screen bg-background ${focusMode ? 'hidden' : ''}`}>
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onFocusMode={() => setFocusMode(true)}
          activeContext={activeContext}
          onContextChange={(ctx) => dispatch({ type: 'SET_CONTEXT', payload: ctx })}
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

          {/* Save error banner */}
          {saveStatus === 'error' && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{saveError || 'Changes not saved to server. Data is cached locally.'}</span>
              <button
                onClick={() => { /* trigger manual retry */ import('@/lib/sheets').then(m => m.saveState(state)); }}
                className="text-xs font-medium px-2 py-1 rounded bg-red-100 hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {activePage === 'planner' && <DailyPlannerPage />}
            {activePage === 'tasks' && <TasksPage newTaskTrigger={newTaskTrigger} searchTrigger={searchTrigger} reminderTrigger={reminderTrigger} />}
            {activePage === 'timer' && <TimerPage />}
            {activePage === 'matrix' && <MatrixPage />}
            {activePage === 'stats' && <StatsPage />}
            {activePage === 'reading' && <ReadLaterPage />}
            {activePage === 'reminders' && <RemindersPage reminderTrigger={reminderTrigger} />}
            {activePage === 'templates' && <TemplatesPage />}
            {activePage === 'review' && <WeeklyReviewPage />}
            {activePage === 'settings' && <SettingsPage />}
          </main>
        </div>
      </div>
    </>
  );
}
