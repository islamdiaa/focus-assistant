# Security Policy

Focus Assistant is a **single-user, no-login** app by design. It is intended to run on a trusted home network, behind a VPN, or behind an authenticating reverse proxy. Anyone who can reach its port can read and change your data — this is documented and intentional for a personal self-hosted tool. See the [Security section of the README](./README.md#security) for safe-deployment guidance.

## Supported versions

| Version                    | Supported                                                     |
| -------------------------- | ------------------------------------------------------------- |
| latest release (`v1.9.1`+) | ✅                                                            |
| older releases             | ❌ — please update; Docker `latest` is rebuilt on every merge |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use [GitHub private vulnerability reporting](https://github.com/islamdiaa/focus-assistant/security/advisories/new) instead. Please include:

- A description of the issue and its impact
- Steps or a proof of concept to reproduce it
- The version (Docker tag or commit) you tested against

You should receive a response within a few days. Coordinated disclosure via GitHub Advisories (private fork + draft advisory) is available if you'd like to work on a fix together.

## Hardening notes

- The Docker image ships a container `HEALTHCHECK` hitting `GET /health`.
- Obsidian vault sync rejects traversal paths and sensitive system directories before writing.
- Dependency advisories are tracked by Dependabot; `pnpm audit` is kept clean.
