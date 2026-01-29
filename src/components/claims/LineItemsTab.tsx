import type { Id } from "../../../convex/_generated/dataModel"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface LineItem {
  _id: Id<"lineItems">
  lineNumber: number
  procedureCode: string
  procedureType: string
  description?: string
  units: number
  chargeAmount: number
  allowedAmount?: number
  paidAmount?: number
  status: string
}

interface LineItemsTabProps {
  lineItems: LineItem[]
}

export function LineItemsTab({ lineItems }: LineItemsTabProps) {
  if (lineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No line items for this claim.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalCharges = lineItems.reduce((s, i) => s + i.chargeAmount, 0)
  const totalAllowed = lineItems.reduce((s, i) => s + (i.allowedAmount || 0), 0)
  const totalPaid = lineItems.reduce((s, i) => s + (i.paidAmount || 0), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Units</TableHead>
              <TableHead className="text-right">Charges</TableHead>
              <TableHead className="text-right">Allowed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.lineNumber}</TableCell>
                <TableCell>
                  <span className="font-mono">{item.procedureCode}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {item.procedureType}
                  </Badge>
                </TableCell>
                <TableCell>{item.description || "-"}</TableCell>
                <TableCell className="text-center">{item.units}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.chargeAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {item.allowedAmount ? formatCurrency(item.allowedAmount) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.paidAmount ? formatCurrency(item.paidAmount) : "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} type="claim" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals */}
        <div className="flex justify-end mt-4 pt-4 border-t border-border">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Charges</span>
              <span className="font-medium">{formatCurrency(totalCharges)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Allowed</span>
              <span className="font-medium">{formatCurrency(totalAllowed)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-medium">Total Paid</span>
              <span className="font-bold text-success">
                {formatCurrency(totalPaid)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
