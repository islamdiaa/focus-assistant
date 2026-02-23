/**
 * Sidebar — Warm Productivity design
 * Desktop: fixed left rail with icon + label navigation + daily tip
 * Mobile: hidden by default, opens as overlay via hamburger button
 * V1.2: Added Daily Planner, Templates, Weekly Review, Focus Mode
 * V1.8.5: Added Work/Personal/All context switcher
 */
import {
  CheckSquare,
  Timer,
  LayoutGrid,
  BarChart3,
  Settings,
  Sparkles,
  X,
  Sun,
  FileText,
  CalendarCheck,
  Crosshair,
  Lightbulb,
  BookOpen,
  Bell,
  Briefcase,
  User,
  Globe,
} from "lucide-react";
import { DAILY_TIPS } from "@/lib/types";
import type { ContextFilter } from "@/lib/types";
import { useMemo } from "react";

export type Page =
  | "planner"
  | "tasks"
  | "timer"
  | "matrix"
  | "stats"
  | "reading"
  | "reminders"
  | "templates"
  | "review"
  | "settings";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
  onFocusMode?: () => void;
  onScratchPad?: () => void;
  activeContext: ContextFilter;
  onContextChange: (context: ContextFilter) => void;
}

const NAV_ITEMS: {
  id: Page;
  label: string;
  icon: typeof CheckSquare;
  section?: string;
}[] = [
  { id: "planner", label: "Today", icon: Sun },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "timer", label: "Focus Timer", icon: Timer },
  { id: "matrix", label: "Matrix", icon: LayoutGrid },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "reading", label: "Read Later", icon: BookOpen, section: "Knowledge" },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "templates", label: "Templates", icon: FileText, section: "Tools" },
  { id: "review", label: "Weekly Review", icon: CalendarCheck },
  { id: "settings", label: "Settings", icon: Settings, section: "System" },
];

const CONTEXT_OPTIONS: {
  id: ContextFilter;
  label: string;
  icon: typeof Globe;
}[] = [
  { id: "all", label: "All", icon: Globe },
  { id: "work", label: "Work", icon: Briefcase },
  { id: "personal", label: "Personal", icon: User },
];

export default function Sidebar({
  activePage,
  onNavigate,
  isOpen,
  onClose,
  onFocusMode,
  onScratchPad,
  activeContext,
  onContextChange,
}: SidebarProps) {
  const tip = useMemo(
    () => DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)],
    []
  );

  function handleNav(page: Page) {
    onNavigate(page);
    onClose();
  }

  // Group items by section
  let lastSection: string | undefined;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 h-screen z-50 w-64 bg-card border-r border-border flex flex-col
        transition-transform duration-300 ease-in-out
        lg:sticky lg:translate-x-0 lg:w-56 lg:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Logo + close button */}
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-warm-sage/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-warm-sage" />
            </div>
            <div>
              <h1 className="font-serif text-lg leading-tight text-foreground">
                Focus
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Assistant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-warm-sand/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context Switcher */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex bg-warm-sand/40 rounded-lg p-0.5 gap-0.5">
            {CONTEXT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = activeContext === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onContextChange(opt.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                    ${
                      isActive
                        ? "bg-white text-warm-charcoal shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;

            return (
              <div key={item.id}>
                {showSection && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 pt-4 pb-1">
                    {item.section}
                  </p>
                )}
                <button
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "bg-warm-sage/15 text-warm-charcoal"
                        : "text-muted-foreground hover:bg-warm-sand/50 hover:text-foreground"
                    }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] ${isActive ? "text-warm-sage" : ""}`}
                  />
                  {item.label}
                </button>
              </div>
            );
          })}

          {/* Focus Mode button */}
          {onFocusMode && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 pt-4 pb-1">
                Quick Actions
              </p>
              <button
                onClick={() => {
                  onFocusMode();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-warm-sage hover:bg-warm-sage/10"
              >
                <Crosshair className="w-[18px] h-[18px]" />
                Focus Mode
              </button>
              {onScratchPad && (
                <button
                  onClick={() => {
                    onScratchPad();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-warm-amber hover:bg-warm-amber/10"
                >
                  <Lightbulb className="w-[18px] h-[18px]" />
                  Thoughts
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Daily Tip */}
        <div className="px-3 pb-4">
          <div className="bg-warm-amber-light rounded-xl p-4 border border-warm-amber/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-warm-amber" />
              <span className="text-xs font-semibold text-warm-charcoal uppercase tracking-wide">
                Daily Tip
              </span>
            </div>
            <p className="text-xs text-warm-charcoal/80 leading-relaxed">
              {tip}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
