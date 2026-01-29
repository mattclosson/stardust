import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useOrganization } from "@/contexts/OrganizationContext"
import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plug,
  Plus,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react"

export const Route = createFileRoute("/settings/integrations")({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  const { selectedOrganization } = useOrganization()
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [showLogsDialog, setShowLogsDialog] = useState(false)

  // Queries
  const integration = useQuery(
    api.integrations.redox.getIntegration,
    selectedOrganization ? { organizationId: selectedOrganization } : "skip"
  )

  const syncLogs = useQuery(
    api.integrations.redox.getSyncLogs,
    selectedOrganization ? { organizationId: selectedOrganization, limit: 20 } : "skip"
  )

  // Mutations
  const createIntegration = useMutation(api.integrations.redox.createIntegration)
  const updateIntegration = useMutation(api.integrations.redox.updateIntegration)

  if (!selectedOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select an organization first</p>
      </div>
    )
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${import.meta.env.VITE_CONVEX_SITE_URL}/webhooks/redox/${selectedOrganization}`
    : ""

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground">
          Connect your EHR and practice management systems to automatically import claims and patient data.
        </p>
      </div>

      {/* Redox Integration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plug className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Redox</CardTitle>
                <CardDescription>
                  Connect to 90+ EHR systems including Epic, Cerner, NextGen, and more
                </CardDescription>
              </div>
            </div>
            {integration === undefined ? (
              <Skeleton className="h-6 w-20" />
            ) : integration ? (
              <Badge variant={integration.isActive ? "default" : "secondary"}>
                {integration.isActive ? "Active" : "Inactive"}
              </Badge>
            ) : (
              <Badge variant="outline">Not Connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : integration ? (
            <>
              {/* Integration Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {integration.isActive ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium">Disabled</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Synced</p>
                  <p className="text-sm font-medium mt-1">{integration.totalSynced || 0} records</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                  <p className="text-sm font-medium mt-1">
                    {integration.lastSyncAt
                      ? new Date(integration.lastSyncAt).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Last Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {integration.lastSyncStatus === "success" && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Success</span>
                      </>
                    )}
                    {integration.lastSyncStatus === "error" && (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium">Error</span>
                      </>
                    )}
                    {!integration.lastSyncStatus && (
                      <span className="text-sm font-medium text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="p-4 bg-muted/30 rounded-lg border">
                <Label className="text-xs text-muted-foreground">Webhook URL (configure in Redox dashboard)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-xs bg-background p-2 rounded border font-mono overflow-x-auto">
                    {webhookUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={integration.isActive}
                    onCheckedChange={async (checked) => {
                      await updateIntegration({
                        integrationId: integration._id,
                        isActive: checked,
                      })
                    }}
                  />
                  <Label className="text-sm">Enable integration</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLogsDialog(true)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    View Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSetupDialog(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // No integration setup yet
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 bg-muted rounded-full mb-4">
                <Plug className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Connect to Redox</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Redox connects to 90+ EHR systems. Once connected, patient demographics and
                charges will automatically flow into Stardust as draft claims.
              </p>
              <Button onClick={() => setShowSetupDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Set Up Integration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon: Direct Integrations */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Plug className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Direct EHR Integrations</CardTitle>
                <CardDescription>
                  Connect directly to NextGen, athenahealth, and other systems
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Direct integrations bypass Redox for lower costs at scale. Contact us to discuss
            your integration needs.
          </p>
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <SetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        organizationId={selectedOrganization}
        existingIntegration={integration}
        webhookUrl={webhookUrl}
        onSave={async (data) => {
          if (integration) {
            await updateIntegration({
              integrationId: integration._id,
              ...data,
            })
          } else {
            await createIntegration({
              organizationId: selectedOrganization,
              name: data.name || "Redox Integration",
              sourceId: data.sourceId,
              destinationId: data.destinationId,
            })
          }
          setShowSetupDialog(false)
        }}
      />

      {/* Logs Dialog */}
      <LogsDialog
        open={showLogsDialog}
        onOpenChange={setShowLogsDialog}
        logs={syncLogs || []}
      />
    </div>
  )
}

// Setup Dialog Component
function SetupDialog({
  open,
  onOpenChange,
  organizationId,
  existingIntegration,
  webhookUrl,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  existingIntegration: any
  webhookUrl: string
  onSave: (data: { name?: string; sourceId?: string; destinationId?: string }) => Promise<void>
}) {
  const [name, setName] = useState(existingIntegration?.name || "Redox Integration")
  const [sourceId, setSourceId] = useState(existingIntegration?.config?.sourceId || "")
  const [destinationId, setDestinationId] = useState(existingIntegration?.config?.destinationId || "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ name, sourceId, destinationId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingIntegration ? "Configure Redox Integration" : "Set Up Redox Integration"}
          </DialogTitle>
          <DialogDescription>
            Configure your Redox connection to start receiving patient and charge data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Integration Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Practice EHR"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceId">Redox Source ID</Label>
            <Input
              id="sourceId"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="From Redox dashboard"
            />
            <p className="text-xs text-muted-foreground">
              Find this in your Redox dashboard under Sources
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationId">Redox Destination ID</Label>
            <Input
              id="destinationId"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              placeholder="From Redox dashboard"
            />
            <p className="text-xs text-muted-foreground">
              Find this in your Redox dashboard under Destinations
            </p>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border">
            <Label className="text-xs text-muted-foreground">Your Webhook URL</Label>
            <p className="text-xs mt-1 mb-2 text-muted-foreground">
              Add this URL as a destination in your Redox dashboard
            </p>
            <code className="text-xs bg-background p-2 rounded border font-mono block overflow-x-auto">
              {webhookUrl}
            </code>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Setup Instructions</p>
                <ol className="mt-2 space-y-1 text-blue-800 dark:text-blue-200 list-decimal list-inside">
                  <li>Log into your Redox dashboard</li>
                  <li>Create a new destination with the webhook URL above</li>
                  <li>Subscribe to Financial.Transaction and PatientAdmin events</li>
                  <li>Copy the Source and Destination IDs here</li>
                  <li>Test the connection using Redox's test tools</li>
                </ol>
                <a
                  href="https://docs.redoxengine.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Redox Documentation
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : existingIntegration ? "Save Changes" : "Create Integration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Logs Dialog Component
function LogsDialog({
  open,
  onOpenChange,
  logs,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  logs: any[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sync Logs</DialogTitle>
          <DialogDescription>
            Recent integration activity and sync events
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sync events yet</p>
              <p className="text-sm text-muted-foreground">
                Events will appear here once data starts flowing from Redox
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.eventType}
                    </TableCell>
                    <TableCell>
                      {log.status === "success" && (
                        <Badge variant="default" className="bg-green-500">Success</Badge>
                      )}
                      {log.status === "error" && (
                        <Badge variant="destructive">Error</Badge>
                      )}
                      {log.status === "skipped" && (
                        <Badge variant="secondary">Skipped</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.entityType && (
                        <span className="capitalize">{log.entityType}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.errorMessage || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
