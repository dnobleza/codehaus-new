import { useMemo, useState } from 'react';
import { UserRoundPlus, UserRoundX, Users } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useCan } from '@/shared/auth/useCan';
import type { ApiError } from '@/shared/api/apiClient';
import { assigneeName } from '../api/assignments.api';
import {
  useAssignUserMutation,
  useAssignableUsers,
  useProjectAssignments,
  useUnassignUserMutation,
} from '../api/assignments.queries';

/**
 * The project's delivery team: who is assigned, plus add/remove for admins.
 *
 * This panel is what makes assignment-scoping real. `project_assignments` is
 * the table that decides which projects a staff member can see at all
 * (projects.repository.js#listAssignedTo) — with no way to write it, every
 * staff dashboard and project list is empty regardless of what the backend
 * permits.
 *
 * Roles split cleanly here: admin manages the team, staff reads the roster of
 * a project it is already on, and the endpoints enforce both independently.
 */
export function ProjectTeamPanel({ projectId }: { projectId: string }) {
  const canViewTeam = useCan('project.viewTeam');
  const canAssign = useCan('project.assign');
  const [selectedUserId, setSelectedUserId] = useState('');

  const assignments = useProjectAssignments(projectId);
  // Only admins can read the assignable roster; staff would 403, so the query
  // is never mounted for them.
  const assignable = useAssignableUsers(canAssign);
  const assignMutation = useAssignUserMutation(projectId);
  const unassignMutation = useUnassignUserMutation(projectId);

  /* Anyone already on the team is not offered again — the API 409s on a
     duplicate, and an option that can only fail is not worth showing. */
  const availableUsers = useMemo(() => {
    const assignedIds = new Set((assignments.data ?? []).map((a) => String(a.user_id)));
    return (assignable.data ?? []).filter((user) => !assignedIds.has(String(user.user_id)));
  }, [assignable.data, assignments.data]);

  if (!canViewTeam) return null;

  const mutationError = (assignMutation.error ?? unassignMutation.error) as ApiError | null;

  function handleAssign() {
    if (!selectedUserId) return;
    assignMutation.mutate(selectedUserId, { onSuccess: () => setSelectedUserId('') });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users aria-hidden="true" className="size-4 text-primary-text" />
          Delivery team
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {mutationError && (
          <Alert variant="danger" title="Couldn't update the team" description={mutationError.message} />
        )}

        {assignments.isLoading && <LoadingSpinner label="Loading team..." />}

        {assignments.isError && (
          <Alert
            variant="danger"
            title="Couldn't load the team"
            description="Reload the page to try again."
          />
        )}

        {assignments.data && assignments.data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {canAssign
              ? 'Nobody is assigned yet. Assigned staff see this project on their dashboard and project list.'
              : 'Nobody is assigned to this project yet.'}
          </p>
        )}

        {assignments.data && assignments.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {assignments.data.map((member) => (
              <li
                key={String(member.user_id)}
                className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {assigneeName(member)}
                  </span>
                  <Badge variant="neutral">{String(member.role).toLowerCase()}</Badge>
                </span>

                {canAssign && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${assigneeName(member)} from this project`}
                    disabled={unassignMutation.isPending}
                    onClick={() => unassignMutation.mutate(member.user_id)}
                  >
                    <UserRoundX aria-hidden="true" />
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canAssign && (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
            <Select
              label="Add a team member"
              value={selectedUserId}
              disabled={assignable.isLoading || availableUsers.length === 0}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              <option value="">
                {assignable.isLoading
                  ? 'Loading...'
                  : availableUsers.length === 0
                    ? 'Everyone available is already assigned'
                    : 'Select a staff member'}
              </option>
              {availableUsers.map((user) => (
                <option key={String(user.user_id)} value={String(user.user_id)}>
                  {assigneeName(user)} ({String(user.role).toLowerCase()})
                </option>
              ))}
            </Select>

            <Button
              className="shrink-0"
              disabled={!selectedUserId || assignMutation.isPending}
              onClick={handleAssign}
            >
              <UserRoundPlus aria-hidden="true" />
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
