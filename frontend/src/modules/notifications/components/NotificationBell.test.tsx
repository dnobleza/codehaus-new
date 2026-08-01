import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../api/notifications.queries', () => ({
  useNotifications: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useMarkAllNotificationsRead: vi.fn(),
}));

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../api/notifications.queries';
import { NotificationBell } from './NotificationBell';
import type { AppNotification } from '@/shared/types/notification.types';

const unread: AppNotification = {
  id: 'n-1',
  user_id: 1,
  project_id: 'proj-1',
  event_type: 'quotation_sent',
  title: 'Your quotation is ready',
  body: 'QUO-0001 for Business Package is ready for your review.',
  link: '/client/dashboard/quotations/proj-1/q-1',
  read_at: null,
  created_at: new Date().toISOString(),
};

const markReadMutate = vi.fn();
const markAllMutate = vi.fn();

function mockInbox(notifications: AppNotification[], unreadCount: number) {
  vi.mocked(useNotifications).mockReturnValue({
    data: { notifications, unreadCount },
  } as unknown as ReturnType<typeof useNotifications>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMarkNotificationRead).mockReturnValue({
    mutate: markReadMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useMarkNotificationRead>);
  vi.mocked(useMarkAllNotificationsRead).mockReturnValue({
    mutate: markAllMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useMarkAllNotificationsRead>);
});

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  it('announces the unread count on the trigger', () => {
    mockInbox([unread], 1);
    renderBell();

    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });

  it('shows no badge and a plain label when everything is read', () => {
    mockInbox([{ ...unread, read_at: new Date().toISOString() }], 0);
    renderBell();

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('caps the badge at 9+', async () => {
    mockInbox([unread], 42);
    renderBell();

    expect(screen.getByText('9+')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications, 42 unread' })).toBeInTheDocument();
  });

  it('marks read and navigates to the notification link when clicked', async () => {
    mockInbox([unread], 1);
    renderBell();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    fireEvent.click(await screen.findByText('Your quotation is ready'));

    expect(markReadMutate).toHaveBeenCalledWith('n-1');
    expect(navigate).toHaveBeenCalledWith('/client/dashboard/quotations/proj-1/q-1');
  });

  it('does not re-mark an already-read notification', async () => {
    mockInbox([{ ...unread, read_at: new Date().toISOString() }], 0);
    renderBell();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(await screen.findByText('Your quotation is ready'));

    expect(markReadMutate).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalled();
  });

  it('shows an empty state when the inbox is empty', async () => {
    mockInbox([], 0);
    renderBell();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });
});
