/**
 * Home — Main layout with sidebar navigation
 * Desktop: fixed sidebar + content
 * Mobile: hamburger menu + full-width content
 */
import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import TasksPage from './TasksPage';
import TimerPage from './TimerPage';
import MatrixPage from './MatrixPage';
import StatsPage from './StatsPage';
import SettingsPage from './SettingsPage';
import { useApp } from '@/contexts/AppContext';
import { Smile, Clock, Menu } from 'lucide-react';

type Page = 'tasks' | 'timer' | 'matrix' | 'stats' | 'settings';

const MOTIVATIONAL = [
  'Your brain is powerful!',
  'You can do hard things.',
  'One step at a time.',
  'Progress, not perfection.',
  'Stay curious, stay focused.',
];

export default function Home() {
  const [activePage, setActivePage] = useState<Page>('tasks');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { state } = useApp();

  const subtitle = useMemo(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)], []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayStats = state.dailyStats.find(s => s.date === todayStr);
  const completedToday = todayStats?.tasksCompleted || 0;
  const focusToday = todayStats?.focusMinutes || 0;

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
          {activePage === 'tasks' && <TasksPage />}
          {activePage === 'timer' && <TimerPage />}
          {activePage === 'matrix' && <MatrixPage />}
          {activePage === 'stats' && <StatsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
