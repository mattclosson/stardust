import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  ArrowLeft,
  User,
  Building,
  Calendar,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { StatusBadge, RiskBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AssignDialog } from "@/components/dialogs/AssignDialog"
import { StatusDialog } from "@/components/dialogs/StatusDialog"
import { StartHoldCallDialog } from "@/components/dialogs/StartHoldCallDialog"
import { CallStatusBadge } from "@/components/calls/CallStatusBadge"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"

export const Route = createFileRoute("/claims/$claimId")({
  component: ClaimDetailPage,
})

type ClaimStatus =
  | "draft"
  | "ready_to_submit"
  | "submitted"
  | "acknowledged"
  | "pending"
  | "paid"
  | "partial_paid"
  | "denied"
  | "rejected"
  | "appealed"
  | "written_off"
  | "closed"

const claimStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "ready_to_submit", label: "Ready to Submit" },
  { value: "submitted", label: "Submitted" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "partial_paid", label: "Partial Paid" },
  { value: "denied", label: "Denied" },
  { value: "rejected", label: "Rejected" },
  { value: "appealed", label: "Appealed" },
  { value: "written_off", label: "Written Off" },
  { value: "closed", label: "Closed" },
]

function ClaimDetailPage() {
  const { claimId } = Route.useParams()

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [showCallDialog, setShowCallDialog] = useState(false)

  // Fetch real data from Convex
  const claim = useQuery(api.claims.getById, {
    claimId: claimId as Id<"claims">,
  })
  const timeline = useQuery(api.claims.getTimeline, {
    claimId: claimId as Id<"claims">,
  })
  const callHistory = useQuery(api.holdCalls.getHistory, {
    claimId: claimId as Id<"claims">,
  })

  // Mutations
  const assignClaim = useMutation(api.claims.assign)
  const updateClaimStatus = useMutation(api.claims.updateStatus)

  const isLoading = claim === undefined

  // Action handlers
  const handleAssign = async (assignee: string) => {
    await assignClaim({
      claimId: claimId as Id<"claims">,
      assignedTo: assignee,
    })
  }

  const handleStatusChange = async (status: string, reason?: string) => {
    await updateClaimStatus({
      claimId: claimId as Id<"claims">,
      status: status as ClaimStatus,
      reason,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Loading..." />
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Claim Not Found" />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                The requested claim could not be found.
              </p>
              <Button asChild className="mt-4">
                <Link to="/claims">Back to Claims</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const lineItems = claim.lineItems || []
  const denials = claim.denials || []
  const statusEvents = timeline || []

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title={`Claim ${claim.claimNumber}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/claims">
              <ArrowLeft className="w-4 h-4" />
              Back to Claims
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {claim.payer && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowCallDialog(true)}
              >
                <Phone className="w-4 h-4" />
                Call Payer
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(true)}
            >
              Assign
            </Button>
            <Button onClick={() => setStatusDialogOpen(true)}>
              Change Status
            </Button>
          </div>
        </div>

        {/* Claim Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{claim.claimNumber}</h2>
                  <StatusBadge status={claim.status} type="claim" />
                  <StatusBadge
                    status={claim.priority || "medium"}
                    type="priority"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Patient</p>
                      <p className="font-medium">
                        {claim.patient
                          ? `${claim.patient.firstName} ${claim.patient.lastName}`
                          : "-"}
                      </p>
                      {claim.patient && (
                        <p className="text-xs text-muted-foreground">
                          MRN: {claim.patient.mrn}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Payer</p>
                      <p className="font-medium">{claim.payer?.name || "-"}</p>
                      {claim.payer && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {claim.payer.payerType}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Date of Service
                      </p>
                      <p className="font-medium">
                        {formatDate(claim.dateOfService)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Charges
                      </p>
                      <p className="font-medium">
                        {formatCurrency(claim.totalCharges)}
                      </p>
                      {claim.totalPaid && (
                        <p className="text-xs text-success">
                          Paid: {formatCurrency(claim.totalPaid)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Risk Panel */}
              {claim.denialRisk !== undefined && (
                <Card className="w-full lg:w-80 bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="font-medium">AI Risk Analysis</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">
                        Denial Risk
                      </span>
                      <RiskBadge risk={claim.denialRisk} />
                    </div>
                    {claim.denialRiskFactors &&
                      claim.denialRiskFactors.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Risk Factors:
                          </p>
                          <div className="space-y-1">
                            {claim.denialRiskFactors.map((factor, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-sm"
                              >
                                <AlertTriangle className="w-3 h-3 text-warning" />
                                {factor}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="line-items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="line-items">Line Items</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="denials">
              Denials
              {denials.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {denials.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calls">
              Call History
              {callHistory && callHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {callHistory.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Line Items Tab */}
          <TabsContent value="line-items">
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                {lineItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No line items for this claim.
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Units</TableHead>
                          <TableHead className="text-right">Charges</TableHead>
                          <TableHead className="text-right">Allowed</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>{item.lineNumber}</TableCell>
                            <TableCell>
                              <span className="font-mono">
                                {item.procedureCode}
                              </span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {item.procedureType}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.description || "-"}</TableCell>
                            <TableCell className="text-center">
                              {item.units}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.chargeAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.allowedAmount
                                ? formatCurrency(item.allowedAmount)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.paidAmount
                                ? formatCurrency(item.paidAmount)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={item.status} type="claim" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Totals */}
                    <div className="flex justify-end mt-4 pt-4 border-t border-border">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total Charges
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              lineItems.reduce((s, i) => s + i.chargeAmount, 0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total Allowed
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              lineItems.reduce(
                                (s, i) => s + (i.allowedAmount || 0),
                                0
                              )
                            )}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="font-medium">Total Paid</span>
                          <span className="font-bold text-success">
                            {formatCurrency(
                              lineItems.reduce(
                                (s, i) => s + (i.paidAmount || 0),
                                0
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {statusEvents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No status history for this claim.
                  </p>
                ) : (
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
                              <StatusBadge
                                status={event.toStatus}
                                type="claim"
                              />
                              {event.fromStatus && (
                                <span className="text-xs text-muted-foreground">
                                  from{" "}
                                  <span className="capitalize">
                                    {event.fromStatus.replace(/_/g, " ")}
                                  </span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1">
                              {event.reason || "Status updated"}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{formatDateTime(event.createdAt)}</span>
                              <span>•</span>
                              <span className="capitalize">
                                {event.actorType}
                              </span>
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Denials Tab */}
          <TabsContent value="denials">
            <Card>
              <CardHeader>
                <CardTitle>Related Denials</CardTitle>
              </CardHeader>
              <CardContent>
                {denials.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No denials for this claim.
                  </p>
                ) : (
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
                              <StatusBadge
                                status={denial.status}
                                type="denial"
                              />
                            </div>
                            <p className="text-sm mt-1">{denial.denialReason}</p>
                            <p className="text-xs text-muted-foreground mt-1 capitalize">
                              Category:{" "}
                              {denial.denialCategory.replace(/_/g, " ")}
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Call History Tab */}
          <TabsContent value="calls">
            <Card>
              <CardHeader>
                <CardTitle>Call History</CardTitle>
              </CardHeader>
              <CardContent>
                {!callHistory || callHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No calls recorded for this claim.</p>
                    {claim.payer && (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={() => setShowCallDialog(true)}
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
                              Hold time: {Math.floor(call.totalHoldTimeSeconds / 60)}m {call.totalHoldTimeSeconds % 60}s
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <Button variant="outline" size="sm">
                  Upload Document
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  No documents attached to this claim.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        title="Assign Claim"
        description={`Assign claim ${claim.claimNumber} to a team member.`}
        currentAssignee={claim.assignedTo}
        onAssign={handleAssign}
      />

      <StatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title="Change Claim Status"
        description={`Change the status of claim ${claim.claimNumber}.`}
        currentStatus={claim.status}
        statusOptions={claimStatusOptions}
        onChangeStatus={handleStatusChange}
      />

      {/* Hold Call Dialog */}
      {claim.payer && (
        <StartHoldCallDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          organizationId={claim.organizationId}
          payerId={claim.payer._id}
          payerName={claim.payer.name}
          payerPhone={claim.payer.providerServicesPhone}
          claimId={claim._id}
          claimNumber={claim.claimNumber}
        />
      )}
    </div>
  )
}
