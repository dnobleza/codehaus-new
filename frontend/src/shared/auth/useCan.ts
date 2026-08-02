import { useAuthStore } from '@/shared/store/auth.store';
import { roleCan, type Capability } from './capabilities';

/**
 * Returns whether the signed-in user may perform `capability`, per the
 * shared capability matrix in `capabilities.ts`. Reads the current user's
 * role from the existing Zustand auth store — no separate normalization,
 * `AuthUser.role` is already lowercase (bridged once at
 * `modules/auth/api/auth.api.ts`).
 *
 * This only gates UI rendering; the backend remains the source of truth for
 * authorization and re-checks every request independently.
 */
export function useCan(capability: Capability): boolean {
  const role = useAuthStore((state) => state.user?.role);
  return roleCan(role, capability);
}
