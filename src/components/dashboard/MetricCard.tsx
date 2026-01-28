import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    trend: "up" | "down" | "neutral"
  }
  icon?: LucideIcon
  iconColor?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("hover:bg-white/2 transition-colors duration-150", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-xl font-semibold tracking-tight">{value}</p>
            {change && (
              <p
                className={cn(
                  "text-xs font-medium",
                  change.trend === "up" && "text-green-400",
                  change.trend === "down" && "text-red-400",
                  change.trend === "neutral" && "text-muted-foreground"
                )}
              >
                {change.trend === "up" && "+"}
                {change.trend === "down" && "-"}
                {change.value}% from last month
              </p>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md bg-white/5",
                iconColor
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
