import { Clock, CheckCircle, XCircle } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"

interface StatusEvent {
  _id: string
  toStatus: string
  fromStatus?: string
  reason?: string
  actorType: string
  actorId?: string
  createdAt: number
}

interface TimelineTabProps {
  statusEvents: StatusEvent[]
}

export function TimelineTab({ statusEvents }: TimelineTabProps) {
  if (statusEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No status history for this claim.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {statusEvents.map((event, index) => (
              <div key={event._id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                    index === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {event.toStatus === "paid" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : event.toStatus === "denied" ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={event.toStatus} type="claim" />
                    {event.fromStatus && (
                      <span className="text-xs text-muted-foreground">
                        from{" "}
                        <span className="capitalize">
                          {event.fromStatus.replace(/_/g, " ")}
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{event.reason || "Status updated"}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatDateTime(event.createdAt)}</span>
                    <span>•</span>
                    <span className="capitalize">{event.actorType}</span>
                    {event.actorId && (
                      <>
                        <span>•</span>
                        <span>{event.actorId}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
