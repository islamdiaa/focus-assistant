/**
 * Scratch Pad Drawer — Always-accessible quick capture for ideas
 *
 * Slide-out drawer from the right edge. Captures freeform thoughts
 * that can later be converted to tasks. Designed for ADHD-friendly
 * quick capture without losing context.
 */
import { useState, useRef, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { X, CheckSquare, Trash2, StickyNote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface ScratchPadDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ScratchPadDrawer({
  open,
  onClose,
}: ScratchPadDrawerProps) {
  const { state, dispatch } = useApp();
  const [newText, setNewText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const notes = state.scratchPad || [];

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  function handleAdd() {
    if (!newText.trim()) return;
    dispatch({ type: "ADD_SCRATCH_NOTE", payload: { text: newText.trim() } });
    setNewText("");
    inputRef.current?.focus();
  }

  function handleConvert(id: string) {
    dispatch({ type: "CONVERT_SCRATCH_TO_TASK", payload: id });
  }

  function handleDelete(id: string) {
    dispatch({ type: "DELETE_SCRATCH_NOTE", payload: id });
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 lg:w-96 z-40 bg-card border-l border-border shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-warm-amber" />
                <h3 className="font-serif text-lg text-foreground">
                  Scratch Pad
                </h3>
                {notes.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-warm-sand/50 px-1.5 py-0.5 rounded-full">
                    {notes.length}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-warm-sand/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder="Capture a thought..."
                  className="bg-background text-sm"
                />
                <Button
                  onClick={handleAdd}
                  size="sm"
                  disabled={!newText.trim()}
                  className="bg-warm-amber hover:bg-warm-amber/90 text-white shrink-0"
                >
                  Add
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1 keyboard-hint">
                Press{" "}
                <kbd className="px-1 py-0.5 bg-warm-sand/50 rounded text-[9px] font-mono">
                  I
                </kbd>{" "}
                to toggle
              </p>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <StickyNote className="w-10 h-10 text-warm-amber/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Your ideas land here
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Type a thought and hit Enter
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {notes.map(note => (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.2 }}
                        className="group bg-background rounded-lg border border-border/50 p-3 hover:shadow-sm transition-shadow"
                      >
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                          {note.text}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatTime(note.createdAt)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleConvert(note.id)}
                              className="p-1.5 rounded text-muted-foreground/60 hover:text-warm-sage hover:bg-warm-sage-light transition-colors"
                              title="Convert to task"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="p-1.5 rounded text-muted-foreground/60 hover:text-warm-terracotta hover:bg-warm-terracotta-light transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
