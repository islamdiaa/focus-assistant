/**
 * Help Page — Comprehensive app usage guide
 * Sections: Getting Started, Features Guide, Keyboard Shortcuts, Workflow Tips, Data & Privacy
 * Uses the app's glass UI styling with collapsible sections and lucide-react icons
 */
import { useState } from "react";
import {
  Sun,
  CheckSquare,
  Timer,
  LayoutGrid,
  BarChart3,
  BookOpen,
  Bell,
  FileText,
  CalendarCheck,
  PenLine,
  Crosshair,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Keyboard,
  Sparkles,
  Shield,
  Rocket,
  Brain,
  Target,
  HelpCircle,
  Star,
  GripVertical,
  Zap,
  Eye,
  Search,
  Command,
  Globe,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Collapsible Section Component                                      */
/* ------------------------------------------------------------------ */
function Section({
  title,
  icon: Icon,
  iconColor,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: typeof HelpCircle;
  iconColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass rounded-2xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconColor}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-serif text-lg text-foreground flex-1">{title}</h3>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-6 pt-1 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature Card Component                                             */
/* ------------------------------------------------------------------ */
function FeatureCard({
  icon: Icon,
  iconColor,
  title,
  children,
}: {
  icon: typeof HelpCircle;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background rounded-xl border border-white/15 dark:border-white/10 p-4 mb-3 last:mb-0">
      <div className="flex items-center gap-2.5 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tip Card Component                                                 */
/* ------------------------------------------------------------------ */
function TipCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-background rounded-xl border border-white/15 dark:border-white/10 p-4 mb-3 last:mb-0">
      <Lightbulb className="w-4 h-4 text-warm-amber mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        {children}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Keyboard Shortcut Row                                              */
/* ------------------------------------------------------------------ */
function KbdRow({ keys, action }: { keys: string; action: string }) {
  return (
    <tr className="border-b border-white/10 last:border-0">
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {keys.split(" / ").map((k, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-muted-foreground/50 text-[10px]">/</span>
              )}
              <kbd className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-mono font-medium text-foreground shadow-sm">
                {k}
              </kbd>
            </span>
          ))}
        </div>
      </td>
      <td className="py-2.5 text-xs text-muted-foreground">{action}</td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Help Page                                                     */
/* ------------------------------------------------------------------ */
export default function HelpPage() {
  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl backdrop-blur-md bg-warm-sage/25 shadow-md shadow-warm-sage/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-warm-sage" />
          </div>
          <div>
            <h2 className="font-serif text-2xl lg:text-3xl text-foreground">
              Help & Guide
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Everything you need to know about Focus Assistant
            </p>
          </div>
        </div>
      </div>

      {/* ========== GETTING STARTED ========== */}
      <Section
        title="Getting Started"
        icon={Rocket}
        iconColor="bg-warm-sage/15 text-warm-sage"
        defaultOpen={true}
      >
        <div className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            Focus Assistant is an ADHD-friendly productivity app designed to
            help you manage tasks, stay focused, and build consistent work
            habits. It uses warm colors, chunky interactive elements, and
            satisfying feedback to keep you motivated.
          </p>
          <div className="bg-warm-sage-light/30 rounded-xl border border-warm-sage/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-warm-sage mb-3">
              Quick Tour of the Sidebar
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  icon: Sun,
                  label: "Today",
                  desc: "Your daily planner & dashboard",
                },
                {
                  icon: CheckSquare,
                  label: "Tasks",
                  desc: "Create and manage all tasks",
                },
                {
                  icon: Timer,
                  label: "Focus Timer",
                  desc: "Pomodoro work sessions",
                },
                {
                  icon: LayoutGrid,
                  label: "Matrix",
                  desc: "Eisenhower priority matrix",
                },
                {
                  icon: BarChart3,
                  label: "Stats",
                  desc: "Streaks, charts & progress",
                },
                {
                  icon: PenLine,
                  label: "Canvas",
                  desc: "Freeform thought journal",
                },
                {
                  icon: BookOpen,
                  label: "Read Later",
                  desc: "Saved articles & links",
                },
                {
                  icon: Bell,
                  label: "Reminders",
                  desc: "Birthdays & appointments",
                },
                {
                  icon: FileText,
                  label: "Templates",
                  desc: "Reusable task templates",
                },
                {
                  icon: CalendarCheck,
                  label: "Weekly Review",
                  desc: "Reflect & plan ahead",
                },
              ].map(item => {
                const NavIcon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-background border border-white/15 dark:border-white/10"
                  >
                    <NavIcon className="w-4 h-4 text-warm-sage shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use the <strong>Context Switcher</strong> at the top of the sidebar
            to filter between <strong>Work</strong>, <strong>Personal</strong>,
            or <strong>All</strong> contexts. This filters tasks, reminders, and
            stats across the entire app.
          </p>
        </div>
      </Section>

      {/* ========== FEATURES GUIDE ========== */}
      <Section
        title="Features Guide"
        icon={Sparkles}
        iconColor="bg-warm-amber/15 text-warm-amber"
      >
        <FeatureCard icon={Sun} iconColor="text-warm-amber" title="Today View">
          <p>
            Your daily command center. Shows a motivational quote, today's stats
            (tasks completed, focus minutes), and everything you need for the
            day.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Focus Goals</strong> — Star up to 3 priority tasks as your
              daily focus goals with progress tracking (0/3 to 3/3)
            </li>
            <li>
              <strong>Due Tasks</strong> — Tasks due today are highlighted
              automatically
            </li>
            <li>
              <strong>Monitoring Section</strong> — Tasks you're waiting on from
              others appear here
            </li>
            <li>
              <strong>Reminders</strong> — Overdue, today, and upcoming 5 days
              shown at a glance
            </li>
            <li>
              <strong>Drag & Drop</strong> — Reorder pinned tasks by dragging
            </li>
            <li>
              <strong>Time Budget</strong> — Progress bar showing estimated vs.
              available hours
            </li>
          </ul>
        </FeatureCard>

        <FeatureCard
          icon={CheckSquare}
          iconColor="text-warm-sage"
          title="Tasks"
        >
          <p>
            Full-featured task management with everything you need to stay
            organized.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Priorities</strong> — Urgent, High, Medium, Low with
              color-coded badges
            </li>
            <li>
              <strong>Categories</strong> — Work or Personal, filtered by the
              context switcher
            </li>
            <li>
              <strong>Energy Levels</strong> — Tag tasks by mental energy
              required
            </li>
            <li>
              <strong>Due Dates</strong> — Set deadlines with overdue
              highlighting
            </li>
            <li>
              <strong>Subtasks</strong> — Break tasks into smaller steps with
              progress tracking
            </li>
            <li>
              <strong>Recurring Tasks</strong> — Daily, weekly, monthly, or
              quarterly recurrence
            </li>
            <li>
              <strong>Filter Tabs</strong> — All, Open, Monitored, Done
            </li>
            <li>
              <strong>Bulk Actions</strong> — Multi-select for batch complete,
              delete, or pin-to-today
            </li>
            <li>
              <strong>Monitor Toggle</strong> — Mark tasks you're waiting on
              others for
            </li>
            <li>
              <strong>Inline Editing</strong> — Edit task details directly on
              the card
            </li>
            <li>
              <strong>Time Estimates</strong> — Optional duration estimates for
              planning
            </li>
          </ul>
        </FeatureCard>

        <FeatureCard
          icon={PenLine}
          iconColor="text-warm-lavender"
          title="Canvas"
        >
          <p>
            A freeform thought journal designed as an ADHD-friendly "brain dump"
            space. Write freely without friction using rich text editing.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Daily Entries</strong> — One entry per day with date
              navigation
            </li>
            <li>
              <strong>Markdown Shortcuts</strong> —{" "}
              <code className="bg-warm-sand/60 px-1 py-0.5 rounded text-[11px]">
                #
              </code>{" "}
              for headings,{" "}
              <code className="bg-warm-sand/60 px-1 py-0.5 rounded text-[11px]">
                -
              </code>{" "}
              for lists,{" "}
              <code className="bg-warm-sand/60 px-1 py-0.5 rounded text-[11px]">
                [ ]
              </code>{" "}
              for checkboxes,{" "}
              <code className="bg-warm-sand/60 px-1 py-0.5 rounded text-[11px]">
                {">"}
              </code>{" "}
              for quotes
            </li>
            <li>
              <strong>Slash Commands</strong> — Type{" "}
              <code className="bg-warm-sand/60 px-1 py-0.5 rounded text-[11px]">
                /
              </code>{" "}
              to open a menu of formatting options
            </li>
            <li>
              <strong>Floating Toolbar</strong> — Select text to see formatting
              options
            </li>
            <li>
              <strong>Callout Blocks</strong> — Highlight important thoughts
            </li>
            <li>
              <strong>Auto-Save</strong> — Saves after 1 second of inactivity,
              every 30 seconds, and when you leave the page
            </li>
          </ul>
        </FeatureCard>

        <FeatureCard
          icon={Timer}
          iconColor="text-warm-blue"
          title="Focus Timer"
        >
          <p>
            Pomodoro technique timer to break work into focused sessions with
            breaks in between.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Circular Progress</strong> — Visual timer with satisfying
              countdown animation
            </li>
            <li>
              <strong>Link Tasks</strong> — Connect one or more tasks or
              subtasks to a session
            </li>
            <li>
              <strong>Configurable Durations</strong> — Adjust focus, short
              break, and long break lengths in Settings
            </li>
            <li>
              <strong>Presets</strong> — Classic Pomodoro (25/5), Short Sprints
              (15/3), Deep Work (50/10), Gentle Start (10/5)
            </li>
            <li>
              <strong>Notification Sounds</strong> — Choose from multiple alert
              sounds or mute
            </li>
          </ul>
        </FeatureCard>

        <FeatureCard
          icon={LayoutGrid}
          iconColor="text-warm-terracotta"
          title="Eisenhower Matrix"
        >
          <p>
            Prioritize tasks by dragging them into four quadrants based on
            urgency and importance.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Do First</strong> — Urgent + Important tasks
            </li>
            <li>
              <strong>Schedule</strong> — Important but not urgent tasks
            </li>
            <li>
              <strong>Delegate</strong> — Urgent but not important tasks
            </li>
            <li>
              <strong>Eliminate</strong> — Neither urgent nor important tasks
            </li>
            <li>
              <strong>Drag & Drop</strong> — Move tasks between quadrants
              visually
            </li>
          </ul>
        </FeatureCard>

        <FeatureCard
          icon={BookOpen}
          iconColor="text-warm-sage"
          title="Read Later"
        >
          <p>
            Save articles, links, and resources for later reading with status
            tracking.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Status Tracking</strong> — Unread, Reading, Done
            </li>
            <li>
              <strong>Quick Add</strong> — Paste a URL and title to save
            </li>
            <li>
              <strong>Organized</strong> — Filter by reading status
            </li>
          </ul>
        </FeatureCard>

        <FeatureCard icon={Bell} iconColor="text-warm-amber" title="Reminders">
          <p>
            Never forget birthdays, appointments, or important dates with
            flexible reminder support.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Categories</strong> — Birthdays, appointments, events, and
              more
            </li>
            <li>
              <strong>Recurring</strong> — Yearly, monthly, and other recurrence
              patterns
            </li>
            <li>
              <strong>Acknowledge</strong> — Dismiss a reminder or advance to
              the next occurrence
            </li>
            <li>
              <strong>Optional Time</strong> — Set a specific time of day for
              reminders
            </li>
          </ul>
        </FeatureCard>

        <FeatureCard
          icon={FileText}
          iconColor="text-muted-foreground"
          title="Templates"
        >
          <p>
            Save and reuse task templates for repeating workflows. Create a
            template once and spawn tasks from it any time you need them.
          </p>
        </FeatureCard>

        <FeatureCard
          icon={CalendarCheck}
          iconColor="text-warm-blue"
          title="Weekly Review"
        >
          <p>
            A guided reflection session at the end of each week. Review
            accomplishments, note challenges, and plan your priorities for the
            coming week.
          </p>
        </FeatureCard>

        <FeatureCard icon={BarChart3} iconColor="text-warm-sage" title="Stats">
          <p>
            Track your productivity over time with visual charts and statistics.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Daily Streak</strong> — Consecutive days with completed
              tasks
            </li>
            <li>
              <strong>Focus Minutes</strong> — Total Pomodoro time tracked
            </li>
            <li>
              <strong>Weekly Charts</strong> — Visual breakdown of your
              productivity
            </li>
            <li>
              <strong>All-Time Stats</strong> — Cumulative progress overview
            </li>
          </ul>
        </FeatureCard>

        <FeatureCard
          icon={Crosshair}
          iconColor="text-warm-sage"
          title="Focus Mode"
        >
          <p>
            A distraction-free overlay that hides the sidebar and shows only
            your current task and timer. Press{" "}
            <kbd className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium">
              F
            </kbd>{" "}
            to enter,{" "}
            <kbd className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium">
              Esc
            </kbd>{" "}
            to exit.
          </p>
        </FeatureCard>

        <FeatureCard
          icon={Lightbulb}
          iconColor="text-warm-amber"
          title="Thoughts (Scratch Pad)"
        >
          <p>
            A floating scratch pad for quick thoughts. Accessible via the yellow
            button in the bottom-right corner or by pressing{" "}
            <kbd className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium">
              I
            </kbd>
            . You can turn any thought into a reminder.
          </p>
        </FeatureCard>

        <FeatureCard
          icon={Globe}
          iconColor="text-warm-blue"
          title="Context Filtering"
        >
          <p>
            Use the Work / Personal / All toggle in the sidebar to filter your
            entire view. When set to "Work", only work-related tasks, reminders,
            and stats are shown — great for reducing overwhelm by focusing on
            one area at a time.
          </p>
        </FeatureCard>
      </Section>

      {/* ========== KEYBOARD SHORTCUTS ========== */}
      <Section
        title="Keyboard Shortcuts"
        icon={Keyboard}
        iconColor="bg-warm-blue/15 text-warm-blue"
      >
        <div className="bg-background rounded-xl border border-white/15 dark:border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/15 dark:border-white/10">
                <th className="text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-4 py-2.5">
                  Shortcut
                </th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-4 py-2.5">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="px-4">
              <tr className="border-b border-white/10">
                <td colSpan={2} className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-sage">
                    Navigation
                  </p>
                </td>
              </tr>
              <KbdRow keys="Ctrl+K / Cmd+K" action="Open command palette" />
              <KbdRow
                keys="1 - 9"
                action="Switch between pages (Today, Tasks, Timer, ...)"
              />
              <KbdRow keys="H" action="Open this Help page" />
              <KbdRow keys="C" action="Open Canvas" />
              <KbdRow keys="F" action="Enter Focus Mode" />
              <KbdRow keys="Esc" action="Exit Focus Mode or close sidebar" />

              <tr className="border-b border-white/10">
                <td colSpan={2} className="px-4 pt-4 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-amber">
                    Actions
                  </p>
                </td>
              </tr>
              <KbdRow keys="N" action="New task (on Today or Tasks page)" />
              <KbdRow
                keys="R"
                action="New reminder (on Today, Tasks, or Reminders page)"
              />
              <KbdRow
                keys="/"
                action="Focus search bar (on Today or Tasks page)"
              />
              <KbdRow keys="I" action="Toggle Thoughts scratch pad" />

              <tr className="border-b border-white/10">
                <td colSpan={2} className="px-4 pt-4 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-blue">
                    Editing
                  </p>
                </td>
              </tr>
              <KbdRow keys="Ctrl+Z / Cmd+Z" action="Undo last action" />
              <KbdRow
                keys="Ctrl+Shift+Z / Cmd+Shift+Z"
                action="Redo last undone action"
              />
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-3 px-1">
          Keyboard shortcuts are disabled when you're typing in an input field
          or text editor (except Ctrl+K, Ctrl+Z, and Ctrl+Shift+Z which always
          work).
        </p>
      </Section>

      {/* ========== WORKFLOW TIPS ========== */}
      <Section
        title="Workflow Tips for ADHD"
        icon={Brain}
        iconColor="bg-warm-lavender/15 text-warm-lavender"
      >
        <p className="text-sm text-foreground mb-4 leading-relaxed">
          These tips are designed to help you get the most out of Focus
          Assistant, especially if you have ADHD or find it hard to stay
          organized.
        </p>

        <TipCard>
          <strong className="text-foreground">
            Start each day on the Today page.
          </strong>{" "}
          It gives you a focused view of what matters right now — due tasks,
          reminders, and your daily focus goals. Resist the urge to browse all
          tasks first.
        </TipCard>

        <TipCard>
          <strong className="text-foreground">
            Use Focus Goals to limit daily priorities to 3.
          </strong>{" "}
          Star your top 3 tasks for the day and focus on completing those before
          anything else. The progress counter (0/3 to 3/3) provides satisfying
          visual feedback.
        </TipCard>

        <TipCard>
          <strong className="text-foreground">
            Use Canvas for brain dumps before organizing.
          </strong>{" "}
          When your mind is racing, open Canvas and write freely without
          worrying about structure. You can organize the thoughts into tasks
          later.
        </TipCard>

        <TipCard>
          <strong className="text-foreground">
            Use the Monitor status for tasks you're waiting on others for.
          </strong>{" "}
          Toggle "Monitor" on tasks that are blocked by someone else. They'll
          appear in the Monitored tab and the Today view's monitoring section,
          keeping them visible without cluttering your active list.
        </TipCard>

        <TipCard>
          <strong className="text-foreground">
            Use Focus Timer to break work into manageable sessions.
          </strong>{" "}
          The Pomodoro technique works well for ADHD brains. Start with the
          "Gentle Start" preset (10 min focus) if 25 minutes feels too long,
          then gradually increase.
        </TipCard>

        <TipCard>
          <strong className="text-foreground">
            Use the Context Switcher to reduce overwhelm.
          </strong>{" "}
          Set to "Work" during work hours and "Personal" afterward. Seeing
          everything at once can be paralyzing — narrowing the view helps you
          focus on what's relevant right now.
        </TipCard>

        <TipCard>
          <strong className="text-foreground">
            Review your week using Weekly Review.
          </strong>{" "}
          Take 15 minutes at the end of each week to reflect on what went well,
          what was challenging, and plan your priorities for next week. This
          builds self-awareness over time.
        </TipCard>

        <TipCard>
          <strong className="text-foreground">
            Use the Thoughts pad for fleeting ideas.
          </strong>{" "}
          Press{" "}
          <kbd className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium">
            I
          </kbd>{" "}
          to quickly jot down a thought before it disappears. You can convert it
          to a reminder or task later.
        </TipCard>

        <TipCard>
          <strong className="text-foreground">
            Break big tasks into subtasks.
          </strong>{" "}
          Large tasks feel overwhelming and are easy to avoid. Breaking them
          into small, concrete subtasks gives you clear next steps and the
          dopamine reward of checking things off.
        </TipCard>
      </Section>

      {/* ========== DATA & PRIVACY ========== */}
      <Section
        title="Data & Privacy"
        icon={Shield}
        iconColor="bg-warm-sage/15 text-warm-sage"
      >
        <div className="space-y-3">
          <FeatureCard
            icon={FileText}
            iconColor="text-warm-sage"
            title="Local Storage"
          >
            <p>
              By default, all your data is stored locally in a human-readable
              Markdown file (
              <code className="bg-warm-sand/60 px-1 py-0.5 rounded text-[11px]">
                focus-assist-data.md
              </code>
              ). You can open this file in any text editor, Obsidian, VS Code,
              or view it on GitHub.
            </p>
          </FeatureCard>

          <FeatureCard
            icon={Star}
            iconColor="text-warm-blue"
            title="Google Sheets Sync (Optional)"
          >
            <p>
              You can optionally sync your data to a Google Sheet for
              cross-device access. Configure this in Settings under Data
              Storage. You'll need a Google Sheet and an API key.
            </p>
          </FeatureCard>

          <FeatureCard
            icon={Shield}
            iconColor="text-warm-sage"
            title="Automatic Backups"
          >
            <p>
              The app maintains daily automatic backups of your data file. If
              anything goes wrong, you can restore from a recent backup.
            </p>
          </FeatureCard>

          <FeatureCard
            icon={Eye}
            iconColor="text-warm-lavender"
            title="Privacy First"
          >
            <p>
              Focus Assistant does not send your data to any third-party
              analytics, tracking, or advertising services. Your productivity
              data stays on your server. The optional Google Sheets sync is
              user-initiated and uses your own API key.
            </p>
          </FeatureCard>

          <FeatureCard
            icon={Zap}
            iconColor="text-warm-amber"
            title="Export & Import"
          >
            <p>
              You can export all your data as Markdown or JSON from Settings,
              and import previously exported files to restore. Great for moving
              between servers or creating manual backups.
            </p>
          </FeatureCard>
        </div>
      </Section>

      {/* ========== FOOTER ========== */}
      <div className="bg-warm-sand/50 rounded-2xl border border-white/15 dark:border-white/10 p-6 text-center">
        <Sparkles className="w-5 h-5 text-warm-sage mx-auto mb-2" />
        <p className="text-sm text-foreground font-serif">
          You're doing great. One step at a time.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Focus Assistant is built with ADHD-friendly design principles in mind.
        </p>
      </div>
    </div>
  );
}
