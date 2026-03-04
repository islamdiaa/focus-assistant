/**
 * PrioritySelector — Reusable pill-style priority picker.
 * Used in task create/edit forms across TasksPage and DailyPlannerPage.
 */
import type { Priority } from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants";

export interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  labelId?: string;
  size?: "sm" | "md";
}

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export function PrioritySelector({
  value,
  onChange,
  labelId,
  size = "md",
}: PrioritySelectorProps) {
  const btnClass = size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm";

  return (
    <div
      className="grid grid-cols-4 gap-2"
      role="group"
      aria-labelledby={labelId}
    >
      {PRIORITIES.map(p => (
        <button
          key={p}
          type="button"
          aria-pressed={value === p}
          onClick={() => onChange(p)}
          className={`${btnClass} rounded-lg font-medium border-2 transition-colors duration-200 motion-safe:active:scale-[0.97]
            ${value === p ? `${PRIORITY_COLORS[p]} border-current shadow-sm scale-[1.02]` : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
        >
          {PRIORITY_LABELS[p]}
        </button>
      ))}
    </div>
  );
}
