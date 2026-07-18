import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/shared/api/apiClient';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatTimelineRange } from '@/shared/utils/timeline';
import { toNumber } from '@/shared/utils/currency';
import type { Package } from '@/shared/types/package.types';
import { usePackages } from '@/modules/packages/api/packages.queries';
import { useAddons } from '@/modules/packages/api/addons.queries';
import { PackageCard } from '@/modules/packages/components/PackageCard';
import { QuotationSummaryCard } from '@/modules/quotations/components/QuotationSummaryCard';
import { useCreateQuotation } from '@/modules/quotations/api/quotations.queries';
import { AddonCatalog } from '../components/AddonCatalog';
import { useCreateProject } from '../api/projects.queries';

/**
 * Combines the task brief's "Package browser" and "Quotation builder" pages
 * into a single two-step wizard: pick a package (or Custom Project), then
 * (for non-custom packages) select add-ons with a live running total before
 * submitting. Kept as one page/component rather than two routes because
 * step 2 depends entirely on step 1's selection and there's no reason for a
 * client to navigate away mid-request.
 */
export function NewProjectPage() {
  const navigate = useNavigate();
  const { data: packages, isLoading: isLoadingPackages, isError: isPackagesError, refetch: refetchPackages } =
    usePackages();
  const { data: addons, isLoading: isLoadingAddons, isError: isAddonsError, refetch: refetchAddons } =
    useAddons();

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [requestDetails, setRequestDetails] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);

  const createProject = useCreateProject();
  const createQuotation = useCreateQuotation();

  const selectedAddons = useMemo(
    () => (addons ?? []).filter((addon) => selectedAddonIds.has(addon.id)),
    [addons, selectedAddonIds],
  );

  const basePrice = selectedPackage ? toNumber(selectedPackage.base_price) : 0;
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + toNumber(addon.price), 0);
  const total = basePrice + addonsTotal;
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

  const titleError = titleTouched && title.trim().length === 0 ? 'Project title is required' : undefined;
  const isSubmitting = createProject.isPending || createQuotation.isPending;
  const submitError = (createProject.error ?? createQuotation.error) as ApiError | null;

  async function handleSubmit() {
    setTitleTouched(true);
    if (!selectedPackage || title.trim().length === 0) return;

    try {
      const project = await createProject.mutateAsync({
        title: title.trim(),
        requestDetails: requestDetails.trim() || undefined,
        packageId: selectedPackage.is_custom ? null : selectedPackage.id,
      });

      // Custom projects have no catalog price — the backend rejects a
      // quotation request for them outright (base_price is null), so we
      // never call POST /quotations in that case; an admin prepares the
      // quotation manually instead (see project detail page's waiting state).
      if (!selectedPackage.is_custom) {
        await createQuotation.mutateAsync({
          projectId: project.id,
          payload: { addonIds: Array.from(selectedAddonIds) },
        });
      }

      navigate(`/client/dashboard/projects/${project.id}`);
    } catch {
      // Surfaced via createProject.error / createQuotation.error below.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        {selectedPackage && (
          <button
            type="button"
            onClick={() => setSelectedPackage(null)}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Change package
          </button>
        )}
        <h1 className="text-2xl font-bold text-foreground">
          {selectedPackage ? selectedPackage.name : 'Request a new project'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedPackage
            ? 'Review what is included, add any optional features, and submit your request.'
            : 'Choose a package that fits your business, or request a fully custom project.'}
        </p>
      </div>

      {!selectedPackage && (
        <>
          {isLoadingPackages && <LoadingSpinner label="Loading packages..." />}
          {isPackagesError && <ErrorState onRetry={() => refetchPackages()} />}
          {!isLoadingPackages && !isPackagesError && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(packages ?? []).map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onSelect={setSelectedPackage} />
              ))}
            </div>
          )}
        </>
      )}

      {selectedPackage && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {submitError && (
              <Alert
                variant="danger"
                title="Couldn't submit your request"
                description={submitError.message}
              />
            )}

            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
              <Input
                label="Project title"
                placeholder="e.g. My Bakery Website"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => setTitleTouched(true)}
                error={titleError}
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="request-details" className="text-sm font-medium text-foreground">
                  {selectedPackage.is_custom ? 'Describe what you need' : 'Additional details (optional)'}
                </label>
                <textarea
                  id="request-details"
                  rows={4}
                  value={requestDetails}
                  onChange={(event) => setRequestDetails(event.target.value)}
                  placeholder={
                    selectedPackage.is_custom
                      ? 'e.g. inventory system with barcode scanning, multi-branch support...'
                      : 'Anything else we should know about your project?'
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            {!selectedPackage.is_custom && (
              <>
                {isLoadingAddons && <LoadingSpinner label="Loading add-ons..." />}
                {isAddonsError && <ErrorState onRetry={() => refetchAddons()} />}
                {!isLoadingAddons && !isAddonsError && (
                  <AddonCatalog
                    addons={addons ?? []}
                    selectedIds={selectedAddonIds}
                    onToggle={toggleAddon}
                  />
                )}
              </>
            )}

            {selectedPackage.is_custom && (
              <Alert
                variant="info"
                title="Custom quotation"
                description="Our team will review your request and prepare a tailored quotation for you — no catalog pricing applies here."
              />
            )}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            {selectedPackage.is_custom ? (
              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit request'}
              </Button>
            ) : (
              <QuotationSummaryCard
                packageLabel={selectedPackage.name}
                basePrice={basePrice}
                addonLines={selectedAddons.map((addon) => ({
                  label: addon.name,
                  amount: toNumber(addon.price),
                }))}
                total={total}
                timelineLabel={timelineLabel}
                footer={
                  <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NewProjectPage;
