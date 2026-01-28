/**
 * Payment and adjustment generator
 * Creates realistic payment records and line-item adjustments
 */

import { formatDate, addDays, addBusinessDays } from "../utils/dateUtils"
import { randomInt, chance, pickRandom, randomMoney } from "../utils/randomUtils"
import {
  generateCheckNumber,
  generateTraceNumber,
  generateERAId,
} from "../utils/identifierUtils"
import { ClaimStatus } from "./claimGenerator"

/**
 * Generated payment data
 */
export interface GeneratedPayment {
  paymentType: "insurance" | "patient"
  paymentMethod: "check" | "eft" | "virtual_card" | "cash" | "credit_card"
  checkNumber?: string
  traceNumber?: string
  amount: number
  paymentDate: string
  postedAt: number
  eraId?: string
  // For linking
  claimIndex: number
}

/**
 * Generated adjustment data
 */
export interface GeneratedAdjustment {
  groupCode: "CO" | "PR" | "OA" | "PI" | "CR"
  reasonCode: string
  remarkCodes?: string[]
  amount: number
  description?: string
  // For linking
  claimIndex: number
  lineItemIndex: number
}

/**
 * Payment and adjustments bundle for a claim
 */
export interface GeneratedPaymentBundle {
  payments: GeneratedPayment[]
  adjustments: GeneratedAdjustment[]
}

/**
 * Generate payments and adjustments for a paid/partial claim
 */
export function generatePaymentForClaim(
  claimIndex: number,
  claimStatus: ClaimStatus,
  dateOfService: string,
  totalCharges: number,
  totalAllowed?: number,
  totalPaid?: number,
  lineItemCount: number = 1,
  payerType: string = "commercial"
): GeneratedPaymentBundle {
  const payments: GeneratedPayment[] = []
  const adjustments: GeneratedAdjustment[] = []
  
  // Only generate payments for paid/partial/closed claims
  if (!["paid", "partial_paid", "closed"].includes(claimStatus)) {
    return { payments, adjustments }
  }
  
  const dosDate = new Date(dateOfService)
  
  // Insurance payment
  const insurancePaymentDate = addDays(dosDate, randomInt(21, 45))
  const insurancePaidAmount = totalPaid || (totalAllowed ? totalAllowed * 0.8 : totalCharges * 0.5)
  
  const insurancePayment: GeneratedPayment = {
    paymentType: "insurance",
    paymentMethod: selectPaymentMethod(payerType),
    amount: Math.round(insurancePaidAmount * 100) / 100,
    paymentDate: formatDate(insurancePaymentDate),
    postedAt: addBusinessDays(insurancePaymentDate, randomInt(1, 3)).getTime(),
    claimIndex,
  }
  
  // Add payment reference numbers based on method
  if (insurancePayment.paymentMethod === "check") {
    insurancePayment.checkNumber = generateCheckNumber()
  } else if (insurancePayment.paymentMethod === "eft") {
    insurancePayment.traceNumber = generateTraceNumber()
    insurancePayment.eraId = generateERAId()
  } else if (insurancePayment.paymentMethod === "virtual_card") {
    insurancePayment.traceNumber = generateTraceNumber()
  }
  
  payments.push(insurancePayment)
  
  // Patient payment (if there's patient responsibility)
  const patientResponsibility = (totalAllowed || totalCharges * 0.6) - insurancePaidAmount
  
  if (patientResponsibility > 0 && chance(0.40)) {
    const patientPaymentDate = addDays(insurancePaymentDate, randomInt(7, 60))
    const patientPaidAmount = chance(0.70)
      ? patientResponsibility
      : patientResponsibility * (0.3 + Math.random() * 0.5)
    
    const patientPayment: GeneratedPayment = {
      paymentType: "patient",
      paymentMethod: pickRandom(["check", "credit_card", "cash"]),
      amount: Math.round(patientPaidAmount * 100) / 100,
      paymentDate: formatDate(patientPaymentDate),
      postedAt: patientPaymentDate.getTime(),
      claimIndex,
    }
    
    if (patientPayment.paymentMethod === "check") {
      patientPayment.checkNumber = generateCheckNumber()
    }
    
    payments.push(patientPayment)
  }
  
  // Generate adjustments for each line item
  const contractualAdjustment = (totalCharges - (totalAllowed || totalCharges * 0.6))
  const adjustmentPerLine = contractualAdjustment / lineItemCount
  
  for (let i = 0; i < lineItemCount; i++) {
    // Contractual adjustment (CO-45)
    if (adjustmentPerLine > 0) {
      adjustments.push({
        groupCode: "CO",
        reasonCode: "45",
        amount: Math.round((adjustmentPerLine + (Math.random() - 0.5) * 10) * 100) / 100,
        description: "Charge exceeds fee schedule/maximum allowable",
        claimIndex,
        lineItemIndex: i,
      })
    }
    
    // Patient responsibility adjustments
    if (patientResponsibility > 0) {
      const prAmount = (patientResponsibility / lineItemCount) * (0.8 + Math.random() * 0.4)
      
      // Randomly assign to deductible, coinsurance, or copay
      const prType = pickRandom([
        { code: "1", desc: "Deductible amount" },
        { code: "2", desc: "Coinsurance amount" },
        { code: "3", desc: "Co-payment amount" },
      ])
      
      adjustments.push({
        groupCode: "PR",
        reasonCode: prType.code,
        amount: Math.round(prAmount * 100) / 100,
        description: prType.desc,
        claimIndex,
        lineItemIndex: i,
      })
    }
  }
  
  return { payments, adjustments }
}

