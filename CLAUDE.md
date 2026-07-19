# Project Engineering Guidelines

## Tech Stack

Backend: Node.js + Express 5, PostgreSQL via `pg` + Prisma, JWT auth (jsonwebtoken + bcrypt),
Zod validation, Pino logging, Helmet/CORS/rate-limit.

Frontend: React 19 + TypeScript + Vite, Tailwind CSS v4, TanStack Query, Zustand,
React Hook Form + Zod, React Router, Base UI components, Vitest.

## Commands

Root: `npm run dev` (runs backend + frontend concurrently)
Backend: `npm --prefix backend run dev` | `npm --prefix backend run migrate`
Frontend: `npm --prefix frontend run build` | `lint` (oxlint) | `test` (vitest) | `format` (prettier)

## Project Structure

Backend (`backend/src/`): controllers → services → repositories → db/migrations,
plus middleware, validators, config, utils. Repository Pattern already in place — follow it.

Frontend (`frontend/src/`): app, modules, components, shared, lib, styles.
Design system source of truth: `frontend/docs/design-system.md` — check before any new UI work.

## Environment Setup

Backend: copy `backend/.env.example` to `backend/.env`, fill in `DB_USER`, `DB_PASSWORD`,
`DB_NAME`, `JWT_SECRET` before first run.

## Testing

Frontend: `npm --prefix frontend test` (Vitest) — has coverage.
Backend: no test script yet — no automated coverage. Rely on manual QA until added.

## CI/CD

No CI/CD pipeline configured (no GitHub Actions, no Docker). Run lint/test/build manually
before opening a PR: `npm --prefix frontend run lint`, `npm --prefix frontend test`,
`npm --prefix frontend run build`.

## Known Issues

- Payment installment schedule: ₱0-quote edge case not yet handled.
- `frontend/src/index.css`: `--primary` token still needs to point to brand blue
  (design-system.md is source of truth, token not yet synced).

---

## AI Engineering Team

This project uses the following global engineering specialists:

- Team Lead
- Backend Engineer
- Frontend Engineer
- UI/UX Engineer
- Database Engineer
- Security Engineer
- QA Engineer
- DevOps Engineer
- Git Integration Engineer
- Documentation Engineer

---

# Workflow

For complex features:

1. Team Lead analyzes the request.
2. Create an implementation plan.
3. Delegate work to the appropriate specialist.
4. Review implementation.
5. Deliver the final solution.

For simple tasks, use the most appropriate specialist directly.

---

# Engineering Principles

- Clean Architecture
- SOLID Principles
- DRY
- KISS
- Separation of Concerns
- Maintainability over cleverness
- Readability over brevity

---

# Development Standards

All generated code should:

- Follow the existing project architecture.
- Reuse existing components and services whenever possible.
- Avoid duplicate logic.
- Keep functions small and focused.
- Prefer composition over duplication.
- Write production-quality code.

---

# Backend Standards

- RESTful APIs
- Repository Pattern when applicable
- Business logic belongs in Services.
- Database access belongs in Repositories.
- Controllers remain thin.
- Global error handling.
- Parameterized SQL queries.
- Async/Await.

---

# Frontend Standards

- Reusable components.
- Responsive design.
- Accessible UI.
- Consistent styling.
- Follow the project's design system.

---

# Database Standards

- Normalize where appropriate.
- Proper indexing.
- Foreign key constraints.
- Transactions for multi-step writes.
- Never duplicate data without justification.
- DATE columns: return as plain strings, not JS Date objects — Postgres driver TZ-shifts Date objects on read (fixed 2026, don't regress).

---

# Security Standards

Follow OWASP recommendations.

- Validate all input.
- Prevent SQL Injection.
- Never expose sensitive information.
- Hash passwords.
- Secure authentication.
- Least privilege.

---

# Git Standards

- Feature branches
- Pull Requests
- Descriptive commits, Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)
- Always create a new branch before pushing changes — never push directly to `main`.
- PRs require review/approval before merge.

---

# Documentation

Every significant feature should include:

- Clear comments where needed.
- API documentation when applicable.
- Updated README if functionality changes.

---

# General Rules

Before implementing a solution:

- Understand the existing codebase.
- Follow established project conventions.
- Do not introduce unnecessary dependencies.
- Ask for clarification when requirements are ambiguous.
