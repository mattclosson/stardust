import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Sparkles } from "lucide-react"
import { signUp, signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { logError } from "@/lib/logger"

// Define search params type
type SignupSearch = {
  invite?: string
}

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  validateSearch: (search: Record<string, unknown>): SignupSearch => {
    return {
      invite: typeof search.invite === "string" ? search.invite : undefined,
    }
  },
})

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  billing_specialist: "Billing Specialist",
  coder: "Coder",
  appeals_specialist: "Appeals Specialist",
  viewer: "Viewer",
}

function SignupPage() {
  const navigate = useNavigate()
  const { invite: inviteToken } = Route.useSearch()

  // Fetch invite details if token is present
  const invite = useQuery(
    api.team.getInviteByToken,
    inviteToken ? { token: inviteToken } : "skip"
  )
  const acceptInvite = useMutation(api.team.acceptInvite)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Pre-fill email if invite specifies one
  useEffect(() => {
    if (invite?.email && !email) {
      setEmail(invite.email)
    }
  }, [invite?.email])

  const validatePassword = () => {
    if (password.length < 8) {
      return "Password must be at least 8 characters"
    }
    if (password !== confirmPassword) {
      return "Passwords do not match"
    }
    return null
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const passwordError = validatePassword()
    if (passwordError) {
      setError(passwordError)
      return
    }

    setIsLoading(true)

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      })

      if (result.error) {
        setError(result.error.message || "Failed to create account")
        return
      }

      // If there's a valid invite, accept it
      if (inviteToken && invite?.isValid) {
        try {
          await acceptInvite({ token: inviteToken })
        } catch (inviteErr) {
          logError("Failed to accept invite", inviteErr)
          // Still show success but note the invite issue
          setError("Account created, but failed to join the team. Please try the invite link again after logging in.")
        }
      }

      setSuccess(true)
      // Auto redirect after signup
      setTimeout(() => {
        navigate({ to: "/" })
      }, 1500)
    } catch (err) {
      setError("An unexpected error occurred")
      logError("Email signup failed", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Store the invite token in localStorage so we can use it after OAuth redirect
      if (inviteToken) {
        localStorage.setItem("pendingInviteToken", inviteToken)
      }

      await signIn.social({
        provider: "google",
        callbackURL: inviteToken ? `/invite/${inviteToken}` : "/",
      })
    } catch (err) {
      setError("Failed to sign up with Google")
      logError("Google signup failed", err)
      setIsLoading(false)
    }
  }

  // Check if invite is invalid or expired
  const hasInvalidInvite = inviteToken && invite && !invite.isValid

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold">Account Created!</h2>
            <p className="text-muted-foreground">
              {invite?.isValid
                ? `You've joined ${invite.companyName}. Redirecting to dashboard...`
                : "Your account has been created successfully. Redirecting you to the dashboard..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            {invite?.isValid
              ? `Join ${invite.companyName} as ${ROLE_LABELS[invite.role] ?? invite.role}`
              : "Get started with Stardust"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite Banner */}
          {invite?.isValid && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">You've been invited!</p>
                <p className="text-xs opacity-80">
                  Joining as <Badge variant="secondary" className="ml-1">{ROLE_LABELS[invite.role]}</Badge>
                </p>
              </div>
            </div>
          )}

          {/* Invalid Invite Warning */}
          {hasInvalidInvite && (
            <div className="flex items-center gap-2 p-3 text-sm text-warning bg-warning/10 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {invite.isExpired
                  ? "This invite has expired. You can still create an account."
                  : "This invite is no longer valid. You can still create an account."}
              </span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Google Sign Up */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Email Sign Up Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  disabled={isLoading || (invite?.email !== undefined && invite.email !== "")}
                />
              </div>
              {invite?.email && (
                <p className="text-xs text-muted-foreground">
                  This invite is reserved for this email address.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : invite?.isValid ? (
                "Create account & join team"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link to="/login" className="underline hover:text-primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/login" className="underline hover:text-primary">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
