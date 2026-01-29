import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import {
  Bell,
  Mail,
  Clock,
  AlertCircle,
  CheckSquare,
  FileText,
  Loader2,
  Check,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export const Route = createFileRoute("/settings/notifications")({
  component: NotificationsSettingsPage,
})

interface NotificationPreferences {
  emailNotifications: boolean
  taskAssignments: boolean
  taskDueDates: boolean
  claimStatusChanges: boolean
  denialAlerts: boolean
  appealDeadlines: boolean
  teamUpdates: boolean
}

const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  taskAssignments: true,
  taskDueDates: true,
  claimStatusChanges: true,
  denialAlerts: true,
  appealDeadlines: true,
  teamUpdates: false,
}

function NotificationsSettingsPage() {
  const currentUser = useQuery(api.team.getCurrentUser)
  const updatePreferences = useMutation(api.team.updateNotificationPreferences)

  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const isLoading = currentUser === undefined

  // Load preferences from user profile
  useEffect(() => {
    if (currentUser?.notificationPreferences) {
      setPreferences({
        ...defaultPreferences,
        ...currentUser.notificationPreferences,
      })
    }
  }, [currentUser])

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    setHasChanges(true)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updatePreferences({ preferences })
      setSaveSuccess(true)
      setHasChanges(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Failed to save preferences:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Notifications</h2>
          <p className="text-muted-foreground">Manage your notification preferences</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Notifications</h2>
          <p className="text-muted-foreground">Manage your notification preferences</p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Control whether you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email in addition to in-app alerts
              </p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={() => handleToggle("emailNotifications")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Task Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Task Notifications
          </CardTitle>
          <CardDescription>Notifications related to your assigned tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Task Assignments</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when a task is assigned to you
              </p>
            </div>
            <Switch
              checked={preferences.taskAssignments}
              onCheckedChange={() => handleToggle("taskAssignments")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Due Date Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive reminders when task due dates are approaching
              </p>
            </div>
            <Switch
              checked={preferences.taskDueDates}
              onCheckedChange={() => handleToggle("taskDueDates")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Claims & Denials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Claims & Denials
          </CardTitle>
          <CardDescription>Notifications about claim activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Claim Status Changes</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when claims you're working on change status
              </p>
            </div>
            <Switch
              checked={preferences.claimStatusChanges}
              onCheckedChange={() => handleToggle("claimStatusChanges")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Denial Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Be alerted when new denials are received
              </p>
            </div>
            <Switch
              checked={preferences.denialAlerts}
              onCheckedChange={() => handleToggle("denialAlerts")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Appeal Deadlines
              </Label>
              <p className="text-sm text-muted-foreground">
                Get warnings before appeal deadlines expire
              </p>
            </div>
            <Switch
              checked={preferences.appealDeadlines}
              onCheckedChange={() => handleToggle("appealDeadlines")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Team Updates
          </CardTitle>
          <CardDescription>Stay informed about team activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Team Activity</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when team members join or leave
              </p>
            </div>
            <Switch
              checked={preferences.teamUpdates}
              onCheckedChange={() => handleToggle("teamUpdates")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
