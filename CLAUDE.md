# Focus Assistant — CLAUDE.md

## Project Overview

Focus Assistant is a productivity app for ADHD users. React 19 + TypeScript + Vite frontend, Express + Drizzle backend. Version 1.8.8.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite, framer-motion v12, @dnd-kit/react, Tiptap v3, Radix UI, cmdk
- **Backend**: Express, Drizzle ORM, PostgreSQL, markdown file storage
- **Testing**: Vitest (unit), Playwright (e2e)
- **Build**: Vite (client), esbuild (server), pnpm

## Key Commands

```bash
pnpm check          # TypeScript check (tsc --noEmit)
pnpm test           # Run all 371 unit tests
pnpm test:e2e       # Playwright e2e tests
pnpm build          # Production build
pnpm preflight      # Full pre-push validation (types + tests + guards + compat)
pnpm format         # Prettier format all
pnpm format:check   # Prettier check
```

## Pre-commit/push Hooks

- **Pre-commit**: `prettier --check .` (format validation)
- **Pre-push**: `pnpm preflight` (TypeScript + tests + env guards + keyboard shortcuts + schema compat + save error handling)

## Project Structure

```
client/src/
  pages/           # Page components (Home.tsx is the shell/router)
  components/      # Shared components (Sidebar, CommandPalette, ui/)
  contexts/        # AppContext.tsx (global state with reducer)
  hooks/           # Custom hooks
  lib/             # types.ts, utils
shared/            # appTypes.ts (Zod schemas), types.ts
server/            # Express API, mdStorage.ts (markdown persistence)
```

## Design System

### Colors (OKLCH)

- **Background**: `oklch(0.97 0.005 75)` light / `oklch(0.16 0.015 75)` dark
- **Warm Sage** (primary): hue 155, chroma 0.11 (light) / 0.11 (dark)
- **Warm Amber** (accent): hue 80
- **Warm Terracotta** (destructive): hue 35
- All colors use OKLCH color space with named hue families

### Glass Effects (3 tiers)

- `glass-subtle`: blur 12px — use for most cards
- `glass`: blur 20px — use for elevated surfaces
- `glass-heavy`: blur 30px — use sparingly (sidebar, modals only)
- Dark mode glass needs alpha channel: `oklch(0.22 0.02 155 / 0.85)`

### Typography

- **Headings**: DM Serif Display (restrict to 3xl+)
- **Body**: DM Sans
- Line height: 1.5-1.75 for body text

### Tailwind v4

- Uses `@theme inline` for CSS variables
- Uses `@custom-variant dark` for dark mode
- Named group variants: `group-focus-within/sub:opacity-100`

## Accessibility Standards (WCAG AA)

### Motion

- CSS: `@media (prefers-reduced-motion: reduce)` in index.css
- React: `<MotionConfig reducedMotion="user">` wraps entire app in Home.tsx
- Tailwind: Use `motion-safe:` prefix for CSS transforms (e.g., `motion-safe:active:scale-[0.97]`)

### Contrast

- Text: 4.5:1 minimum ratio
- UI elements: 3:1 minimum
- Section labels: use `text-muted-foreground/70` minimum (not /50 or /60)
- Primary foreground: dark text on sage green (`oklch(0.18 0.01 155)`)

### Navigation

- `aria-current="page"` on active sidebar nav button
- `aria-label="Main navigation"` on `<nav>`
- `document.title` updates on page change via useEffect
- `aria-live="polite"` region announces page changes to screen readers
- `aria-label` on icon-only buttons

### Buttons

- `disabled:active:scale-100` override on Button component
- `disabled:pointer-events-none` on all disabled buttons
- Never add `role="button"` or `tabIndex` to drag handles — use `aria-hidden="true"`

### Keyboard

- Single-key shortcuts check for modifier keys (not in input/textarea)
- Tab order matches visual order
- Focus rings visible on all interactive elements

## Patterns & Conventions

### Button Press Feedback

Pattern: `motion-safe:active:scale-[0.97]`

