import { ConvexReactClient } from "convex/react"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ReactNode } from "react"
import { authClient } from "./auth-client"

// Initialize the Convex client
const convexUrl = import.meta.env.VITE_CONVEX_URL

export const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

// Convex Provider wrapper component with Better Auth integration
export function ConvexClientProvider({ 
  children,
  initialToken,
}: { 
  children: ReactNode
  initialToken?: string | null
}) {
  if (!convex) {
    // Return children without Convex if URL is not configured
    // This allows the app to run in demo mode with mock data
    return <>{children}</>
  }

  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  )
}
