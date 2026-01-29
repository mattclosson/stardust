import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { ArrowLeft, Phone, Mic } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AssignDialog } from "@/components/dialogs/AssignDialog"
import { StatusDialog } from "@/components/dialogs/StatusDialog"
import { StartHoldCallDialog } from "@/components/dialogs/StartHoldCallDialog"
import {
  ClaimHeader,
  LineItemsTab,
  TimelineTab,
  DenialsTab,
} from "@/components/claims"
import { CallHistoryTab } from "@/components/shared/CallHistoryTab"
import { VoiceAssistantModal } from "@/components/voice"
import type { ClaimStatus } from "@/types"
import { CLAIM_STATUS_OPTIONS } from "@/constants/statuses"

export const Route = createFileRoute("/claims/$claimId")({
  component: ClaimDetailPage,
})

function ClaimDetailPage() {
  const { claimId } = Route.useParams()

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [showCallDialog, setShowCallDialog] = useState(false)
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false)

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
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setVoiceAssistantOpen(true)}
            >
              <Mic className="w-4 h-4" />
              Talk to Assistant
            </Button>
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
            <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
              Assign
            </Button>
            <Button onClick={() => setStatusDialogOpen(true)}>
              Change Status
            </Button>
          </div>
        </div>

        {/* Claim Header */}
        <ClaimHeader claim={claim} patient={claim.patient} payer={claim.payer} />

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

          <TabsContent value="line-items">
            <LineItemsTab lineItems={lineItems} />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineTab statusEvents={statusEvents} />
          </TabsContent>

          <TabsContent value="denials">
            <DenialsTab denials={denials} />
          </TabsContent>

          <TabsContent value="calls">
            <CallHistoryTab
              callHistory={callHistory}
              hasPayer={!!claim.payer}
              onCallPayer={() => setShowCallDialog(true)}
              emptyMessage="No calls recorded for this claim."
            />
          </TabsContent>

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
        statusOptions={CLAIM_STATUS_OPTIONS}
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

      {/* Voice Assistant Dialog */}
      <VoiceAssistantModal
        open={voiceAssistantOpen}
        onOpenChange={setVoiceAssistantOpen}
        claimId={claim._id}
      />
    </div>
  )
}
