import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  Users,
  Mail,
  MoreHorizontal,
  UserPlus,
  Copy,
  Check,
  Clock,
  Shield,
  Building2,
  X,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InviteDialog } from "@/components/dialogs/InviteDialog"
import { OrgAssignmentDialog } from "@/components/dialogs/OrgAssignmentDialog"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/utils"

export const Route = createFileRoute("/settings/team")({
  component: TeamSettingsPage,
})

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "billing_specialist", label: "Billing Specialist" },
  { value: "coder", label: "Coder" },
  { value: "appeals_specialist", label: "Appeals Specialist" },
  { value: "viewer", label: "Viewer" },
]

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/10 text-red-500",
  supervisor: "bg-orange-500/10 text-orange-500",
  billing_specialist: "bg-blue-500/10 text-blue-500",
  coder: "bg-purple-500/10 text-purple-500",
  appeals_specialist: "bg-green-500/10 text-green-500",
  viewer: "bg-gray-500/10 text-gray-500",
}

interface TeamMember {
  _id: Id<"rcmUsers">
  firstName: string
  lastName: string
  email: string
  role: string
  status: string
  organizationCount: number
  assignments: Array<{
    _id: Id<"rcmUserAssignments">
    organizationId: Id<"organizations">
    organizationName: string
    isPrimary: boolean
    canView: boolean
    canEdit: boolean
    canManage: boolean
  }>
}

function TeamSettingsPage() {
  const teamMembers = useQuery(api.team.list)
  const pendingInvites = useQuery(api.team.getInvites)
  const currentUser = useQuery(api.team.getCurrentUser)
  const updateRole = useMutation(api.team.updateRole)
  const updateStatus = useMutation(api.team.updateStatus)
  const revokeInvite = useMutation(api.team.revokeInvite)

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [orgDialogOpen, setOrgDialogOpen] = useState(false)
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const isLoading = teamMembers === undefined || pendingInvites === undefined
  const isAdmin = currentUser?.role === "admin"
  const canManageTeam = currentUser?.role === "admin" || currentUser?.role === "supervisor"

  const handleRoleChange = async (memberId: Id<"rcmUsers">, newRole: string) => {
    try {
      await updateRole({
        rcmUserId: memberId,
        role: newRole as "admin" | "supervisor" | "billing_specialist" | "coder" | "appeals_specialist" | "viewer",
      })
    } catch (error) {
      console.error("Failed to update role:", error)
    }
  }

  const handleToggleStatus = async (member: TeamMember) => {
    if (member.status === "active") {
      setSelectedMember(member)
      setConfirmDisableOpen(true)
    } else {
      await updateStatus({
        rcmUserId: member._id,
        status: "active",
      })
    }
  }

  const confirmDisable = async () => {
    if (!selectedMember) return
    await updateStatus({
      rcmUserId: selectedMember._id,
      status: "disabled",
    })
  }

  const handleManageOrgs = (member: TeamMember) => {
    setSelectedMember(member)
    setOrgDialogOpen(true)
  }

  const handleCopyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleRevokeInvite = async (inviteId: Id<"invites">) => {
    try {
      await revokeInvite({ inviteId })
    } catch (error) {
      console.error("Failed to revoke invite:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Team Members</h2>
          <p className="text-muted-foreground">
            Manage your team and their access to organizations
          </p>
        </div>
        {canManageTeam && (
          <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Team Member
          </Button>
        )}
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Members
          </CardTitle>
          <CardDescription>
            {teamMembers?.filter(m => m.status === "active").length ?? 0} active team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organizations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers?.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell className="font-medium">
                      {member.firstName} {member.lastName}
                      {member._id === currentUser?._id && (
                        <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      {isAdmin && member._id !== currentUser?._id ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member._id, value)}
                        >
                          <SelectTrigger className="w-40 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={ROLE_COLORS[member.role] ?? "bg-gray-500/10"}>
                          {ROLE_OPTIONS.find(r => r.value === member.role)?.label ?? member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{member.organizationCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.status === "active" ? "default" : "secondary"}
                        className={member.status === "active" ? "bg-green-500/10 text-green-500" : ""}
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManageTeam && member._id !== currentUser?._id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleManageOrgs(member as TeamMember)}>
                              <Building2 className="w-4 h-4 mr-2" />
                              Manage Organizations
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(member as TeamMember)}>
                              {member.status === "active" ? (
                                <>
                                  <X className="w-4 h-4 mr-2" />
                                  Disable Account
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Enable Account
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {canManageTeam && pendingInvites && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Invites
            </CardTitle>
            <CardDescription>
              {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite._id}>
                    <TableCell>
                      {invite.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {invite.email}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Any email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[invite.role] ?? "bg-gray-500/10"}>
                        {ROLE_OPTIONS.find(r => r.value === invite.role)?.label ?? invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(new Date(invite.expiresAt).toISOString().split("T")[0])}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleCopyInviteLink(invite.token)}
                        >
                          {copiedToken === invite.token ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevokeInvite(invite._id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      {selectedMember && (
        <OrgAssignmentDialog
          open={orgDialogOpen}
          onOpenChange={setOrgDialogOpen}
          member={selectedMember}
        />
      )}

      <ConfirmDialog
        open={confirmDisableOpen}
        onOpenChange={setConfirmDisableOpen}
        title="Disable Team Member"
        description={`Are you sure you want to disable ${selectedMember?.firstName} ${selectedMember?.lastName}'s account? They will no longer be able to access the system.`}
        confirmText="Disable"
        variant="destructive"
        onConfirm={confirmDisable}
      />
    </div>
  )
}
