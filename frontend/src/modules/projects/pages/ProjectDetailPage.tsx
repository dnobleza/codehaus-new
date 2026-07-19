import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FolderOpen, ListTodo } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useProjectOverview } from '../api/projects.queries';
import { InvoicesTab } from '../components/InvoicesTab';
import { ActivityTabPanel } from '../components/overview/ActivityTabPanel';
import { ComingSoonTabPanel } from '../components/overview/ComingSoonTabPanel';
import { MilestoneProgressCard } from '../components/overview/MilestoneProgressCard';
import { OverviewTabPanel } from '../components/overview/OverviewTabPanel';
import { ProjectOverviewBanner } from '../components/overview/ProjectOverviewBanner';
import { ProjectOverviewHeader } from '../components/overview/ProjectOverviewHeader';
import { ProjectTimelineCard } from '../components/overview/ProjectTimelineCard';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'files', label: 'Files' },
  { value: 'activity', label: 'Activity' },
  { value: 'invoices', label: 'Invoices' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

/**
 * Project Overview page (stage 3): breadcrumb + header + a 7-tab surface.
 * Overview/Timeline/Milestones all read off a single `useProjectOverview`
 * fetch (the task brief's "these are cheap since the data's already
 * fetched" guidance — one request backs all three tabs' milestone data).
 * Invoices is the pre-existing quotation-review + proof-of-payment flow,
 * unchanged in behavior, just relocated under its own tab (see
 * `InvoicesTab`). Tasks/Files are empty-state placeholders — no backing
 * data exists for them yet.
 */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: overview, isLoading, isError, refetch } = useProjectOverview(id);
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  if (isLoading) {
    return <LoadingSpinner label="Loading project..." />;
  }

  if (isError || !overview || !id) {
    return <ErrorState description="We couldn't load this project." onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectOverviewHeader project={overview.project} />
      <ProjectOverviewBanner projectId={id} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="pt-6">
          <OverviewTabPanel
            overview={overview}
            onViewAllActivity={() => setActiveTab('activity')}
          />
        </TabsContent>

        <TabsContent value="timeline" className="pt-6">
          <ProjectTimelineCard milestones={overview.milestones} />
        </TabsContent>

        <TabsContent value="milestones" className="pt-6">
          <MilestoneProgressCard milestones={overview.milestones} />
        </TabsContent>

        <TabsContent value="tasks" className="pt-6">
          <ComingSoonTabPanel
            icon={ListTodo}
            title="No tasks yet"
            description="Task tracking for this project isn't available yet — check back soon."
          />
        </TabsContent>

        <TabsContent value="files" className="pt-6">
          <ComingSoonTabPanel
            icon={FolderOpen}
            title="No files yet"
            description="Files shared for this project aren't available yet — check back soon."
          />
        </TabsContent>

        <TabsContent value="activity" className="pt-6">
          <ActivityTabPanel projectId={id} />
        </TabsContent>

        <TabsContent value="invoices" className="pt-6">
          <InvoicesTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjectDetailPage;
