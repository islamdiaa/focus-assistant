/**
 * Sidebar — Warm Productivity design
 * Narrow left rail with icon + label navigation
 * Daily tip card at bottom
 * Warm cream background with sage active states
 */
import { CheckSquare, Timer, LayoutGrid, BarChart3, Settings, Sparkles } from 'lucide-react';
import { DAILY_TIPS } from '@/lib/types';
import { useMemo } from 'react';

type Page = 'tasks' | 'timer' | 'matrix' | 'stats' | 'settings';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof CheckSquare }[] = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'matrix', label: 'Matrix', icon: LayoutGrid },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const tip = useMemo(() => DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)], []);

  return (
    <aside className="w-56 shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-warm-sage/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-warm-sage" />
          </div>
          <div>
            <h1 className="font-serif text-lg leading-tight text-foreground">Focus</h1>
            <p className="text-xs text-muted-foreground leading-tight">Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-warm-sage/15 text-warm-charcoal'
                  : 'text-muted-foreground hover:bg-warm-sand/50 hover:text-foreground'
                }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-warm-sage' : ''}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Daily Tip */}
      <div className="px-3 pb-4">
        <div className="bg-warm-amber-light rounded-xl p-4 border border-warm-amber/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-warm-amber" />
            <span className="text-xs font-semibold text-warm-charcoal uppercase tracking-wide">Daily Tip</span>
          </div>
          <p className="text-xs text-warm-charcoal/80 leading-relaxed">{tip}</p>
        </div>
      </div>
    </aside>
  );
}
