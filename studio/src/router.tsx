import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { CrumbHandle } from '@/components/custom/site-header/site-header.component'
import DashboardLayout from '@/layouts/dashboard.layout'
import RootLayout from '@/layouts/root.layout'
import {
  ModelDetailPage,
  ModelsPage,
  NewCheckPage,
  NotFoundPage,
  OverviewPage,
  PlaygroundPage,
  ReportDetailPage,
  ReportsPage,
  SettingsAccountPage,
  SettingsAllowListPage,
  SettingsApiKeysPage,
  SettingsServerPage,
  SignInPage,
  SignUpPage,
} from '@/pages'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Clerk's components own their sub-routes (verification steps etc.), hence the splats
      { path: '/sign-in/*', element: <SignInPage /> },
      { path: '/sign-up/*', element: <SignUpPage /> },
      {
        path: '/',
        element: <DashboardLayout />,
        handle: { crumb: 'Studio' } satisfies CrumbHandle,
        children: [
          { index: true, element: <OverviewPage />, handle: { crumb: 'Overview' } satisfies CrumbHandle },
          { path: 'checks/new', element: <NewCheckPage />, handle: { crumb: 'New check' } satisfies CrumbHandle },
          {
            path: 'reports',
            handle: { crumb: 'Reports' } satisfies CrumbHandle,
            children: [
              { index: true, element: <ReportsPage /> },
              {
                path: ':reportId',
                element: <ReportDetailPage />,
                handle: { crumb: 'Report' } satisfies CrumbHandle,
              },
            ],
          },
          {
            path: 'models',
            handle: { crumb: 'Models' } satisfies CrumbHandle,
            children: [
              { index: true, element: <ModelsPage /> },
              {
                path: ':modelId',
                element: <ModelDetailPage />,
                // Model ids double as their display name (t0-vision, t0-video, …)
                handle: { crumb: (params) => params.modelId ?? 'Model' } satisfies CrumbHandle,
              },
            ],
          },
          { path: 'playground', element: <PlaygroundPage />, handle: { crumb: 'Playground' } satisfies CrumbHandle },
          {
            path: 'settings',
            handle: { crumb: 'Settings' } satisfies CrumbHandle,
            children: [
              { index: true, element: <Navigate to="allow-list" replace /> },
              { path: 'allow-list', element: <SettingsAllowListPage />, handle: { crumb: 'Allow list' } satisfies CrumbHandle },
              { path: 'api-keys', element: <SettingsApiKeysPage />, handle: { crumb: 'API keys' } satisfies CrumbHandle },
              { path: 'server', element: <SettingsServerPage />, handle: { crumb: 'Server' } satisfies CrumbHandle },
              // Clerk needs the full subtree (security tab, verification steps, …)
              { path: 'account/*', element: <SettingsAccountPage />, handle: { crumb: 'Account' } satisfies CrumbHandle },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
