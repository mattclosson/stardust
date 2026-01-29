import { Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CallStatusBadge } from "@/components/calls/CallStatusBadge"
import { formatDateTime } from "@/lib/utils"

interface CallRecord {
  _id: string
  status: string
  startedAt: number
  totalHoldTimeSeconds?: number
  payer?: {
    name: string
  } | null
}

interface CallHistoryTabProps {
  callHistory?: CallRecord[]
  hasPayer: boolean
  onCallPayer?: () => void
  emptyMessage?: string
}

export function CallHistoryTab({
  callHistory,
  hasPayer,
  onCallPayer,
  emptyMessage = "No calls recorded.",
}: CallHistoryTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
      </CardHeader>
      <CardContent>
        {!callHistory || callHistory.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{emptyMessage}</p>
            {hasPayer && onCallPayer && (
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={onCallPayer}
              >
                <Phone className="w-4 h-4" />
                Call Payer
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {callHistory.map((call) => (
              <div
                key={call._id}
                className="flex items-center justify-between p-4 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      call.status === "completed"
                        ? "bg-success/10"
                        : call.status === "cancelled" || call.status === "failed"
                          ? "bg-destructive/10"
                          : "bg-warning/10"
                    }`}
                  >
                    <Phone
                      className={`w-5 h-5 ${
                        call.status === "completed"
                          ? "text-success"
                          : call.status === "cancelled" || call.status === "failed"
                            ? "text-destructive"
                            : "text-warning"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium">
                      {call.payer?.name || "Unknown Payer"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(call.startedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <CallStatusBadge status={call.status} />
                  {call.totalHoldTimeSeconds && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Hold time: {Math.floor(call.totalHoldTimeSeconds / 60)}m{" "}
                      {call.totalHoldTimeSeconds % 60}s
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
