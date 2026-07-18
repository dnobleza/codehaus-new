import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { AdminDashboardLayout } from '@/shared/layouts/AdminDashboardLayout';
import { AuthLayout } from '@/shared/layouts/AuthLayout';
import { ClientDashboardLayout } from '@/shared/layouts/ClientDashboardLayout';
import { LandingLayout } from '@/shared/layouts/LandingLayout';
import { StaffDashboardLayout } from '@/shared/layouts/StaffDashboardLayout';
import { NotFoundPage } from '@/shared/components/common/NotFoundPage';
import { ROLES } from '@/shared/constants/roles';
import { RequireAuth, RequireRole } from './guards';

/** Maps a page module's default export to the `Component` shape React Router's `lazy` route API expects. */
function lazyPage(importer: () => Promise<{ default: ComponentType }>) {
  return () => importer().then((module) => ({ Component: module.default }));
}

// Route modules are lazy-loaded per feature module (architecture doc §3),
// so the initial bundle only ships the landing page + shell chrome.
export const router = createBrowserRouter([
  {
    element: <LandingLayout />,
    children: [
      {
        index: true,
        lazy: lazyPage(() => import('@/modules/marketing/LandingPage')),
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', lazy: lazyPage(() => import('@/modules/auth/pages/LoginPage')) },
      { path: 'register', lazy: lazyPage(() => import('@/modules/auth/pages/RegisterPage')) },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={[ROLES.CLIENT]} />,
        children: [
          {
            path: 'client/dashboard',
            element: <ClientDashboardLayout />,
            children: [
              {
                index: true,
                lazy: lazyPage(() => import('@/modules/dashboard-client/DashboardPage')),
              },
              {
                path: 'projects',
                lazy: lazyPage(() => import('@/modules/projects/pages/ProjectsListPage')),
              },
              {
                path: 'projects/new',
                lazy: lazyPage(() => import('@/modules/projects/pages/NewProjectPage')),
              },
              {
                path: 'projects/:id',
                lazy: lazyPage(() => import('@/modules/projects/pages/ProjectDetailPage')),
              },
            ],
          },
        ],
      },
      {
        element: <RequireRole roles={[ROLES.STAFF]} />,
        children: [
          {
            path: 'staff/dashboard',
            element: <StaffDashboardLayout />,
            children: [
              {
                index: true,
                lazy: lazyPage(() => import('@/modules/dashboard-staff/DashboardPage')),
              },
              {
                path: 'projects',
                lazy: lazyPage(() => import('@/modules/projects/pages/AdminProjectsListPage')),
              },
              {
                path: 'projects/:id',
                lazy: lazyPage(() => import('@/modules/projects/pages/AdminProjectDetailPage')),
              },
              {
                path: 'payments',
                lazy: lazyPage(() => import('@/modules/payments/pages/AdminPaymentsQueuePage')),
              },
            ],
          },
        ],
      },
      {
        element: <RequireRole roles={[ROLES.ADMIN]} />,
        children: [
          {
            path: 'admin/dashboard',
            element: <AdminDashboardLayout />,
            children: [
              {
                index: true,
                lazy: lazyPage(() => import('@/modules/dashboard-admin/DashboardPage')),
              },
              {
                path: 'projects',
                lazy: lazyPage(() => import('@/modules/projects/pages/AdminProjectsListPage')),
              },
              {
                path: 'projects/:id',
                lazy: lazyPage(() => import('@/modules/projects/pages/AdminProjectDetailPage')),
              },
              {
                path: 'payments',
                lazy: lazyPage(() => import('@/modules/payments/pages/AdminPaymentsQueuePage')),
              },
              {
                path: 'packages',
                lazy: lazyPage(() => import('@/modules/packages/pages/AdminPackagesPage')),
              },
              {
                path: 'packages/new',
                lazy: lazyPage(() => import('@/modules/packages/pages/AdminPackageFormPage')),
              },
              {
                path: 'packages/:id/edit',
                lazy: lazyPage(() => import('@/modules/packages/pages/AdminPackageFormPage')),
              },
              {
                path: 'addons',
                lazy: lazyPage(() => import('@/modules/addons/pages/AdminAddonsPage')),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
