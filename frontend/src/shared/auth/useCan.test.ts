import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useAuthStore } from '@/shared/store/auth.store';
import { ROLES, type Role } from '@/shared/constants/roles';
import type { AuthUser } from '@/shared/types/auth.types';
import { useCan } from './useCan';
import type { Capability } from './capabilities';

function setRole(role: Role | null) {
  if (!role) {
    useAuthStore.getState().clearSession();
    return;
  }
  const user: AuthUser = {
    id: 1,
    role,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };
  useAuthStore.getState().setSession(user, 'token');
}

/**
 * Exhaustive per-role expectations, mirroring the capability matrix in the
 * task brief exactly. Every capability x role combination is asserted so a
 * future edit to `capabilities.ts` that silently changes a grant is caught
 * here.
 */
const EXPECTATIONS: Record<Capability, Record<Role, boolean>> = {
  'project.list': { admin: true, staff: true, client: true },
  'project.view': { admin: true, staff: true, client: true },
  'project.accept': { admin: true, staff: false, client: false },
  'project.decline': { admin: true, staff: false, client: false },
  'project.deliver': { admin: true, staff: false, client: false },
  'project.setDeliveryStatus': { admin: true, staff: true, client: false },
  'project.setCommercialStatus': { admin: true, staff: false, client: false },
  // Staffing a project is an admin decision; reading the roster of a project
  // you are already on is not.
  'project.assign': { admin: true, staff: false, client: false },
  'project.viewTeam': { admin: true, staff: true, client: false },
  'quotation.create': { admin: true, staff: false, client: false },
  'quotation.edit': { admin: true, staff: false, client: false },
  'quotation.send': { admin: true, staff: false, client: false },
  'quotation.respond': { admin: false, staff: false, client: true },
  'milestone.update': { admin: true, staff: true, client: false },
  'milestone.generate': { admin: true, staff: true, client: false },
  'payment.queue.view': { admin: true, staff: true, client: false },
  'payment.verify': { admin: true, staff: false, client: false },
  'payment.reject': { admin: true, staff: false, client: false },
  'payment.viewProof': { admin: true, staff: false, client: true },
  'payment.submit': { admin: false, staff: false, client: true },
  'catalog.manage': { admin: true, staff: false, client: false },
};

describe('useCan', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  for (const [capability, byRole] of Object.entries(EXPECTATIONS) as [
    Capability,
    Record<Role, boolean>,
  ][]) {
    for (const role of Object.values(ROLES)) {
      it(`${capability}: ${role} -> ${byRole[role]}`, () => {
        setRole(role);
        const { result } = renderHook(() => useCan(capability));
        expect(result.current).toBe(byRole[role]);
      });
    }
  }

  it('returns false for every capability when unauthenticated', () => {
    setRole(null);
    const { result } = renderHook(() => useCan('project.list'));
    expect(result.current).toBe(false);
  });
});
