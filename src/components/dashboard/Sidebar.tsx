import { Link, useRouterState } from "@tanstack/react-router"
import {
  LayoutDashboard,
  FileText,
  XCircle,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { OrganizationSwitcher } from "./OrganizationSwitcher"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Claims", href: "/claims", icon: FileText },
  { name: "Denials", href: "/denials", icon: XCircle },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
]

const settingsNavigation = [
  { name: "Team", href: "/settings/team", icon: Users },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar transition-[width] duration-200 ease-out",
        collapsed ? "w-[52px]" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-12 border-b border-white/5",
        collapsed ? "justify-center px-0" : "px-3"
      )}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground">
            <Sparkles className="w-4 h-4" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight">Stardust</span>
          )}
        </div>
      </div>

      {/* Organization Switcher */}
      <div className={cn(
        "py-2 border-b border-white/5",
        collapsed ? "px-1.5" : "px-2"
      )}>
        <OrganizationSwitcher collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-3",
        collapsed ? "px-1.5" : "px-2"
      )}>
        {!collapsed && (
          <p className="px-2 mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Navigation
          </p>
        )}
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.href)

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors duration-100",
                  collapsed ? "justify-center w-9 h-9 mx-auto" : "gap-2.5 px-2 py-1.5",
                  isActive
                    ? collapsed 
                      ? "bg-white/10 text-white"
                      : "bg-white/10 text-white border-l-2 border-primary -ml-px pl-[calc(0.5rem-1px)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 shrink-0 transition-colors duration-100",
                  isActive ? "text-primary" : ""
                )} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Settings & Collapse */}
      <div className={cn(
        "py-3 border-t border-white/5",
        collapsed ? "px-1.5" : "px-2"
      )}>
        {!collapsed && (
          <p className="px-2 mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Settings
          </p>
        )}
        <div className="space-y-0.5">
          {settingsNavigation.map((item) => {
            const isActive = currentPath.startsWith(item.href)

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors duration-100",
                  collapsed ? "justify-center w-9 h-9 mx-auto" : "gap-2.5 px-2 py-1.5",
                  isActive
                    ? collapsed 
                      ? "bg-white/10 text-white"
                      : "bg-white/10 text-white border-l-2 border-primary -ml-px pl-[calc(0.5rem-1px)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 shrink-0 transition-colors duration-100",
                  isActive ? "text-primary" : ""
                )} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              collapsed ? "w-9 h-9 p-0 mx-auto flex justify-center" : "w-full justify-start h-8 px-2"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  )
}
