import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  ArrowLeft,
  User,
  Building,
  DollarSign,
  FileText,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Copy,
  Edit,
  Lightbulb,
  TrendingUp,
  Loader2,
  Phone,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import { StartHoldCallDialog } from "@/components/dialogs/StartHoldCallDialog"
import { CallStatusBadge } from "@/components/calls/CallStatusBadge"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
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
        appealLevel: 1,
        appealType,
        submissionMethod,
        generatedAppealLetter: appealLetter || undefined,
      })
      setShowAppealDialog(false)
      // Reset form
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

  const overturnRate = similarDenials ? similarDenials.overturnRate * 100 : 0
  const overturnedCount = similarDenials?.overturnedCount || 0
  const totalSimilar = similarDenials?.totalCount || 0

  const canAppeal = !["appealing", "appeal_submitted", "overturned", "upheld", "written_off"].includes(denial.status)

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
            {"payer" in denial && denial.payer && (
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
                  Start Appeal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Submit Appeal</DialogTitle>
                  <DialogDescription>
                    Review and submit the appeal for denial {denial.denialCode}
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
                          <SelectItem value="reconsideration">
                            Reconsideration
                          </SelectItem>
                          <SelectItem value="formal_appeal">
                            Formal Appeal
                          </SelectItem>
                          <SelectItem value="external_review">
                            External Review
                          </SelectItem>
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
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono">
                    {denial.denialCode}
                  </span>
                  <StatusBadge status={denial.status} type="denial" />
                  <Badge variant="outline" className="capitalize">
                    {denial.denialCategory.replace(/_/g, " ")}
                  </Badge>
                </div>

                <p className="text-muted-foreground">{denial.denialReason}</p>

                <Separator />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Claim</p>
                      <Link
                        to="/claims/$claimId"
                        params={{ claimId: denial.claim?._id || "" }}
                        className="font-medium text-primary hover:underline"
                      >
                        {denial.claim?.claimNumber || "-"}
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Patient</p>
                      <p className="font-medium">
                        {"patient" in denial && denial.patient
                          ? `${denial.patient.firstName} ${denial.patient.lastName}`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Payer</p>
                      <p className="font-medium">
                        {"payer" in denial && denial.payer ? denial.payer.name : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium text-destructive">
                        {denial.claim
                          ? formatCurrency(denial.claim.totalCharges)
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {denial.appealDeadline && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <Clock className="w-5 h-5 text-warning" />
                    <span className="text-sm">
                      Appeal deadline:{" "}
                      <span className="font-medium">
                        {formatDate(denial.appealDeadline)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis Card */}
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
                      denial.overturnLikelihood && denial.overturnLikelihood > 0.6
                        ? "text-success"
                        : denial.overturnLikelihood && denial.overturnLikelihood > 0.3
                          ? "text-warning"
                          : "text-muted-foreground"
                    }`}
                  >
                    {denial.overturnLikelihood
                      ? `${(denial.overturnLikelihood * 100).toFixed(0)}%`
                      : "N/A"}
                  </span>
                </div>
                <Progress
                  value={(denial.overturnLikelihood || 0) * 100}
                  className="h-2"
                />
              </div>

              {/* Similar Denials */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Similar Denials
                  </span>
                  <span className="font-medium">
                    {denial.similarDenialCount || totalSimilar}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Historical overturn rate:{" "}
                  <span className="font-medium text-success">
                    {overturnRate.toFixed(0)}%
                  </span>
                </div>
              </div>

              <Separator />

              {/* Suggested Action */}
              {denial.suggestedAction && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      Recommended Action
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {denial.suggestedAction}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appeal" className="space-y-4">
          <TabsList>
            <TabsTrigger value="appeal">Appeal Letter</TabsTrigger>
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

          {/* Appeal Letter Tab */}
          <TabsContent value="appeal">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>AI-Generated Appeal Letter</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAppeal}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating ? "Generating..." : appealLetter ? "Regenerate" : "Generate with AI"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigator.clipboard.writeText(appealLetter)}
                    disabled={!appealLetter}
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" disabled={!appealLetter}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {isGenerating && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                        <span>Generating appeal letter...</span>
                      </div>
                    </div>
                  )}
                  <Textarea
                    value={appealLetter}
                    onChange={(e) => setAppealLetter(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="Click 'Generate with AI' above to create a customized appeal letter based on this denial..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Similar Denials Tab */}
          <TabsContent value="similar">
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
                          <p className="text-sm text-muted-foreground">
                            Total Similar
                          </p>
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
                          <p className="text-sm text-muted-foreground">
                            Overturned
                          </p>
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
                          <p className="text-sm text-muted-foreground">
                            Success Rate
                          </p>
                          <p className="text-2xl font-bold">
                            {overturnRate.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {similarDenials?.similarDenials && similarDenials.similarDenials.length > 0 ? (
                  <div className="space-y-3">
                    {similarDenials.similarDenials.slice(0, 5).map((similar) => (
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
                            <p className="font-medium font-mono">
                              {similar.denialCode}
                            </p>
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
                    <p className="text-muted-foreground">No calls recorded for this denial.</p>
                    {"payer" in denial && denial.payer && (
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

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Denial History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                  <div className="space-y-6">
                    <div className="relative flex gap-4">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-destructive text-destructive-foreground">
                        <XCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2">
                          <StatusBadge status="new" type="denial" />
                        </div>
                        <p className="text-sm mt-1">Denial received from payer</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(denial.receivedAt)} • Payer
                        </p>
                      </div>
                    </div>

                    {denial.status !== "new" && (
                      <div className="relative flex gap-4">
                        <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-warning text-warning-foreground">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={denial.status} type="denial" />
                          </div>
                          <p className="text-sm mt-1">Status updated</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(denial._creationTime)} • System
                          </p>
                        </div>
                      </div>
                    )}

                    {"appeals" in denial && denial.appeals && denial.appeals.length > 0 && (
                      denial.appeals.map((appeal: {
                        _id: string;
                        appealType: string;
                        appealLevel: number;
                        status: string;
                        createdAt: number;
                      }) => (
                        <div key={appeal._id} className="relative flex gap-4">
                          <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                            <Send className="w-4 h-4" />
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {appeal.appealType.replace(/_/g, " ")}
                              </Badge>
                              <StatusBadge status={appeal.status} type="denial" />
                            </div>
                            <p className="text-sm mt-1">
                              Level {appeal.appealLevel} appeal {appeal.status}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(appeal.createdAt)} • System
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
      {"payer" in denial && denial.payer && denial.claim && (
        <StartHoldCallDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          organizationId={denial.claim.organizationId}
          payerId={denial.payer._id}
          payerName={denial.payer.name}
          payerPhone={denial.payer.providerServicesPhone}
          claimId={denial.claim._id}
          claimNumber={denial.claim.claimNumber}
          denialId={denial._id}
          denialCode={denial.denialCode}
        />
      )}
    </div>
  )
}
