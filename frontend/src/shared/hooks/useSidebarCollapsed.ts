import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dashboard-sidebar-collapsed';

function readStoredValue(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // localStorage may be unavailable (private browsing, disabled storage, etc.) —
    // fall back to the default expanded state rather than throwing.
    return false;
  }
}

/**
 * Tracks whether the desktop sidebar is collapsed to icon-only width,
 * persisting the preference in `localStorage` so it survives refreshes and
 * navigation. Used by `DashboardShell`.
 */
export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(readStoredValue);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    } catch {
      // Ignore storage write failures; the in-memory state still works for
      // the current session.
    }
  }, [isCollapsed]);

  function toggleCollapsed() {
    setIsCollapsed((prev) => !prev);
  }

  return { isCollapsed, toggleCollapsed };
}
