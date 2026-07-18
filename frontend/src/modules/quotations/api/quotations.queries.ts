import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import {
  adminQuotationsApi,
  quotationsApi,
  type AdminQuotationPayload,
  type CreateQuotationPayload,
} from './quotations.api';

/**
 * All three quotation mutations invalidate the parent project's detail
 * query (and the list, for the create case) rather than writing the
 * response into the cache directly — the parent `Project` nests
 * `quotations` with addon line items that the plain mutation response
 * doesn't include (see `Quotation` type's doc comment), so a refetch is the
 * simplest way to keep the UI's itemized breakdown correct.
 *
 * Unlike accept/reject below, `projectId` is passed at mutate-time rather
 * than bound when the hook is instantiated — this mutation is used from
 * `NewProjectPage`, where the project doesn't exist yet when the component
 * renders (it's created by `useCreateProject` in the same submit handler).
 */
export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: CreateQuotationPayload }) =>
      quotationsApi.create(projectId, payload),
    onSuccess: (_quotation, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useAcceptQuotation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => quotationsApi.accept(projectId, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useRejectQuotation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => quotationsApi.reject(projectId, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

// --- Admin/staff quotation create/edit/send ---

function invalidateAdminProjectDetail(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminDetail(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminAll() });
}

export function useCreateAndSendQuotation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminQuotationPayload) => adminQuotationsApi.createAndSend(projectId, payload),
    onSuccess: () => invalidateAdminProjectDetail(queryClient, projectId),
  });
}

export function useEditDraftQuotation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quotationId, payload }: { quotationId: string; payload: AdminQuotationPayload }) =>
      adminQuotationsApi.editDraft(projectId, quotationId, payload),
    onSuccess: () => invalidateAdminProjectDetail(queryClient, projectId),
  });
}

export function useSendDraftQuotation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => adminQuotationsApi.sendDraft(projectId, quotationId),
    onSuccess: () => invalidateAdminProjectDetail(queryClient, projectId),
  });
}
