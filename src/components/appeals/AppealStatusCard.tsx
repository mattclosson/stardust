import { useState } from "react"
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  MoreHorizontal,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateTime } from "@/lib/utils"

interface Appeal {
  _id: string
  appealLevel: number
  appealType: "reconsideration" | "formal_appeal" | "external_review"
  submissionMethod: "electronic" | "fax" | "mail" | "portal"
  status: "draft" | "submitted" | "in_review" | "decided"
  outcome?: "overturned" | "partially_overturned" | "upheld"
  generatedAppealLetter?: string
  submittedAt?: number
  responseReceivedAt?: number
  responseNotes?: string
  createdAt: number
}

interface AppealStatusCardProps {
  appeals: Appeal[]
  canCreateAppeal: boolean
  onCreateAppeal: () => void
  onSubmitAppeal: (appealId: string) => Promise<void>
  onRecordOutcome: (appealId: string) => void
  onViewLetter: (appealId: string, letter: string) => void
}

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "bg-muted text-muted-foreground",
    icon: FileText,
    progress: 25,
  },
  submitted: {
    label: "Submitted",
    color: "bg-primary text-primary-foreground",
    icon: Send,
    progress: 50,
  },
  in_review: {
    label: "In Review",
    color: "bg-warning text-warning-foreground",
    icon: Clock,
    progress: 75,
  },
  decided: {
    label: "Decided",
    color: "bg-success text-success-foreground",
    icon: CheckCircle,
    progress: 100,
  },
}

const OUTCOME_CONFIG = {
  overturned: {
    label: "Overturned",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle,
  },
  partially_overturned: {
    label: "Partially Overturned",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: CheckCircle,
  },
  upheld: {
    label: "Upheld",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: XCircle,
  },
}

const TYPE_LABELS = {
  reconsideration: "Reconsideration",
  formal_appeal: "Formal Appeal",
  external_review: "External Review",
}

export function AppealStatusCard({
  appeals,
  canCreateAppeal,
  onCreateAppeal,
  onSubmitAppeal,
  onRecordOutcome,
  onViewLetter,
}: AppealStatusCardProps) {
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const handleSubmit = async (appealId: string) => {
    setSubmittingId(appealId)
    try {
      await onSubmitAppeal(appealId)
    } finally {
      setSubmittingId(null)
    }
  }

  // Sort appeals by level
  const sortedAppeals = [...appeals].sort((a, b) => a.appealLevel - b.appealLevel)
  const latestAppeal = sortedAppeals[sortedAppeals.length - 1]
  const canCreateNextLevel =
    latestAppeal?.status === "decided" &&
    latestAppeal?.outcome === "upheld" &&
    latestAppeal?.appealLevel < 3

  if (appeals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Appeals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              No appeals have been filed for this denial.
            </p>
            {canCreateAppeal && (
              <Button onClick={onCreateAppeal} className="gap-2">
                <Send className="w-4 h-4" />
                Start Appeal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Appeals ({appeals.length})
        </CardTitle>
        {(canCreateAppeal || canCreateNextLevel) && (
          <Button
            size="sm"
            onClick={onCreateAppeal}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {canCreateNextLevel
              ? `Start Level ${(latestAppeal?.appealLevel || 0) + 1} Appeal`
              : "Start Appeal"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedAppeals.map((appeal) => {
          const statusConfig = STATUS_CONFIG[appeal.status]
          const outcomeConfig = appeal.outcome
            ? OUTCOME_CONFIG[appeal.outcome]
            : null
          const StatusIcon = statusConfig.icon
          const isSubmitting = submittingId === appeal._id

          return (
            <div
              key={appeal._id}
              className="border border-border rounded-lg p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Level {appeal.appealLevel}</Badge>
                  <Badge variant="secondary" className="capitalize">
                    {TYPE_LABELS[appeal.appealType]}
                  </Badge>
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {appeal.generatedAppealLetter && (
                      <DropdownMenuItem
                        onClick={() =>
                          onViewLetter(appeal._id, appeal.generatedAppealLetter!)
                        }
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Appeal Letter
                      </DropdownMenuItem>
                    )}
                    {appeal.status === "draft" && (
                      <DropdownMenuItem
                        onClick={() => handleSubmit(appeal._id)}
                        disabled={isSubmitting}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Mark as Submitted
                      </DropdownMenuItem>
                    )}
                    {appeal.status === "submitted" && (
                      <DropdownMenuItem onClick={() => onRecordOutcome(appeal._id)}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Record Outcome
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <Progress value={statusConfig.progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Draft</span>
                  <span>Submitted</span>
                  <span>In Review</span>
                  <span>Decided</span>
                </div>
              </div>

              {/* Outcome */}
              {outcomeConfig && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg border ${outcomeConfig.color}`}
                >
                  <outcomeConfig.icon className="w-5 h-5" />
                  <div>
                    <p className="font-medium">{outcomeConfig.label}</p>
                    {appeal.responseNotes && (
                      <p className="text-sm opacity-80">{appeal.responseNotes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Created: {formatDateTime(appeal.createdAt)}</span>
                {appeal.submittedAt && (
                  <span>Submitted: {formatDateTime(appeal.submittedAt)}</span>
                )}
                {appeal.responseReceivedAt && (
                  <span>
                    Response: {formatDateTime(appeal.responseReceivedAt)}
                  </span>
                )}
              </div>

              {/* Actions */}
              {appeal.status === "draft" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleSubmit(appeal._id)}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Mark as Submitted
                  </Button>
                </div>
              )}

              {appeal.status === "submitted" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRecordOutcome(appeal._id)}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Record Outcome
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
