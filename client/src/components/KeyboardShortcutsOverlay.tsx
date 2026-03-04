/**
 * KeyboardShortcutsOverlay — Full-screen modal showing all keyboard shortcuts
 *
 * Triggered by pressing `?` (Shift+/) anywhere in the app, or via Command Palette.
 * Organized by category with key badges.
 * Closes on Escape, backdrop click, or X button.
 * Focus is trapped inside the dialog while open and restored on close.
 */
import { useEffect, useCallback, useRef } from "react";
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
      { keys: ["1"], description: "Today / Daily Planner" },
      { keys: ["2"], description: "Tasks" },
      { keys: ["3"], description: "Timer / Pomodoro" },
      { keys: ["4"], description: "Matrix" },
      { keys: ["5"], description: "Stats" },
      { keys: ["6"], description: "Read Later" },
      { keys: ["7"], description: "Templates" },
      { keys: ["8"], description: "Weekly Review" },
      { keys: ["9"], description: "Settings" },
      { keys: ["0"], description: "Help & Guide" },
      { keys: ["C"], description: "Canvas" },
      { keys: ["H"], description: "Help & Guide" },
    ],
  },
  {
    label: "Actions",
    items: [
      { keys: ["Ctrl", "K"], description: "Command Palette" },
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["N"], description: "New Task (on Tasks / Today)" },
      { keys: ["R"], description: "New Reminder (on Tasks / Today)" },
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
          <span key={key} className="flex items-center gap-1">
            {i > 0 && (
              <span
                className="text-muted-foreground/50 text-xs select-none"
                aria-hidden="true"
              >
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Save previous focus and move focus into dialog on open
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Delay to let animation start
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap: Tab cycles within the dialog
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [open, onClose]
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
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none"
          >
            <div
              ref={panelRef}
              className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border flex-shrink-0">
                <h2
                  id="shortcuts-title"
                  className="font-serif text-xl sm:text-2xl text-foreground leading-tight"
                >
                  Keyboard Shortcuts
                </h2>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  aria-label="Close keyboard shortcuts"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors motion-safe:active:scale-[0.97]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {SHORTCUT_CATEGORIES.map(category => (
                    <div key={category.label}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                        {category.label}
                      </h3>
                      <div className="divide-y divide-border/50">
                        {category.items.map(item => (
                          <ShortcutRow key={item.description} {...item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer hint */}
              <div className="px-4 sm:px-6 py-3 border-t border-border flex-shrink-0">
                <p className="text-xs text-muted-foreground/70">
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
