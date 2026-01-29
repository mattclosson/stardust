import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Loader2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { logError } from "@/lib/logger"
import { getRoleLabel } from "@/constants/roles"

interface AssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  currentAssignee?: string
  organizationId?: Id<"organizations">
  onAssign: (assignee: string) => Promise<void>
}

export function AssignDialog({
  open,
  onOpenChange,
  title,
  description = "Select a team member to assign this to.",
  currentAssignee,
  organizationId,
  onAssign,
}: AssignDialogProps) {
  const [assignee, setAssignee] = useState(currentAssignee || "")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch team members for the organization
  const teamMembers = useQuery(
    api.team.listForOrganization,
    organizationId ? { organizationId } : "skip"
  )

  // Reset assignee when dialog opens
  useEffect(() => {
    if (open) {
      setAssignee(currentAssignee || "")
    }
  }, [open, currentAssignee])

  const handleAssign = async () => {
    if (!assignee.trim()) return
    
    setIsLoading(true)
    try {
      await onAssign(assignee.trim())
      onOpenChange(false)
      setAssignee("")
    } catch (error) {
      logError("Assignment failed", error)
    } finally {
      setIsLoading(false)
    }
  }

  const isLoadingMembers = teamMembers === undefined && organizationId !== undefined

  // Get display name for current assignee
  const getDisplayName = (value: string) => {
    const member = teamMembers?.find(
      (m) => m.email === value || `${m.firstName} ${m.lastName}` === value
    )
    if (member) {
      return `${member.firstName} ${member.lastName}`
    }
    return value || "Select team member"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="assignee">Assign to</Label>
          {isLoadingMembers ? (
            <div className="mt-2 flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers && teamMembers.length > 0 ? (
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select team member">
                  {assignee ? getDisplayName(assignee) : "Select team member"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem
                    key={member._id}
                    value={member.email}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {member.firstName} {member.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({getRoleLabel(member.role)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No team members available for this organization.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={isLoading || !assignee.trim() || isLoadingMembers}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
