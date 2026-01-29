import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router"
import { Users, Building2, Bell, Shield, Plug } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
})

const settingsNavItems = [
  { name: "Team", href: "/settings/team", icon: Users },
  { name: "Organizations", href: "/settings/organizations", icon: Building2 },
  { name: "Integrations", href: "/settings/integrations", icon: Plug },
  { name: "Notifications", href: "/settings/notifications", icon: Bell },
  { name: "Security", href: "/settings/security", icon: Shield },
]

function SettingsLayout() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Settings" />

      <div className="flex-1 flex">
        {/* Settings Sidebar */}
        <nav className="w-56 border-r border-border p-4 space-y-1">
          {settingsNavItems.map((item) => {
            const isActive = currentPath === item.href

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Settings Content */}
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
