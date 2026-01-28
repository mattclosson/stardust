import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  Phone,
  PhoneCall,
  Clock,
  UserCheck,
  Loader2,
  X,
  CheckCircle,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CallStatusBadge } from "./CallStatusBadge"
import { useState, useEffect } from "react"
import { logError } from "@/lib/logger"

interface ActiveCallBannerProps {
  callId: Id<"holdCalls">
  onClose?: () => void
}

export function ActiveCallBanner({ callId, onClose }: ActiveCallBannerProps) {
  const call = useQuery(api.holdCalls.getById, { callId })
  const cancelCall = useMutation(api.holdCalls.cancel)
  const completeCall = useMutation(api.holdCalls.complete)
  const bridgeCall = useAction(api.holdCalls.bridgeCall)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Update elapsed time every second when on hold
  useEffect(() => {
    if (!call || call.status !== "on_hold" || !call.holdStartedAt) return

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - call.holdStartedAt!) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [call?.status, call?.holdStartedAt])

  if (!call) return null

  // Don't show banner for ended calls
  if (["completed", "failed", "cancelled"].includes(call.status)) {
    return null
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await cancelCall({ callId })
      onClose?.()
    } finally {
      setIsCancelling(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // For real calls with Twilio, bridge the call to user's phone
      if (call?.twilioCallSid) {
        await bridgeCall({ callId })
      } else {
        // For simulated calls, just mark as completed
        await completeCall({
          callId,
          notes: "User connected with operator",
        })
        onClose?.()
      }
    } catch (error) {
      logError("Failed to connect call", error)
      // Still mark as completed for simulated calls on error
      await completeCall({
        callId,
        notes: "User connected with operator (manual)",
      })
      onClose?.()
    } finally {
      setIsConnecting(false)
    }
  }

  // Check if this is a real Twilio call
  const isRealCall = !!call?.twilioCallSid

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusIcon = () => {
    switch (call.status) {
      case "initiating":
      case "dialing":
        return <Loader2 className="w-5 h-5 animate-spin" />
      case "ivr_navigation":
        return <Phone className="w-5 h-5" />
      case "on_hold":
        return <Clock className="w-5 h-5" />
      case "operator_detected":
        return <UserCheck className="w-5 h-5" />
      case "user_connected":
        return <PhoneCall className="w-5 h-5" />
      default:
        return <Phone className="w-5 h-5" />
    }
  }

  const getStatusText = () => {
    switch (call.status) {
      case "initiating":
        return "Starting call..."
      case "dialing":
        return `Dialing ${call.payer?.name || "payer"}...`
      case "ivr_navigation":
        return "Navigating phone menu..."
      case "on_hold":
        return `On hold with ${call.payer?.name || "payer"}`
      case "operator_detected":
        return "Operator is ready!"
      case "user_connected":
        return "Connected to operator"
      default:
        return "Call in progress"
    }
  }

  const isOnHold = call.status === "on_hold"
  const isOperatorReady = call.status === "operator_detected"

  return (
    <Card
      className={`border-2 ${
        isOperatorReady
          ? "border-success bg-success/5 shadow-lg shadow-success/20"
          : "border-primary/50"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isOperatorReady
                  ? "bg-success text-success-foreground animate-pulse"
                  : isOnHold
                    ? "bg-warning/20 text-warning"
                    : "bg-primary/20 text-primary"
              }`}
            >
              {getStatusIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{getStatusText()}</p>
                <CallStatusBadge status={call.status} />
                {isRealCall && (
                  <Badge variant="outline" className="text-warning border-warning gap-1">
                    <Zap className="w-3 h-3" />
                    Live
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {call.claim
                  ? `Claim ${call.claim.claimNumber}`
                  : call.payer?.name || "Insurance call"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOnHold && (
              <div className="text-right mr-2">
                <p className="text-lg font-mono font-bold">
                  {formatTime(elapsedSeconds)}
                </p>
                <p className="text-xs text-muted-foreground">hold time</p>
              </div>
            )}

            {isOperatorReady && (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="gap-2 bg-success hover:bg-success/90"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Connect Now
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {isOnHold && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Estimated wait: 15-30 min</span>
              <span>{formatTime(elapsedSeconds)} elapsed</span>
            </div>
            <Progress value={Math.min((elapsedSeconds / 1800) * 100, 100)} className="h-1" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Wrapper component that fetches active calls for an organization
interface GlobalCallBannerProps {
  organizationId: Id<"organizations">
}

export function GlobalCallBanner({ organizationId }: GlobalCallBannerProps) {
  const activeCalls = useQuery(api.holdCalls.getActive, { organizationId })

  if (!activeCalls || activeCalls.length === 0) return null

  // Show the most recent active call
  const activeCall = activeCalls[0]

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <ActiveCallBanner callId={activeCall._id} />
    </div>
  )
}
