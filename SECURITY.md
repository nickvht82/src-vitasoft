# Security Policy

## Supported Versions

Vitasoft is under active development on the `main` branch. Security fixes are applied
to the latest release only.

| Version | Supported |
| ------- | ------------------ |
| `main` (latest) | :white_check_mark: |
| Older commits/tags | :x: |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Report privately via one of these channels:

1. **GitHub Private Vulnerability Reporting** (preferred):
   [Security → Report a vulnerability](https://github.com/nickvht82/src-vitasoft/security/advisories/new)
2. **Email:** huyvht8582@gmail.com — subject prefix `[SECURITY]`

Please include:
- Description of the vulnerability and its impact
- Steps to reproduce (proof of concept if possible)
- Affected component (`api/`, `core/*`, `admin/`, `infra/`, ...)
- Suggested fix, if you have one

## Response Timeline

| Stage | Target |
|---|---|
| Acknowledgement | within 48 hours |
| Triage & severity assessment | within 7 days |
| Fix for confirmed high/critical issues | within 30 days |
| Public disclosure | coordinated with reporter after fix is deployed |

## Scope

In scope:
- Backend API (`api/`, `core/*` packages)
- Web applications (`vitasoft-homepage/`, `admin/`)
- Infrastructure as Code (`infra/` — Terraform, K8s manifests, CI/CD workflows)
- Dependency supply-chain issues in this repository

Out of scope:
- Denial of service via volumetric traffic (handled at infrastructure layer)
- Vulnerabilities in third-party services we consume (report to the vendor)
- Social engineering, physical attacks

## Security Measures in Place

- Dependencies scanned weekly (Dependabot) + `pnpm audit` gate in CI (fails on high/critical CVEs)
- No secrets in the repository — local `.env` (gitignored), production via Google Secret Manager
- Keyless CI/CD authentication (Workload Identity Federation — no long-lived cloud keys)
- Input validation at all API boundaries (zod), errors follow RFC 7807
- Full policy: [docs/ARCHITECTURE.md §7](docs/ARCHITECTURE.md)

Thank you for helping keep Vitasoft and its users safe!
