/**
 * QuickAddDialog — Global quick-add for tasks, accessible from any page
 *
 * Triggered by:
 * - N key (when not in input, not on tasks/planner page) — global catch-all
 * - Ctrl+N / Cmd+N — works even when focused in an input
 * - "Add new task" action in CommandPalette
 *
 * Fields: title (required), priority (default medium), category (optional), due date (optional)
 * On submit: dispatches ADD_TASK via AppContext reducer
 */
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import type { Priority, Category } from "@shared/appTypes";

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "health", label: "Health" },
  { value: "learning", label: "Learning" },
  { value: "errands", label: "Errands" },
  { value: "other", label: "Other" },
];

export default function QuickAddDialog({
  open,
  onOpenChange,
}: QuickAddDialogProps) {
  const { dispatch } = useApp();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState<Category | "">("");
  const [dueDate, setDueDate] = useState("");

  // Reset form and auto-focus title when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setPriority("medium");
      setCategory("");
      setDueDate("");
      // Use requestAnimationFrame to ensure the dialog is mounted before focusing
      requestAnimationFrame(() => {
        titleRef.current?.focus();
      });
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    dispatch({
      type: "ADD_TASK",
      payload: {
        title: trimmed,
        priority,
        category: category || undefined,
        dueDate: dueDate || undefined,
      },
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md glass-subtle bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Quick Add Task
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add a new task. Fill in the title and optionally set priority,
            category, and due date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Title */}
          <div>
            <label
              htmlFor="quick-add-title"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
            >
              Task title <span className="text-destructive">*</span>
            </label>
            <Input
              id="quick-add-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              className="bg-background"
              autoComplete="off"
            />
          </div>

          {/* Priority + Category row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label
                htmlFor="quick-add-priority"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
              >
                Priority
              </label>
              <select
                id="quick-add-priority"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="quick-add-category"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
              >
                Category
              </label>
              <select
                id="quick-add-category"
                value={category}
                onChange={e => setCategory(e.target.value as Category | "")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              >
                <option value="">None</option>
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label
              htmlFor="quick-add-due"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
            >
              Due date
            </label>
            <Input
              id="quick-add-due"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 bg-warm-sage hover:bg-warm-sage/90 text-[oklch(0.18_0.01_155)] font-medium"
            >
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
