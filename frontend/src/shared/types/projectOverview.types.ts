import type { ProjectStatusCode } from './project.types';

/**
 * Matches `backend/src/services/projectOverview.service.js#presentMilestone`
 * exactly (camelCase, presenter-shaped — never the raw `milestones` row).
 */
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed';

export interface ProjectMilestone {
  id: string;
  sequence: number;
  name: string;
  status: MilestoneStatus;
  progressPercent: number;
  /** DATE-only string (e.g. "2026-07-18"), or `null` until a staff progress update sets it. */
  startDate: string | null;
  /** DATE-only string, or `null` until a staff progress update sets it. */
  endDate: string | null;
  /** Only ever non-null on (at most) the single `in_progress` milestone. */
  currentFocus: string | null;
}

/**
 * Matches `presentActivity` — `actor` is `null` for system-generated rows
 * (no `actor_user_id`), otherwise the acting user's id + name, joined from
 * `registration` server-side.
 */
export interface ProjectActivityActor {
  id: number | string;
  firstName: string;
  lastName: string;
}

export interface ProjectActivityItem {
  id: string;
  actionType: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: ProjectActivityActor | null;
}

/** Matches `presentProject` — the trimmed project shape the Overview page's header needs. */
export interface ProjectOverviewSummary {
  id: string;
  referenceCode: string | null;
  title: string;
  statusCode: ProjectStatusCode;
  createdAt: string;
}

/**
 * `GET /projects/:id/overview` response shape (`data`), per
 * `projectOverview.service.js#getOverviewForClient`. `estimatedCompletionDate`/
 * `daysLeft` are `null` whenever no milestone has an `endDate` yet — either
 * because no milestones exist at all, or because a staff progress update
 * hasn't set one — never assume they're populated just because `milestones`
 * is non-empty.
 */
export interface ProjectOverview {
  project: ProjectOverviewSummary;
  overallProgressPercent: number;
  estimatedCompletionDate: string | null;
  daysLeft: number | null;
  milestones: ProjectMilestone[];
  recentActivity: ProjectActivityItem[];
}

/**
 * `GET /projects/:id/activity` response shape (`data`), per
 * `projectOverview.service.js#getActivityForClient`. NOTE: the field is
 * `activity`, not `items` — verified directly against the live controller/
 * service (`projects.controller.js#getActivity` -> `getActivityForClient`),
 * which differs from an earlier draft of this feature's contract.
 */
export interface ProjectActivityPage {
  activity: ProjectActivityItem[];
  nextCursor: string | null;
}

/** Query params for `GET /projects/:id/activity`, per `activity.validator.js`. */
export interface ListProjectActivityParams {
  limit?: number;
  before?: string;
}
