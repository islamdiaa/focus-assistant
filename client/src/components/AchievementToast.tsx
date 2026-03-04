/**
 * AchievementToast — animated badge shown when a new achievement is unlocked.
 *
 * Uses framer-motion for entrance/exit animation.
 * Glass styling with warm-amber accent.
 * Auto-dismisses after 5 seconds.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ListChecks,
  Zap,
  Star,
  Target,
  Flame,
  Calendar,
  Sparkles,
  Award,
  Trophy,
  Brain,
  X,
} from "lucide-react";
import type { Achievement } from "@/lib/achievements";

// ---- Icon map (Lucide icon name → component) ----
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle2,
  ListChecks,
  Zap,
  Star,
  Target,
  Flame,
  Calendar,
  Sparkles,
  Award,
  Trophy,
  Brain,
};

function AchievementIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? Star;
  return <Icon className={className} />;
}

// ---- Single toast card ----
interface AchievementToastCardProps {
  achievement: Achievement;
  onDismiss: () => void;
}

function AchievementToastCard({
  achievement,
  onDismiss,
}: AchievementToastCardProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      role="status"
      aria-live="polite"
      className="relative flex items-start gap-3 w-72 rounded-xl border border-warm-amber/30 bg-card/90 backdrop-blur-[20px] shadow-lg p-3.5"
      style={{
        background: "oklch(var(--card) / 0.92)",
      }}
    >
      {/* Amber accent bar */}
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-warm-amber" />

      {/* Icon badge */}
      <div className="shrink-0 w-9 h-9 rounded-lg bg-warm-amber-light dark:bg-warm-amber/15 flex items-center justify-center">
        <AchievementIcon
          name={achievement.icon}
          className="w-4.5 h-4.5 text-warm-amber"
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-amber mb-0.5">
          Achievement Unlocked
        </p>
        <p className="text-sm font-semibold text-foreground leading-snug">
          {achievement.title}
        </p>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
          {achievement.description}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss achievement notification"
        className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ---- Container: stacks multiple toasts ----
interface AchievementToastProps {
  achievements: Achievement[];
  onDismiss: (id: string) => void;
}

export default function AchievementToast({
  achievements,
  onDismiss,
}: AchievementToastProps) {
  return (
    <div
      aria-label="Achievement notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end"
    >
      <AnimatePresence mode="popLayout">
        {achievements.map(a => (
          <AchievementToastCard
            key={a.id}
            achievement={a}
            onDismiss={() => onDismiss(a.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---- Hook: manages which achievements are queued for display ----
export function useAchievementToast() {
  const [queue, setQueue] = useState<Achievement[]>([]);

  function enqueue(achievements: Achievement[]) {
    if (achievements.length === 0) return;
    setQueue(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const fresh = achievements.filter(a => !existingIds.has(a.id));
      return [...prev, ...fresh];
    });
  }

  function dismiss(id: string) {
    setQueue(prev => prev.filter(a => a.id !== id));
  }

  return { queue, enqueue, dismiss };
}