/**
 * Select payment method based on payer type
 */
function selectPaymentMethod(
  payerType: string
): "check" | "eft" | "virtual_card" | "cash" | "credit_card" {
  // Medicare and Medicaid mostly use EFT
  if (payerType === "medicare" || payerType === "medicaid") {
    return chance(0.85) ? "eft" : "check"
  }
  
  // Commercial payers mix of EFT and virtual cards
  if (payerType === "commercial") {
    const rand = Math.random()
    if (rand < 0.50) return "eft"
    if (rand < 0.75) return "virtual_card"
    return "check"
  }
  
  // Workers comp often uses checks
  if (payerType === "workers_comp") {
    return chance(0.60) ? "check" : "eft"
  }
  
  // Self-pay
  return pickRandom(["check", "cash", "credit_card"])
}

/**
 * Common adjustment reason codes with descriptions
 */
export const ADJUSTMENT_REASON_CODES = {
  // Contractual Obligation (CO)
  CO: {
    "45": "Charge exceeds fee schedule/maximum allowable",
    "59": "Processed based on multiple or concurrent procedure rules",
    "97": "Benefit included in another service",
    "253": "Sequestration adjustment",
  },
  // Patient Responsibility (PR)
  PR: {
    "1": "Deductible amount",
    "2": "Coinsurance amount",
    "3": "Co-payment amount",
    "96": "Non-covered charge(s)",
  },
  // Other Adjustment (OA)
  OA: {
    "23": "Impact of prior payer adjudication",
    "94": "Processed in excess of charges",
  },
}

/**
 * Generate payments for multiple claims
 */
export function generatePaymentsForClaims(
  claimData: Array<{
    index: number
    status: ClaimStatus
    dateOfService: string
    totalCharges: number
    totalAllowed?: number
    totalPaid?: number
    lineItemCount: number
    payerType: string
  }>
): GeneratedPaymentBundle[] {
  return claimData
    .filter(claim => ["paid", "partial_paid", "closed"].includes(claim.status))
    .map(claim =>
      generatePaymentForClaim(
        claim.index,
        claim.status,
        claim.dateOfService,
        claim.totalCharges,
        claim.totalAllowed,
        claim.totalPaid,
        claim.lineItemCount,
        claim.payerType
      )
    )
}
