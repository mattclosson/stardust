import { HeadContent, Outlet, Scripts, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { ConvexClientProvider } from '../lib/convex'
import { Sidebar } from '../components/dashboard/Sidebar'
import { TooltipProvider } from '../components/ui/tooltip'
import { AuthGuard } from '../components/auth/AuthGuard'
import { GlobalCallBanner } from '../components/calls/ActiveCallBanner'
import { OrganizationProvider, useOrganization } from '../contexts/OrganizationContext'

import appCss from '../styles.css?url'

// Routes that should not show the sidebar (auth pages)
const authRoutes = ['/login', '/signup']

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'RCM AI Dashboard',
      },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

// Wrapper component for the call banner that uses the selected organization
function CallBannerWrapper() {
  const { selectedOrganization } = useOrganization()
  
  if (!selectedOrganization) return null
  
  return <GlobalCallBanner organizationId={selectedOrganization._id} />
}

function RootLayout() {
  const location = useLocation()
  const isAuthPage = authRoutes.some(route => location.pathname === route)

  return (
    <ConvexClientProvider>
      <OrganizationProvider>
        <TooltipProvider>
          <AuthGuard>
            {isAuthPage ? (
              // Auth pages - no sidebar
              <Outlet />
            ) : (
              // Dashboard pages - with sidebar
              <div className="flex h-screen overflow-hidden bg-background">
                <Sidebar />
                <main className="flex-1 overflow-auto bg-background">
                  <Outlet />
                </main>
                {/* Global call status banner */}
                <CallBannerWrapper />
              </div>
            )}
          </AuthGuard>
        </TooltipProvider>
      </OrganizationProvider>
    </ConvexClientProvider>
  )
}
