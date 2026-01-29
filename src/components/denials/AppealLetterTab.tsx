import { Sparkles, Copy, Edit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface AppealLetterTabProps {
  appealLetter: string
  isGenerating: boolean
  onAppealLetterChange: (value: string) => void
  onGenerateAppeal: () => void
}

export function AppealLetterTab({
  appealLetter,
  isGenerating,
  onAppealLetterChange,
  onGenerateAppeal,
}: AppealLetterTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI-Generated Appeal Letter</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateAppeal}
            disabled={isGenerating}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating
              ? "Generating..."
              : appealLetter
                ? "Regenerate"
                : "Generate with AI"}
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
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!appealLetter}
          >
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
            onChange={(e) => onAppealLetterChange(e.target.value)}
            className="min-h-[400px] font-mono text-sm"
            placeholder="Click 'Generate with AI' above to create a customized appeal letter based on this denial..."
          />
        </div>
      </CardContent>
    </Card>
  )
}
