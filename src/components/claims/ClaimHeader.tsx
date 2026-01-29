import type { Id } from "../../../convex/_generated/dataModel"
import {
  User,
  Building,
  Calendar,
  DollarSign,
  AlertTriangle,
  Sparkles,
} from "lucide-react"
import { StatusBadge, RiskBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ClaimHeaderProps {
  claim: {
    claimNumber: string
    status: string
    priority?: string
    dateOfService: string
    totalCharges: number
    totalPaid?: number
    denialRisk?: number
    denialRiskFactors?: string[]
  }
  patient?: {
    firstName: string
    lastName: string
    mrn: string
  } | null
  payer?: {
    _id: Id<"payers">
    name: string
    payerType: string
  } | null
}

export function ClaimHeader({ claim, patient, payer }: ClaimHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{claim.claimNumber}</h2>
              <StatusBadge status={claim.status} type="claim" />
              <StatusBadge
                status={claim.priority || "medium"}
                type="priority"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">
                    {patient
                      ? `${patient.firstName} ${patient.lastName}`
                      : "-"}
                  </p>
                  {patient && (
                    <p className="text-xs text-muted-foreground">
                      MRN: {patient.mrn}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Payer</p>
                  <p className="font-medium">{payer?.name || "-"}</p>
                  {payer && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {payer.payerType}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date of Service</p>
                  <p className="font-medium">{formatDate(claim.dateOfService)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Charges</p>
                  <p className="font-medium">
                    {formatCurrency(claim.totalCharges)}
                  </p>
                  {claim.totalPaid && (
                    <p className="text-xs text-success">
                      Paid: {formatCurrency(claim.totalPaid)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Risk Panel */}
          {claim.denialRisk !== undefined && (
            <Card className="w-full lg:w-80 bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-medium">AI Risk Analysis</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    Denial Risk
                  </span>
                  <RiskBadge risk={claim.denialRisk} />
                </div>
                {claim.denialRiskFactors && claim.denialRiskFactors.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Risk Factors:
                    </p>
                    <div className="space-y-1">
                      {claim.denialRiskFactors.map((factor, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <AlertTriangle className="w-3 h-3 text-warning" />
                          {factor}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
