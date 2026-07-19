/**
 * Centralized TanStack Query key factory (architecture doc §7). Keeping
 * every module's keys in one place avoids accidental collisions and gives
 * mutations a single source of truth to invalidate against. Generic by
 * design — the Admin frontend work extends this same file rather than
 * inventing a parallel one.
 */
export const queryKeys = {
  packages: {
    all: ['packages'] as const,
    list: () => [...queryKeys.packages.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.packages.all, 'detail', id] as const,
    // Admin-scoped queries (GET /admin/packages, GET /admin/packages/:id):
    // nested under the same `packages` bucket rather than a parallel key
    // tree, since it's the same entity — just a different, all-rows admin
    // view instead of the client's active-only catalog view.
    adminAll: () => [...queryKeys.packages.all, 'admin'] as const,
    adminList: () => [...queryKeys.packages.adminAll(), 'list'] as const,
    adminDetail: (id: string) => [...queryKeys.packages.adminAll(), 'detail', id] as const,
  },
  addons: {
    all: ['addons'] as const,
    list: () => [...queryKeys.addons.all, 'list'] as const,
    // Admin-scoped catalog management (GET/POST/PATCH/DELETE /admin/addons).
    adminAll: () => [...queryKeys.addons.all, 'admin'] as const,
    adminList: () => [...queryKeys.addons.adminAll(), 'list'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (filters?: unknown) => [...queryKeys.projects.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
    // Client-facing "Project Overview" page (GET /projects/:id/overview, GET /projects/:id/activity).
    overview: (id: string) => [...queryKeys.projects.all, 'overview', id] as const,
    activity: (id: string) => [...queryKeys.projects.all, 'activity', id] as const,
    // Admin/staff-scoped project queue (GET /admin/projects, GET /admin/projects/:id).
    adminAll: () => [...queryKeys.projects.all, 'admin'] as const,
    adminList: (filters?: unknown) =>
      [...queryKeys.projects.adminAll(), 'list', filters ?? {}] as const,
    adminDetail: (id: string) => [...queryKeys.projects.adminAll(), 'detail', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    listByProject: (projectId: string) =>
      [...queryKeys.payments.all, 'project', projectId] as const,
    // Admin/staff-scoped verification queue (GET /admin/payments).
    adminAll: () => [...queryKeys.payments.all, 'admin'] as const,
    adminList: (filters?: unknown) =>
      [...queryKeys.payments.adminAll(), 'list', filters ?? {}] as const,
  },
} as const;
