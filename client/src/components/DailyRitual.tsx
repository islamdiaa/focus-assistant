import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";

interface DailyRitualProps {
  mode: "morning" | "evening";
  tasks: Task[];
  onComplete: (data: {
    focusIntention?: string;
    carryForward: string[];
  }) => void;
  onDismiss: () => void;
}

// Animation variants — static, no dependency on props/state
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

/**
 * Daily Planning Ritual — guided start/end of day overlay for ADHD users.
 *
 * Morning: review yesterday's unfinished tasks, set a focus intention, start the day.
 * Evening: review accomplishments, carry forward unfinished tasks, end the day.
 */
export default function DailyRitual({
  mode,
  tasks,
  onComplete,
  onDismiss,
}: DailyRitualProps) {
  const isMorning = mode === "morning";

  // ---- Derived task lists ----
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .split("T")[0];

  const unfinishedTasks = useMemo(
    () =>
      tasks.filter(t => {
        if (t.status === "done") return false;
        if (isMorning) {
          // Morning: show tasks pinned to yesterday or due yesterday that are still active
          return (
            t.pinnedToday === yesterday ||
            (t.dueDate && t.dueDate <= yesterday && t.status === "active")
          );
        }
        // Evening: show today's active tasks that aren't done
        return (
          t.pinnedToday === today ||
          (t.dueDate === today && t.status === "active")
        );
      }),
    [tasks, isMorning, today, yesterday]
  );

  const completedToday = useMemo(
    () =>
      tasks.filter(
        t =>
          t.status === "done" &&
          t.completedAt &&
          t.completedAt.startsWith(today)
      ),
    [tasks, today]
  );

  // ---- Local state ----
  const [step, setStep] = useState(0);
  const [focusIntention, setFocusIntention] = useState("");
  const [carryForwardIds, setCarryForwardIds] = useState<Set<string>>(
    () => new Set(unfinishedTasks.map(t => t.id))
  );

  const toggleCarryForward = (id: string) => {
    setCarryForwardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleComplete = () => {
    onComplete({
      focusIntention: isMorning ? focusIntention || undefined : undefined,
      carryForward: Array.from(carryForwardIds),
    });
  };

  // ---- Step definitions ----
  const morningSteps = [
    unfinishedTasks.length > 0 ? "carry-forward" : null,
    "focus-intention",
  ].filter(Boolean) as string[];

  const eveningSteps = [
    "accomplishments",
    unfinishedTasks.length > 0 ? "carry-forward" : null,
  ].filter(Boolean) as string[];

  const steps = isMorning ? morningSteps : eveningSteps;
  const currentStep = steps[step] ?? "done";
  const isLastStep = step >= steps.length - 1;

  const advanceOrComplete = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  // ---- Focus trap ----
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      (previousFocusRef.current as HTMLElement)?.focus?.();
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onDismiss]
  );

  // ---- Accent color ----
  const accentClass = isMorning ? "text-warm-sage" : "text-warm-amber";
  const accentBgClass = isMorning
    ? "bg-warm-sage/90 hover:bg-warm-sage"
    : "bg-warm-amber/90 hover:bg-warm-amber";

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm bg-black/40 dark:bg-black/60"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-lg mx-4 rounded-2xl glass-heavy border border-white/20 dark:border-white/10 shadow-2xl p-6 sm:p-8 text-foreground outline-none"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label={
          isMorning ? "Morning planning ritual" : "Evening review ritual"
        }
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {isMorning ? (
            <Sun className={`size-7 ${accentClass}`} aria-hidden="true" />
          ) : (
            <Moon className={`size-7 ${accentClass}`} aria-hidden="true" />
          )}
          <div>
            <h2 className="font-['DM_Serif_Display'] text-3xl leading-tight">
              {isMorning ? "Good morning!" : "Great work today!"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isMorning
                ? "Let\u2019s plan your day."
                : "Let\u2019s review your day."}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        {steps.length > 1 && (
          <div
            className="flex gap-1.5 mb-5"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`Step ${step + 1} of ${steps.length}`}
          >
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step
                    ? isMorning
                      ? "bg-warm-sage"
                      : "bg-warm-amber"
                    : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        )}

        {/* Step content */}
        <div className="min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {currentStep === "carry-forward" && (
                <CarryForwardStep
                  tasks={unfinishedTasks}
                  selected={carryForwardIds}
                  onToggle={toggleCarryForward}
                  isMorning={isMorning}
                />
              )}

              {currentStep === "focus-intention" && (
                <FocusIntentionStep
                  value={focusIntention}
                  onChange={setFocusIntention}
                />
              )}

              {currentStep === "accomplishments" && (
                <AccomplishmentsStep tasks={completedToday} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onDismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors motion-safe:active:scale-[0.97]"
          >
            {isMorning ? "Skip for now" : "Dismiss"}
          </button>

          <Button
            onClick={advanceOrComplete}
            className={`${accentBgClass} text-white shadow-md`}
          >
            {isLastStep ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                {isMorning ? "Start My Day" : "End My Day"}
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---- Sub-step components ----

function CarryForwardStep({
  tasks,
  selected,
  onToggle,
  isMorning,
}: {
  tasks: Task[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  isMorning: boolean;
}) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">
        {isMorning
          ? "Yesterday\u2019s unfinished tasks"
          : "Tasks to carry forward"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {isMorning
          ? "Check the ones you\u2019d like to carry into today."
          : "Select tasks to move to tomorrow."}
      </p>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground/70 italic">
          No unfinished tasks. Nice work!
        </p>
      ) : (
        <ul className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          {tasks.map(task => (
            <li key={task.id}>
              <label className="flex items-center gap-3 p-2.5 rounded-xl glass-subtle border border-white/10 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                <input
                  type="checkbox"
                  checked={selected.has(task.id)}
                  onChange={() => onToggle(task.id)}
                  className="size-4 rounded accent-warm-sage shrink-0"
                />
                <span className="text-sm leading-snug">{task.title}</span>
                {task.priority === "high" || task.priority === "urgent" ? (
                  <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold text-warm-terracotta shrink-0">
                    {task.priority}
                  </span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FocusIntentionStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">
        What&apos;s your main focus for today?
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        One clear intention keeps your ADHD brain on track.
      </p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='e.g. "Finish the project proposal"'
        className="w-full rounded-xl glass-subtle border border-white/20 dark:border-white/10 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-warm-sage/40 transition-shadow bg-transparent"
        autoFocus
        maxLength={200}
      />
      <p className="text-xs text-muted-foreground/70 mt-2 text-right">
        {value.length}/200
      </p>
    </div>
  );
}

function AccomplishmentsStep({ tasks }: { tasks: Task[] }) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">
        Today&apos;s accomplishments
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        You completed{" "}
        <span className="font-semibold text-warm-sage">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>{" "}
        today. Well done!
      </p>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground/70 italic">
          No completed tasks yet — but showing up counts!
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
          {tasks.map(task => (
            <li
              key={task.id}
              className="flex items-center gap-2.5 p-2 rounded-lg"
            >
              <Check
                className="size-4 text-warm-sage shrink-0"
                aria-hidden="true"
              />
              <span className="text-sm line-through text-muted-foreground">
                {task.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
