# CodeHaus Frontend Architecture — Design Document

**Status:** Approved (skeleton) — full detail below
**Date:** 2026-07-16
**Author:** Frontend Team Lead
**Scope:** Frontend architecture only. Backend (`backend/`) already exists and is out of scope except as an integration contract.

## Stack Decisions

| Concern            | Decision                                                                                                               | Rationale                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | React 18 + Vite                                                                                                        | SPA, no SSR/SEO requirement beyond landing page; pairs cleanly with the existing pure REST/Express backend.                                    |
| Language           | TypeScript                                                                                                             | Type safety across API contracts, components, and state at multi-engineer scale.                                                               |
| Styling            | Tailwind CSS + shadcn/ui                                                                                               | Utility-first CSS with accessible, unstyled component primitives themed once and reused everywhere.                                            |
| Routing            | React Router v6 (`createBrowserRouter`)                                                                                | Data-router APIs, nested layouts, lazy route modules.                                                                                          |
| Server state       | TanStack Query                                                                                                         | Caching, refetching, pagination, and loading/error state for all REST calls.                                                                   |
| Client state       | Zustand                                                                                                                | Minimal-boilerplate store for true client-only state (auth session, UI state), kept separate from server cache.                                |
| Roles              | `client`, `admin`, `staff`                                                                                             | Three-tier access model from day one (see [Section 6](#6-state-management-architecture) and [Section 3](#3-routing-architecture)).             |
| Real-time          | Polling (TanStack Query refetch intervals) now; WebSocket-ready upgrade path documented                                | Backend has no socket.io/ws dependency yet; architecture isolates the transport so swapping to WebSocket later doesn't touch component code.   |
| Auth token pattern | Refresh token in httpOnly cookie (backend-set), access token in memory (Zustand), silent refresh via axios interceptor | Derived from existing backend implementation (`backend/src/controllers/auth.controller.js`), not a new decision — frontend must conform to it. |

---

## 1. Frontend Folder Structure

```
frontend/
  public/                       # static files served as-is (favicon, robots.txt)
  src/
    app/                        # application shell — composition root, not a feature
      providers/                 # QueryClientProvider, ThemeProvider, AuthProvider wiring, ErrorBoundary
      router/                    # route tree definition, route guards, lazy route registration
      App.tsx                    # top-level component: providers + router
      main.tsx                   # ReactDOM entry point

    modules/                    # one folder per business domain (feature module)
      auth/
      dashboard-client/
      dashboard-admin/
      projects/
      clients/
      quotations/
      invoices/
      payments/
      messaging/
      notifications/
      reports/
      settings/
      support/
      # each module internally follows the same shape — see Section 11

    shared/                     # cross-cutting code used by 2+ modules
      components/                # shadcn-based UI primitives (Button, Card, Table, Modal, Badge...)
      layouts/                   # LandingLayout, AuthLayout, ClientDashboardLayout, AdminDashboardLayout, ErrorLayout
      hooks/                      # non-domain hooks: useDebounce, useMediaQuery, useLocalStorage
      api/                        # apiClient (axios instance + interceptors), queryClient config, query key factory
      store/                      # global Zustand stores: auth session, UI (sidebar, theme)
      utils/                      # formatters, validators, date helpers
      constants/                  # route paths, role enums, status enums
      types/                      # shared/global TypeScript types (API envelope, pagination, role)
      config/                      # env variable access, feature flags

    styles/                      # Tailwind config extensions, design tokens, globals.css
    assets/                      # images, icons, fonts

  index.html
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  .env.example
```

**Ownership rule:** a file lives in `modules/<domain>/` if it is meaningful only within that domain. It lives in `shared/` the moment a second module needs it unchanged. Promotion from module to shared is a one-way door reviewed by the Team Lead — it is the main mechanism preventing shared/ from becoming a dumping ground.

**When to use each top-level folder:**

- `app/` — only composition: providers, router, entry point. Never business logic.
- `modules/` — all feature/domain code. Default location for new work.
- `shared/` — only code proven reusable across modules. Nothing goes here on a hunch.
- `styles/` — design tokens and Tailwind theme extension only, not component-specific CSS.
- `assets/` — static binary assets only.

---

## 2. Application Layers

| Layer                 | Responsibility                                                                               | Lives in                                                      | Talks to                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| **Presentation**      | Renders UI, captures user input, no business rules                                           | `modules/*/components`, `shared/components`, `shared/layouts` | Business layer via hooks/props only                       |
| **Business**          | Domain logic, orchestration, validation rules, derived state                                 | `modules/*/hooks`                                             | API layer (via TanStack Query hooks) + State layer        |
| **API / Data Access** | Talks to backend REST endpoints, shapes requests/responses                                   | `modules/*/api`, `shared/api`                                 | Infrastructure layer (`apiClient`)                        |
| **State**             | Holds data: server cache (TanStack Query), client state (Zustand), local component state     | `modules/*/store`, `shared/store`, TanStack Query cache       | Read by Presentation & Business layers                    |
| **Utility**           | Pure functions: formatting, validation, calculations — no side effects                       | `shared/utils`, `shared/constants`                            | Called by any layer                                       |
| **Infrastructure**    | Cross-cutting technical concerns: HTTP client, router, env config, logging, error boundaries | `shared/api/apiClient.ts`, `app/router`, `shared/config`      | Bottom of the stack; nothing depends on it depending back |

**Communication rule:** Presentation never calls the API layer directly — it only calls Business-layer hooks (e.g., a component calls `useProjects()`, not `axios.get('/projects')`). This keeps components swappable and testable without a real network layer, and keeps API-shape changes contained to one file per resource.

---

## 3. Routing Architecture

React Router v6 `createBrowserRouter`, one lazy-loaded route module per feature module (code-split automatically per domain).

### Route Groups

| Group                   | Layout                  | Guard                                             | Example paths                                                                                                                                                       |
| ----------------------- | ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public                  | `LandingLayout`         | none                                              | `/`, `/pricing`, `/about`, `/contact`                                                                                                                               |
| Auth                    | `AuthLayout`            | `RedirectIfAuthenticated`                         | `/login`, `/register`, `/forgot-password`, `/reset-password`                                                                                                        |
| Client (protected)      | `ClientDashboardLayout` | `RequireAuth` + `RequireRole('client')`           | `/dashboard`, `/projects`, `/projects/:id`, `/quotations`, `/invoices`, `/payments`, `/messages`, `/notifications`, `/reports`, `/settings`, `/profile`, `/support` |
| Admin/Staff (protected) | `AdminDashboardLayout`  | `RequireAuth` + `RequireRole('admin' \| 'staff')` | `/admin/dashboard`, `/admin/clients`, `/admin/projects`, `/admin/team`, `/admin/reports`, `/admin/analytics`, `/admin/support`, `/admin/settings`                   |
| Error                   | `ErrorLayout`           | none                                              | `404`, `403`, `500`                                                                                                                                                 |

### Route Hierarchy (text tree)

```
/                                   LandingLayout
├─ /pricing, /about, /contact
├─ /login, /register, /forgot-password, /reset-password    AuthLayout
├─ /dashboard                        ClientDashboardLayout (RequireAuth + role:client)
│  ├─ /projects, /projects/:id
│  ├─ /quotations, /quotations/:id
│  ├─ /invoices, /invoices/:id
│  ├─ /payments
│  ├─ /messages
│  ├─ /notifications
│  ├─ /reports
│  ├─ /settings, /profile
│  └─ /support
├─ /admin/dashboard                  AdminDashboardLayout (RequireAuth + role:admin|staff)
│  ├─ /admin/clients, /admin/clients/:id
│  ├─ /admin/projects, /admin/projects/:id
│  ├─ /admin/team
│  ├─ /admin/reports, /admin/analytics
│  ├─ /admin/support
│  └─ /admin/settings
└─ *                                  ErrorLayout (404)
```

### Access Control

- `RequireAuth`: reads Zustand auth store; if no valid session, redirects to `/login` with a `redirectTo` query param for post-login return.
- `RequireRole(roles)`: checks the authenticated user's role against an allow-list; on mismatch, redirects to `/403` (not `/login` — the user is authenticated, just not authorized).
- Guards are route-loader-level (React Router `loader`), so unauthorized UI never mounts even momentarily.
- Staff and Admin share the Admin layout and most routes; route-level or component-level checks narrow specific actions (e.g., only Admin can access `/admin/team` role management) — this granularity is a Business-layer concern, not a routing concern.

### Navigation Flow

Unauthenticated visitor → Landing/Public pages → Register or Login → on success, redirected by role: `client` → `/dashboard`, `admin`/`staff` → `/admin/dashboard`. Session expiry (refresh failure) anywhere in the protected tree → forced redirect to `/login` with the current path preserved for return-after-login.

---

## 4. Layout Architecture

| Layout                  | Responsibility                                                                 | Shared components used                                                                    | Pages owned                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `LandingLayout`         | Public marketing shell: header nav, footer, CTA                                | Header, Footer, Button                                                                    | Landing, Pricing, About, Contact                                                                   |
| `AuthLayout`            | Centered card shell for auth forms, brand panel                                | Card, Logo                                                                                | Login, Register, Forgot/Reset Password                                                             |
| `ClientDashboardLayout` | Sidebar + topbar shell for authenticated clients                               | Sidebar, TopNav, Breadcrumbs, NotificationBell, ProfileMenu                               | Dashboard, Projects, Quotations, Invoices, Payments, Messages, Reports, Settings, Profile, Support |
| `AdminDashboardLayout`  | Sidebar + topbar shell for admin/staff, wider data-table-oriented content area | Sidebar (admin variant), TopNav, Breadcrumbs, GlobalSearch, NotificationBell, ProfileMenu | Admin Dashboard, Clients, Projects, Team, Reports, Analytics, Support, Settings                    |
| `ErrorLayout`           | Minimal centered shell, no nav chrome                                          | Logo, Button                                                                              | 404, 403, 500                                                                                      |

Each layout is a single component in `shared/layouts/` that renders an `<Outlet />`; it owns no domain logic — only chrome (nav, containers, responsive shell) shared by every page mounted inside it.

---

## 5. Component Architecture

| Category                        | Location                       | Reusability                      | Responsibility                                                                  |
| ------------------------------- | ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------- |
| **UI (primitive)**              | `shared/components/ui/`        | Global, zero domain knowledge    | shadcn-based atoms: Button, Input, Select, Dialog, Table, Badge, Card           |
| **Common**                      | `shared/components/common/`    | Global, minimal domain knowledge | EmptyState, LoadingSpinner, ErrorState, ConfirmDialog, PageHeader               |
| **Layout**                      | `shared/layouts/`              | Global                           | Page shells (Section 4)                                                         |
| **Shared feature components**   | `shared/components/feature/`   | Used by 2+ modules               | e.g., `StatusBadge` (used by projects, quotations, invoices), `CurrencyDisplay` |
| **Business/Feature components** | `modules/<domain>/components/` | Single module only               | Domain-specific UI: `ProjectCard`, `InvoiceTable`, `QuotationForm`              |

**Rule of thumb:** a component starts inside its module. It is promoted to `shared/components/feature/` only once a second module needs the same behavior — never pre-emptively. UI primitives (`shared/components/ui/`) are the one exception: they're seeded up front from shadcn since every module needs them immediately.

---

## 6. State Management Architecture

| State type          | Tool                                                         | Location                            | Example                                             |
| ------------------- | ------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------- |
| **Server state**    | TanStack Query                                               | `modules/<domain>/api/*.queries.ts` | Project list, invoice detail, quotation status      |
| **Auth state**      | Zustand (persisted, memory + rehydrated from silent refresh) | `shared/store/auth.store.ts`        | Access token, current user, role                    |
| **Global UI state** | Zustand                                                      | `shared/store/ui.store.ts`          | Sidebar collapsed, active theme, global modal state |
| **Local state**     | React `useState`/`useReducer`                                | Inside components                   | Form input, toggle, hover state                     |
| **URL state**       | React Router search params                                   | Route components                    | Filters, pagination page, active tab                |

**Why split server state from Zustand:** TanStack Query already solves caching, dedup, invalidation, and background refetch — duplicating that in a global store causes stale-data bugs. Zustand is reserved for state that has no server source of truth (UI preferences) or that must survive across the whole app outside the query cache (the authenticated user's identity and role, read by route guards on every navigation).

---

## 7. API Architecture

### Folder Organization

```
shared/api/
  apiClient.ts        # axios instance: baseURL, withCredentials, interceptors
  queryClient.ts       # TanStack QueryClient instance + default options
  queryKeys.ts         # centralized query key factory, avoids key collisions

modules/<domain>/api/
  <domain>.api.ts       # raw REST calls (getProjects, createProject...)
  <domain>.queries.ts   # useQuery/useMutation hooks wrapping the above
```

### Request Lifecycle

1. Component calls a module hook, e.g. `useProjects(filters)`.
2. Hook calls `useQuery` with a key from `queryKeys.ts` and a fetcher from `<domain>.api.ts`.
3. Fetcher calls `apiClient` (shared axios instance) with the relative path — `baseURL` and credentials are pre-configured once.
4. Request interceptor attaches `Authorization: Bearer <accessToken>` read from the Zustand auth store.
5. Response returns; TanStack Query caches by key and re-renders subscribers.

### Response & Error Handling

- Success responses are unwrapped to their `data` payload in the `.api.ts` layer, so components never see the transport envelope.
- Errors are normalized into a single `ApiError` shape (`status`, `message`, `fieldErrors?`) in an axios response interceptor, so every module handles errors the same way.
- TanStack Query's `error` state surfaces `ApiError` to components; a shared `<ErrorState />` component renders it consistently.
- Form-level validation errors (`fieldErrors`) are mapped to form fields by the module's form logic — this is the one place per-domain handling differs.

### Authentication Flow & Token Management

- On login/register, backend sets an httpOnly `refresh_token` cookie and returns an access token in the response body (matches `backend/src/controllers/auth.controller.js`).
- Access token is held in memory only (Zustand store, not persisted to localStorage) to limit XSS exposure.
- Axios request interceptor attaches the access token to every request.
- Axios response interceptor catches `401`, calls `/auth/refresh` (cookie sent automatically via `withCredentials`), updates the store with the new access token, and retries the original request once. A second `401` forces logout and redirect to `/login`.
- `RequireAuth` route guard checks for a valid in-memory access token; on hard page reload (memory cleared), the app performs a silent refresh on boot before rendering protected routes.

### Environment Configuration

- `.env` variables (`VITE_API_BASE_URL`, `VITE_ENV`) read once through `shared/config/env.ts`, which validates them at boot (fail fast on missing config) rather than accessing `import.meta.env` scattered across the codebase.

---

## 8. Page Hierarchy

```
Landing
├─ Pricing
├─ About
├─ Contact
Authentication
├─ Login
├─ Register
├─ Forgot Password
└─ Reset Password
Client Dashboard (home)
├─ Projects (list) → Project Details
├─ Request Project (form, entry point into Projects)
├─ Quotations (list) → Quotation Details
├─ Invoices (list) → Invoice Details
├─ Payments (list, tied to Invoices)
├─ Messages (tied to Projects/Support threads)
├─ Notifications (list)
├─ Reports
├─ Settings
├─ Profile
└─ Support
Admin Dashboard (home)
├─ Clients (list) → Client Details
├─ Projects (list) → Project Details (admin view)
├─ Team (staff management)
├─ Reports
├─ Analytics
├─ Support (ticket queue)
└─ Settings
Error
├─ 404
├─ 403
└─ 500
```

**Relationships:** Request Project creates a Project, which generates a Quotation, which upon approval generates an Invoice, which is settled via Payments — this chain is the core business flow and is reflected in cross-links between those pages (e.g., a Project Details page links to its Quotation and Invoice). Messages and Notifications are cross-cutting — they can reference any entity (project, invoice, support ticket) via a polymorphic reference rather than living under one parent.

---

## 9. Dashboard Information Architecture

### Client Dashboard

| Widget               | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| Welcome Section      | Greets the client by name, shows account status at a glance                 |
| Statistics           | Summary counts: active projects, pending quotations, unpaid invoices        |
| Active Projects      | Cards/list of in-progress projects with status and next milestone           |
| Recent Activity      | Chronological feed of events across projects (status changes, new messages) |
| Notifications        | Latest unread notifications, links to full Notifications page               |
| Calendar             | Upcoming milestones, meetings, deadlines across active projects             |
| Quick Actions        | Shortcuts: Request Project, View Invoices, Contact Support                  |
| Pending Quotations   | Quotations awaiting client approval — action-required item                  |
| Outstanding Invoices | Unpaid invoices with due dates — action-required item                       |
| Recent Payments      | Last few completed payments for reassurance/record-keeping                  |

### Admin Dashboard

| Widget           | Purpose                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| Revenue Overview | Aggregate revenue trend (MRR-style chart) for business health             |
| Analytics        | Deeper metrics: conversion from quotation to invoice, project throughput  |
| Client Summary   | Total/active/new clients this period                                      |
| Projects         | Cross-client project status board (active, delayed, completed)            |
| Team Activity    | What staff members are currently working on / recent actions              |
| Recent Clients   | Newest client sign-ups needing onboarding attention                       |
| Pending Tasks    | Admin/staff action items (quotations to approve, invoices to send)        |
| Support Tickets  | Open ticket queue with priority/age                                       |
| Reports          | Entry point into detailed report generation                               |
| System Health    | API/backend status indicator (uptime, error rate) — operational awareness |
| Notifications    | Admin-relevant notifications feed                                         |

Each widget is a component in `modules/dashboard-client/components/` or `modules/dashboard-admin/components/`; it fetches its own data via a scoped TanStack Query hook rather than the dashboard page fetching everything and prop-drilling, so widgets can be added/removed independently.

---

## 10. Navigation Architecture

- **Sidebar** — primary navigation for both dashboards, role-aware (renders Client vs Admin menu items from a config array, not duplicated markup). Collapsible; collapsed state stored in `shared/store/ui.store.ts`.
- **Top Navigation** — global search (admin only), notification bell, profile menu; sticky across scroll.
- **Breadcrumbs** — auto-derived from the active route tree (React Router route `handle` metadata), giving users a path back up the hierarchy on nested pages (e.g., Projects → Project Details).
- **Footer** — present only in `LandingLayout`; dashboards omit it in favor of vertical space.
- **Search** — global search in Admin top nav queries across clients/projects/invoices; Client dashboard uses local, per-page search/filter instead (smaller data scope).
- **Notifications** — bell icon opens a dropdown of the latest items, with a link to the full Notifications page; unread count sourced from a polling query.
- **Profile Menu** — avatar dropdown: Profile, Settings, Logout, in both dashboards.

**Navigation flow:** Sidebar is the primary wayfinding tool (task-oriented, "go to my Invoices"). Breadcrumbs handle drill-down orientation ("where am I within Projects"). Top nav handles cross-cutting actions (search, notifications, account) that aren't tied to the current section.

---

## 11. Feature Modules

Each module below is self-contained: `components/`, `hooks/`, `api/`, `store/` (only if the module needs local client state beyond server cache), `types/`, `routes.tsx`.

| Module             | Responsibility                                      | Boundary                                                                                                  |
| ------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `auth`             | Login, register, password reset, session bootstrap  | Owns the auth store's _write_ path; other modules only _read_ auth state via `shared/store/auth.store.ts` |
| `dashboard-client` | Client home dashboard composition and widgets       | Reads from other modules' query hooks (projects, invoices, etc.) but owns no domain data itself           |
| `dashboard-admin`  | Admin home dashboard composition and widgets        | Same pattern as above, admin-scoped                                                                       |
| `projects`         | Project CRUD, project details, request-project flow | Owns Project entity end-to-end                                                                            |
| `clients`          | Admin-side client management                        | Owns Client entity (admin view of a client account)                                                       |
| `quotations`       | Quotation creation, approval flow                   | Owns Quotation entity; references Project by ID only                                                      |
| `invoices`         | Invoice generation, viewing, status                 | Owns Invoice entity; references Quotation/Project by ID only                                              |
| `payments`         | Payment recording/viewing                           | Owns Payment entity; references Invoice by ID only                                                        |
| `messaging`        | Threaded messages tied to projects/support          | Owns Message/Thread entity; polymorphic reference to other entities                                       |
| `notifications`    | Notification feed and preferences                   | Owns Notification entity                                                                                  |
| `reports`          | Report generation/viewing (both dashboards)         | Reads from other modules' data via dedicated report endpoints, owns no primary entity                     |
| `settings`         | Account/app settings                                | Owns user preference data                                                                                 |
| `support`          | Support ticket flow                                 | Owns Ticket entity                                                                                        |

**Boundary rule:** a module may import another module's `api/`-layer _types_ (e.g., `invoices` importing a `ProjectSummary` type from `projects`) but never another module's components or internal hooks directly. Cross-module UI composition happens only at the `dashboard-*` or page level, never module-to-module.

---

## 12. Design System Architecture

| Aspect         | Approach                                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Colors**     | Defined once as CSS variables / Tailwind theme tokens (`--color-primary`, `--color-surface`, semantic tokens like `--color-danger`) in `styles/tokens.css`; components reference tokens, never raw hex values. |
| **Typography** | A small type scale (e.g., `text-xs` through `text-3xl`) mapped to defined use-cases (heading, body, caption) via Tailwind config, not ad hoc sizing per component.                                             |
| **Icons**      | Single icon library (e.g., lucide-react, which shadcn already assumes) — no mixing icon sets.                                                                                                                  |
| **Components** | shadcn/ui primitives generated into `shared/components/ui/`, customized once at the theme level; feature components compose primitives rather than styling raw HTML elements.                                  |
| **Tokens**     | Tailwind config (`tailwind.config.ts`) is the single source of truth for color, spacing, radius, shadow tokens — consumed by both Tailwind classes and any JS that needs raw values (charts).                  |
| **Themes**     | Light/dark via CSS variable swap at the root (`data-theme` attribute); no component-level theme branching.                                                                                                     |
| **Spacing**    | Tailwind's default spacing scale used consistently; no arbitrary pixel values in component code.                                                                                                               |

**Consistency mechanism:** design tokens live in exactly one place (Tailwind config + CSS variables). Any new color/spacing need is added there first, then consumed — never hardcoded inline. This is enforced in code review, not tooling, at this stage; a lint rule (e.g., `eslint-plugin-tailwindcss`) can be added later if drift becomes a problem.

---

## 13. Scalability

- **Thousands of users:** Client-side concerns only (SPA served from CDN/static host); backend scaling is out of scope. TanStack Query's caching reduces redundant requests at scale.
- **Future mobile app:** `modules/*/api` and `shared/api` contain no React/DOM-specific code — they are portable to React Native largely as-is if a mobile app is built later. UI layers (`components/`, `layouts/`) would not be reused, by design.
- **Multiple frontend teams:** The module boundary (Section 11) is also a team-ownership boundary — one team can own `projects` + `quotations` + `invoices` (the core delivery pipeline) while another owns `messaging` + `notifications` + `support`, with `shared/` changes requiring Team Lead review since they affect everyone.
- **New feature modules:** Adding a module means adding one new folder under `modules/` and one route registration — it does not require touching existing modules, satisfying an open/closed structure.
- **Additional user roles:** The `RequireRole` guard and the role enum (`shared/constants/roles.ts`) are the only two places a new role touches; route trees and layouts are already role-parameterized rather than hardcoded to `client`/`admin`.
- **Future multi-tenancy:** Not implemented now, but the architecture doesn't block it — a tenant identifier would flow through `shared/store/auth.store.ts` and the `apiClient` (as a header), the same mechanism already used for the access token, without restructuring modules.

---

## 14. Development Roadmap

| Phase                                | Deliverable                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1 — Project Setup**          | Vite + React + TypeScript scaffold, ESLint/Prettier, Tailwind + shadcn install, folder structure from Section 1 created empty with placeholder `index.ts` files |
| **Phase 2 — Design System**          | Tailwind tokens, theme (light/dark), core `shared/components/ui/` primitives (Button, Input, Card, Table, Dialog, Badge)                                        |
| **Phase 3 — Infrastructure**         | `apiClient` + interceptors, `queryClient`, env config, error boundary, `shared/store` (auth, ui) skeletons                                                      |
| **Phase 4 — Routing & Layouts**      | Router tree, all 5 layouts, route guards (`RequireAuth`, `RequireRole`), error pages                                                                            |
| **Phase 5 — Authentication Module**  | Login, Register, Forgot/Reset Password, session bootstrap + silent refresh wired end-to-end against the existing backend `auth` routes                          |
| **Phase 6 — Client Dashboard Shell** | `dashboard-client` module with static widget layout, no real data yet                                                                                           |
| **Phase 7 — Admin Dashboard Shell**  | `dashboard-admin` module, same approach                                                                                                                         |
| **Phase 8 — Core Delivery Pipeline** | `projects` → `quotations` → `invoices` → `payments` modules, in that dependency order, each wired to real backend endpoints as they become available            |
| **Phase 9 — Communication Modules**  | `messaging`, `notifications` (polling-based)                                                                                                                    |
| **Phase 10 — Supporting Modules**    | `reports`, `settings`, `support`                                                                                                                                |
| **Phase 11 — Hardening**             | Accessibility pass, responsive QA, error/loading state audit across all modules, performance pass (bundle splitting verification)                               |

Each phase ends with a Team Lead review gate per the collaboration workflow before the next phase starts.
