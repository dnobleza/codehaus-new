import { useEffect, useMemo, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import type { ApiError } from '@/shared/api/apiClient';
import { toNumber } from '@/shared/utils/currency';
import { formatTimelineRange } from '@/shared/utils/timeline';
import type { Quotation } from '@/shared/types/quotation.types';
import { useAdminPackages } from '@/modules/packages/api/packages.queries';
import { useAdminAddons } from '@/modules/addons/api/addons.queries';
import { AddonCatalog } from './AddonCatalog';
import { QuotationSummaryCard } from '@/modules/quotations/components/QuotationSummaryCard';
import {
  useCreateAndSendQuotation,
  useEditDraftQuotation,
  useSendDraftQuotation,
} from '@/modules/quotations/api/quotations.queries';

interface AdminQuotationBuilderProps {
  projectId: string;
  /** The project's own package selection, used as the default when preparing a brand-new quotation. */
  projectPackageId: string | null;
  /** Present when editing an existing `draft` quotation (client-submitted, or a previously saved admin draft). */
  draftQuotation?: Quotation;
  onDone?: () => void;
}

/**
 * Admin/staff quotation builder — "finalize/send a quotation" (task brief
 * step 7). Reuses `AddonCatalog` (identical add-on multi-select UI the
 * client-side quotation flow already built) and `QuotationSummaryCard`
 * (same itemized breakdown component) rather than forking either.
 *
 * This component originally read the catalog through the client-facing
 * `usePackages`/`useAddons` hooks (`GET /packages`, `GET /addons`),
 * reasoning that an admin should only ever quote from what's currently
 * active/purchasable — but those require role CLIENT exactly and reject
 * ADMIN/STAFF with a 403. Switched to the admin-scoped
 * `useAdminPackages`/`useAdminAddons` (`/admin/packages`, `/admin/addons`)
 * instead, filtered to `is_active` here client-side to preserve the
 * original "only quote what's purchasable" intent. Those admin-scoped
 * catalog-read endpoints accept both ADMIN and STAFF (writes stay
 * ADMIN-only) — see `backend/src/routes/adminPackages.route.js` /
 * `adminAddons.route.js` — so both roles can prepare quotations, matching
 * `adminProjects.route.js` allowing STAFF to create/send them.
 */
export function AdminQuotationBuilder({
  projectId,
  projectPackageId,
  draftQuotation,
  onDone,
}: AdminQuotationBuilderProps) {
  const {
    data: rawPackages,
    isLoading: loadingPackages,
    isError: packagesError,
    refetch: refetchPackages,
  } = useAdminPackages();
  const {
    data: rawAddons,
    isLoading: loadingAddons,
    isError: addonsError,
    refetch: refetchAddons,
  } = useAdminAddons();

  // `/admin/packages` and `/admin/addons` return every row (active +
  // inactive) for catalog management purposes — filter to active here so
  // an admin/staff can never quote a package/add-on that isn't currently
  // purchasable, matching the client-facing catalog's own scope and the
  // backend's `resolvePricing` validation (rejects an inactive
  // package/add-on with a 400 regardless).
  const packages = useMemo(() => (rawPackages ?? []).filter((pkg) => pkg.is_active), [rawPackages]);
  const addons = useMemo(() => (rawAddons ?? []).filter((addon) => addon.is_active), [rawAddons]);

  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    draftQuotation?.package_id ?? projectPackageId ?? '',
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(
    new Set(draftQuotation?.addons?.map((addon) => addon.addonId) ?? []),
  );
  const [discountAmount, setDiscountAmount] = useState<string>(draftQuotation?.discount_amount ?? '0');

  const createAndSend = useCreateAndSendQuotation(projectId);
  const editDraft = useEditDraftQuotation(projectId);
  const sendDraft = useSendDraftQuotation(projectId);

  useEffect(() => {
    if (!draftQuotation) return;
    setSelectedPackageId(draftQuotation.package_id ?? projectPackageId ?? '');
    setSelectedAddonIds(new Set(draftQuotation.addons?.map((addon) => addon.addonId) ?? []));
    setDiscountAmount(draftQuotation.discount_amount ?? '0');
  }, [draftQuotation, projectPackageId]);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === selectedPackageId),
    [packages, selectedPackageId],
  );
  const selectedAddons = useMemo(
    () => addons.filter((addon) => selectedAddonIds.has(addon.id)),
    [addons, selectedAddonIds],
  );

  const basePrice = selectedPackage ? toNumber(selectedPackage.base_price) : 0;
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + toNumber(addon.price), 0);
  const discount = toNumber(discountAmount) || 0;
  const total = Math.max(0, basePrice + addonsTotal - discount);
  const timelineLabel = selectedPackage
    ? formatTimelineRange(selectedPackage.estimated_timeline_min_days, selectedPackage.estimated_timeline_max_days)
    : null;

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) next.delete(addonId);
      else next.add(addonId);
      return next;
    });
  }

  const isBusy = createAndSend.isPending || editDraft.isPending || sendDraft.isPending;
  const apiError = (createAndSend.error ?? editDraft.error ?? sendDraft.error) as ApiError | null;
  const canSubmit = Boolean(selectedPackageId);

  function buildPayload() {
    return {
      packageId: selectedPackageId || undefined,
      addonIds: Array.from(selectedAddonIds),
      discountAmount: discount,
    };
  }

  async function handleCreateAndSend() {
    await createAndSend.mutateAsync(buildPayload());
    onDone?.();
  }

  async function handleSaveDraft() {
    if (!draftQuotation) return;
    await editDraft.mutateAsync({ quotationId: draftQuotation.id, payload: buildPayload() });
    onDone?.();
  }

  async function handleSaveAndSend() {
    if (!draftQuotation) return;
    await editDraft.mutateAsync({ quotationId: draftQuotation.id, payload: buildPayload() });
    await sendDraft.mutateAsync(draftQuotation.id);
    onDone?.();
  }

  if (loadingPackages || loadingAddons) return <LoadingSpinner label="Loading catalog..." />;
  if (packagesError) return <ErrorState onRetry={() => refetchPackages()} />;
  if (addonsError) return <ErrorState onRetry={() => refetchAddons()} />;

  return (
    <div className="flex flex-col gap-4">
      {apiError && <Alert variant="danger" title="Couldn't save this quotation" description={apiError.message} />}

      <Select
        label="Package"
        value={selectedPackageId}
        onChange={(event) => setSelectedPackageId(event.target.value)}
      >
        <option value="">Select a package...</option>
        {packages
          .filter((pkg) => !pkg.is_custom)
          .map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name}
            </option>
          ))}
      </Select>

      <AddonCatalog addons={addons} selectedIds={selectedAddonIds} onToggle={toggleAddon} />

      <Input
        label="Discount amount (PHP, optional)"
        type="number"
        min="0"
        step="0.01"
        value={discountAmount}
        onChange={(event) => setDiscountAmount(event.target.value)}
      />

      {selectedPackage && (
        <QuotationSummaryCard
          packageLabel={selectedPackage.name}
          basePrice={basePrice}
          addonLines={selectedAddons.map((addon) => ({ label: addon.name, amount: toNumber(addon.price) }))}
          total={total}
          timelineLabel={timelineLabel}
        />
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {draftQuotation ? (
          <>
            <Button variant="outline" onClick={handleSaveDraft} disabled={isBusy || !canSubmit}>
              {editDraft.isPending ? 'Saving...' : 'Save draft'}
            </Button>
            <Button onClick={handleSaveAndSend} disabled={isBusy || !canSubmit}>
              {isBusy ? 'Sending...' : 'Send to client'}
            </Button>
          </>
        ) : (
          <Button onClick={handleCreateAndSend} disabled={isBusy || !canSubmit}>
            {createAndSend.isPending ? 'Sending...' : 'Send quotation'}
          </Button>
        )}
      </div>
    </div>
  );
}
