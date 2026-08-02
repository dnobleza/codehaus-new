import type { PaymentInstallment } from './payment.types';
import type { Quotation } from './quotation.types';

/**
 * All 21 project lifecycle statuses — exact `code` values from the
 * `project_statuses` lookup table, per
 * `backend/docs/superpowers/specs/2026-07-17-package-quotation-schema-design.md`
 * ("Status Representation Decision" table). Written out explicitly (not
 * `string`) so every consumer's switch/lookup over this union is
 * exhaustively checked by TypeScript — see `modules/projects/utils/projectStatus.ts`
 * for the label/phase/badge mappings that key off this type.
 */
export type ProjectStatusCode =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'waiting_for_client'
  | 'quotation_sent'
  | 'quotation_accepted'
  | 'quotation_rejected'
  | 'payment_pending'
  | 'payment_verification'
  | 'accepted'
  | 'scheduled'
  | 'in_development'
  | 'in_testing'
  | 'client_review'
  | 'revision_requested'
  | 'revision_in_progress'
  | 'ready_for_deployment'
  | 'deployed'
  | 'delivered'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

/**
 * Matches the raw `projects` row shape, verified against the live API.
 * `quotations` is only present when fetched via `GET /projects/:id` (the
 * service nests `quotations.repository.js#listByProjectWithAddons`'s
 * result, newest first); `GET /projects` (list) returns bare rows without
 * it — do not assume `quotations` exists on rows coming from the list
 * endpoint.
 */
export interface Project {
  id: string;
  client_id: number | string;
  package_id: string | null;
  title: string;
  request_details: string | null;
  status_code: ProjectStatusCode;
  /** Populated only when an admin/staff declines a submitted request (project then sits in `cancelled`). */
  decline_reason: string | null;
  timeline_estimate_min_days: number | null;
  timeline_estimate_max_days: number | null;
  start_date: string | null;
  end_date: string | null;
  completion_date: string | null;
  created_at: string;
  updated_at: string;
  /**
   * Client identity, joined in on the admin/staff reads only
   * (`projects.repository.js`'s PROJECT_WITH_CLIENT_SELECT). Absent on the
   * client's own `GET /projects` — a client already knows who they are.
   *
   * Nullable because the join is a LEFT JOIN: a project whose client row is
   * missing still appears in an admin list rather than vanishing from it.
   * Render through `clientName()` rather than assuming a value.
   */
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_email?: string | null;
  quotations?: Quotation[];
  /**
   * Only present when fetched via `GET /projects/:id` or
   * `GET /admin/projects/:id` (nests the raw `payment_installments` rows,
   * ordered by `sequence`); `GET /projects` (list) returns bare rows
   * without it — do not assume `paymentInstallments` exists on rows coming
   * from the list endpoint.
   */
  paymentInstallments?: PaymentInstallment[];
}
