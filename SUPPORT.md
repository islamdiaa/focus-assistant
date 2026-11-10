# Support

- 🐛 **Bug or unexpected behavior?** [Open an issue](https://github.com/islamdiaa/focus-assistant/issues/new?template=bug_report.yml) — include your Docker tag (or commit), browser, and steps to reproduce.
- 💡 **Feature idea?** [Open a feature request](https://github.com/islamdiaa/focus-assistant/issues/new?template=feature_request.yml) or check [existing suggestions](https://github.com/islamdiaa/focus-assistant/issues).
- 🛠 **Self-hosting help?** See the [Docker guide](./docs/docker-guide.md) (including Unraid setup, backup and restore).
- 🔒 **Found a security issue?** Please use [private vulnerability reporting](https://github.com/islamdiaa/focus-assistant/security/advisories/new) — see [SECURITY.md](./SECURITY.md).

## Quick diagnostics

1. `docker logs focus-assistant` — server errors
2. `curl http://localhost:1992/health` — should return `{"status":"ok"}` (also shown as container health in `docker ps`)
3. Your data lives in the `data/` volume as a plain Markdown file — you can inspect or back it up at any time.
