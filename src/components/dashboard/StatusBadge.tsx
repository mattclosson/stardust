import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ClaimStatus =
  | "draft"
  | "ready_to_submit"
  | "submitted"
  | "acknowledged"
  | "pending"
  | "paid"
  | "partial_paid"
  | "denied"
  | "rejected"
  | "appealed"
  | "written_off"
  | "closed"

type DenialStatus =
  | "new"
  | "in_review"
  | "appealing"
  | "appeal_submitted"
  | "overturned"
  | "upheld"
  | "written_off"

type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled"

type Priority = "low" | "medium" | "high" | "critical"

interface StatusBadgeProps {
  status: ClaimStatus | DenialStatus | TaskStatus | Priority | string
  type?: "claim" | "denial" | "task" | "priority"
  className?: string
}

const claimStatusConfig: Record<ClaimStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  draft: { label: "Draft", variant: "secondary" },
  ready_to_submit: { label: "Ready", variant: "info" },
  submitted: { label: "Submitted", variant: "info" },
  acknowledged: { label: "Acknowledged", variant: "info" },
  pending: { label: "Pending", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  partial_paid: { label: "Partial", variant: "warning" },
  denied: { label: "Denied", variant: "destructive" },
  rejected: { label: "Rejected", variant: "destructive" },
  appealed: { label: "Appealed", variant: "warning" },
  written_off: { label: "Written Off", variant: "secondary" },
  closed: { label: "Closed", variant: "secondary" },
}

const denialStatusConfig: Record<DenialStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  new: { label: "New", variant: "destructive" },
  in_review: { label: "In Review", variant: "warning" },
  appealing: { label: "Appealing", variant: "info" },
  appeal_submitted: { label: "Appeal Sent", variant: "info" },
  overturned: { label: "Overturned", variant: "success" },
  upheld: { label: "Upheld", variant: "secondary" },
  written_off: { label: "Written Off", variant: "secondary" },
}

const taskStatusConfig: Record<TaskStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  pending: { label: "Pending", variant: "warning" },
  in_progress: { label: "In Progress", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
}

const priorityConfig: Record<Priority, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  low: { label: "Low", variant: "secondary" },
  medium: { label: "Medium", variant: "info" },
  high: { label: "High", variant: "warning" },
  critical: { label: "Critical", variant: "destructive" },
}

export function StatusBadge({ status, type = "claim", className }: StatusBadgeProps) {
  let config: { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" } | undefined

  switch (type) {
    case "claim":
      config = claimStatusConfig[status as ClaimStatus]
      break
    case "denial":
      config = denialStatusConfig[status as DenialStatus]
      break
    case "task":
      config = taskStatusConfig[status as TaskStatus]
      break
    case "priority":
      config = priorityConfig[status as Priority]
      break
  }

  if (!config) {
    config = { label: status, variant: "secondary" }
  }

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  )
}

interface RiskBadgeProps {
  risk: number
  className?: string
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  const percentage = Math.round(risk * 100)
  
  let variant: "success" | "warning" | "destructive" = "success"
  if (risk > 0.7) variant = "destructive"
  else if (risk > 0.4) variant = "warning"

  return (
    <Badge variant={variant} className={cn(className)}>
      {percentage}% Risk
    </Badge>
  )
}
