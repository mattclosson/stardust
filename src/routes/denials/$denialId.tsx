import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  ArrowLeft,
  Sparkles,
  Send,
  Copy,
  Loader2,
  Phone,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { RecordOutcomeDialog } from "@/components/dialogs/RecordOutcomeDialog"
import { StartHoldCallDialog } from "@/components/dialogs/StartHoldCallDialog"
import { AppealStatusCard } from "@/components/appeals/AppealStatusCard"
import {
  DenialHeader,
  AIAnalysisCard,
  SimilarDenialsTab,
  DenialHistoryTab,
  AppealLetterTab,
} from "@/components/denials"
import { CallHistoryTab } from "@/components/shared/CallHistoryTab"
import { logError } from "@/lib/logger"

export const Route = createFileRoute("/denials/$denialId")({
  component: DenialDetailPage,
})

function DenialDetailPage() {
  const { denialId } = Route.useParams()
  const [appealLetter, setAppealLetter] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAppealDialog, setShowAppealDialog] = useState(false)
  const [showWriteOffDialog, setShowWriteOffDialog] = useState(false)
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false)
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null)
  const [viewLetterDialog, setViewLetterDialog] = useState<{ open: boolean; letter: string }>({ open: false, letter: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [appealType, setAppealType] = useState<"reconsideration" | "formal_appeal" | "external_review">("reconsideration")
  const [submissionMethod, setSubmissionMethod] = useState<"electronic" | "fax" | "mail" | "portal">("electronic")
  const [showCallDialog, setShowCallDialog] = useState(false)

  // Fetch real data from Convex
  const denial = useQuery(api.denials.getById, {
    denialId: denialId as Id<"denials">,
  })
  const similarDenials = useQuery(api.denials.getSimilarDenials, denial ? {
    denialCode: denial.denialCode,
    denialCategory: denial.denialCategory,
    limit: 10,
  } : "skip")
  const callHistory = useQuery(api.holdCalls.getHistory, {
    denialId: denialId as Id<"denials">,
  })

  // Mutations
  const generateAppealLetter = useMutation(api.ai.appealGenerator.generateAppealLetter)
  const createAppeal = useMutation(api.appeals.create)
  const submitAppeal = useMutation(api.appeals.submit)
  const updateAppeal = useMutation(api.appeals.update)
  const updateDenialStatus = useMutation(api.denials.updateStatus)

  const isLoading = denial === undefined

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

  if (!denial) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader title="Denial Not Found" />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                The requested denial could not be found.
              </p>
              <Button asChild className="mt-4">
                <Link to="/denials">Back to Denials</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleGenerateAppeal = async () => {
    setIsGenerating(true)
    try {
      const result = await generateAppealLetter({
        denialId: denialId as Id<"denials">,
      })
      setAppealLetter(result.appealLetter)
    } catch (error) {
      logError("Failed to generate appeal letter", error)
    }
    setIsGenerating(false)
  }

  const handleSubmitAppeal = async () => {
    if (!denial.claim) return
    
    setIsSubmitting(true)
    try {
      await createAppeal({
        denialId: denialId as Id<"denials">,
        claimId: denial.claim._id,
        appealLevel: nextAppealLevel,
        appealType,
        submissionMethod,
        generatedAppealLetter: appealLetter || undefined,
      })
      setShowAppealDialog(false)
      setAppealLetter("")
      setAppealType("reconsideration")
      setSubmissionMethod("electronic")
    } catch (error) {
      logError("Failed to submit appeal", error)
    }
    setIsSubmitting(false)
  }

  const handleWriteOff = async () => {
    await updateDenialStatus({
      denialId: denialId as Id<"denials">,
      status: "written_off",
    })
  }

  const handleSubmitAppealStatus = async (appealId: string) => {
    try {
      await submitAppeal({ appealId: appealId as Id<"appeals"> })
    } catch (error) {
      logError("Failed to submit appeal", error)
    }
  }

  const handleRecordOutcome = async (outcome: {
    outcome: "overturned" | "partially_overturned" | "upheld"
    responseNotes?: string
  }) => {
    if (!selectedAppealId) return
    try {
      await updateAppeal({
        appealId: selectedAppealId as Id<"appeals">,
        status: "decided",
        outcome: outcome.outcome,
        responseNotes: outcome.responseNotes,
      })
    } catch (error) {
      logError("Failed to record outcome", error)
    }
  }

  const openOutcomeDialog = (appealId: string) => {
    setSelectedAppealId(appealId)
    setShowOutcomeDialog(true)
  }

  const openViewLetter = (_appealId: string, letter: string) => {
    setViewLetterDialog({ open: true, letter })
  }

  const overturnRate = similarDenials?.overturnRate || 0
  const overturnedCount = similarDenials?.overturnedCount || 0
  const totalSimilar = similarDenials?.totalCount || 0

  // Determine what level the next appeal would be
  const existingAppeals = ("appeals" in denial ? denial.appeals : []) || []
  const latestAppeal = existingAppeals.length > 0 
    ? existingAppeals.reduce((latest, appeal) => 
        appeal.appealLevel > latest.appealLevel ? appeal : latest
      , existingAppeals[0])
    : null
  
  const canAppeal = 
    (existingAppeals.length === 0 && !["overturned", "written_off"].includes(denial.status)) ||
    (latestAppeal?.status === "decided" && latestAppeal?.outcome === "upheld" && latestAppeal.appealLevel < 3)
  
  const nextAppealLevel = latestAppeal ? latestAppeal.appealLevel + 1 : 1

  const patient = "patient" in denial ? denial.patient : null
  const payer = "payer" in denial ? denial.payer : null

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title={`Denial - ${denial.denialCode}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/denials">
              <ArrowLeft className="w-4 h-4" />
              Back to Denials
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {payer && (
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
              onClick={() => setShowWriteOffDialog(true)}
              disabled={denial.status === "written_off"}
            >
              Write Off
            </Button>
            <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!canAppeal}>
                  <Send className="w-4 h-4" />
                  {nextAppealLevel > 1 ? `Start Level ${nextAppealLevel} Appeal` : "Start Appeal"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {nextAppealLevel > 1 ? `Submit Level ${nextAppealLevel} Appeal` : "Submit Appeal"}
                  </DialogTitle>
                  <DialogDescription>
                    {nextAppealLevel > 1 
                      ? `Create a Level ${nextAppealLevel} appeal after the previous appeal was upheld.`
                      : `Review and submit the appeal for denial ${denial.denialCode}`
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Appeal Type</Label>
                      <Select
                        value={appealType}
                        onValueChange={(v) => setAppealType(v as typeof appealType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reconsideration">Reconsideration</SelectItem>
                          <SelectItem value="formal_appeal">Formal Appeal</SelectItem>
                          <SelectItem value="external_review">External Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Submission Method</Label>
                      <Select
                        value={submissionMethod}
                        onValueChange={(v) => setSubmissionMethod(v as typeof submissionMethod)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronic">Electronic</SelectItem>
                          <SelectItem value="fax">Fax</SelectItem>
                          <SelectItem value="mail">Mail</SelectItem>
                          <SelectItem value="portal">Payer Portal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Appeal Letter</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateAppeal}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        <Sparkles className="w-3 h-3" />
                        {isGenerating ? "Generating..." : "Generate with AI"}
                      </Button>
                    </div>
                    <Textarea
                      value={appealLetter}
                      onChange={(e) => setAppealLetter(e.target.value)}
                      className="h-48 font-mono text-sm"
                      placeholder="Click 'Generate with AI' to create an appeal letter..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAppealDialog(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitAppeal} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Appeal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Denial Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DenialHeader denial={denial} patient={patient} payer={payer} />
          <AIAnalysisCard
            overturnLikelihood={denial.overturnLikelihood}
            similarDenialCount={denial.similarDenialCount}
            totalSimilar={totalSimilar}
            overturnRate={overturnRate}
            suggestedAction={denial.suggestedAction}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appeals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="appeals">
              Appeals
              {existingAppeals.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {existingAppeals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="letter">Appeal Letter</TabsTrigger>
            <TabsTrigger value="similar">Similar Denials</TabsTrigger>
            <TabsTrigger value="calls">
              Call History
              {callHistory && callHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {callHistory.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="appeals">
            <AppealStatusCard
              appeals={existingAppeals.map(appeal => ({
                _id: appeal._id,
                appealLevel: appeal.appealLevel,
                appealType: appeal.appealType,
                submissionMethod: appeal.submissionMethod,
                status: appeal.status,
                outcome: appeal.outcome,
                generatedAppealLetter: appeal.generatedAppealLetter,
                submittedAt: appeal.submittedAt,
                responseReceivedAt: appeal.responseReceivedAt,
                responseNotes: appeal.responseNotes,
                createdAt: appeal.createdAt,
              }))}
              canCreateAppeal={canAppeal}
              onCreateAppeal={() => setShowAppealDialog(true)}
              onSubmitAppeal={handleSubmitAppealStatus}
              onRecordOutcome={openOutcomeDialog}
              onViewLetter={openViewLetter}
            />
          </TabsContent>

          <TabsContent value="letter">
            <AppealLetterTab
              appealLetter={appealLetter}
              isGenerating={isGenerating}
              onAppealLetterChange={setAppealLetter}
              onGenerateAppeal={handleGenerateAppeal}
            />
          </TabsContent>

          <TabsContent value="similar">
            <SimilarDenialsTab
              totalSimilar={totalSimilar}
              overturnedCount={overturnedCount}
              overturnRate={overturnRate}
              similarDenials={similarDenials?.similarDenials}
            />
          </TabsContent>

          <TabsContent value="calls">
            <CallHistoryTab
              callHistory={callHistory}
              hasPayer={!!payer}
              onCallPayer={() => setShowCallDialog(true)}
              emptyMessage="No calls recorded for this denial."
            />
          </TabsContent>

          <TabsContent value="history">
            <DenialHistoryTab denial={denial} appeals={existingAppeals} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Write Off Confirmation Dialog */}
      <ConfirmDialog
        open={showWriteOffDialog}
        onOpenChange={setShowWriteOffDialog}
        title="Write Off Denial"
        description={`Are you sure you want to write off this denial for claim ${denial.claim?.claimNumber || ""}? This action cannot be undone.`}
        confirmText="Write Off"
        variant="destructive"
        onConfirm={handleWriteOff}
      />

      {/* Hold Call Dialog */}
      {payer && denial.claim && (
        <StartHoldCallDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          organizationId={denial.claim.organizationId}
          payerId={payer._id}
          payerName={payer.name}
          payerPhone={payer.providerServicesPhone}
          claimId={denial.claim._id}
          claimNumber={denial.claim.claimNumber}
          denialId={denial._id}
          denialCode={denial.denialCode}
        />
      )}

      {/* Record Outcome Dialog */}
      <RecordOutcomeDialog
        open={showOutcomeDialog}
        onOpenChange={setShowOutcomeDialog}
        appealLevel={
          selectedAppealId
            ? existingAppeals.find((a) => a._id === selectedAppealId)?.appealLevel || 1
            : 1
        }
        onRecordOutcome={handleRecordOutcome}
      />

      {/* View Appeal Letter Dialog */}
      <Dialog
        open={viewLetterDialog.open}
        onOpenChange={(open) => setViewLetterDialog({ ...viewLetterDialog, open })}
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Appeal Letter</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg">
              {viewLetterDialog.letter}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(viewLetterDialog.letter)}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </Button>
            <Button onClick={() => setViewLetterDialog({ open: false, letter: "" })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
