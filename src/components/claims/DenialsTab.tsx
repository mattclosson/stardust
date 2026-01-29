import { Link } from "@tanstack/react-router"
import type { Id } from "../../../convex/_generated/dataModel"
import { Sparkles } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Denial {
  _id: Id<"denials">
  denialCode: string
  denialReason: string
  denialCategory: string
  status: string
  overturnLikelihood?: number
}

interface DenialsTabProps {
  denials: Denial[]
}

export function DenialsTab({ denials }: DenialsTabProps) {
  if (denials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Related Denials</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No denials for this claim.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Denials</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {denials.map((denial) => (
            <div
              key={denial._id}
              className="p-4 rounded-lg border border-border"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">
                      {denial.denialCode}
                    </span>
                    <StatusBadge status={denial.status} type="denial" />
                  </div>
                  <p className="text-sm mt-1">{denial.denialReason}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    Category: {denial.denialCategory.replace(/_/g, " ")}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/denials/$denialId"
                    params={{ denialId: denial._id }}
                  >
                    View Details
                  </Link>
                </Button>
              </div>
              {denial.overturnLikelihood !== undefined && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Overturn likelihood:
                  </span>
                  <span
                    className={`font-medium ${
                      denial.overturnLikelihood > 0.6
                        ? "text-success"
                        : denial.overturnLikelihood > 0.3
                          ? "text-warning"
                          : "text-muted-foreground"
                    }`}
                  >
                    {(denial.overturnLikelihood * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
