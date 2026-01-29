import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  Building2,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  FileText,
  Users,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"

export const Route = createFileRoute("/settings/organizations")({
  component: OrganizationsSettingsPage,
})

const FACILITY_TYPES = [
  { value: "physician_office", label: "Physician Office" },
  { value: "hospital_outpatient", label: "Hospital Outpatient" },
  { value: "asc", label: "Ambulatory Surgery Center" },
  { value: "clinic", label: "Clinic" },
]

const FACILITY_COLORS: Record<string, string> = {
  physician_office: "bg-blue-500/10 text-blue-500",
  hospital_outpatient: "bg-purple-500/10 text-purple-500",
  asc: "bg-green-500/10 text-green-500",
  clinic: "bg-orange-500/10 text-orange-500",
}

type FacilityType = "physician_office" | "hospital_outpatient" | "asc" | "clinic"

interface OrganizationFormData {
  name: string
  npi: string
  taxId: string
  specialty: string
  facilityType: FacilityType
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    zip: string
  }
}

const emptyFormData: OrganizationFormData = {
  name: "",
  npi: "",
  taxId: "",
  specialty: "",
  facilityType: "physician_office",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
  },
}

function OrganizationsSettingsPage() {
  const organizations = useQuery(api.organizations.listAll)
  const currentUser = useQuery(api.team.getCurrentUser)
  const createOrg = useMutation(api.organizations.create)
  const updateOrg = useMutation(api.organizations.update)
  const deleteOrg = useMutation(api.organizations.remove)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Id<"organizations"> | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"organizations"> | null>(null)
  const [formData, setFormData] = useState<OrganizationFormData>(emptyFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLoading = organizations === undefined
  const isAdmin = currentUser?.role === "admin"

  const handleOpenCreate = () => {
    setEditingOrg(null)
    setFormData(emptyFormData)
    setDialogOpen(true)
  }

  const handleOpenEdit = (org: NonNullable<typeof organizations>[number]) => {
    setEditingOrg(org._id)
    setFormData({
      name: org.name,
      npi: org.npi,
      taxId: org.taxId,
      specialty: org.specialty,
      facilityType: org.facilityType,
      address: {
        line1: org.address.line1,
        line2: org.address.line2 ?? "",
        city: org.address.city,
        state: org.address.state,
        zip: org.address.zip,
      },
    })
    setDialogOpen(true)
  }

  const handleOpenDelete = (orgId: Id<"organizations">) => {
    setSelectedOrgId(orgId)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const addressData = {
        ...formData.address,
        line2: formData.address.line2 || undefined,
      }

      if (editingOrg) {
        await updateOrg({
          organizationId: editingOrg,
          ...formData,
          address: addressData,
        })
      } else {
        await createOrg({
          ...formData,
          address: addressData,
        })
      }
      setDialogOpen(false)
      setFormData(emptyFormData)
      setEditingOrg(null)
    } catch (error) {
      console.error("Failed to save organization:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedOrgId) return
    await deleteOrg({ organizationId: selectedOrgId })
    setSelectedOrgId(null)
  }

  const selectedOrg = organizations?.find((o) => o._id === selectedOrgId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Organizations</h2>
          <p className="text-muted-foreground">
            Manage healthcare organizations your team works with
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Organization
          </Button>
        )}
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            All Organizations
          </CardTitle>
          <CardDescription>
            {organizations?.length ?? 0} organization{(organizations?.length ?? 0) !== 1 ? "s" : ""} in your RCM company
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : organizations?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No organizations yet</p>
              {isAdmin && (
                <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                  Add your first organization
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>NPI</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations?.map((org) => (
                  <TableRow key={org._id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge className={FACILITY_COLORS[org.facilityType] ?? "bg-gray-500/10"}>
                        {FACILITY_TYPES.find((t) => t.value === org.facilityType)?.label ?? org.facilityType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{org.specialty}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{org.npi}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {org.address.city}, {org.address.state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{org.userCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{org.claimCount ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(org)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenDelete(org._id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingOrg ? "Edit Organization" : "Add Organization"}</DialogTitle>
            <DialogDescription>
              {editingOrg
                ? "Update the organization details below."
                : "Enter the details for the new healthcare organization."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Health Center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Family Medicine"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facilityType">Facility Type</Label>
                <Select
                  value={formData.facilityType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, facilityType: value as FacilityType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="npi">NPI</Label>
                <Input
                  id="npi"
                  value={formData.npi}
                  onChange={(e) => setFormData({ ...formData, npi: e.target.value })}
                  placeholder="1234567890"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="12-3456789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <div className="grid gap-3">
                <Input
                  value={formData.address.line1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, line1: e.target.value },
                    })
                  }
                  placeholder="Street Address"
                />
                <Input
                  value={formData.address.line2 ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, line2: e.target.value },
                    })
                  }
                  placeholder="Suite, Unit, etc. (optional)"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                    placeholder="City"
                  />
                  <Input
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                    placeholder="State"
                    maxLength={2}
                  />
                  <Input
                    value={formData.address.zip}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zip: e.target.value },
                      })
                    }
                    placeholder="ZIP Code"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name || !formData.npi}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingOrg ? "Save Changes" : "Add Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Organization"
        description={`Are you sure you want to delete "${selectedOrg?.name}"? This action cannot be undone. Organizations with existing claims cannot be deleted.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