- Applied globally via `button.tsx` base CVA class
- Also add to standalone `<button>` elements not using Button component
- Do NOT add to: tiny icon buttons (clear X), drag handles, link-style buttons
- Do NOT use `transform-gpu` — unnecessary GPU layer promotion

### AnimatePresence + Suspense

- `AnimatePresence` must be OUTSIDE `Suspense` for exit animations on lazy-loaded pages
- Pattern: `<AnimatePresence> → <motion.div key={page}> → <Suspense> → {content}`

### Sidebar Navigation

- 4 groups: Core (Today, Tasks, Matrix), Tools (Timer, Canvas, Templates), Knowledge (Reading, Reminders, Weekly Review), Meta (Stats, Settings, Help)
- Section labels: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70`
- Quick Actions section uses same label styling for consistency

### Reducer Actions

- Auto-save actions go in `NON_UNDOABLE_ACTIONS` to avoid polluting undo stack
- State shape defined in `shared/appTypes.ts` with Zod schemas

### Render Safety

- Never mutate variables during render (React Strict Mode double-invokes)
- Use index comparison instead of mutable tracking vars: `i === 0 || arr[i-1].x !== arr[i].x`

## Multi-Agent Workflow

### Implementation Phase (5 parallel agents)

1. Create feature branch from main: `feat/design-improvements-hX-hY`
2. Assign non-overlapping files to each agent
3. Each agent runs `tsc --noEmit` after changes
4. Verify: `pnpm check && pnpm test && pnpm build`
5. Format: `npx prettier --write <files>`
6. Commit, push, create PR via `gh pr create`

### Review Phase (4 parallel agents)

Each reviews the full PR from a different angle:

1. **Code Quality** — bugs, types, React best practices, DRY
2. **Accessibility** — WCAG AA, contrast, keyboard, screen readers, motion
3. **Security & Performance** — re-renders, bundle size, browser compat, XSS
4. **UX Completeness** — visual consistency, dark mode, mobile, animation feel

### Fix Phase

- Deduplicate findings across all 4 reviewers
- Launch fix agents in parallel (non-overlapping files)
- Re-verify: `tsc --noEmit && pnpm test`
- Format, commit, push

### Verification Phase (exhaustive)

- `pnpm check` — zero TypeScript errors
- `pnpm test` — all tests pass
- `pnpm build` — production build succeeds
- `pnpm preflight` — all guards pass
- Launch 2+ verification agents checking different aspects post-merge

### Merge Phase

- `gh pr merge <N> --merge --delete-branch`
- `git checkout main && git pull origin main`
- Re-run full verification on main

## Known Issues & Workarounds

- **Worktree creation fails**: `.claude/` owned by root, no sudo. Workaround: run agents without isolation, assign non-overlapping files.
- **Prettier pre-commit**: Always run `npx prettier --write <files>` before committing.
- **Git push rejected (remote ahead)**: `git stash && git pull --rebase origin main && git stash pop && git push`

## Remaining Design Improvement Tasks

### High Priority

- [ ] H11: Toast notifications for key actions
- [ ] H12: Progressive disclosure — collapse secondary sections in Today
- [ ] H13: Reorder DailyPlanner — action items first
- [ ] H14: Standardize glass effects — reduce glass-heavy usage
- [ ] H15: Bulk actions discoverability (count badge + action bar)

### Medium Priority

- [ ] M1: Typography hierarchy — restrict DM Serif to 3xl+
- [ ] M2: Card border-radius and shadow standardization
- [ ] M3: Checkbox spring animation on completion
- [ ] M4: Drag-and-drop ghost/lift feedback
- [ ] M5: Stats grid responsive cols-2/cols-4
- [ ] M6: Sidebar breakpoint lg→md (768px)
- [ ] M7: mx-auto + max-w-5xl on all page roots
- [ ] M8: Timer single-focus nudge + prominent running state
- [ ] M9: Stats charts — increase height, add Y-axis labels
- [ ] M10: Settings page — reorder by usage frequency
- [ ] M11: Move Focus Mode/Thoughts to sidebar footer

### Low Priority

- [ ] L1: Matrix page — dismissible onboarding banner
- [ ] L2: Skeleton loading states for async content
