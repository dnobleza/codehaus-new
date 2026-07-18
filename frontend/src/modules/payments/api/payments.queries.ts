import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import {
  adminPaymentsApi,
  paymentsApi,
  type ListAdminPaymentsFilters,
  type SubmitPaymentPayload,
} from './payments.api';

/** Multipart payment submission (payment method + amount + reference + proof file). */
export function useSubmitPayment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitPaymentPayload) => paymentsApi.submit(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.listByProject(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

/**
 * Payments for a project, newest-first (so `payments[0]` is the most recent
 * submission). Polls on the same 8s rhythm as `useProject` while that most
 * recent payment is under admin verification, so the client's own status
 * badge (e.g. "Under Verification" -> "Verified") updates live without a
 * reload. Once verified/rejected, polling for that submission stops; a
 * later new submission is picked up via `useSubmitPayment`'s explicit
 * cache invalidation, not polling.
 */
export function useProjectPayments(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payments.listByProject(projectId ?? ''),
    queryFn: () => paymentsApi.listByProject(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const latestPayment = query.state.data?.[0];
      return latestPayment?.status === 'verification' ? 8000 : false;
    },
  });
}

/**
 * Loads an authenticated proof-of-payment file as a blob object URL, since
 * a plain `<img src>` can't carry the `Authorization` header the proof
 * route requires. Not a TanStack Query hook (the object URL is a local
 * resource that must be revoked on unmount/change, which doesn't fit the
 * query cache's lifecycle) — plain `useState`/`useEffect` instead.
 */
export function useProofImageUrl(proofUrl: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!proofUrl) {
      setUrl(null);
      setError(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    paymentsApi
      .fetchProofBlobUrl(proofUrl)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        objectUrl = blobUrl;
        setUrl(blobUrl);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load proof of payment'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [proofUrl]);

  return { url, isLoading, error };
}

// --- Admin/staff payment verification queue ---

/**
 * All payments across every project, optionally filtered by status — the
 * admin/staff verification queue, and the source `AdminProjectDetailPage`
 * derives its single-project "Payment verification" card from. Polls
 * unconditionally while mounted: unlike a per-record detail query, a brand
 * new submission from a client can't be predicted from the data already in
 * cache (there's nothing in "0 items awaiting verification" that indicates
 * a new one is about to appear), so a content-conditional predicate can't
 * work here the way it does for `useProject`/`useAdminProject`. This is
 * the intended "live work queue" surface anyway — staff keep it open and
 * watch for new submissions.
 */
export function useAdminPayments(filters?: ListAdminPaymentsFilters) {
  return useQuery({
    queryKey: queryKeys.payments.adminList(filters),
    queryFn: () => adminPaymentsApi.list(filters),
    refetchInterval: 8000,
  });
}

function invalidateAdminPaymentCaches(queryClient: ReturnType<typeof useQueryClient>, projectId?: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.payments.adminAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminAll() });
  if (projectId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.adminDetail(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.listByProject(projectId) });
  }
}

/** Verifying cascades the parent project to `accepted` server-side — refetch both caches. */
export function useVerifyPayment(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPaymentsApi.verify(id),
    onSuccess: () => invalidateAdminPaymentCaches(queryClient, projectId),
  });
}

export function useRejectPayment(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPaymentsApi.reject(id),
    onSuccess: () => invalidateAdminPaymentCaches(queryClient, projectId),
  });
}
