import { useNavigate, useLocation } from "@tanstack/react-router"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useSession } from "@/lib/auth-client"

interface AuthGuardProps {
  children: React.ReactNode
}

// Public routes that don't require authentication
const publicRoutes = ["/login", "/signup"]

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: session, isPending } = useSession()

  const isPublicRoute = publicRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  )

  useEffect(() => {
    // Don't redirect while loading
    if (isPending) return

    // If not authenticated and on a protected route, redirect to login
    if (!session?.user && !isPublicRoute) {
      navigate({ 
        to: "/login",
        search: { redirect: location.pathname },
      })
    }

    // If authenticated and on login/signup, redirect to home
    if (session?.user && isPublicRoute) {
      navigate({ to: "/" })
    }
  }, [session, isPending, isPublicRoute, location.pathname, navigate])

  // Show loading while checking auth
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!session?.user && !isPublicRoute) {
    return null
  }

  // Show nothing while redirecting authenticated users from auth pages
  if (session?.user && isPublicRoute) {
    return null
  }

  return <>{children}</>
}
