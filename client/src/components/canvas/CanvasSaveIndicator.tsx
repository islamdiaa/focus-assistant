import { Cloud, Loader2, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasSaveIndicatorProps {
  status: "saved" | "saving" | "unsaved";
}

const statusConfig = {
  saved: {
    icon: Cloud,
    label: "Saved",
    color: "text-warm-sage",
  },
  saving: {
    icon: Loader2,
    label: "Saving...",
    color: "text-warm-amber",
  },
  unsaved: {
    icon: CloudOff,
    label: "Unsaved",
    color: "text-muted-foreground",
  },
} as const;

export function CanvasSaveIndicator({ status }: CanvasSaveIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-all duration-300 ease-in-out",
        config.color
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 transition-all duration-300",
          status === "saving" && "animate-spin"
        )}
      />
      <span className="transition-opacity duration-300">{config.label}</span>
    </div>
  );
}
