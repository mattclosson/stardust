import { Link } from "@tanstack/react-router"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  User,
  Building,
  DollarSign,
  FileText,
  Clock,
} from "lucide-react"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate } from "@/lib/utils"

interface DenialHeaderProps {
  denial: {
    denialCode: string
    status: string
    denialCategory: string
    denialReason: string
    appealDeadline?: string
    claim?: {
      _id: Id<"claims">
      claimNumber: string
      totalCharges: number
    } | null
  }
  patient?: {
    firstName: string
    lastName: string
  } | null
  payer?: {
    name: string
  } | null
}

export function DenialHeader({ denial, patient, payer }: DenialHeaderProps) {
  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-mono">
              {denial.denialCode}
            </span>
            <StatusBadge status={denial.status} type="denial" />
            <Badge variant="outline" className="capitalize">
              {denial.denialCategory.replace(/_/g, " ")}
            </Badge>
          </div>

          <p className="text-muted-foreground">{denial.denialReason}</p>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Claim</p>
                <Link
                  to="/claims/$claimId"
                  params={{ claimId: denial.claim?._id || "" }}
                  className="font-medium text-primary hover:underline"
                >
                  {denial.claim?.claimNumber || "-"}
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-medium">
                  {patient
                    ? `${patient.firstName} ${patient.lastName}`
                    : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Payer</p>
                <p className="font-medium">{payer?.name || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium text-destructive">
                  {denial.claim
                    ? formatCurrency(denial.claim.totalCharges)
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {denial.appealDeadline && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <Clock className="w-5 h-5 text-warning" />
              <span className="text-sm">
                Appeal deadline:{" "}
                <span className="font-medium">
                  {formatDate(denial.appealDeadline)}
                </span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
