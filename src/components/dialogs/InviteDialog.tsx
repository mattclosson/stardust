import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Loader2, Copy, Check, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin", description: "Full access to all features" },
  { value: "supervisor", label: "Supervisor", description: "Can manage team and workflows" },
  { value: "billing_specialist", label: "Billing Specialist", description: "Claims and billing work" },
  { value: "coder", label: "Coder", description: "Coding and coding reviews" },
  { value: "appeals_specialist", label: "Appeals Specialist", description: "Denials and appeals" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
]

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
]

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const createInvite = useMutation(api.team.createInvite)

  const [role, setRole] = useState<string>("billing_specialist")
  const [email, setEmail] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("7")
  const [isLoading, setIsLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const result = await createInvite({
        role: role as "admin" | "supervisor" | "billing_specialist" | "coder" | "appeals_specialist" | "viewer",
        email: email || undefined,
        expiresInDays: parseInt(expiresInDays),
      })
      const inviteUrl = `${window.location.origin}/invite/${result.token}`
      setGeneratedLink(inviteUrl)
    } catch (error) {
      logError("Failed to create invite", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after animation
    setTimeout(() => {
      setRole("billing_specialist")
      setEmail("")
      setExpiresInDays("7")
      setGeneratedLink(null)
      setCopied(false)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Generate an invite link to add a new team member.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          // Configuration form
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, the invite will be reserved for this email address.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Link Expires In</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Generated link view
          <>
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm text-muted-foreground">Invite link generated!</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generatedLink}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Role:</span>{" "}
                  {ROLE_OPTIONS.find((r) => r.value === role)?.label}
                </p>
                {email && (
                  <p>
                    <span className="text-muted-foreground">For:</span> {email}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Expires in:</span>{" "}
                  {EXPIRY_OPTIONS.find((e) => e.value === expiresInDays)?.label}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
