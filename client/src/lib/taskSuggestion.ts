import type { Task } from "./types";

interface SuggestionScore {
  task: Task;
  score: number;
  reasons: string[];
}

/**
 * Score tasks to suggest the best next task based on:
 * - Priority weight (urgent=40, high=30, medium=20, low=10)
 * - Due date urgency (overdue=30, today=25, tomorrow=15, this week=10)
 * - Energy match to time of day (morning=high, afternoon=medium, evening=low)
 * - Shorter tasks get a small boost (under 30min=10, under 60min=5)
 * - Pinned today tasks get a boost (+15)
 */
export function suggestNextTask(tasks: Task[]): SuggestionScore | null {
  // Filter to only active (not done/monitored) tasks
  const candidates = tasks.filter(t => t.status === "active");
  if (candidates.length === 0) return null;

  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().split("T")[0];

  const scored: SuggestionScore[] = candidates.map(task => {
    let score = 0;
    const reasons: string[] = [];

    // Priority
    const priorityScores: Record<string, number> = {
      urgent: 40,
      high: 30,
      medium: 20,
      low: 10,
    };
    score += priorityScores[task.priority] || 10;
    if (task.priority === "urgent" || task.priority === "high") {
      reasons.push(`${task.priority} priority`);
    }

    // Due date urgency
    if (task.dueDate) {
      const due = new Date(task.dueDate + "T23:59:59");
      const diffDays = Math.ceil(
        (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 0) {
        score += 30;
        reasons.push("overdue");
      } else if (diffDays === 0) {
        score += 25;
        reasons.push("due today");
      } else if (diffDays === 1) {
        score += 15;
        reasons.push("due tomorrow");
      } else if (diffDays <= 7) {
        score += 10;
        reasons.push("due this week");
      }
    }

    // Energy match (morning 6-12 = high, afternoon 12-17 = medium, evening = low)
    const timeEnergy =
      hour >= 6 && hour < 12 ? "high" : hour < 17 ? "medium" : "low";
    if (task.energy && task.energy === timeEnergy) {
      score += 15;
      reasons.push("matches your energy right now");
    }

    // Shorter tasks boost
    const mins =
      typeof task.estimatedMinutes === "number" ? task.estimatedMinutes : 0;
    if (mins > 0 && mins <= 30) {
      score += 10;
      reasons.push("quick win");
    } else if (mins > 0 && mins <= 60) {
      score += 5;
      reasons.push("manageable size");
    }

    // Pinned today boost
    if (task.pinnedToday === today) {
      score += 15;
      reasons.push("pinned for today");
    }

    return { task, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] || null;
}
