/**
 * CategorySelector — Reusable category picker with emoji + label.
 * Used in task create/edit forms across TasksPage.
 * Supports deselection (clicking the active category deselects it).
 */
import type { Category } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/constants";

export interface CategorySelectorProps {
  value: Category | null;
  onChange: (category: Category | null) => void;
  labelId?: string;
  size?: "sm" | "md";
}

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[];

export function CategorySelector({
  value,
  onChange,
  labelId,
  size = "md",
}: CategorySelectorProps) {
  const btnClass = size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm";

  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="group"
      aria-labelledby={labelId}
    >
      {CATEGORIES.map(c => (
        <button
          key={c}
          type="button"
          aria-pressed={value === c}
          onClick={() => onChange(value === c ? null : c)}
          className={`${btnClass} rounded-lg font-medium border-2 transition-all duration-200 flex items-center gap-1.5 motion-safe:active:scale-[0.97]
            ${value === c ? "bg-warm-sage-light text-warm-sage border-warm-sage/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
        >
          <span>{CATEGORY_CONFIG[c].emoji}</span>
          <span>{CATEGORY_CONFIG[c].label}</span>
        </button>
      ))}
    </div>
  );
}
