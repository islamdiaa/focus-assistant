import confetti from "canvas-confetti";

/**
 * Fire a celebration confetti burst.
 * Uses the canvas-confetti library for zero-dependency animations.
 */
export function fireConfetti() {
  // Check for reduced motion preference
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ["#7CB77A", "#D4A843", "#C27A5A", "#8B9FD4", "#C4A0D4"],
    disableForReducedMotion: true,
  });
}

/**
 * Get a milestone message based on tasks completed today.
 * Returns null if no milestone reached.
 */
export function getMilestoneMessage(completedToday: number): string | null {
  const milestones: Record<number, string> = {
    1: "First task done! You're rolling!",
    3: "3 tasks crushed! You're on fire!",
    5: "5 tasks today! Incredible focus!",
    10: "10 tasks?! You're unstoppable!",
    15: "15 tasks! Legendary productivity!",
    20: "20 tasks! Are you even human?!",
  };
  return milestones[completedToday] ?? null;
}
