import { useState } from "react"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RecordOutcomeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appealLevel: number
  onRecordOutcome: (outcome: {
    outcome: "overturned" | "partially_overturned" | "upheld"
    responseNotes?: string
  }) => Promise<void>
}

export function RecordOutcomeDialog({
  open,
  onOpenChange,
  appealLevel,
  onRecordOutcome,
}: RecordOutcomeDialogProps) {
  const [outcome, setOutcome] = useState<
    "overturned" | "partially_overturned" | "upheld" | null
  >(null)
  const [responseNotes, setResponseNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!outcome) return

    setIsSubmitting(true)
    try {
      await onRecordOutcome({
        outcome,
        responseNotes: responseNotes || undefined,
      })
      onOpenChange(false)
      // Reset form
      setOutcome(null)
      setResponseNotes("")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form on close
      setOutcome(null)
      setResponseNotes("")
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Appeal Outcome</DialogTitle>
          <DialogDescription>
            Record the payer's decision on the Level {appealLevel} appeal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Payer Decision</Label>
            <RadioGroup
              value={outcome || ""}
              onValueChange={(v) =>
                setOutcome(v as "overturned" | "partially_overturned" | "upheld")
              }
              className="space-y-2"
            >
              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  outcome === "overturned"
                    ? "border-success bg-success/5"
                    : "border-border hover:border-success/50"
                }`}
                onClick={() => setOutcome("overturned")}
              >
                <RadioGroupItem value="overturned" id="overturned" />
                <div className="flex items-center gap-2 flex-1">
                  <CheckCircle
                    className={`w-5 h-5 ${
                      outcome === "overturned"
                        ? "text-success"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <Label
                      htmlFor="overturned"
                      className="cursor-pointer font-medium"
                    >
                      Overturned
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Payer reversed the denial - claim will be paid
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  outcome === "partially_overturned"
                    ? "border-warning bg-warning/5"
                    : "border-border hover:border-warning/50"
                }`}
                onClick={() => setOutcome("partially_overturned")}
              >
                <RadioGroupItem
                  value="partially_overturned"
                  id="partially_overturned"
                />
                <div className="flex items-center gap-2 flex-1">
                  <AlertCircle
                    className={`w-5 h-5 ${
                      outcome === "partially_overturned"
                        ? "text-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <Label
                      htmlFor="partially_overturned"
                      className="cursor-pointer font-medium"
                    >
                      Partially Overturned
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Payer approved some line items but not all
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  outcome === "upheld"
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-destructive/50"
                }`}
                onClick={() => setOutcome("upheld")}
              >
                <RadioGroupItem value="upheld" id="upheld" />
                <div className="flex items-center gap-2 flex-1">
                  <XCircle
                    className={`w-5 h-5 ${
                      outcome === "upheld"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <Label htmlFor="upheld" className="cursor-pointer font-medium">
                      Upheld
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Payer maintained the denial - consider Level{" "}
                      {appealLevel + 1} appeal
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responseNotes">Response Notes (optional)</Label>
            <Textarea
              id="responseNotes"
              placeholder="Enter any notes about the payer's response..."
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!outcome || isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Record Outcome
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
