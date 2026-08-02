import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import { adminUsersApi, assignmentsApi } from './assignments.api';

/** A project's delivery team. */
export function useProjectAssignments(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projects.assignments(projectId),
    queryFn: () => assignmentsApi.list(projectId),
    enabled: Boolean(projectId),
  });
}

/**
 * Staff and admin available to assign. Admin-only endpoint, so this is only
 * mounted behind the `project.assign` capability — a staff caller would 403.
 *
 * The roster changes far less often than a project does, so it is cached for
 * five minutes rather than refetched every time a picker opens.
 */
export function useAssignableUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.assignable(),
    queryFn: () => adminUsersApi.listAssignable(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/*
  Both mutations invalidate the project's assignment list and the admin project
  lists. The list invalidation matters because a staff member's project list is
  scoped by assignment (projects.repository.js#listAssignedTo) — assigning
  someone changes what THEY can see, and an admin who is also assigned sees
  their own view change too.
*/
function useInvalidateAssignments(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.assignments(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminAll() });
  };
}

export function useAssignUserMutation(projectId: string) {
  const invalidate = useInvalidateAssignments(projectId);
  return useMutation({
    mutationFn: (userId: number | string) => assignmentsApi.assign(projectId, userId),
    onSuccess: invalidate,
  });
}

export function useUnassignUserMutation(projectId: string) {
  const invalidate = useInvalidateAssignments(projectId);
  return useMutation({
    mutationFn: (userId: number | string) => assignmentsApi.unassign(projectId, userId),
    onSuccess: invalidate,
  });
}
