import { Link } from 'react-router-dom';
import { ChevronRight, Download, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProjectOverviewSummary } from '@/shared/types/projectOverview.types';
import { PROJECT_STATUS_BADGE_VARIANT, PROJECT_STATUS_LABELS } from '../../utils/projectStatus';

interface ProjectOverviewHeaderProps {
  project: ProjectOverviewSummary;
}

/**
 * `createdAt` is a full `timestamptz` (not a DATE-only column), so it's
 * formatted directly via `Date` rather than routed through
 * `shared/utils/dateOnly.ts`'s local-parts parser — that helper exists
 * specifically to avoid a UTC-midnight rollback bug for DATE-only strings,
 * which doesn't apply here.
 */
function formatCreatedDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Breadcrumb + title/status/meta + action buttons for the Project Overview
 * page. Both action buttons are intentionally disabled-with-a-tooltip
 * rather than wired to a real destination:
 * - "Download Report": no report generator exists yet (per the task
 *   brief's explicit instruction to build it disabled).
 * - "Message Team": the task brief says to link to "the existing messaging
 *   module for this project" — but `modules/messaging/` is an empty
 *   placeholder (`.gitkeep` only, no route registered in
 *   `app/router/index.tsx`, confirmed by grep across the codebase) in this
 *   build. Linking it to a route that 404s would be worse than a
 *   "coming soon" tooltip, so it gets the same disabled treatment as
 *   Download Report until a real messaging route exists.
 *
 * Both buttons use `aria-disabled` (not the native `disabled` attribute) so
 * they stay focusable/hoverable — a truly `disabled` button won't fire the
 * hover/focus events a Tooltip needs to appear.
 */
export function ProjectOverviewHeader({ project }: ProjectOverviewHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link to="/client/dashboard/projects" className="hover:text-foreground hover:underline">
          Projects
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="font-medium text-foreground">Project Details</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
            <Badge variant={PROJECT_STATUS_BADGE_VARIANT[project.statusCode]}>
              {PROJECT_STATUS_LABELS[project.statusCode]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Project ID: {project.referenceCode ?? project.id} · Created:{' '}
            {formatCreatedDate(project.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  aria-disabled="true"
                  className="cursor-not-allowed opacity-50"
                  onClick={(event) => event.preventDefault()}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Download Report
                </Button>
              }
            />
            <TooltipContent>Report generation is coming soon.</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  aria-disabled="true"
                  className="cursor-not-allowed opacity-50"
                  onClick={(event) => event.preventDefault()}
                >
                  <MessageSquare className="size-4" aria-hidden="true" />
                  Message Team
                </Button>
              }
            />
            <TooltipContent>Messaging is coming soon.</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
