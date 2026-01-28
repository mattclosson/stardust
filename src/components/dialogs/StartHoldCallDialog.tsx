import { useState } from "react"
import { useMutation, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Phone, Loader2, Clock, Info, AlertTriangle, Zap, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
import { useSession } from "@/lib/auth-client"
import type { CallPurpose } from "@/types"

// Check if real calls are enabled via environment variable
const ENABLE_REAL_CALLS = import.meta.env.VITE_ENABLE_REAL_CALLS === "true"

interface StartHoldCallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: Id<"organizations">
  payerId: Id<"payers">
  payerName: string
  payerPhone?: string
  claimId?: Id<"claims">
  claimNumber?: string
  denialId?: Id<"denials">
  denialCode?: string
}

export function StartHoldCallDialog({
  open,
  onOpenChange,
  organizationId,
  payerId,
  payerName,
  payerPhone,
  claimId,
  claimNumber,
  denialId,
  denialCode,
}: StartHoldCallDialogProps) {
  const { data: session } = useSession()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useRealCall, setUseRealCall] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [callPurpose, setCallPurpose] = useState<CallPurpose>(
    // Default based on context
    denialId ? "appeal" : claimId ? "claims_status" : "general"
  )

  const initiateCall = useMutation(api.holdCalls.initiate)
  const simulateCall = useAction(api.holdCalls.simulateCall)
  const startRealCall = useAction(api.holdCalls.startRealCall)

  // Get user ID from session for call initiation
  const userId = session?.user?.id ?? "unknown"

  const handleStart = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number")
      return
    }

    if (useRealCall && !consentGiven) {
      setError("Please acknowledge that this will place a real phone call")
      return
    }

    setIsStarting(true)
    setError(null)

    try {
      const { callId } = await initiateCall({
        organizationId,
        payerId,
        claimId,
        denialId,
        userPhoneNumber: phoneNumber,
        initiatedBy: userId,
        callPurpose,
      })

      // Start either real call or simulation
      if (useRealCall && ENABLE_REAL_CALLS) {
        await startRealCall({ callId })
      } else {
        await simulateCall({ callId })
      }

      onOpenChange(false)
      setPhoneNumber("")
      setConsentGiven(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start call")
    } finally {
      setIsStarting(false)
    }
  }

  const formatPhoneForDisplay = (phone?: string) => {
    if (!phone) return "No phone on file"
    // Simple formatting for display
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call {payerName}
          </DialogTitle>
          <DialogDescription>
            We'll dial the insurance company and wait on hold for you.
            When an operator answers, we'll alert you to connect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Call mode indicator */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              {useRealCall && ENABLE_REAL_CALLS ? (
                <>
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">Real Call Mode</span>
                  <Badge variant="outline" className="text-warning border-warning">
                    Live
                  </Badge>
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Simulation Mode</span>
                  <Badge variant="secondary">Demo</Badge>
                </>
              )}
            </div>
            {ENABLE_REAL_CALLS && (
              <div className="flex items-center gap-2">
                <Label htmlFor="real-call" className="text-xs text-muted-foreground">
                  Use real call
                </Label>
                <Switch
                  id="real-call"
                  checked={useRealCall}
                  onCheckedChange={setUseRealCall}
                />
              </div>
            )}
          </div>

          {/* Call context */}
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Calling:</span>
              <span className="font-medium">{formatPhoneForDisplay(payerPhone)}</span>
            </div>
            {claimNumber && (
              <div className="flex items-center gap-2 text-sm">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Regarding claim:</span>
                <span className="font-mono font-medium">{claimNumber}</span>
              </div>
            )}
            {denialCode && (
              <div className="flex items-center gap-2 text-sm">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Denial code:</span>
                <span className="font-mono font-medium">{denialCode}</span>
              </div>
            )}
          </div>

          {/* Call purpose selector */}
          <div className="space-y-2">
            <Label htmlFor="call-purpose">Call Purpose</Label>
            <Select value={callPurpose} onValueChange={(value) => setCallPurpose(value as CallPurpose)}>
              <SelectTrigger id="call-purpose">
                <SelectValue placeholder="Select reason for call" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claims_status">Claim Status Inquiry</SelectItem>
                <SelectItem value="eligibility">Eligibility & Benefits</SelectItem>
                <SelectItem value="prior_auth">Prior Authorization</SelectItem>
                <SelectItem value="appeal">Appeals & Disputes</SelectItem>
                <SelectItem value="general">General Inquiry</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This helps us navigate the phone menu automatically
            </p>
          </div>

          {/* Estimated wait time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Estimated wait: 15-30 minutes</span>
          </div>

          {/* Phone number input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Your phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll call this number when an operator is ready to speak with you
            </p>
          </div>

          {/* Real call consent */}
          {useRealCall && ENABLE_REAL_CALLS && (
            <div className="rounded-lg border border-warning/50 bg-warning/5 p-3 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Real Phone Call</p>
                  <p className="text-muted-foreground">
                    This will place an actual phone call to {payerName}. 
                    Standard calling rates may apply via Twilio.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                />
                <Label htmlFor="consent" className="text-sm">
                  I understand this will place a real phone call
                </Label>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!payerPhone && (
            <p className="text-sm text-warning">
              Note: This payer doesn't have a phone number on file. The call will be simulated.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={!phoneNumber.trim() || isStarting}
            className="gap-2"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Start Holding
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
