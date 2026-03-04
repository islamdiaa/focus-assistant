/**
 * EnergySelector — Reusable energy level picker with emoji + label.
 * Used in task create/edit forms across TasksPage.
 * Supports deselection (clicking the active energy level deselects it).
 */
import type { EnergyLevel } from "@/lib/types";
import { ENERGY_CONFIG } from "@/lib/constants";

export interface EnergySelectorProps {
  value: EnergyLevel | null;
  onChange: (energy: EnergyLevel | null) => void;
  labelId?: string;
  size?: "sm" | "md";
}

const ENERGY_LEVELS = Object.keys(ENERGY_CONFIG) as EnergyLevel[];

export function EnergySelector({
  value,
  onChange,
  labelId,
  size = "md",
}: EnergySelectorProps) {
  const btnClass = size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm";

  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="group"
      aria-labelledby={labelId}
    >
      {ENERGY_LEVELS.map(e => (
        <button
          key={e}
          type="button"
          aria-pressed={value === e}
          onClick={() => onChange(value === e ? null : e)}
          className={`${btnClass} rounded-lg font-medium border-2 transition-colors duration-200 flex items-center gap-1.5 motion-safe:active:scale-[0.97]
            ${value === e ? "bg-warm-amber-light text-warm-amber border-warm-amber/40 shadow-sm scale-[1.02]" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"}`}
        >
          <span aria-hidden="true">{ENERGY_CONFIG[e].emoji}</span>
          <span>{ENERGY_CONFIG[e].label}</span>
        </button>
      ))}
    </div>
  );
}
