import { apiClient } from '@/shared/api/apiClient';
import type { ApiEnvelope } from '@/shared/types/api.types';
import type { Role } from '@/shared/constants/roles';

/**
 * A member of a project's delivery team.
 *
 * Names come from the `registration` table via a join, so they are nullable —
 * `users` and `registration` are separate tables and the join is a LEFT JOIN
 * (see projectAssignments.repository.js#listByProject). Render with a fallback
 * rather than assuming a name exists.
 */
export interface ProjectAssignment {
  project_id: string;
  user_id: number | string;
  assigned_by: number | string | null;
  assigned_at: string;
  role: Role | Uppercase<Role>;
  first_name: string | null;
  last_name: string | null;
}

/** A user eligible to be put on a delivery team — staff and admin only. */
export interface AssignableUser {
  user_id: number | string;
  role: Role | Uppercase<Role>;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

/** Best-effort display name; falls back to the email, then to the id. */
export function assigneeName(
  user: Pick<ProjectAssignment, 'first_name' | 'last_name' | 'user_id'> & { email?: string },
): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user.email) return user.email;
  return `User #${user.user_id}`;
}

export const assignmentsApi = {
  /** The project's current delivery team. Admin, or staff already assigned to it. */
  async list(projectId: string): Promise<ProjectAssignment[]> {
    const response = await apiClient.get<ApiEnvelope<ProjectAssignment[]>>(
      `/admin/projects/${projectId}/assignments`,
    );
    return response.data.data;
  },

  /** Add a user to the team. 409s if already assigned, or if the user is not staff/admin. */
  async assign(projectId: string, userId: number | string): Promise<ProjectAssignment> {
    const response = await apiClient.post<ApiEnvelope<ProjectAssignment>>(
      `/admin/projects/${projectId}/assignments`,
      { userId },
    );
    return response.data.data;
  },

  /** Remove a user from the team. 404s if they were not on it. */
  async unassign(projectId: string, userId: number | string): Promise<void> {
    await apiClient.delete(`/admin/projects/${projectId}/assignments/${userId}`);
  },
};

export const adminUsersApi = {
  /** Active staff and admin users, for the assignment picker. Admin-only. */
  async listAssignable(): Promise<AssignableUser[]> {
    const response = await apiClient.get<ApiEnvelope<AssignableUser[]>>('/admin/users/assignable');
    return response.data.data;
  },
};
