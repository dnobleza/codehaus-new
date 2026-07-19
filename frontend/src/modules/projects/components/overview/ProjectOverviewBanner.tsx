import { useState } from 'react';
import { X } from 'lucide-react';

import { Alert } from '@/components/ui/alert';

const STORAGE_KEY_PREFIX = 'codehaus.projectOverviewBannerDismissed.';

interface ProjectOverviewBannerProps {
  projectId: string;
}

/**
 * Dismissible info banner ("You will be notified once a milestone is
 * completed or requires your approval."). Dismissal is persisted in
 * `localStorage`, keyed per-project (a client with multiple projects
 * dismissing the banner on one shouldn't silently hide it on another).
 */
export function ProjectOverviewBanner({ projectId }: ProjectOverviewBannerProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(storageKey) === '1';
    } catch {
      // Private-browsing/storage-disabled contexts can throw on access —
      // fail open (banner just shows every visit) rather than crash the page.
      return false;
    }
  });

  if (isDismissed) return null;

  function handleDismiss() {
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // Ignore — dismissal just won't persist across reloads in this case.
    }
    setIsDismissed(true);
  }

  return (
    <div className="relative">
      <Alert
        variant="info"
        title="You will be notified once a milestone is completed or requires your approval."
        className="pr-10"
      />
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
