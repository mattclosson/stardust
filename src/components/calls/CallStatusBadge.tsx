import { Badge } from "@/components/ui/badge"

type CallStatus =
  | "initiating"
  | "dialing"
  | "ivr_navigation"
  | "on_hold"
  | "operator_detected"
  | "user_connected"
  | "completed"
  | "failed"
  | "cancelled"

interface CallStatusBadgeProps {
  status: CallStatus
}

const statusConfig: Record<CallStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  initiating: {
    label: "Starting",
    variant: "secondary",
  },
  dialing: {
    label: "Dialing",
    variant: "secondary",
  },
  ivr_navigation: {
    label: "Navigating Menu",
    variant: "outline",
  },
  on_hold: {
    label: "On Hold",
    variant: "outline",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  operator_detected: {
    label: "Operator Ready",
    variant: "default",
    className: "bg-success text-success-foreground animate-pulse",
  },
  user_connected: {
    label: "Connected",
    variant: "default",
    className: "bg-success text-success-foreground",
  },
  completed: {
    label: "Completed",
    variant: "secondary",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
  },
  cancelled: {
    label: "Cancelled",
    variant: "secondary",
  },
}

export function CallStatusBadge({ status }: CallStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const }

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
