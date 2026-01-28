import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  Search,
  XCircle,
  TrendingUp,
  DollarSign,
  Sparkles,
  MoreHorizontal,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateAppealDialog } from "@/components/dialogs/CreateAppealDialog"
import { StatusDialog } from "@/components/dialogs/StatusDialog"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useOrganization } from "@/contexts/OrganizationContext"
import type { DenialStatus, DenialCategory } from "@/types"
import {
  DENIAL_FILTER_OPTIONS,
  DENIAL_CATEGORY_FILTER_OPTIONS,
  DENIAL_STATUS_OPTIONS,
} from "@/constants/statuses"

export const Route = createFileRoute("/denials/")({
  component: DenialsListPage,
})

interface Denial {
  _id: Id<"denials">
  denialCode: string
  denialReason: string
  denialCategory: string
  status: string
  appealDeadline?: string
  overturnLikelihood?: number
  claimId: Id<"claims">
  claim?: {
    _id: Id<"claims">
    claimNumber: string
    dateOfService: string
    totalCharges: number
    status: string
  } | null
  patient?: {
    _id: Id<"patients">
    firstName: string
    lastName: string
    mrn: string
  } | null
  payer?: {
    _id: Id<"payers">
    name: string
    payerType: string
  } | null
  _creationTime: number
}

