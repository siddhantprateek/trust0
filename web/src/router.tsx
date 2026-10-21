import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '@/layouts/root.layout'
import { BlogPage, BlogPostPage, HomePage, NotFoundPage, PrivacyPage, TermsPage, UseCasePage, UseCasesPage } from '@/pages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'blog', element: <BlogPage /> },
      { path: 'blog/:slug', element: <BlogPostPage /> },
      { path: 'use-cases', element: <UseCasesPage /> },
      { path: 'use-cases/:slug', element: <UseCasePage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
