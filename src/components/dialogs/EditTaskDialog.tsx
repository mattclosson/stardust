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

interface Task {
  _id: string
  title: string
  priority: string
  status: string
  assignedTo?: string
  dueDate?: string
}

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  organizationId?: Id<"organizations">
  onSave: (updates: {
    priority?: string
    status?: string
    assignedTo?: string
  }) => Promise<void>
}

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  organizationId,
  onSave,
}: EditTaskDialogProps) {
  const [priority, setPriority] = useState("")
  const [status, setStatus] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch team members for the organization
  const teamMembers = useQuery(
    api.team.listForOrganization,
    organizationId ? { organizationId } : "skip"
  )

  useEffect(() => {
    if (task) {
      setPriority(task.priority)
      setStatus(task.status)
      setAssignedTo(task.assignedTo || "")
    }
  }, [task])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave({
        priority,
        status,
        assignedTo: assignedTo || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      logError("Task update failed", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!task) return null

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
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details for: {task.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : teamMembers && teamMembers.length > 0 ? (
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member">
                    {assignedTo ? getDisplayName(assignedTo) : "Select team member"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
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
              <p className="text-sm text-muted-foreground">
                No team members available.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