function DenialsListPage() {
  const { selectedOrganization } = useOrganization()
  const orgId = selectedOrganization?._id

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<DenialStatus | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<DenialCategory | "all">(
    "all"
  )

  // Dialog states
  const [appealDialogOpen, setAppealDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [writeOffDialogOpen, setWriteOffDialogOpen] = useState(false)
  const [selectedDenial, setSelectedDenial] = useState<Denial | null>(null)

  // Fetch real data from Convex, filtered by selected organization
  const denials = useQuery(
    api.denials.list,
    orgId ? { organizationId: orgId, limit: 100 } : "skip"
  )
  const denialStats = useQuery(
    api.denials.getStats,
    orgId ? { organizationId: orgId } : "skip"
  )

  // Mutations
  const createAppeal = useMutation(api.appeals.create)
  const updateDenialStatus = useMutation(api.denials.updateStatus)

  const isLoading = !orgId || denials === undefined || denialStats === undefined

  // Calculate total at risk from denials
  const totalAtRisk = denials
    ? denials.reduce(
        (sum, d) => sum + (d.claim?.totalCharges || 0),
        0
      )
    : 0

  // Filter denials
  const filteredDenials = denials
    ? denials
        .filter((denial) => {
          if (statusFilter !== "all" && denial.status !== statusFilter) {
            return false
          }
          if (
            categoryFilter !== "all" &&
            denial.denialCategory !== categoryFilter
          ) {
            return false
          }
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
              denial.denialCode.toLowerCase().includes(query) ||
              denial.denialReason.toLowerCase().includes(query) ||
              denial.claim?.claimNumber?.toLowerCase().includes(query) ||
              denial.patient?.firstName?.toLowerCase().includes(query) ||
              denial.patient?.lastName?.toLowerCase().includes(query)
            )
          }
          return true
        })
        .sort((a, b) => b._creationTime - a._creationTime)
    : []

  // Action handlers
  const handleStartAppeal = (denial: Denial) => {
    setSelectedDenial(denial)
    setAppealDialogOpen(true)
  }

  const handleUpdateStatus = (denial: Denial) => {
    setSelectedDenial(denial)
    setStatusDialogOpen(true)
  }

  const handleWriteOff = (denial: Denial) => {
    setSelectedDenial(denial)
    setWriteOffDialogOpen(true)
  }

  const confirmCreateAppeal = async (data: {
    appealLevel: number
    appealType: "reconsideration" | "formal_appeal" | "external_review"
    submissionMethod: "electronic" | "fax" | "mail" | "portal"
    generatedAppealLetter?: string
  }) => {
    if (!selectedDenial || !selectedDenial.claim) return
    await createAppeal({
      denialId: selectedDenial._id,
      claimId: selectedDenial.claimId,
      ...data,
    })
  }

  const confirmStatusChange = async (status: string) => {
    if (!selectedDenial) return
    await updateDenialStatus({
      denialId: selectedDenial._id,
      status,
    })
  }

  const confirmWriteOff = async () => {
    if (!selectedDenial) return
    await updateDenialStatus({
      denialId: selectedDenial._id,
      status: "written_off",
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Denials" />

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
                title="Total Denials"
                value={denialStats.total}
                icon={XCircle}
                iconColor="text-destructive"
              />
              <MetricCard
                title="$ at Risk"
                value={formatCurrency(totalAtRisk)}
                icon={DollarSign}
                iconColor="text-warning"
              />
              <MetricCard
                title="Appeal Rate"
                value={`${(denialStats.appealRate * 100).toFixed(0)}%`}
                icon={TrendingUp}
                iconColor="text-info"
              />
              <MetricCard
                title="Avg Overturn Likelihood"
                value={`${(denialStats.avgOverturnLikelihood * 100).toFixed(0)}%`}
                icon={Sparkles}
                iconColor="text-primary"
              />
            </>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code, reason, claim #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as DenialStatus | "all")
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {DENIAL_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={(v) =>
                  setCategoryFilter(v as DenialCategory | "all")
                }
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {DENIAL_CATEGORY_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Denials Table */}
        <Card>
          <CardHeader>
            <CardTitle>Denials ({filteredDenials.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Overturn %</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDenials.map((denial) => (
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
                      <TableCell>
                        <span className="font-mono">{denial.denialCode}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {denial.denialCategory.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {denial.patient ? (
                          <div>
                            <p className="font-medium">
                              {denial.patient.lastName}, {denial.patient.firstName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {denial.patient.mrn}
                            </p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{denial.payer?.name || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {denial.claim
                          ? formatCurrency(denial.claim.totalCharges)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {denial.appealDeadline ? (
                          <span
                            className={
                              new Date(denial.appealDeadline) <
                              new Date(Date.now() + 7 * 86400000)
                                ? "text-warning font-medium"
                                : ""
                            }
                          >
                            {formatDate(denial.appealDeadline)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={denial.status} type="denial" />
                      </TableCell>
                      <TableCell>
                        {denial.overturnLikelihood !== undefined ? (
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-primary" />
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
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                to="/denials/$denialId"
                                params={{ denialId: denial._id }}
                              >
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStartAppeal(denial as Denial)}
                              disabled={["appealing", "appeal_submitted", "overturned", "upheld", "written_off"].includes(denial.status)}
                            >
                              Start Appeal
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(denial as Denial)}
                            >
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleWriteOff(denial as Denial)}
                              disabled={denial.status === "written_off"}
                              className="text-destructive"
                            >
                              Write Off
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateAppealDialog
        open={appealDialogOpen}
        onOpenChange={setAppealDialogOpen}
        denialCode={selectedDenial?.denialCode || ""}
        claimNumber={selectedDenial?.claim?.claimNumber || ""}
        onCreateAppeal={confirmCreateAppeal}
      />

      <StatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title="Update Denial Status"
        description={`Update the status of denial ${selectedDenial?.denialCode}.`}
        currentStatus={selectedDenial?.status || ""}
        statusOptions={DENIAL_STATUS_OPTIONS}
        showReason={false}
        onChangeStatus={confirmStatusChange}
      />

      <ConfirmDialog
        open={writeOffDialogOpen}
        onOpenChange={setWriteOffDialogOpen}
        title="Write Off Denial"
        description={`Are you sure you want to write off this denial? This will mark the denial for ${selectedDenial?.claim?.claimNumber || ""} as written off.`}
        confirmText="Write Off"
        variant="destructive"
        onConfirm={confirmWriteOff}
      />
    </div>
  )
}
