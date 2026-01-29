import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useCallback } from "react"
import { usePaginatedQuery, useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  Search,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { StatusBadge, RiskBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { AssignDialog } from "@/components/dialogs/AssignDialog"
import { StatusDialog } from "@/components/dialogs/StatusDialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useOrganization } from "@/contexts/OrganizationContext"
import type { ClaimStatus } from "@/types"
import { CLAIM_FILTER_OPTIONS, CLAIM_STATUS_OPTIONS } from "@/constants/statuses"

export const Route = createFileRoute("/claims/")({
  component: ClaimsListPage,
})

interface Claim {
  _id: Id<"claims">
  claimNumber: string
  status: string
  dateOfService: string
  totalCharges: number
  totalPaid?: number
  priority?: string
  denialRisk?: number
  assignedTo?: string
  patient?: {
    firstName: string
    lastName: string
    mrn: string
  } | null
  payer?: {
    name: string
    payerType: string
  } | null
}

const PAGE_SIZE = 25

function ClaimsListPage() {
  const { selectedOrganization } = useOrganization()
  const orgId = selectedOrganization?._id

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "all">("all")
  const [sortBy, setSortBy] = useState<"date" | "charges" | "risk">("date")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)

  // Fetch total count for pagination info
  const totalCount = useQuery(
    api.claims.count,
    orgId ? { organizationId: orgId } : "skip"
  )

  // Fetch paginated claims data
  const { results: allLoadedClaims, status, loadMore } = usePaginatedQuery(
    api.claims.list,
    orgId ? { organizationId: orgId } : "skip",
    { initialNumItems: PAGE_SIZE }
  )

  const assignClaim = useMutation(api.claims.assign)
  const updateClaimStatus = useMutation(api.claims.updateStatus)
  const isLoading = !orgId || status === "LoadingFirstPage"
  const isLoadingMore = status === "LoadingMore"
  const canLoadMore = status === "CanLoadMore"

  // Calculate pagination values
  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 1
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const endIndex = startIndex + PAGE_SIZE

  // Get claims for current page (slice from all loaded claims)
  const currentPageClaims = allLoadedClaims?.slice(startIndex, endIndex) ?? []

  // Handle next page
  const handleNextPage = useCallback(() => {
    const nextPage = currentPage + 1
    const neededItems = nextPage * PAGE_SIZE

    // Check if we need to load more data
    if (allLoadedClaims && allLoadedClaims.length < neededItems && canLoadMore) {
      loadMore(PAGE_SIZE)
    }

    setCurrentPage(nextPage)
  }, [currentPage, allLoadedClaims, canLoadMore, loadMore])

  // Handle previous page
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }, [currentPage])

  // Check if we can go to next page
  const hasNextPage = totalCount ? currentPage < totalPages : canLoadMore
  const hasPrevPage = currentPage > 1

  // Filter and sort claims for current page
  const filteredClaims = currentPageClaims
    .filter((claim) => {
      // Status filter
      if (statusFilter !== "all" && claim.status !== statusFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          claim.claimNumber.toLowerCase().includes(query) ||
          claim.patient?.firstName?.toLowerCase().includes(query) ||
          claim.patient?.lastName?.toLowerCase().includes(query) ||
          claim.patient?.mrn?.toLowerCase().includes(query) ||
          claim.payer?.name?.toLowerCase().includes(query)
        )
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "charges":
          return b.totalCharges - a.totalCharges
        case "risk":
          return (b.denialRisk || 0) - (a.denialRisk || 0)
        case "date":
        default:
          return (
            new Date(b.dateOfService).getTime() -
            new Date(a.dateOfService).getTime()
          )
      }
    })

  // Action handlers
  const handleAssign = (claim: Claim) => {
    setSelectedClaim(claim)
    setAssignDialogOpen(true)
  }

  const handleChangeStatus = (claim: Claim) => {
    setSelectedClaim(claim)
    setStatusDialogOpen(true)
  }

  const confirmAssign = async (assignee: string) => {
    if (!selectedClaim) return
    await assignClaim({
      claimId: selectedClaim._id,
      assignedTo: assignee,
    })
  }

  const confirmStatusChange = async (status: string, reason?: string) => {
    if (!selectedClaim) return
    await updateClaimStatus({
      claimId: selectedClaim._id,
      status: status as ClaimStatus,
      reason,
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Claims" />

      <div className="flex-1 p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by claim #, patient, payer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ClaimStatus | "all")}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as "date" | "charges" | "risk")}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date of Service</SelectItem>
                  <SelectItem value="charges">Total Charges</SelectItem>
                  <SelectItem value="risk">Denial Risk</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Claims Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Claims {totalCount !== undefined && (
                <span className="font-normal text-muted-foreground">{totalCount.toLocaleString()}</span>
              )}
            </CardTitle>
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
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Claim #</TableHead>
                    <TableHead className="whitespace-nowrap">Patient</TableHead>
                    <TableHead className="whitespace-nowrap">DOS</TableHead>
                    <TableHead className="whitespace-nowrap">Payer</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Charges</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Paid</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Priority</TableHead>
                    <TableHead className="whitespace-nowrap">Risk</TableHead>
                    <TableHead className="w-10 sticky right-0 bg-background"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => (
                    <TableRow key={claim._id}>
                      <TableCell className="whitespace-nowrap">
                        <Link
                          to="/claims/$claimId"
                          params={{ claimId: claim._id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {claim.claimNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {claim.patient ? (
                          <div>
                            <p className="font-medium">
                              {claim.patient.lastName}, {claim.patient.firstName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {claim.patient.mrn}
                            </p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(claim.dateOfService)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {claim.payer ? (
                          <div>
                            <p className="font-medium">{claim.payer.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {claim.payer.payerType}
                            </p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">
                        {formatCurrency(claim.totalCharges)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {claim.totalPaid ? formatCurrency(claim.totalPaid) : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge status={claim.status} type="claim" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge
                          status={claim.priority || "medium"}
                          type="priority"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {claim.denialRisk !== undefined ? (
                          <RiskBadge risk={claim.denialRisk} />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                to="/claims/$claimId"
                                params={{ claimId: claim._id }}
                              >
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAssign(claim as Claim)}
                            >
                              Assign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleChangeStatus(claim as Claim)}
                            >
                              Change Status
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {totalCount !== undefined ? (
                  <>
                    Showing {Math.min(startIndex + 1, totalCount)}-{Math.min(endIndex, totalCount)} of {totalCount.toLocaleString()} claims
                  </>
                ) : (
                  `Showing ${filteredClaims.length} claims`
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={!hasPrevPage || isLoadingMore}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasNextPage || isLoadingMore}
                >
                  {isLoadingMore ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        title="Assign Claim"
        description={`Assign claim ${selectedClaim?.claimNumber} to a team member.`}
        currentAssignee={selectedClaim?.assignedTo}
        organizationId={orgId}
        onAssign={confirmAssign}
      />

      <StatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title="Change Claim Status"
        description={`Change the status of claim ${selectedClaim?.claimNumber}.`}
        currentStatus={selectedClaim?.status || ""}
        statusOptions={CLAIM_STATUS_OPTIONS}
        onChangeStatus={confirmStatusChange}
      />
    </div>
  )
}
