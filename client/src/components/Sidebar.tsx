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
  Crosshair,
  Lightbulb,
  BookOpen,
  Bell,
  Briefcase,
  User,
  Globe,
  PenLine,
  HelpCircle,
  FileText,
  CalendarCheck,
} from "lucide-react";
import { DAILY_TIPS } from "@/lib/types";
import type { ContextFilter } from "@/lib/types";
import { useMemo } from "react";

export type Page =
  | "planner"
  | "tasks"
  | "canvas"
  | "timer"
  | "matrix"
  | "stats"
  | "reading"
  | "reminders"
  | "templates"
  | "review"
  | "settings"
  | "help";

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
  section: string;
}[] = [
  // Core
  { id: "planner", label: "Today", icon: Sun, section: "Core" },
  { id: "tasks", label: "Tasks", icon: CheckSquare, section: "Core" },
  { id: "matrix", label: "Matrix", icon: LayoutGrid, section: "Core" },
  // Tools
  { id: "timer", label: "Focus Timer", icon: Timer, section: "Tools" },
  { id: "canvas", label: "Canvas", icon: PenLine, section: "Tools" },
  { id: "templates", label: "Templates", icon: FileText, section: "Tools" },
  // Knowledge
  { id: "reading", label: "Read Later", icon: BookOpen, section: "Knowledge" },
  { id: "reminders", label: "Reminders", icon: Bell, section: "Knowledge" },
  {
    id: "review",
    label: "Weekly Review",
    icon: CalendarCheck,
    section: "Knowledge",
  },
  // Meta
  { id: "stats", label: "Stats", icon: BarChart3, section: "Meta" },
  { id: "settings", label: "Settings", icon: Settings, section: "Meta" },
  { id: "help", label: "Help", icon: HelpCircle, section: "Meta" },
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

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 h-screen z-50 w-64 glass-heavy border-r border-white/20 flex flex-col
        transition-transform duration-300 ease-in-out
        md:sticky md:translate-x-0 md:w-56 md:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Logo + close button */}
        <div className="px-6 py-6 border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl backdrop-blur-md bg-warm-sage/25 shadow-md shadow-warm-sage/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-warm-sage" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight text-foreground">
                Focus
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Assistant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-[oklch(0.20_0.015_155)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context Switcher */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex backdrop-blur-md bg-white/30 dark:bg-[oklch(0.20_0.015_155)] rounded-xl p-0.5 gap-0.5">
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
                        ? "bg-white/70 dark:bg-[oklch(0.25_0.025_155)] text-warm-charcoal dark:text-foreground shadow-md backdrop-blur-sm"
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
        <nav
          aria-label="Main navigation"
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        >
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const showSection =
              i === 0 || NAV_ITEMS[i - 1].section !== item.section;

            return (
              <div key={item.id}>
                {showSection && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 pt-4 pb-1">
                    {item.section}
                  </p>
                )}
                <button
                  onClick={() => handleNav(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "bg-warm-sage/15 text-warm-charcoal backdrop-blur-md shadow-sm ring-1 ring-warm-sage/10"
                        : "text-muted-foreground hover:bg-white/40 dark:hover:bg-[oklch(0.20_0.015_155)] hover:text-foreground"
                    }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-warm-sage" />
                  )}
                  <Icon
                    className={`w-[18px] h-[18px] ${isActive ? "text-warm-sage" : ""}`}
                  />
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Focus Mode & Thoughts */}
        <div className="px-3 pb-2 pt-2 border-t border-white/10">
          {onFocusMode && (
            <button
              onClick={() => {
                onFocusMode();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-warm-sage hover:bg-warm-sage/10 motion-safe:active:scale-[0.97]"
            >
              <Crosshair className="w-[18px] h-[18px]" />
              Focus Mode
            </button>
          )}
          {onScratchPad && (
            <button
              onClick={() => {
                onScratchPad();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-warm-amber hover:bg-warm-amber/10 motion-safe:active:scale-[0.97]"
            >
              <Lightbulb className="w-[18px] h-[18px]" />
              Thoughts
            </button>
          )}
        </div>

        {/* Daily Tip */}
        <div className="px-3 pb-4">
          <div className="backdrop-blur-md bg-warm-amber/10 shadow-md shadow-warm-amber/5 rounded-xl p-4 border border-warm-amber/20">
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
