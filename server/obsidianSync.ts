/**
 * Obsidian Vault Sync
 *
 * Writes a formatted FocusAssist.md file to the configured Obsidian vault path.
 * Called on every save when auto-sync is enabled and vault path is set.
 *
 * The output file is Obsidian-friendly with:
 * - YAML frontmatter for metadata
 * - Task lists with checkboxes
 * - Tags as #hashtags
 * - Reading list with links
 * - Daily stats summary
 */
import fs from "fs/promises";
import path from "path";
import type { AppState, Task, ReadingItem } from "../shared/appTypes";

const PRIORITY_EMOJI: Record<string, string> = {
  urgent: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function generateObsidianMarkdown(state: AppState): string {
  const now = new Date();
  const lines: string[] = [];

  // YAML frontmatter
  lines.push("---");
  lines.push(`title: FocusAssist Dashboard`);
  lines.push(`updated: ${now.toISOString()}`);
  lines.push(`tags: [focusassist, productivity]`);
  lines.push(`streak: ${state.currentStreak}`);
  lines.push("---");
  lines.push("");

  // Header
  lines.push("# 🎯 FocusAssist");
  lines.push("");
  lines.push(
    `> Last synced: ${now.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
  );
  lines.push(`> Current streak: **${state.currentStreak} days**`);
  lines.push("");

  // Active Tasks
  const activeTasks = state.tasks.filter(t => t.status === "active");
  const doneTasks = state.tasks.filter(t => t.status === "done");

  lines.push("## 📋 Active Tasks");
  lines.push("");
  if (activeTasks.length === 0) {
    lines.push("_No active tasks._");
  } else {
    // Group by quadrant
    const quadrants: Record<string, Task[]> = {
      "do-first": [],
      schedule: [],
      delegate: [],
      eliminate: [],
      unassigned: [],
    };
    activeTasks.forEach(t => {
      (quadrants[t.quadrant] || quadrants["unassigned"]).push(t);
    });

    const quadrantLabels: Record<string, string> = {
      "do-first": "🔥 Do First",
      schedule: "📅 Schedule",
      delegate: "👥 Delegate",
      eliminate: "🗑️ Eliminate",
      unassigned: "📥 Inbox",
    };

    for (const [q, tasks] of Object.entries(quadrants)) {
      if (tasks.length === 0) continue;
      lines.push(`### ${quadrantLabels[q]}`);
      lines.push("");
      for (const t of tasks) {
        const emoji = PRIORITY_EMOJI[t.priority] || "";
        const due = t.dueDate ? ` 📅 ${t.dueDate}` : "";
        const cat = t.category ? ` #${t.category}` : "";
        lines.push(`- [ ] ${emoji} **${t.title}**${due}${cat}`);
        if (t.description) {
          lines.push(`  - ${t.description}`);
        }
        if (t.subtasks && t.subtasks.length > 0) {
          for (const s of t.subtasks) {
            lines.push(`  - [${s.done ? "x" : " "}] ${s.title}`);
          }
        }
      }
      lines.push("");
    }
  }

  // Recently Completed
  if (doneTasks.length > 0) {
    lines.push("## ✅ Recently Completed");
    lines.push("");
    const recent = doneTasks
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
      .slice(0, 20);
    for (const t of recent) {
      const completed = t.completedAt ? ` (${formatDate(t.completedAt)})` : "";
      lines.push(`- [x] ~~${t.title}~~${completed}`);
    }
    lines.push("");
  }

  // Reading List
  const readingList = state.readingList || [];
  if (readingList.length > 0) {
    lines.push("## 📚 Reading List");
    lines.push("");

    const unread = readingList.filter(r => r.status === "unread");
    const reading = readingList.filter(r => r.status === "reading");
    const read = readingList.filter(r => r.status === "read");

    if (unread.length > 0) {
      lines.push("### 📥 Unread");
      lines.push("");
      for (const r of unread) {
        const tags =
          r.tags.length > 0 ? ` ${r.tags.map(t => `#${t}`).join(" ")}` : "";
        lines.push(`- [ ] [${r.title}](${r.url})${tags}`);
        if (r.description) lines.push(`  - ${r.description}`);
      }
      lines.push("");
    }

    if (reading.length > 0) {
      lines.push("### 📖 Currently Reading");
      lines.push("");
      for (const r of reading) {
        const tags =
          r.tags.length > 0 ? ` ${r.tags.map(t => `#${t}`).join(" ")}` : "";
        lines.push(`- [ ] [${r.title}](${r.url})${tags}`);
        if (r.notes) lines.push(`  - 📝 ${r.notes.split("\n")[0]}`);
      }
      lines.push("");
    }

    if (read.length > 0) {
      lines.push("### ✅ Read");
      lines.push("");
      for (const r of read.slice(0, 20)) {
        const readDate = r.readAt ? ` (${formatDate(r.readAt)})` : "";
        lines.push(`- [x] [${r.title}](${r.url})${readDate}`);
        if (r.notes) lines.push(`  - 📝 ${r.notes.split("\n")[0]}`);
      }
      lines.push("");
    }
  }

  // Stats
  if (state.dailyStats.length > 0) {
    lines.push("## 📊 Recent Stats");
    lines.push("");
    lines.push("| Date | Tasks Done | Focus (min) | Pomodoros |");
    lines.push("|------|-----------|-------------|----------|");
    const recentStats = [...state.dailyStats]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);
    for (const s of recentStats) {
      lines.push(
        `| ${s.date} | ${s.tasksCompleted} | ${s.focusMinutes} | ${s.pomodorosCompleted} |`
      );
    }
    lines.push("");
  }

  // Timer Settings
  lines.push("## ⏱️ Timer Settings");
  lines.push("");
  lines.push(`- Focus: ${state.settings.focusDuration} min`);
  lines.push(`- Short Break: ${state.settings.shortBreak} min`);
  lines.push(`- Long Break: ${state.settings.longBreak} min`);
  lines.push(
    `- Sessions before long break: ${state.settings.sessionsBeforeLongBreak}`
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Sync state to Obsidian vault.
 * Returns true if sync succeeded, false if skipped or failed.
 */
export async function syncToObsidian(
  state: AppState
): Promise<{ synced: boolean; error?: string }> {
  const prefs = state.preferences;
  if (!prefs?.obsidianAutoSync || !prefs?.obsidianVaultPath) {
    return { synced: false };
  }

  const vaultPath = prefs.obsidianVaultPath.trim();
  if (!vaultPath) return { synced: false };

  try {
    // Ensure vault directory exists
    await fs.mkdir(vaultPath, { recursive: true });

    const filePath = path.join(vaultPath, "FocusAssist.md");
    const content = generateObsidianMarkdown(state);
    await fs.writeFile(filePath, content, "utf-8");

    return { synced: true };
  } catch (err: any) {
    console.error("[ObsidianSync] Failed to write to vault:", err.message);
    return { synced: false, error: err.message };
  }
}
