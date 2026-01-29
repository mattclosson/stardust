import { useState, useEffect, useRef, useCallback } from "react"

// PersonaPlex connection states
export type ConnectionState = 
  | "disconnected" 
  | "connecting" 
  | "connected" 
  | "error"

// Voice assistant states
export type VoiceState = 
  | "idle" 
  | "listening" 
  | "processing" 
  | "speaking"

export interface ClaimVoiceContext {
  claimNumber: string
  payerClaimNumber?: string
  patientName: string
  patientMrn: string
  payerName: string
  memberId: string
  groupNumber?: string
  dateOfService: string
  dateOfServiceEnd?: string
  totalCharges: number
  totalAllowed?: number
  totalPaid?: number
  totalAdjustments?: number
  totalPatientResponsibility?: number
  status: string
  priority?: string
  priorAuthNumber?: string
  diagnoses: string[]
  procedures: string[]
}

export interface UsePersonaPlexOptions {
  claimContext?: ClaimVoiceContext | null
  onTranscript?: (text: string, isFinal: boolean) => void
  onAssistantResponse?: (text: string) => void
  onError?: (error: Error) => void
}

export interface UsePersonaPlexReturn {
  connectionState: ConnectionState
  voiceState: VoiceState
  isConnected: boolean
  isMicrophoneEnabled: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  enableMicrophone: () => Promise<boolean>
  disableMicrophone: () => void
  audioLevel: number
}

// Audio configuration for PersonaPlex
const SAMPLE_RATE = 48000
const CHANNELS = 1
const BUFFER_SIZE = 4096

export function usePersonaPlex(options: UsePersonaPlexOptions = {}): UsePersonaPlexReturn {
  const { claimContext, onTranscript, onAssistantResponse, onError } = options

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  // Refs for audio/WebSocket management
  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingRef = useRef(false)

  // Environment variables
  const apiUrl = import.meta.env.VITE_PERSONAPLEX_API_URL || "http://localhost:8999"
  const wsUrl = import.meta.env.VITE_PERSONAPLEX_WS_URL || "ws://localhost:8999"

  // Create a session with claim context
  const createSession = useCallback(async (): Promise<string> => {
    const response = await fetch(`${apiUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_context: claimContext }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`)
    }

    const data = await response.json()
    return data.session_id
  }, [apiUrl, claimContext])

  // Delete session on disconnect
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await fetch(`${apiUrl}/sessions/${sessionId}`, { method: "DELETE" })
    } catch {
      // Ignore errors on cleanup
    }
  }, [apiUrl])

  // Play audio from the queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return

    const audioContext = audioContextRef.current
    if (!audioContext) return

    isPlayingRef.current = true
    setVoiceState("speaking")

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()
      if (!audioData) continue

      try {
        const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0))
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        
        await new Promise<void>((resolve) => {
          source.onended = () => resolve()
          source.start()
        })
      } catch (e) {
        console.error("Failed to play audio:", e)
      }
    }

    isPlayingRef.current = false
    setVoiceState(isMicrophoneEnabled ? "listening" : "idle")
  }, [isMicrophoneEnabled])

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data instanceof Blob) {
      // Binary audio data from assistant
      event.data.arrayBuffer().then((buffer) => {
        audioQueueRef.current.push(buffer)
        playNextAudio()
      })
    } else if (typeof event.data === "string") {
      try {
        const message = JSON.parse(event.data)
        
        switch (message.type) {
          case "transcript":
            // User's speech transcription
            onTranscript?.(message.text, message.is_final)
            if (message.is_final) {
              setVoiceState("processing")
            }
            break
          
          case "response":
            // Assistant's text response
            onAssistantResponse?.(message.text)
            break
          
          case "speaking_start":
            setVoiceState("speaking")
            break
          
          case "speaking_end":
            setVoiceState(isMicrophoneEnabled ? "listening" : "idle")
            break
          
          case "error":
            setError(message.message)
            onError?.(new Error(message.message))
            break
        }
      } catch {
        // Non-JSON message, ignore
      }
    }
  }, [onTranscript, onAssistantResponse, onError, isMicrophoneEnabled, playNextAudio])

  // Connect to PersonaPlex
  const connect = useCallback(async () => {
    if (connectionState === "connecting" || connectionState === "connected") {
      return
    }

    setConnectionState("connecting")
    setError(null)

    try {
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })

      // Create session with claim context
      const sessionId = await createSession()
      sessionIdRef.current = sessionId

      // Connect WebSocket
      const ws = new WebSocket(`${wsUrl}/ws/${sessionId}`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionState("connected")
        setVoiceState("idle")
      }

      ws.onmessage = handleMessage

      ws.onerror = (event) => {
        console.error("WebSocket error:", event)
        setError("Connection error")
        setConnectionState("error")
        onError?.(new Error("WebSocket connection error"))
      }

      ws.onclose = (event) => {
        if (event.code !== 1000) {
          setError(`Connection closed: ${event.reason || "Unknown reason"}`)
          setConnectionState("error")
        } else {
          setConnectionState("disconnected")
        }
        setVoiceState("idle")
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to connect")
      setError(err.message)
      setConnectionState("error")
      onError?.(err)
    }
  }, [connectionState, createSession, wsUrl, handleMessage, onError])

  // Disconnect from PersonaPlex
  const disconnect = useCallback(() => {
    // Clean up WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected")
      wsRef.current = null
    }

    // Delete session
    if (sessionIdRef.current) {
      deleteSession(sessionIdRef.current)
      sessionIdRef.current = null
    }

    // Clean up audio
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    audioQueueRef.current = []
    isPlayingRef.current = false

    setConnectionState("disconnected")
    setVoiceState("idle")
    setIsMicrophoneEnabled(false)
    setAudioLevel(0)
    setError(null)
  }, [deleteSession])

  // Enable microphone and start sending audio
  const enableMicrophone = useCallback(async (): Promise<boolean> => {
    if (!wsRef.current || connectionState !== "connected") {
      setError("Not connected")
      return false
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      mediaStreamRef.current = stream

      const audioContext = audioContextRef.current
      if (!audioContext) {
        throw new Error("Audio context not initialized")
      }

      // Create audio processing pipeline
      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      // Analyser for audio level visualization
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      // Processor to send audio data to WebSocket
      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS)
      processorRef.current = processor

      processor.onaudioprocess = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return
        }

        const inputData = event.inputBuffer.getChannelData(0)
        
        // Convert float32 to int16 for transmission
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }

        wsRef.current.send(int16Data.buffer)

        // Calculate audio level for visualization
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average / 255)
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsMicrophoneEnabled(true)
      setVoiceState("listening")
      return true
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to enable microphone")
      setError(err.message)
      onError?.(err)
      return false
    }
  }, [connectionState, onError])

  // Disable microphone
  const disableMicrophone = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    setIsMicrophoneEnabled(false)
    setVoiceState("idle")
    setAudioLevel(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connectionState,
    voiceState,
    isConnected: connectionState === "connected",
    isMicrophoneEnabled,
    error,
    connect,
    disconnect,
    enableMicrophone,
    disableMicrophone,
    audioLevel,
  }
}
