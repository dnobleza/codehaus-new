import { ROLES, type Role } from '@/shared/constants/roles';

/**
 * Every capability the frontend gates a control on. Names mirror the
 * backend's authorization split introduced in commit 7906772:
 * ADMIN owns the commercial and financial ledger, STAFF owns delivery
 * execution, CLIENT owns intent and approval.
 *
 * This is the single source of truth for role-based UI gating — do not
 * scatter `user.role === 'admin'` checks through components. Add a new
 * capability here (and to `CAPABILITY_ROLES` below) instead.
 */
export type Capability =
  | 'project.list'
  | 'project.view'
  | 'project.accept'
  | 'project.decline'
  | 'project.deliver'
  | 'project.setDeliveryStatus'
  | 'project.setCommercialStatus'
  | 'quotation.create'
  | 'quotation.edit'
  | 'quotation.send'
  | 'quotation.respond'
  | 'milestone.update'
  | 'milestone.generate'
  | 'payment.queue.view'
  | 'payment.verify'
  | 'payment.reject'
  | 'payment.viewProof'
  | 'payment.submit'
  | 'catalog.manage';

/**
 * The capability matrix, mirroring the backend exactly (see
 * `backend/src/routes/adminProjects.route.js` and `adminPayments.route.js`
 * doc comments for the governing principle). Every capability lists exactly
 * the roles permitted to perform it — scope differences (e.g. "assigned
 * only" vs "all", "read-only" vs full access) are enforced server-side and
 * do not change whether a control is shown at all here.
 */
const CAPABILITY_ROLES: Record<Capability, readonly Role[]> = {
  'project.list': [ROLES.ADMIN, ROLES.STAFF, ROLES.CLIENT],
  'project.view': [ROLES.ADMIN, ROLES.STAFF, ROLES.CLIENT],
  'project.accept': [ROLES.ADMIN],
  'project.decline': [ROLES.ADMIN],
  'project.deliver': [ROLES.ADMIN],
  'project.setDeliveryStatus': [ROLES.ADMIN, ROLES.STAFF],
  'project.setCommercialStatus': [ROLES.ADMIN],
  'quotation.create': [ROLES.ADMIN],
  'quotation.edit': [ROLES.ADMIN],
  'quotation.send': [ROLES.ADMIN],
  'quotation.respond': [ROLES.CLIENT],
  'milestone.update': [ROLES.ADMIN, ROLES.STAFF],
  'milestone.generate': [ROLES.ADMIN, ROLES.STAFF],
  'payment.queue.view': [ROLES.ADMIN, ROLES.STAFF],
  'payment.verify': [ROLES.ADMIN],
  'payment.reject': [ROLES.ADMIN],
  'payment.viewProof': [ROLES.ADMIN, ROLES.CLIENT],
  'payment.submit': [ROLES.CLIENT],
  'catalog.manage': [ROLES.ADMIN],
};

/** Returns whether `role` may perform `capability`, per the matrix above. */
export function roleCan(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return CAPABILITY_ROLES[capability].includes(role);
}
