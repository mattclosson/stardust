import { XCircle, Clock, Send } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"

interface Appeal {
  _id: string
  appealType: string
  appealLevel: number
  status: string
  createdAt: number
}

interface DenialHistoryTabProps {
  denial: {
    status: string
    receivedAt: string
    _creationTime: number
  }
  appeals?: Appeal[]
}

export function DenialHistoryTab({ denial, appeals }: DenialHistoryTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Denial History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            <div className="relative flex gap-4">
              <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-destructive text-destructive-foreground">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2">
                  <StatusBadge status="new" type="denial" />
                </div>
                <p className="text-sm mt-1">Denial received from payer</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDateTime(denial.receivedAt)} • Payer
                </p>
              </div>
            </div>

            {denial.status !== "new" && (
              <div className="relative flex gap-4">
                <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-warning text-warning-foreground">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={denial.status} type="denial" />
                  </div>
                  <p className="text-sm mt-1">Status updated</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(denial._creationTime)} • System
                  </p>
                </div>
              </div>
            )}

            {appeals &&
              appeals.length > 0 &&
              appeals.map((appeal) => (
                <div key={appeal._id} className="relative flex gap-4">
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {appeal.appealType.replace(/_/g, " ")}
                      </Badge>
                      <StatusBadge status={appeal.status} type="denial" />
                    </div>
                    <p className="text-sm mt-1">
                      Level {appeal.appealLevel} appeal {appeal.status}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(appeal.createdAt)} • System
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
