import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
} from "@/components/ui/dialog"
import { logError } from "@/lib/logger"

interface CreateAppealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  denialCode: string
  claimNumber: string
  onCreateAppeal: (data: {
    appealLevel: number
    appealType: "reconsideration" | "formal_appeal" | "external_review"
    submissionMethod: "electronic" | "fax" | "mail" | "portal"
    generatedAppealLetter?: string
  }) => Promise<void>
}

export function CreateAppealDialog({
  open,
  onOpenChange,
  denialCode,
  claimNumber,
  onCreateAppeal,
}: CreateAppealDialogProps) {
  const [appealType, setAppealType] = useState<"reconsideration" | "formal_appeal" | "external_review">("reconsideration")
  const [submissionMethod, setSubmissionMethod] = useState<"electronic" | "fax" | "mail" | "portal">("electronic")
  const [appealLetter, setAppealLetter] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await onCreateAppeal({
        appealLevel: 1,
        appealType,
        submissionMethod,
        generatedAppealLetter: appealLetter || undefined,
      })
      onOpenChange(false)
      // Reset form
      setAppealType("reconsideration")
      setSubmissionMethod("electronic")
      setAppealLetter("")
    } catch (error) {
      logError("Failed to create appeal", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start Appeal</DialogTitle>
          <DialogDescription>
            Create an appeal for denial {denialCode} on claim {claimNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="appealType">Appeal Type</Label>
            <Select value={appealType} onValueChange={(v) => setAppealType(v as typeof appealType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select appeal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reconsideration">Reconsideration</SelectItem>
                <SelectItem value="formal_appeal">Formal Appeal</SelectItem>
                <SelectItem value="external_review">External Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="submissionMethod">Submission Method</Label>
            <Select value={submissionMethod} onValueChange={(v) => setSubmissionMethod(v as typeof submissionMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Select submission method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronic">Electronic</SelectItem>
                <SelectItem value="portal">Payer Portal</SelectItem>
                <SelectItem value="fax">Fax</SelectItem>
                <SelectItem value="mail">Mail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appealLetter">Appeal Letter (optional)</Label>
            <Textarea
              id="appealLetter"
              placeholder="Enter or paste appeal letter content..."
              value={appealLetter}
              onChange={(e) => setAppealLetter(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              You can also generate an appeal letter using AI on the denial detail page.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Appeal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
