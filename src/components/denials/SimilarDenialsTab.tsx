import { FileText, CheckCircle, XCircle, TrendingUp } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"

interface SimilarDenial {
  _id: string
  denialCode: string
  denialCategory: string
  status: string
  receivedAt: string
}

interface SimilarDenialsTabProps {
  totalSimilar: number
  overturnedCount: number
  overturnRate: number
  similarDenials?: SimilarDenial[]
}

export function SimilarDenialsTab({
  totalSimilar,
  overturnedCount,
  overturnRate,
  similarDenials,
}: SimilarDenialsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Similar Denials Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Similar</p>
                  <p className="text-2xl font-bold">{totalSimilar}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overturned</p>
                  <p className="text-2xl font-bold">{overturnedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {(overturnRate * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {similarDenials && similarDenials.length > 0 ? (
          <div className="space-y-3">
            {similarDenials.slice(0, 5).map((similar) => (
              <div
                key={similar._id}
                className="flex items-center justify-between p-4 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      similar.status === "overturned"
                        ? "bg-success/10"
                        : "bg-muted"
                    }`}
                  >
                    {similar.status === "overturned" ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium font-mono">{similar.denialCode}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {similar.denialCategory.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={similar.status} type="denial" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(similar.receivedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No similar denials found in the system.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
