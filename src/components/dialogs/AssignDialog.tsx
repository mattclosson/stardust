import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { logError } from "@/lib/logger"

interface AssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  currentAssignee?: string
  onAssign: (assignee: string) => Promise<void>
}

export function AssignDialog({
  open,
  onOpenChange,
  title,
  description = "Enter the name or email of the person to assign this to.",
  currentAssignee,
  onAssign,
}: AssignDialogProps) {
  const [assignee, setAssignee] = useState(currentAssignee || "")
  const [isLoading, setIsLoading] = useState(false)

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="assignee">Assign to</Label>
          <Input
            id="assignee"
            placeholder="Enter name or email"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isLoading || !assignee.trim()}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
