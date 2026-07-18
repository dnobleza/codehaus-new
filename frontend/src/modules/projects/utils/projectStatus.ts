import type { BadgeProps } from '@/components/ui/badge';
import type { ProjectStatusCode } from '@/shared/types/project.types';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/** Friendly label per status code, exact wording from the schema design doc's status table. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatusCode, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  waiting_for_client: 'Waiting for Client',
  quotation_sent: 'Quotation Sent',
  quotation_accepted: 'Quotation Accepted',
  quotation_rejected: 'Quotation Rejected',
  payment_pending: 'Payment Pending',
  payment_verification: 'Payment Verification',
  accepted: 'Accepted',
  scheduled: 'Scheduled',
  in_development: 'In Development',
  in_testing: 'In Testing',
  client_review: 'Client Review',
  revision_requested: 'Revision Requested',
  revision_in_progress: 'Revision In Progress',
  ready_for_deployment: 'Ready for Deployment',
  deployed: 'Deployed',
  delivered: 'Delivered',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

/** Status -> Badge variant, following design-system.md §2.9's semantic palette. */
export const PROJECT_STATUS_BADGE_VARIANT: Record<ProjectStatusCode, BadgeVariant> = {
  draft: 'neutral',
  submitted: 'info',
  under_review: 'info',
  waiting_for_client: 'warning',
  quotation_sent: 'primary',
  quotation_accepted: 'success',
  quotation_rejected: 'danger',
  payment_pending: 'warning',
  payment_verification: 'warning',
  accepted: 'success',
  scheduled: 'primary',
  in_development: 'primary',
  in_testing: 'primary',
  client_review: 'warning',
  revision_requested: 'warning',
  revision_in_progress: 'primary',
  ready_for_deployment: 'primary',
  deployed: 'success',
  delivered: 'success',
  completed: 'success',
  on_hold: 'danger',
  cancelled: 'danger',
};

export interface ProjectStatusPhase {
  key: string;
  label: string;
  statuses: ProjectStatusCode[];
}

/**
 * Collapses the 21 raw status codes into a friendly ~6-step progress
 * indicator (task brief: "doesn't need to show all 21 raw codes if
 * visually noisy... but the underlying status_code must be accurately
 * reflected"). `on_hold`/`cancelled` are deliberately excluded from this
 * linear list — per the schema design doc, they're reachable from any
 * status and aren't part of a forward progression, so they're rendered as
 * an interrupting banner instead (see `ProjectStatusStepper`).
 */
export const PROJECT_STATUS_PHASES: ProjectStatusPhase[] = [
  { key: 'request', label: 'Request Submitted', statuses: ['draft', 'submitted'] },
  { key: 'review', label: 'Under Review', statuses: ['under_review', 'waiting_for_client'] },
  {
    key: 'quotation',
    label: 'Quotation',
    statuses: ['quotation_sent', 'quotation_accepted', 'quotation_rejected'],
  },
  { key: 'payment', label: 'Payment', statuses: ['payment_pending', 'payment_verification'] },
  {
    key: 'in_progress',
    label: 'In Progress',
    statuses: [
      'accepted',
      'scheduled',
      'in_development',
      'in_testing',
      'client_review',
      'revision_requested',
      'revision_in_progress',
      'ready_for_deployment',
    ],
  },
  { key: 'delivered', label: 'Delivered', statuses: ['deployed', 'delivered', 'completed'] },
];

const EXCEPTION_STATUSES = new Set<ProjectStatusCode>(['on_hold', 'cancelled']);

export function isExceptionStatus(status: ProjectStatusCode): boolean {
  return EXCEPTION_STATUSES.has(status);
}

export function getPhaseIndex(status: ProjectStatusCode): number {
  return PROJECT_STATUS_PHASES.findIndex((phase) => phase.statuses.includes(status));
}

/**
 * Statuses where the client is waiting on an admin/staff action to move
 * things forward (quotation being prepared, payment being verified).
 * Drives `useProject`'s polling interval — see `projects.queries.ts`.
 */
const WAITING_ON_ADMIN_STATUSES = new Set<ProjectStatusCode>([
  'submitted',
  'under_review',
  'payment_verification',
]);

export function isWaitingOnAdmin(status: ProjectStatusCode): boolean {
  return WAITING_ON_ADMIN_STATUSES.has(status);
}

/**
 * Curated "sensible next step(s)" per status, for the admin status-change
 * control (`AdminProjectDetailPage`). The backend does NOT enforce a
 * transition graph — `PATCH /admin/projects/:id/status` accepts any
 * `status_code` that exists in the `project_statuses` lookup table
 * (confirmed in `projects.service.js#updateProjectStatusAdmin`'s comment:
 * "there is no state-machine/adjacency table... nothing at the DATA layer
 * stops any status_code... from being set here"). This map is therefore a
 * frontend-only UX constraint, not a security boundary: an unconstrained
 * 21-item dropdown that lets an admin jump from Draft straight to Completed
 * would be a bad admin experience even though the API itself allows it.
 * `on_hold` and `cancelled` are deliberately available from every
 * non-terminal status (they're documented as reachable from anywhere), and
 * `on_hold` can resume back into the full forward-progression list.
 */
const FORWARD_PROGRESSION: ProjectStatusCode[] = [
  'draft',
  'submitted',
  'under_review',
  'waiting_for_client',
  'quotation_sent',
  'quotation_accepted',
  'quotation_rejected',
  'payment_pending',
  'payment_verification',
  'accepted',
  'scheduled',
  'in_development',
  'in_testing',
  'client_review',
  'revision_requested',
  'revision_in_progress',
  'ready_for_deployment',
  'deployed',
  'completed',
];

const NEXT_STATUS_MAP: Partial<Record<ProjectStatusCode, ProjectStatusCode[]>> = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['waiting_for_client', 'quotation_sent'],
  waiting_for_client: ['under_review', 'quotation_sent'],
  quotation_sent: ['quotation_accepted', 'quotation_rejected'],
  quotation_accepted: ['payment_pending'],
  quotation_rejected: ['under_review', 'quotation_sent'],
  payment_pending: ['payment_verification'],
  payment_verification: ['accepted', 'payment_pending'],
  accepted: ['scheduled'],
  scheduled: ['in_development'],
  in_development: ['in_testing'],
  in_testing: ['client_review', 'revision_in_progress'],
  client_review: ['revision_requested', 'ready_for_deployment'],
  revision_requested: ['revision_in_progress'],
  revision_in_progress: ['in_testing'],
  ready_for_deployment: ['deployed'],
  deployed: ['completed'],
  delivered: ['completed'],
  completed: [],
  on_hold: FORWARD_PROGRESSION,
  cancelled: [],
};

/**
 * Returns the sensible next statuses selectable from the current one,
 * always including the current status itself (so a `<select>` bound to
 * this list can show the current value even if unchanged) plus the
 * `on_hold`/`cancelled` escape hatches when the project isn't already
 * terminal.
 */
export function getSelectableNextStatuses(status: ProjectStatusCode): ProjectStatusCode[] {
  const isTerminal = status === 'completed' || status === 'cancelled';
  const forward = NEXT_STATUS_MAP[status] ?? [];
  const exceptions: ProjectStatusCode[] = isTerminal ? [] : ['on_hold', 'cancelled'];

  const seen = new Set<ProjectStatusCode>([status, ...forward, ...exceptions]);
  return Array.from(seen);
}
