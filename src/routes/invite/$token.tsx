import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useSession } from "@/lib/auth-client"
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const Route = createFileRoute("/invite/$token")({
  component: InviteAcceptPage,
})

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  billing_specialist: "Billing Specialist",
  coder: "Coder",
  appeals_specialist: "Appeals Specialist",
  viewer: "Viewer",
}

function InviteAcceptPage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const { data: session, isPending: isSessionPending } = useSession()

  const invite = useQuery(api.team.getInviteByToken, { token })
  const acceptInvite = useMutation(api.team.acceptInvite)

  const [isAccepting, setIsAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLoading = invite === undefined || isSessionPending

  // Handle accepting the invite
  const handleAccept = async () => {
    setIsAccepting(true)
    setError(null)

    try {
      await acceptInvite({ token })
      setAccepted(true)
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate({ to: "/" })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite")
    } finally {
      setIsAccepting(false)
    }
  }

  // If the user is not logged in, redirect to signup with the invite token
  useEffect(() => {
    if (!isSessionPending && !session?.user && invite?.isValid) {
      navigate({
        to: "/signup",
        search: { invite: token },
      })
    }
  }, [isSessionPending, session, invite, token, navigate])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading invite...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid or not found
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Invalid Invite</h2>
            <p className="text-muted-foreground">
              This invite link is invalid or has been removed.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Expired
  if (invite.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-semibold">Invite Expired</h2>
            <p className="text-muted-foreground">
              This invite has expired. Please contact your team admin for a new invite.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Already used
  if (invite.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Invite Already Used</h2>
            <p className="text-muted-foreground">
              This invite has already been used.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold">Welcome to the Team!</h2>
            <p className="text-muted-foreground">
              You've successfully joined {invite.companyName}. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main accept view (for logged-in users)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join a team
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Company info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Company</span>
              <span className="font-medium">{invite.companyName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="secondary">
                {ROLE_LABELS[invite.role] ?? invite.role}
              </Badge>
            </div>
            {invite.email && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">For</span>
                <span className="text-sm">{invite.email}</span>
              </div>
            )}
          </div>

          {/* Logged in as */}
          {session?.user && (
            <div className="text-center text-sm text-muted-foreground">
              Joining as <span className="font-medium text-foreground">{session.user.email}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Accept Invite"
            )}
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link to="/">Cancel</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
