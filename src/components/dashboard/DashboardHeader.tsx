import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserMenu } from "@/components/auth/UserMenu"

interface DashboardHeaderProps {
  title?: string
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 bg-sidebar border-b border-white/5 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-sm font-semibold tracking-tight">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search claims, patients..."
            className="w-56 h-8 pl-8 text-sm bg-white/5 border-white/10 placeholder:text-muted-foreground focus:bg-white/[0.07] focus:border-white/20 transition-colors"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </Button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
