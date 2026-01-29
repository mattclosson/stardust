import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AudioVisualizerProps {
  audioLevel: number
  isActive: boolean
  className?: string
  barCount?: number
}

export function AudioVisualizer({
  audioLevel,
  isActive,
  className,
  barCount = 5,
}: AudioVisualizerProps) {
  const barsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    if (!isActive) {
      // Reset all bars when inactive
      barsRef.current.forEach((bar) => {
        if (bar) {
          bar.style.height = "4px"
        }
      })
      return
    }

    // Animate bars based on audio level
    barsRef.current.forEach((bar, index) => {
      if (!bar) return

      // Add some variation between bars
      const variation = Math.sin((index / barCount) * Math.PI) * 0.3 + 0.7
      const randomFactor = 0.8 + Math.random() * 0.4
      const height = Math.max(4, audioLevel * 48 * variation * randomFactor)

      bar.style.height = `${height}px`
    })
  }, [audioLevel, isActive, barCount])

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1",
        className
      )}
      role="img"
      aria-label={isActive ? "Audio active" : "Audio inactive"}
    >
      {Array.from({ length: barCount }).map((_, index) => (
        <div
          key={index}
          ref={(el) => {
            if (el) barsRef.current[index] = el
          }}
          className={cn(
            "w-1 rounded-full transition-all duration-75",
            isActive
              ? "bg-linear-to-t from-blue-500 to-blue-400"
              : "bg-muted"
          )}
          style={{ height: "4px" }}
        />
      ))}
    </div>
  )
}

interface PulsingOrbProps {
  isActive: boolean
  audioLevel: number
  state: "idle" | "listening" | "processing" | "speaking"
  className?: string
}

export function PulsingOrb({
  isActive,
  audioLevel,
  state,
  className,
}: PulsingOrbProps) {
  // Calculate scale based on audio level
  const scale = isActive ? 1 + audioLevel * 0.3 : 1

  // Get color based on state
  const getStateColor = () => {
    switch (state) {
      case "listening":
        return "from-blue-500 to-blue-600"
      case "processing":
        return "from-amber-500 to-amber-600"
      case "speaking":
        return "from-green-500 to-green-600"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Outer glow */}
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-linear-to-br opacity-30 blur-xl transition-all duration-150",
          getStateColor(),
          isActive && "animate-pulse"
        )}
        style={{ transform: `scale(${scale * 1.5})` }}
      />

      {/* Main orb */}
      <div
        className={cn(
          "relative h-24 w-24 rounded-full bg-linear-to-br shadow-lg transition-all duration-150",
          getStateColor()
        )}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Inner highlight */}
        <div className="absolute left-1/4 top-1/4 h-8 w-8 rounded-full bg-white/30 blur-sm" />

        {/* State indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          {state === "processing" && (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
        </div>
      </div>
    </div>
  )
}
