import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ApiError } from '@/shared/api/apiClient';
import type { Addon } from '@/shared/types/addon.types';
import { useCreateAddon, useUpdateAddon } from '../api/addons.queries';
import { ADDON_CATEGORY_OPTIONS, addonFormSchema, type AddonFormValues } from '../schemas';

const EMPTY_DEFAULTS: AddonFormValues = {
  category: 'authentication',
  name: '',
  price: '',
  description: '',
  displayOrder: '0',
};

interface AddonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addon: Addon | null;
}

/**
 * Add/Edit add-on form — a Modal (design-system.md §2.6 default 480px
 * variant, since this is a simple few-field form, unlike the package form's
 * multi-section content that justified a dedicated route).
 */
export function AddonFormDialog({ open, onOpenChange, addon }: AddonFormDialogProps) {
  const isEditMode = Boolean(addon);
  const createAddon = useCreateAddon();
  const updateAddon = useUpdateAddon(addon?.id ?? '');
  const mutation = isEditMode ? updateAddon : createAddon;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddonFormValues>({
    resolver: zodResolver(addonFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      addon
        ? {
            category: addon.category,
            name: addon.name,
            price: addon.price,
            description: addon.description ?? '',
            displayOrder: String(addon.display_order),
          }
        : EMPTY_DEFAULTS,
    );
  }, [open, addon, reset]);

  async function onSubmit(values: AddonFormValues) {
    const payload = {
      category: values.category,
      name: values.name,
      price: Number(values.price),
      description: values.description,
      displayOrder: Number(values.displayOrder),
    };

    if (isEditMode) {
      await updateAddon.mutateAsync(payload);
    } else {
      await createAddon.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const apiError = mutation.error as ApiError | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit ${addon?.name}` : 'Create add-on'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {apiError && <Alert variant="danger" title="Couldn't save this add-on" description={apiError.message} />}

          <Select label="Category" error={errors.category?.message} {...register('category')}>
            {ADDON_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input label="Name" error={errors.name?.message} {...register('name')} />

          <Input
            label="Price (PHP)"
            type="number"
            step="0.01"
            min="0"
            error={errors.price?.message}
            {...register('price')}
          />

          <Textarea label="Description" error={errors.description?.message} {...register('description')} />

          <Input
            label="Display order"
            type="number"
            min="0"
            error={errors.displayOrder?.message}
            {...register('displayOrder')}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEditMode ? 'Save changes' : 'Create add-on'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
