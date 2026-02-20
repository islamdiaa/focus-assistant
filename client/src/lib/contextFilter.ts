/**
 * Context filter utility — filters tasks by Work/Personal/All context.
 * 
 * Work = tasks with category 'work'
 * Personal = tasks with category 'personal', 'health', 'learning', 'errands', 'other', or null/undefined
 * All = no filter
 */
import type { Task, Reminder, ContextFilter } from '@/lib/types';
import { WORK_CATEGORIES, PERSONAL_CATEGORIES } from '@/lib/types';

/**
 * Returns true if the task matches the active context filter.
 */
export function taskMatchesContext(task: Task, context: ContextFilter): boolean {
  if (context === 'all') return true;
  const cat = task.category;
  if (context === 'work') {
    return cat != null && WORK_CATEGORIES.includes(cat);
  }
  // 'personal' context: everything that isn't explicitly 'work'
  // This includes null/undefined categories (uncategorized tasks default to personal)
  if (context === 'personal') {
    return cat == null || PERSONAL_CATEGORIES.includes(cat);
  }
  return true;
}

/**
 * Filter an array of tasks by context.
 */
export function filterTasksByContext(tasks: Task[], context: ContextFilter): Task[] {
  if (context === 'all') return tasks;
  return tasks.filter(t => taskMatchesContext(t, context));
}

/**
 * Returns true if a reminder matches the active context.
 * Reminders use reminderCategory (birthday, appointment, event, other),
 * which doesn't map cleanly to work/personal. We map:
 * - 'appointment' → shows in both work and personal (could be either)
 * - 'birthday', 'event', 'other' → personal only
 * - 'all' → shows everything
 */
export function reminderMatchesContext(reminder: Reminder, context: ContextFilter): boolean {
  if (context === 'all') return true;
  if (context === 'work') {
    return reminder.category === 'appointment';
  }
  // personal: show all reminders (birthdays, events, appointments, other)
  return true;
}

/**
 * Filter an array of reminders by context.
 */
export function filterRemindersByContext(reminders: Reminder[], context: ContextFilter): Reminder[] {
  if (context === 'all') return reminders;
  return reminders.filter(r => reminderMatchesContext(r, context));
}

/**
 * Get a human-readable label for the context.
 */
export function getContextLabel(context: ContextFilter): string {
  switch (context) {
    case 'work': return 'Work';
    case 'personal': return 'Personal';
    default: return 'All';
  }
}
