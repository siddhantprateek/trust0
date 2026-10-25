import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '@/layouts/root.layout'
import HomePage from '@/pages/home.page'

// Only the home page ships in the first bundle; every other page loads when it is visited
const page = (load: () => Promise<{ default: React.ComponentType }>) => ({
  lazy: async () => ({ Component: (await load()).default }),
})

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'blog', ...page(() => import('@/pages/blog.page')) },
      { path: 'blog/:slug', ...page(() => import('@/pages/blog-post.page')) },
      { path: 'use-cases', ...page(() => import('@/pages/use-cases.page')) },
      { path: 'use-cases/:slug', ...page(() => import('@/pages/use-case.page')) },
      { path: 'terms', ...page(() => import('@/pages/terms.page')) },
      { path: 'privacy', ...page(() => import('@/pages/privacy.page')) },
      { path: 'support', ...page(() => import('@/pages/support.page')) },
      { path: '*', ...page(() => import('@/pages/notfound.page')) },
    ],
  },
])
