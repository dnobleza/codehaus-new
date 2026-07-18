import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import type { ProjectStatusCode } from '@/shared/types/project.types';
import { isWaitingOnAdmin } from '../utils/projectStatus';
import {
  adminProjectsApi,
  projectsApi,
  type CreateProjectPayload,
  type ListProjectsFilters,
} from './projects.api';

/** The authenticated client's own projects (backend scopes every read to `req.user.id`). */
export function useProjects(filters?: ListProjectsFilters) {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => projectsApi.list(filters),
  });
}

/**
 * Single project detail, including nested quotations. Polls on an interval
 * while the project is in a state where the client is waiting on an
 * admin/staff action (quotation being prepared, payment being verified) —
 * per the brief's "no websockets, TanStack Query refetchInterval is fine"
 * real-time guidance (architecture doc §7). Stops polling once the client
 * has the ball back in their court or the project reaches a terminal state.
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ''),
    queryFn: () => projectsApi.getById(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status_code;
      return status && isWaitingOnAdmin(status) ? 8000 : false;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

// --- Admin/staff project queue ---

/** All projects across every client, optionally filtered by status_code — the admin/staff review queue. */
export function useAdminProjects(filters?: ListProjectsFilters) {
  return useQuery({
    queryKey: queryKeys.projects.adminList(filters),
    queryFn: () => adminProjectsApi.list(filters),
  });
}

/** Single project detail for the admin/staff view — same nested-quotations shape as `useProject`. */
export function useAdminProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.adminDetail(id ?? ''),
    queryFn: () => adminProjectsApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useUpdateProjectStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statusCode: ProjectStatusCode) => adminProjectsApi.updateStatus(id, statusCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminDetail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminAll() });
    },
  });
}

/** Accept a submitted request (-> `under_review`). Mirrors `useUpdateProjectStatus`'s cache invalidation. */
export function useAcceptProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminProjectsApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminDetail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminAll() });
    },
  });
}

/** Decline a submitted request with a reason (-> `cancelled`). Mirrors `useUpdateProjectStatus`'s cache invalidation. */
export function useDeclineProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => adminProjectsApi.decline(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminDetail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminAll() });
    },
  });
}
