import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ImagePlus } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ApiError } from '@/shared/api/apiClient';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { PackageCard } from '../components/PackageCard';
import { PackageItemList } from '../components/PackageItemList';
import {
  useAdminPackage,
  useCreatePackage,
  usePackageFeatureMutations,
  usePackagePageMutations,
  useUpdatePackage,
  useUploadPackageBanner,
  useUploadPackageThumbnail,
} from '../api/packages.queries';
import { packageFormSchema, type PackageFormValues } from '../schemas';

const EMPTY_DEFAULTS: PackageFormValues = {
  name: '',
  slug: undefined,
  description: '',
  isCustom: false,
  basePrice: '',
  timelineMinWeeks: '',
  timelineMaxWeeks: '',
  displayOrder: '0',
};

/**
 * Create/Edit package — a dedicated route rather than a Modal.
 *
 * Decision (per the task brief's ask to justify Modal vs. dedicated-page):
 * design-system.md §2.6 caps even the "content-heavy" Modal variant at
 * 640px, but this form needs a two-column canvas (fields + a live
 * `PackageCard` preview fulfilling "Preview Package Before Publishing"),
 * PLUS inline pages/features list management, PLUS two independent file
 * uploads — that's meaningfully more surface than the clients/invoices
 * Modal forms design-system.md §3.4/§3.5 describe. A dedicated route also
 * lets pages/features/thumbnail/banner management appear progressively
 * once a package exists (see below), which a single-shot create Modal
 * can't do cleanly. This mirrors the client-side precedent of
 * `NewProjectPage` already being a dedicated route for a similarly
 * content-heavy flow.
 *
 * Pages/features/thumbnail/banner require an existing package id (the
 * nested-resource endpoints are all `/admin/packages/:id/...`), so in
 * create mode only the base fields are editable; on successful creation
 * the admin is routed straight to this same page in edit mode, where the
 * rest of the sections unlock.
 */
