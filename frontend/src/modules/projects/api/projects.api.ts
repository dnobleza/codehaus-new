import { apiClient } from '@/shared/api/apiClient';
import type { ApiEnvelope } from '@/shared/types/api.types';
import type { Project, ProjectStatusCode } from '@/shared/types/project.types';

/**
 * camelCase body, matching `backend/src/validators/projects.validator.js`'s
 * `createProjectSchema` exactly (verified against the live API — the field
 * names are camelCase, not the snake_case originally sketched in the task
 * brief).
 */
export interface CreateProjectPayload {
  title: string;
  requestDetails?: string;
  /** Omit/null for a custom project request. */
  packageId?: string | null;
}

export interface ListProjectsFilters {
  statusCode?: ProjectStatusCode;
}

/** Raw REST calls for the project domain. Responses are unwrapped to their `data` payload here. */
export const projectsApi = {
  async list(filters?: ListProjectsFilters): Promise<Project[]> {
    const response = await apiClient.get<ApiEnvelope<Project[]>>('/projects', {
      params: filters?.statusCode ? { status_code: filters.statusCode } : undefined,
    });
    return response.data.data;
  },

  /** Includes nested `quotations` (with addon line items) — see `Project` type. */
  async getById(id: string): Promise<Project> {
    const response = await apiClient.get<ApiEnvelope<Project>>(`/projects/${id}`);
    return response.data.data;
  },

  async create(payload: CreateProjectPayload): Promise<Project> {
    const response = await apiClient.post<ApiEnvelope<Project>>('/projects', payload);
    return response.data.data;
  },
};

/**
 * Admin/staff-scoped project queue (`/admin/projects`, role ADMIN or STAFF
 * per `adminProjects.route.js`). `list()` returns bare `projects` rows
 * (verified against `projects.repository.js#listAll` — no client name or
 * package name joined in; see this module's report for the resulting gap).
 * `getById()` nests `quotations` the same way the client-facing
 * `projectsApi.getById` does (`adminProjects.controller.js#getById` calls
 * the same `getProjectAdmin` -> `listByProjectWithAddons` path).
 */
export const adminProjectsApi = {
  async list(filters?: ListProjectsFilters): Promise<Project[]> {
    const response = await apiClient.get<ApiEnvelope<Project[]>>('/admin/projects', {
      params: filters?.statusCode ? { status_code: filters.statusCode } : undefined,
    });
    return response.data.data;
  },

  async getById(id: string): Promise<Project> {
    const response = await apiClient.get<ApiEnvelope<Project>>(`/admin/projects/${id}`);
    return response.data.data;
  },

  /**
   * `statusCode` is typed as the full `ProjectStatusCode` union (not a bare
   * `string`) even though the backend validator (`adminStatusUpdateSchema`)
   * accepts any string up to 40 chars and only checks existence in the
   * `project_statuses` lookup table at the service layer — there is no
   * transition-graph enforcement server-side (confirmed in
   * `projects.service.js#updateProjectStatusAdmin`'s comment). Keeping the
   * stronger type here is a frontend-only constraint so the status-change
   * UI (`AdminProjectDetailPage`) can only ever request a value that's
   * actually a valid status code, even though the API itself would accept
   * any matching string.
   */
  async updateStatus(id: string, statusCode: ProjectStatusCode): Promise<Project> {
    const response = await apiClient.patch<ApiEnvelope<Project>>(`/admin/projects/${id}/status`, {
      statusCode,
    });
    return response.data.data;
  },

  /** Accept a `submitted` request — the API moves it to `under_review`. Legal only from `submitted` (409 otherwise). */
  async accept(id: string): Promise<Project> {
    const response = await apiClient.patch<ApiEnvelope<Project>>(`/admin/projects/${id}/accept`);
    return response.data.data;
  },

  /** Decline a `submitted` request with a required reason — the API moves it to `cancelled` and stores the reason. */
  async decline(id: string, reason: string): Promise<Project> {
    const response = await apiClient.patch<ApiEnvelope<Project>>(`/admin/projects/${id}/decline`, {
      reason,
    });
    return response.data.data;
  },
};
