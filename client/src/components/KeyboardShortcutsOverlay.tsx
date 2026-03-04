/**
 * KeyboardShortcutsOverlay — Full-screen modal showing all keyboard shortcuts
 *
 * Triggered by pressing `?` (Shift+/) anywhere in the app, or via Command Palette.
 * Organized by category with key badges.
 * Closes on Escape, backdrop click, or X button.
 */
import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  label: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    label: "Navigation",
    items: [
      { keys: ["T"], description: "Today / Daily Planner" },
      { keys: ["K"], description: "Tasks" },
      { keys: ["M"], description: "Matrix" },
      { keys: ["P"], description: "Timer / Pomodoro" },
      { keys: ["C"], description: "Canvas" },
      { keys: ["R"], description: "Read Later" },
      { keys: ["E"], description: "Reminders" },
      { keys: ["W"], description: "Weekly Review" },
      { keys: ["S"], description: "Stats" },
      { keys: [","], description: "Settings" },
      { keys: ["H"], description: "Help & Guide" },
    ],
  },
  {
    label: "Actions",
    items: [
      { keys: ["Ctrl", "N"], description: "Quick Add Task" },
      { keys: ["Ctrl", "K"], description: "Command Palette" },
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["N"], description: "New Task (on Tasks / Today)" },
      { keys: ["F"], description: "Enter Focus Mode" },
      { keys: ["I"], description: "Toggle Scratch Pad" },
      { keys: ["?"], description: "This shortcut overlay" },
    ],
  },
  {
    label: "Search",
    items: [{ keys: ["/"], description: "Search tasks (on Tasks / Today)" }],
  },
  {
    label: "General",
    items: [{ keys: ["Esc"], description: "Close overlay / Exit Focus Mode" }],
  },
];

function KeyBadge({ label }: { label: string }) {
  return (
    <kbd className="bg-muted/50 border border-border rounded-md px-2 py-0.5 font-mono text-xs text-foreground">
      {label}
    </kbd>
  );
}

function ShortcutRow({ keys, description }: ShortcutItem) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground flex-1 min-w-0">
        {description}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-muted-foreground/50 text-xs select-none">
                +
              </span>
            )}
            <KeyBadge label={key} />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function KeyboardShortcutsOverlay({
  open,
  onClose,
}: KeyboardShortcutsOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="shortcuts-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="shortcuts-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                <h2
                  id="shortcuts-title"
                  className="font-display text-2xl text-foreground leading-tight"
                >
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close keyboard shortcuts"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors motion-safe:active:scale-[0.97]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {SHORTCUT_CATEGORIES.map(category => (
                    <div key={category.label}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                        {category.label}
                      </p>
                      <div className="divide-y divide-border/50">
                        {category.items.map((item, i) => (
                          <ShortcutRow key={i} {...item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer hint */}
              <div className="px-6 py-3 border-t border-border flex-shrink-0">
                <p className="text-xs text-muted-foreground/60">
                  Press{" "}
                  <kbd className="bg-muted/50 border border-border rounded px-1.5 py-0.5 font-mono text-xs">
                    Esc
                  </kbd>{" "}
                  or click outside to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