export function AdminPackageFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const { data: pkg, isLoading, isError, refetch } = useAdminPackage(id);

  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage(id ?? '');
  const uploadThumbnail = useUploadPackageThumbnail(id ?? '');
  const uploadBanner = useUploadPackageBanner(id ?? '');
  const pageMutations = usePackagePageMutations(id ?? '');
  const featureMutations = usePackageFeatureMutations(id ?? '');

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!pkg) return;
    reset({
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description ?? '',
      isCustom: pkg.is_custom,
      basePrice: pkg.base_price ?? '',
      timelineMinWeeks:
        pkg.estimated_timeline_min_days != null ? String(Math.round(pkg.estimated_timeline_min_days / 7)) : '',
      timelineMaxWeeks:
        pkg.estimated_timeline_max_days != null ? String(Math.round(pkg.estimated_timeline_max_days / 7)) : '',
      displayOrder: String(pkg.display_order),
    });
  }, [pkg, reset]);

  const isCustom = watch('isCustom');
  const formValues = watch();

  const mutation = isEditMode ? updatePackage : createPackage;
  const apiError = mutation.error as ApiError | null;

  async function onSubmit(values: PackageFormValues) {
    const payload = {
      name: values.name,
      slug: values.slug ? values.slug : undefined,
      description: values.description,
      isCustom: values.isCustom,
      basePrice: values.isCustom ? null : Number(values.basePrice),
      estimatedTimelineMinDays: values.timelineMinWeeks ? Number(values.timelineMinWeeks) * 7 : null,
      estimatedTimelineMaxDays: values.timelineMaxWeeks ? Number(values.timelineMaxWeeks) * 7 : null,
      displayOrder: Number(values.displayOrder),
    };

    if (isEditMode) {
      await updatePackage.mutateAsync(payload);
    } else {
      const created = await createPackage.mutateAsync(payload);
      navigate(`/admin/dashboard/packages/${created.id}/edit`, { replace: true });
    }
  }

  async function handleFileSelected(kind: 'thumbnail' | 'banner', file: File | undefined) {
    if (!file || !id) return;
    setUploadError(null);
    try {
      if (kind === 'thumbnail') await uploadThumbnail.mutateAsync(file);
      else await uploadBanner.mutateAsync(file);
    } catch (error) {
      setUploadError((error as ApiError).message);
    }
  }

  if (isEditMode && isLoading) {
    return <LoadingSpinner label="Loading package..." />;
  }

  if (isEditMode && isError) {
    return <ErrorState description="We couldn't load this package." onRetry={() => refetch()} />;
  }

  // Live preview object: reflects unsaved form edits immediately (fulfills
  // "Preview Package Before Publishing" continuously, rather than as a
  // separate one-off preview step) using whatever's already persisted for
  // fields the preview doesn't editorialize (thumbnail/pages/features).
  const previewPackage = {
    id: pkg?.id ?? 'preview',
    name: formValues.name || 'Untitled package',
    slug: formValues.slug ?? '',
    description: formValues.description || null,
    base_price: formValues.isCustom ? null : formValues.basePrice || null,
    estimated_timeline_min_days: formValues.timelineMinWeeks ? Number(formValues.timelineMinWeeks) * 7 : null,
    estimated_timeline_max_days: formValues.timelineMaxWeeks ? Number(formValues.timelineMaxWeeks) * 7 : null,
    display_order: Number(formValues.displayOrder || 0),
    is_active: pkg?.is_active ?? true,
    thumbnail_url: pkg?.thumbnail_url ?? null,
    banner_url: pkg?.banner_url ?? null,
    is_custom: formValues.isCustom,
    created_by: pkg?.created_by ?? null,
    created_at: pkg?.created_at ?? new Date().toISOString(),
    updated_at: pkg?.updated_at ?? new Date().toISOString(),
    pages: pkg?.pages ?? [],
    features: pkg?.features ?? [],
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/admin/dashboard/packages"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to packages
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          {isEditMode ? `Edit ${pkg?.name ?? 'package'}` : 'Create package'}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 lg:col-span-2">
          {apiError && (
            <Alert variant="danger" title="Couldn't save this package" description={apiError.message} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Package details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Name" error={errors.name?.message} {...register('name')} />
              <Input
                label="Slug (optional)"
                helperText="Auto-generated from the name if left blank."
                error={errors.slug?.message}
                {...register('slug')}
              />
              <Textarea label="Description" error={errors.description?.message} {...register('description')} />

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">Custom project package</p>
                  <p className="text-xs text-muted-foreground">
                    No catalog price — clients requesting this package get an admin-prepared quotation instead.
                  </p>
                </div>
                <Switch
                  checked={isCustom}
                  onCheckedChange={(checked) => setValue('isCustom', checked, { shouldValidate: true })}
                />
              </div>

              {!isCustom && (
                <Input
                  label="Base price (PHP)"
                  type="number"
                  step="0.01"
                  min="0"
                  error={errors.basePrice?.message}
                  {...register('basePrice')}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Timeline min (weeks)"
                  type="number"
                  min="0"
                  error={errors.timelineMinWeeks?.message}
                  {...register('timelineMinWeeks')}
                />
                <Input
                  label="Timeline max (weeks)"
                  type="number"
                  min="0"
                  error={errors.timelineMaxWeeks?.message}
                  {...register('timelineMaxWeeks')}
                />
              </div>

              <Input
                label="Display order"
                type="number"
                min="0"
                helperText="Lower numbers appear first in the client package browser."
                error={errors.displayOrder?.message}
                {...register('displayOrder')}
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="self-start" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEditMode ? 'Save changes' : 'Create package'}
          </Button>

          {isEditMode && pkg && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Images</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {uploadError && (
                    <Alert variant="danger" title="Upload failed" description={uploadError} />
                  )}
                  <ImageUploadField
                    label="Thumbnail"
                    imageUrl={pkg.thumbnail_url}
                    inputRef={thumbnailInputRef}
                    isUploading={uploadThumbnail.isPending}
                    onSelect={(file) => handleFileSelected('thumbnail', file)}
                  />
                  <ImageUploadField
                    label="Banner"
                    imageUrl={pkg.banner_url}
                    inputRef={bannerInputRef}
                    isUploading={uploadBanner.isPending}
                    onSelect={(file) => handleFileSelected('banner', file)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Included pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <PackageItemList
                    title=""
                    emptyMessage="No pages configured yet."
                    items={pkg.pages}
                    placeholder="e.g. Home"
                    isMutating={pageMutations.add.isPending || pageMutations.remove.isPending}
                    onAdd={(name) => pageMutations.add.mutate({ name, displayOrder: pkg.pages.length })}
                    onRemove={(pageId) => pageMutations.remove.mutate(pageId)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Included features</CardTitle>
                </CardHeader>
                <CardContent>
                  <PackageItemList
                    title=""
                    emptyMessage="No features configured yet."
                    items={pkg.features}
                    placeholder="e.g. Contact form"
                    isMutating={featureMutations.add.isPending || featureMutations.remove.isPending}
                    onAdd={(name) => featureMutations.add.mutate({ name, displayOrder: pkg.features.length })}
                    onRemove={(featureId) => featureMutations.remove.mutate(featureId)}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </form>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Preview — as clients will see it
          </p>
          <PackageCard pkg={previewPackage} onSelect={() => undefined} />
        </div>
      </div>
    </div>
  );
}

interface ImageUploadFieldProps {
  label: string;
  imageUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onSelect: (file: File | undefined) => void;
}

function ImageUploadField({ label, imageUrl, inputRef, isUploading, onSelect }: ImageUploadFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-32 w-full rounded-md border border-border object-cover" />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
          <ImagePlus className="size-6" aria-hidden="true" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : `Upload ${label.toLowerCase()}`}
      </Button>
    </div>
  );
}

export default AdminPackageFormPage;
