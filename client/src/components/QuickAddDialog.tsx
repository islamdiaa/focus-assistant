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
import { PrioritySelector } from "@/components/shared/PrioritySelector";
import { CategorySelector } from "@/components/shared/CategorySelector";
import type { Priority, Category } from "@/lib/types";

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickAddDialog({
  open,
  onOpenChange,
}: QuickAddDialogProps) {
  const { dispatch } = useApp();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState<Category | null>(null);
  const [dueDate, setDueDate] = useState("");

  // Reset form and auto-focus title when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setPriority("medium");
      setCategory(null);
      setDueDate("");
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

          {/* Priority */}
          <div>
            <span
              id="quick-add-priority-label"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
            >
              Priority
            </span>
            <PrioritySelector
              value={priority}
              onChange={setPriority}
              labelId="quick-add-priority-label"
              size="sm"
            />
          </div>

          {/* Category */}
          <div>
            <span
              id="quick-add-category-label"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block"
            >
              Category
            </span>
            <CategorySelector
              value={category}
              onChange={setCategory}
              labelId="quick-add-category-label"
              size="sm"
            />
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
