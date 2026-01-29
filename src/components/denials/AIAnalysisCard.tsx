import { Sparkles, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

interface AIAnalysisCardProps {
  overturnLikelihood?: number
  similarDenialCount?: number
  totalSimilar: number
  overturnRate: number
  suggestedAction?: string
}

export function AIAnalysisCard({
  overturnLikelihood,
  similarDenialCount,
  totalSimilar,
  overturnRate,
  suggestedAction,
}: AIAnalysisCardProps) {
  const displayOverturnRate = overturnRate * 100

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overturn Likelihood */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Overturn Likelihood
            </span>
            <span
              className={`font-bold ${
                overturnLikelihood && overturnLikelihood > 0.6
                  ? "text-success"
                  : overturnLikelihood && overturnLikelihood > 0.3
                    ? "text-warning"
                    : "text-muted-foreground"
              }`}
            >
              {overturnLikelihood
                ? `${(overturnLikelihood * 100).toFixed(0)}%`
                : "N/A"}
            </span>
          </div>
          <Progress value={(overturnLikelihood || 0) * 100} className="h-2" />
        </div>

        {/* Similar Denials */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Similar Denials
            </span>
            <span className="font-medium">
              {similarDenialCount || totalSimilar}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Historical overturn rate:{" "}
            <span className="font-medium text-success">
              {displayOverturnRate.toFixed(0)}%
            </span>
          </div>
        </div>

        <Separator />

        {/* Suggested Action */}
        {suggestedAction && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Recommended Action</span>
            </div>
            <p className="text-sm text-muted-foreground">{suggestedAction}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
