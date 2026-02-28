/**
 * CommandPalette — Ctrl+K / Cmd+K quick navigation and task search
 *
 * Provides:
 * - Page navigation: search and jump to any page
 * - Task search: find tasks by title, navigate to Tasks page
 *
 * Keyboard: Arrow keys navigate, Enter selects, Escape closes
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import type { Page } from "@/components/Sidebar";
import {
  Sun,
  CheckSquare,
  Timer,
  LayoutGrid,
  BarChart3,
  BookOpen,
  Bell,
  FileText,
  CalendarCheck,
  Settings,
  Search,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (page: string) => void;
}

const PAGES: { id: Page; label: string; icon: typeof Sun }[] = [
  { id: "planner", label: "Today", icon: Sun },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "timer", label: "Focus Timer", icon: Timer },
  { id: "matrix", label: "Matrix", icon: LayoutGrid },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "reading", label: "Read Later", icon: BookOpen },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "review", label: "Weekly Review", icon: CalendarCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  done: "Done",
  monitored: "Monitored",
};

export default function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: CommandPaletteProps) {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter pages by query
  const filteredPages = useMemo(() => {
    if (!query.trim()) return PAGES;
    const q = query.toLowerCase();
    return PAGES.filter(p => p.label.toLowerCase().includes(q));
  }, [query]);

  // Search tasks by title (case-insensitive), limit to 10
  const filteredTasks = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return state.tasks
      .filter(t => t.title.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, state.tasks]);

  // Build flat list of all results for keyboard navigation
  const results = useMemo(() => {
    const items: { type: "page" | "task"; id: string; index: number }[] = [];
    filteredPages.forEach(p => {
      items.push({ type: "page", id: p.id, index: items.length });
    });
    filteredTasks.forEach(t => {
      items.push({ type: "task", id: t.id, index: items.length });
    });
    return items;
  }, [filteredPages, filteredTasks]);

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input after dialog animation
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Clamp selectedIndex when results change
  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const selectResult = useCallback(
    (index: number) => {
      const result = results[index];
      if (!result) return;
      if (result.type === "page") {
        onNavigate(result.id);
      } else {
        onNavigate("tasks");
      }
    },
    [results, onNavigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(1, results.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          i => (i - 1 + results.length) % Math.max(1, results.length)
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectResult(selectedIndex);
      }
    },
    [results.length, selectedIndex, selectResult]
  );

  // Track the flat index as we render sections
  let flatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-card p-0 gap-0 max-w-md sm:max-w-lg overflow-hidden top-[35%]"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search for pages or tasks
        </DialogDescription>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto py-2">
          {results.length === 0 && query.trim() && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              No results found.
            </p>
          )}

          {/* Pages section */}
          {filteredPages.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Pages
              </p>
              {filteredPages.map(page => {
                const Icon = page.icon;
                const idx = flatIndex++;
                return (
                  <button
                    key={page.id}
                    data-index={idx}
                    onClick={() => selectResult(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                      selectedIndex === idx
                        ? "bg-warm-sage/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{page.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tasks section */}
          {filteredTasks.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mt-1">
                Tasks
              </p>
              {filteredTasks.map(task => {
                const idx = flatIndex++;
                return (
                  <button
                    key={task.id}
                    data-index={idx}
                    onClick={() => selectResult(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                      selectedIndex === idx
                        ? "bg-warm-sage/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CheckSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                    <span className="font-medium truncate flex-1 text-left">
                      {task.title}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize",
                        PRIORITY_COLORS[task.priority] ||
                          "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono">
              &uarr;&darr;
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono">
              &crarr;
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono">
              esc
            </kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
