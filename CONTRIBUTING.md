# Contributing to Focus Assistant

Thanks for your interest in contributing! Focus Assistant is an ADHD-friendly, single-user productivity app — calm UI, keyboard-friendly, and your data stays in a plain Markdown file. Contributions that preserve that spirit are very welcome.

## Ways to contribute

- **Report a bug** — open an issue with the steps to reproduce (see the bug report template).
- **Suggest a feature** — check [open issues](https://github.com/islamdiaa/focus-assistant/issues) first, then open a feature request.
- **Improve docs** — typo fixes and clearer instructions are always appreciated.
- **Submit a pull request** — for bug fixes, accessibility improvements, or small features.

## Development setup

Requirements: **Node 22+** and **pnpm 10**.

```bash
git clone https://github.com/islamdiaa/focus-assistant.git
cd focus-assistant
pnpm install
pnpm dev        # dev server at http://localhost:3000
```

## Before you open a PR

The repo has git hooks (Husky) that enforce the quality gates — `pnpm format:check` on commit and `pnpm preflight` on push. Run these locally to save yourself a red CI:

```bash
pnpm format         # Prettier — always run before committing
pnpm check          # TypeScript
pnpm test           # 500+ Vitest unit tests
pnpm build          # Production build (Vite + esbuild)
pnpm preflight      # Everything above + repo guard checks
pnpm test:e2e       # Playwright end-to-end tests (needs a running build)
```

Guidelines:

- **Keep PRs focused** — one concern per PR; group related changes, separate unrelated ones.
- **Add tests** for behavioral changes. The test suite lives next to the code it covers (`server/*.test.ts`, `client/…`).
- **Accessibility matters here** — the app targets WCAG AA (contrast, keyboard navigation, reduced-motion support). See [CLAUDE.md](./CLAUDE.md) for the established UI patterns.
- **Follow existing conventions** — Zod schemas in `shared/appTypes.ts` are the single source of truth for types; don't define inline schemas.
- **No new external services or tracking** without discussing it first — the no-login, local-data model is a core design decision.
- **Breaking changes to the data file format** need a migration path. The Markdown format is the product: users open it in Obsidian/VS Code.

## AI-assisted contributions

If you use an AI coding assistant, point it at [CLAUDE.md](./CLAUDE.md) and [docs/agent.md](./docs/agent.md) — they document the design system, accessibility standards, and repo conventions. AI-generated PRs are held to the same standard as any other contribution.

## Commit style

- Imperative, concise summary line (e.g., "Fix streak calculation across DST changes").
- Body explains _why_, not just _what_.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](./LICENSE).
