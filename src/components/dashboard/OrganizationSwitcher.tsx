import { Building2, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOrganization } from "@/contexts/OrganizationContext"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface OrganizationSwitcherProps {
  collapsed?: boolean
}

export function OrganizationSwitcher({ collapsed = false }: OrganizationSwitcherProps) {
  const { organizations, selectedOrganization, setOrganization, isLoading } =
    useOrganization()

  // Don't render if no organizations or still loading
  if (isLoading || organizations.length === 0) {
    return null
  }

  // If only one organization, show it but don't make it a dropdown
  if (organizations.length === 1 && selectedOrganization) {
    if (collapsed) {
      return (
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-white/5 cursor-default">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {selectedOrganization.name}
            </TooltipContent>
          </Tooltip>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <div className="flex items-center justify-center w-5 h-5 rounded bg-white/5 shrink-0">
          <Building2 className="w-3 h-3 text-muted-foreground" />
        </div>
        <span className="truncate text-xs font-medium text-foreground">{selectedOrganization.name}</span>
      </div>
    )
  }

  // Multiple organizations - show dropdown
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9"
                  aria-label="Switch organization"
                >
                  <Building2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              {selectedOrganization?.name ?? "Select organization"}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="start"
            side="right"
            className="w-52"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org._id}
                onClick={() => setOrganization(org._id)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded bg-white/5 shrink-0 mr-2">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="truncate flex-1 text-sm">{org.name}</span>
                {selectedOrganization?._id === org._id && (
                  <Check className="w-3.5 h-3.5 ml-2 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-2 h-8"
          aria-label="Switch organization"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-5 h-5 rounded bg-white/5 shrink-0">
              <Building2 className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="truncate text-xs font-medium">
              {selectedOrganization?.name ?? "Select organization"}
            </span>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="bottom"
        className="w-52"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org._id}
            onClick={() => setOrganization(org._id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded bg-white/5 shrink-0 mr-2">
              <Building2 className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="truncate flex-1 text-sm">{org.name}</span>
            {selectedOrganization?._id === org._id && (
              <Check className="w-3.5 h-3.5 ml-2 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
