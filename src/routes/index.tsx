import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import {
  FileText,
  XCircle,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { StatusBadge, RiskBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { useOrganization } from "@/contexts/OrganizationContext"

export const Route = createFileRoute("/")({
  component: DashboardPage,
})

function DashboardPage() {
  const { selectedOrganization } = useOrganization()
  const orgId = selectedOrganization?._id

  // Fetch real data from Convex, filtered by selected organization
  // claims.list uses Convex pagination, so we need paginationOpts instead of limit
  const claims = useQuery(
    api.claims.list,
    orgId ? { organizationId: orgId, paginationOpts: { cursor: null, numItems: 50 } } : "skip"
  )
  const denials = useQuery(
    api.denials.list,
    orgId ? { organizationId: orgId, limit: 50 } : "skip"
  )
  const tasks = useQuery(
    api.tasks.list,
    orgId ? { organizationId: orgId, limit: 50 } : "skip"
  )
  const claimStats = useQuery(
    api.claims.getStats,
    orgId ? { organizationId: orgId } : "skip"
  )
  const denialStats = useQuery(
    api.denials.getStats,
    orgId ? { organizationId: orgId } : "skip"
  )

  const isLoading = !orgId || !claims || !denials || !tasks || !claimStats || !denialStats

  // Get the claims array from paginated response
  const claimsArray = claims?.page ?? []

  // Get high-risk claims
  const highRiskClaims = claimsArray
    .filter((c) => c.denialRisk && c.denialRisk > 0.5)
    .sort((a, b) => (b.denialRisk || 0) - (a.denialRisk || 0))
    .slice(0, 5)

  // Get recent denials
  const recentDenials = denials
    ? [...denials].sort((a, b) => b._creationTime - a._creationTime).slice(0, 5)
    : []

  // Get pending tasks
  const pendingTasks = tasks
    ? tasks
        .filter((t) => t.status === "pending" || t.status === "in_progress")
        .slice(0, 5)
    : []

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </>
          ) : (
            <>
              <MetricCard
                title="Total Claims"
                value={claimStats.total}
                icon={FileText}
                change={{ value: 12, trend: "up" }}
              />
              <MetricCard
                title="Total Charges"
                value={formatCurrency(claimStats.totalCharges)}
                icon={DollarSign}
                iconColor="text-success"
                change={{ value: 8, trend: "up" }}
              />
              <MetricCard
                title="Active Denials"
                value={denialStats.total}
                icon={XCircle}
                iconColor="text-destructive"
                change={{ value: 3, trend: "down" }}
              />
              <MetricCard
                title="High Risk Claims"
                value={claimStats.highRiskCount}
                icon={AlertTriangle}
                iconColor="text-warning"
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* High Risk Claims */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI-Flagged High Risk Claims
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/claims">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : highRiskClaims.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No high-risk claims found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Charges</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highRiskClaims.map((claim) => (
                      <TableRow key={claim._id}>
                        <TableCell>
                          <Link
                            to="/claims/$claimId"
                            params={{ claimId: claim._id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {claim.claimNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {claim.patient
                            ? `${claim.patient.lastName}, ${claim.patient.firstName}`
                            : "-"}
                        </TableCell>
                        <TableCell>{formatCurrency(claim.totalCharges)}</TableCell>
                        <TableCell>
                          <StatusBadge status={claim.status} type="claim" />
                        </TableCell>
                        <TableCell>
                          {claim.denialRisk !== undefined && (
                            <RiskBadge risk={claim.denialRisk} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Tasks Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Tasks
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/tasks">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : pendingTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No pending tasks
                </p>
              ) : (
                pendingTasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full ${
                        task.priority === "critical"
                          ? "bg-destructive"
                          : task.priority === "high"
                            ? "bg-warning"
                            : "bg-muted-foreground"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge
                          status={task.priority}
                          type="priority"
                          className="text-xs"
                        />
                        {task.source === "ai" && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Denials Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Denial Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Denial Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Appeal Rate
                    </span>
                    <span className="font-medium">
                      {(denialStats.appealRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Avg. Overturn Likelihood
                    </span>
                    <span className="font-medium flex items-center gap-1">
                      {(denialStats.avgOverturnLikelihood * 100).toFixed(0)}%
                      <TrendingUp className="w-4 h-4 text-success" />
                    </span>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      By Category
                    </p>
                    <div className="space-y-2">
                      {Object.entries(denialStats.byCategory).map(
                        ([category, count]) => (
                          <div
                            key={category}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="capitalize">
                              {category.replace(/_/g, " ")}
                            </span>
                            <span className="font-medium">{count as number}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Denials */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Denials</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/denials">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentDenials.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No denials found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Overturn %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDenials.map((denial) => (
                      <TableRow key={denial._id}>
                        <TableCell>
                          <Link
                            to="/denials/$denialId"
                            params={{ denialId: denial._id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {denial.claim?.claimNumber || "-"}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {denial.denialCode}
                        </TableCell>
                        <TableCell className="capitalize">
                          {denial.denialCategory.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={denial.status} type="denial" />
                        </TableCell>
                        <TableCell>
                          {denial.overturnLikelihood !== undefined ? (
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
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
