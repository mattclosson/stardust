import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Loader2, Building2, Eye, Edit, Shield, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { logError } from "@/lib/logger"
import { cn } from "@/lib/utils"

interface Assignment {
  organizationId: Id<"organizations">
  organizationName: string
  isPrimary: boolean
  canView: boolean
  canEdit: boolean
  canManage: boolean
}

interface TeamMember {
  _id: Id<"rcmUsers">
  firstName: string
  lastName: string
  email: string
  role: string
  status: string
  assignments: Assignment[]
}

interface OrgAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: TeamMember
}

interface OrgPermissions {
  assigned: boolean
  isPrimary: boolean
  canView: boolean
  canEdit: boolean
  canManage: boolean
}

export function OrgAssignmentDialog({
  open,
  onOpenChange,
  member,
}: OrgAssignmentDialogProps) {
  const organizations = useQuery(api.team.getAllOrganizations)
  const assignToOrg = useMutation(api.team.assignToOrganization)
  const removeFromOrg = useMutation(api.team.removeFromOrganization)

  const [permissions, setPermissions] = useState<Record<string, OrgPermissions>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize permissions from member's current assignments
  useEffect(() => {
    if (organizations && open) {
      const initial: Record<string, OrgPermissions> = {}

      organizations.forEach((org) => {
        const assignment = member.assignments.find(
          (a) => a.organizationId === org._id
        )

        initial[org._id] = assignment
          ? {
              assigned: true,
              isPrimary: assignment.isPrimary,
              canView: assignment.canView,
              canEdit: assignment.canEdit,
              canManage: assignment.canManage,
            }
          : {
              assigned: false,
              isPrimary: false,
              canView: true,
              canEdit: false,
              canManage: false,
            }
      })

      setPermissions(initial)
    }
  }, [organizations, member, open])

  const handleToggleAssigned = (orgId: string, assigned: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [orgId]: {
        ...prev[orgId],
        assigned,
        // Reset to defaults when unassigning
        ...(assigned
          ? {}
          : {
              isPrimary: false,
              canView: true,
              canEdit: false,
              canManage: false,
            }),
      },
    }))
  }

  const handleTogglePrimary = (orgId: string) => {
    setPermissions((prev) => {
      const newPermissions = { ...prev }

      // Unset primary from all others
      Object.keys(newPermissions).forEach((id) => {
        if (newPermissions[id].isPrimary && id !== orgId) {
          newPermissions[id] = { ...newPermissions[id], isPrimary: false }
        }
      })

      // Set this one as primary
      newPermissions[orgId] = { ...newPermissions[orgId], isPrimary: true }

      return newPermissions
    })
  }

  const handleTogglePermission = (
    orgId: string,
    permission: "canView" | "canEdit" | "canManage"
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [orgId]: {
        ...prev[orgId],
        [permission]: !prev[orgId][permission],
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Get original assignments as a map
      const originalMap = new Map(
        member.assignments.map((a) => [a.organizationId, a])
      )

      // Process each organization
      for (const [orgId, perms] of Object.entries(permissions)) {
        const wasAssigned = originalMap.has(orgId as Id<"organizations">)

        if (perms.assigned) {
          // Assign or update
          await assignToOrg({
            rcmUserId: member._id,
            organizationId: orgId as Id<"organizations">,
            isPrimary: perms.isPrimary,
            canView: perms.canView,
            canEdit: perms.canEdit,
            canManage: perms.canManage,
          })
        } else if (wasAssigned) {
          // Remove assignment
          await removeFromOrg({
            rcmUserId: member._id,
            organizationId: orgId as Id<"organizations">,
          })
        }
      }

      onOpenChange(false)
    } catch (error) {
      logError("Failed to update organization assignments", error)
    } finally {
      setIsSaving(false)
    }
  }

  const isLoaded = organizations !== undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Organizations</DialogTitle>
          <DialogDescription>
            Configure organization access for {member.firstName} {member.lastName}
          </DialogDescription>
        </DialogHeader>

        {!isLoaded ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No organizations available
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4 py-4">
              {organizations.map((org) => {
                const perms = permissions[org._id]
                if (!perms) return null

                return (
                  <div
                    key={org._id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      perms.assigned
                        ? "border-primary/50 bg-primary/5"
                        : "border-border"
                    )}
                  >
                    {/* Header row with checkbox and name */}
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`org-${org._id}`}
                        checked={perms.assigned}
                        onCheckedChange={(checked) =>
                          handleToggleAssigned(org._id, checked === true)
                        }
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`org-${org._id}`}
                          className="text-base font-medium cursor-pointer"
                        >
                          {org.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {org.specialty}
                        </p>
                      </div>
                      {perms.assigned && perms.isPrimary && (
                        <Star className="w-4 h-4 text-warning fill-warning" />
                      )}
                    </div>

                    {/* Permissions (only show when assigned) */}
                    {perms.assigned && (
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                        {/* Primary toggle */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant={perms.isPrimary ? "default" : "outline"}
                            size="sm"
                            className="gap-1"
                            onClick={() => handleTogglePrimary(org._id)}
                          >
                            <Star
                              className={cn(
                                "w-3 h-3",
                                perms.isPrimary && "fill-current"
                              )}
                            />
                            Primary
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Default organization for this user
                          </span>
                        </div>

                        {/* Permission toggles */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={perms.canView ? "default" : "outline"}
                            size="sm"
                            className="gap-1"
                            onClick={() =>
                              handleTogglePermission(org._id, "canView")
                            }
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                          <Button
                            variant={perms.canEdit ? "default" : "outline"}
                            size="sm"
                            className="gap-1"
                            onClick={() =>
                              handleTogglePermission(org._id, "canEdit")
                            }
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            variant={perms.canManage ? "default" : "outline"}
                            size="sm"
                            className="gap-1"
                            onClick={() =>
                              handleTogglePermission(org._id, "canManage")
                            }
                          >
                            <Shield className="w-3 h-3" />
                            Manage
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isLoaded}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
