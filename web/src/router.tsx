import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '@/layouts/root.layout'
import { HomePage, NotFoundPage, PrivacyPage, TermsPage } from '@/pages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
