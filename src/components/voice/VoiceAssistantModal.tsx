import { useState, useEffect, useCallback } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePersonaPlex, VoiceState } from "@/hooks/usePersonaPlex"
import { PulsingOrb, AudioVisualizer } from "./AudioVisualizer"
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceAssistantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  claimId: Id<"claims">
}

interface TranscriptEntry {
  id: string
  text: string
  speaker: "user" | "assistant"
  timestamp: Date
}

export function VoiceAssistantModal({
  open,
  onOpenChange,
  claimId,
}: VoiceAssistantModalProps) {
  // Fetch claim context for voice assistant
  const claimContext = useQuery(api.claims.getVoiceContext, { claimId })

  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [currentUserText, setCurrentUserText] = useState("")

  // PersonaPlex hook
  const {
    connectionState,
    voiceState,
    isConnected,
    isMicrophoneEnabled,
    error,
    connect,
    disconnect,
    enableMicrophone,
    disableMicrophone,
    audioLevel,
  } = usePersonaPlex({
    claimContext,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setTranscript((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            text,
            speaker: "user",
            timestamp: new Date(),
          },
        ])
        setCurrentUserText("")
      } else {
        setCurrentUserText(text)
      }
    },
    onAssistantResponse: (text) => {
      setTranscript((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          text,
          speaker: "assistant",
          timestamp: new Date(),
        },
      ])
    },
    onError: (err) => {
      console.error("PersonaPlex error:", err)
    },
  })

  // Auto-connect when modal opens
  useEffect(() => {
    if (open && claimContext && connectionState === "disconnected") {
      connect()
    }
  }, [open, claimContext, connectionState, connect])

  // Cleanup when modal closes
  useEffect(() => {
    if (!open && isConnected) {
      disconnect()
      setTranscript([])
      setCurrentUserText("")
    }
  }, [open, isConnected, disconnect])

  // Handle microphone toggle
  const handleMicrophoneToggle = useCallback(async () => {
    if (isMicrophoneEnabled) {
      disableMicrophone()
    } else {
      await enableMicrophone()
    }
  }, [isMicrophoneEnabled, enableMicrophone, disableMicrophone])

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    disconnect()
    onOpenChange(false)
  }, [disconnect, onOpenChange])

  // Get state label
  const getStateLabel = (state: VoiceState) => {
    switch (state) {
      case "listening":
        return "Listening..."
      case "processing":
        return "Processing..."
      case "speaking":
        return "Speaking..."
      default:
        return "Ready"
    }
  }

  // Get state badge variant
  const getStateBadgeVariant = (state: VoiceState) => {
    switch (state) {
      case "listening":
        return "default"
      case "processing":
        return "secondary"
      case "speaking":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Voice Assistant
            {isConnected && (
              <Badge variant={getStateBadgeVariant(voiceState)}>
                {getStateLabel(voiceState)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {claimContext
              ? `Ask questions about claim ${claimContext.claimNumber}`
              : "Loading claim data..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Claim context summary */}
          {claimContext && (
            <div className="rounded-lg border border-white/10 bg-muted/50 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Patient:</span>{" "}
                  <span className="font-medium">{claimContext.patientName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Member ID:</span>{" "}
                  <span className="font-medium">{claimContext.memberId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Payer:</span>{" "}
                  <span className="font-medium">{claimContext.payerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant="outline" className="ml-1">
                    {claimContext.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Connection state */}
          {connectionState === "connecting" && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Connecting to voice assistant...</span>
            </div>
          )}

          {connectionState === "error" && (
            <div className="flex items-center justify-center gap-2 py-8 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error || "Connection failed"}</span>
            </div>
          )}

          {/* Voice interface */}
          {isConnected && (
            <>
              {/* Pulsing orb visualization */}
              <div className="flex justify-center py-6">
                <PulsingOrb
                  isActive={isMicrophoneEnabled}
                  audioLevel={audioLevel}
                  state={voiceState}
                />
              </div>

              {/* Audio level bars */}
              <div className="flex justify-center">
                <AudioVisualizer
                  audioLevel={audioLevel}
                  isActive={isMicrophoneEnabled && voiceState === "listening"}
                  barCount={9}
                  className="h-12"
                />
              </div>

              {/* Transcript */}
              <div className="rounded-lg border border-white/10 bg-background/50">
                <ScrollArea className="h-48 p-4">
                  {transcript.length === 0 && !currentUserText && (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {isMicrophoneEnabled
                        ? "Start speaking to ask about this claim..."
                        : "Click the microphone to start talking"}
                    </div>
                  )}

                  <div className="space-y-3">
                    {transcript.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex",
                          entry.speaker === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                            entry.speaker === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-muted text-foreground"
                          )}
                        >
                          {entry.text}
                        </div>
                      </div>
                    ))}

                    {/* Current user speech (interim) */}
                    {currentUserText && (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-lg bg-blue-600/50 px-3 py-2 text-sm text-white/80">
                          {currentUserText}
                          <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-white/60" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  size="lg"
                  variant={isMicrophoneEnabled ? "default" : "outline"}
                  onClick={handleMicrophoneToggle}
                  className={cn(
                    "h-14 w-14 rounded-full",
                    isMicrophoneEnabled && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {isMicrophoneEnabled ? (
                    <Mic className="h-6 w-6" />
                  ) : (
                    <MicOff className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleDisconnect}
                  className="h-14 w-14 rounded-full"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>

              {/* Microphone status */}
              <p className="text-center text-xs text-muted-foreground">
                {isMicrophoneEnabled
                  ? "Microphone is active. Speak naturally."
                  : "Click the microphone button to start talking."}
              </p>
            </>
          )}

          {/* Not connected state */}
          {connectionState === "disconnected" && claimContext && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Button onClick={connect} size="lg" className="gap-2">
                <Phone className="h-5 w-5" />
                Start Voice Assistant
              </Button>
              <p className="text-sm text-muted-foreground">
                Click to connect and start asking questions about this claim.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
