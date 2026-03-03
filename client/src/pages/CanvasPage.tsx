import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useCanvasAutoSave } from "@/hooks/useCanvasAutoSave";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { CanvasSaveIndicator } from "@/components/canvas/CanvasSaveIndicator";
import { cn } from "@/lib/utils";

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getPlaceholder(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Late night thoughts...";
  if (hour < 12) return "Good morning. What's on your mind?";
  if (hour < 17) return "Afternoon check-in. How's the day going?";
  if (hour < 21) return "Evening reflection. What went well today?";
  return "Winding down. Any last thoughts?";
}

export default function CanvasPage() {
  const { state, dispatch } = useApp();
  const [currentDate, setCurrentDate] = useState(todayString);

  const today = todayString();
  const isToday = currentDate === today;

  const entry = useMemo(
    () => (state.canvas || []).find(e => e.date === currentDate),
    [state.canvas, currentDate]
  );

  const { handleUpdate, saveStatus, flush } = useCanvasAutoSave({
    date: currentDate,
    dispatch,
  });

  const wordCount = useMemo(() => {
    if (entry?.wordCount != null) return entry.wordCount;
    return 0;
  }, [entry]);

  const goBack = useCallback(() => {
    flush();
    setCurrentDate(d => addDays(d, -1));
  }, [flush]);

  const goForward = useCallback(() => {
    flush();
    setCurrentDate(d => {
      const next = addDays(d, 1);
      return next <= todayString() ? next : d;
    });
  }, [flush]);

  const goToday = useCallback(() => {
    flush();
    setCurrentDate(todayString());
  }, [flush]);

  const placeholder = useMemo(() => getPlaceholder(), []);

  return (
    <div className="flex flex-col h-full">
      {/* Date navigation bar */}
      <div className="glass-subtle border-b px-4 py-3 flex items-center justify-center gap-3">
        <button
          onClick={goBack}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-[oklch(0.20_0.015_155)] transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4 text-warm-charcoal/70 dark:text-white/70" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-warm-charcoal/50 dark:text-white/50 shrink-0" />
          <span className="text-sm font-medium text-warm-charcoal dark:text-white/90 truncate">
            {formatDate(currentDate)}
          </span>
        </div>

        <button
          onClick={goForward}
          disabled={isToday}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            isToday
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-black/5 dark:hover:bg-[oklch(0.20_0.015_155)]"
          )}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4 text-warm-charcoal/70 dark:text-white/70" />
        </button>

        {!isToday && (
          <button
            onClick={goToday}
            className="ml-1 px-2.5 py-1 text-xs font-medium rounded-md bg-warm-sage/10 text-warm-sage hover:bg-warm-sage/20 transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <CanvasEditor
            content={entry?.content ?? ""}
            placeholder={placeholder}
            onUpdate={handleUpdate}
          />
        </div>
      </div>

      {/* Footer bar */}
      <div className="border-t border-black/5 dark:border-white/5 px-4 py-2 flex items-center justify-between">
        <CanvasSaveIndicator status={saveStatus} />
        <span className="text-xs text-muted-foreground">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
      </div>
    </div>
  );
}
