/**
 * Claim generator
 * Creates realistic claims with line items and diagnoses
 */

import { Id } from "../../_generated/dataModel"
import {
  generateClaimNumber,
  generatePayerClaimNumber,
  generateAuthNumber,
} from "../utils/identifierUtils"
import {
  formatDate,
  randomBusinessDayInRange,
  yearsAgo,
  daysAgo,
  addBusinessDays,
  getClaimAgeCategory,
  daysBetween,
} from "../utils/dateUtils"
import { randomInt, chance, pickRandom, randomMoney, weightedRandomFromObject } from "../utils/randomUtils"
import { OrganizationProfile } from "../config/organizations"
import {
  getProcedureCodesForSpecialty,
  selectRandomProcedureCode,
  generateChargeAmount,
  ProcedureCode,
} from "../config/procedureCodes"
import {
  selectRandomDiagnosisCode,
  selectDiagnosisCodes,
  DiagnosisCode,
} from "../config/diagnosisCodes"
import {
  selectClaimStatus,
  calculateAllowedAmount,
  getLineItemCount,
  getDiagnosisCount,
  PAYMENT_DISTRIBUTIONS,
} from "../config/distributions"

/**
 * Claim status type
 */
export type ClaimStatus =
  | "draft"
  | "ready_to_submit"
  | "submitted"
  | "acknowledged"
  | "pending"
  | "paid"
  | "partial_paid"
  | "denied"
  | "rejected"
  | "appealed"
  | "written_off"
  | "closed"

/**
 * Generated claim data
 */
export interface GeneratedClaim {
  claimNumber: string
  payerClaimNumber?: string
  dateOfService: string
  dateOfServiceEnd?: string
  statementFromDate: string
  statementToDate: string
  submittedAt?: number
  placeOfService: string
  priorAuthNumber?: string
  priorAuthRequired: boolean
  totalCharges: number
  totalAllowed?: number
  totalPaid?: number
  totalAdjustments?: number
  totalPatientResponsibility?: number
  status: ClaimStatus
  priority?: "low" | "medium" | "high" | "critical"
  denialRisk?: number
  denialRiskFactors?: string[]
  // For linking
  patientIndex: number // Index into generated patients array
  coverageIndex: number // Index into patient's coverages
}

/**
 * Generated line item data
 */
export interface GeneratedLineItem {
  lineNumber: number
  procedureCode: string
  procedureType: "CPT" | "HCPCS" | "Custom"
  modifiers: string[]
  description?: string
  diagnosisPointers: number[]
  units: number
  chargeAmount: number
  allowedAmount?: number
  paidAmount?: number
  patientResponsibility?: number
  status: "pending" | "paid" | "denied" | "adjusted"
  revenueCode?: string
  serviceDate?: string
}

/**
 * Generated diagnosis data
 */
export interface GeneratedDiagnosis {
  sequence: number
  code: string
  description?: string
  isPrimary: boolean
}

/**
 * Full generated claim with related data
 */
export interface GeneratedClaimBundle {
  claim: GeneratedClaim
  lineItems: GeneratedLineItem[]
  diagnoses: GeneratedDiagnosis[]
}

/**
 * Generate a single claim with line items and diagnoses
 */
export function generateClaim(
  orgProfile: OrganizationProfile,
  claimSequence: number,
  patientIndex: number,
  coverageIndex: number,
  payerType: "commercial" | "medicare" | "medicaid" | "tricare" | "workers_comp" | "self_pay",
  dateOfService?: Date
): GeneratedClaimBundle {
  const now = new Date()

  // Generate date of service if not provided
  const dos = dateOfService || generateDateOfService(orgProfile)
  const dosString = formatDate(dos)

  // Determine claim age category for status distribution
  const ageCategory = getClaimAgeCategory(dos, now)

  // Select status based on age
  const status = selectClaimStatus(ageCategory) as ClaimStatus

  // Generate diagnoses
  const diagnosisCount = getDiagnosisCount()
  const diagnosisCodes = selectDiagnosisCodes(orgProfile.specialty, diagnosisCount)
  const diagnoses: GeneratedDiagnosis[] = diagnosisCodes.map((dx, index) => ({
    sequence: index + 1,
    code: dx.code,
    description: dx.description,
    isPrimary: index === 0,
  }))

  // Generate line items
  const lineItemCount = getLineItemCount(orgProfile.specialty)
  const lineItems: GeneratedLineItem[] = []
  let totalCharges = 0
  let totalAllowed = 0

  for (let i = 0; i < lineItemCount; i++) {
    const procCode = selectRandomProcedureCode(orgProfile.specialty)
    const chargeAmount = generateChargeAmount(procCode)
    totalCharges += chargeAmount

    const allowedAmount = calculateAllowedAmount(chargeAmount, payerType)
    totalAllowed += allowedAmount

    // Determine line item status based on claim status
    let lineStatus: "pending" | "paid" | "denied" | "adjusted" = "pending"
    if (status === "paid") {
      lineStatus = "paid"
    } else if (status === "partial_paid") {
      lineStatus = chance(0.7) ? "paid" : chance(0.5) ? "denied" : "adjusted"
    } else if (status === "denied") {
      lineStatus = "denied"
    }

    const lineItem: GeneratedLineItem = {
      lineNumber: i + 1,
      procedureCode: procCode.code,
      procedureType: procCode.type,
      modifiers: procCode.modifiers || [],
      description: procCode.description,
      diagnosisPointers: [1, ...(i > 0 && diagnoses.length > 1 ? [2] : [])],
      units: procCode.units ? randomInt(procCode.units.min, procCode.units.max) : 1,
      chargeAmount,
      allowedAmount: lineStatus === "paid" || lineStatus === "adjusted" ? allowedAmount : undefined,
      paidAmount: lineStatus === "paid" ? allowedAmount * 0.8 : undefined, // Simplified
      status: lineStatus,
    }

    lineItems.push(lineItem)
  }

  // Calculate claim-level amounts based on status
  let claimTotalAllowed: number | undefined
  let claimTotalPaid: number | undefined
  let claimTotalAdjustments: number | undefined
  let claimTotalPatientResponsibility: number | undefined

  if (["paid", "partial_paid", "closed"].includes(status)) {
    claimTotalAllowed = totalAllowed
    claimTotalPaid = Math.round(totalAllowed * (status === "partial_paid" ? 0.6 : 0.8) * 100) / 100
    claimTotalAdjustments = Math.round((totalCharges - totalAllowed) * 100) / 100
    claimTotalPatientResponsibility = Math.round((totalAllowed - claimTotalPaid) * 100) / 100
  }

  // Generate submission date if applicable
  let submittedAt: number | undefined
  if (!["draft", "ready_to_submit"].includes(status)) {
    const submitDate = addBusinessDays(dos, randomInt(1, 5))
    submittedAt = submitDate.getTime()
  }

  // Determine prior auth requirement
  const needsAuth = lineItems.some(li => {
    const procCodes = getProcedureCodesForSpecialty(orgProfile.specialty)
    const proc = procCodes.find(p => p.code === li.procedureCode)
    return proc?.authRequired
  })

  // Generate denial risk
  const denialRisk = generateDenialRisk(orgProfile, status, payerType)
  const denialRiskFactors = denialRisk > 0.5 ? generateDenialRiskFactors(orgProfile, denialRisk) : undefined

  // Determine priority based on status and amounts
  const priority = determinePriority(status, totalCharges, denialRisk)

  const claim: GeneratedClaim = {
    claimNumber: generateClaimNumber(dos.getFullYear(), orgProfile.id, claimSequence),
    payerClaimNumber: ["acknowledged", "pending", "paid", "partial_paid", "denied", "appealed"].includes(status)
      ? generatePayerClaimNumber(payerType.substring(0, 3).toUpperCase())
      : undefined,
    dateOfService: dosString,
    statementFromDate: dosString,
    statementToDate: dosString,
    submittedAt,
    placeOfService: getPlaceOfService(orgProfile.facilityType),
    priorAuthNumber: needsAuth && chance(0.7) ? generateAuthNumber(payerType.substring(0, 3).toUpperCase()) : undefined,
    priorAuthRequired: needsAuth,
    totalCharges: Math.round(totalCharges * 100) / 100,
    totalAllowed: claimTotalAllowed,
    totalPaid: claimTotalPaid,
    totalAdjustments: claimTotalAdjustments,
    totalPatientResponsibility: claimTotalPatientResponsibility,
    status,
    priority,
    denialRisk,
    denialRiskFactors,
    patientIndex,
    coverageIndex,
  }

  return { claim, lineItems, diagnoses }
}

/**
 * Generate a realistic date of service
 */
function generateDateOfService(orgProfile: OrganizationProfile): Date {
  const now = new Date()
  const threeYearsAgo = yearsAgo(3, now)

  // Weight toward more recent dates
  const random = Math.random()
  let rangeStart: Date
  let rangeEnd: Date

  if (random < 0.15) {
    // 15% in last week
    rangeStart = daysAgo(7, now)
    rangeEnd = now
  } else if (random < 0.40) {
    // 25% in last month
    rangeStart = daysAgo(30, now)
    rangeEnd = daysAgo(7, now)
  } else if (random < 0.65) {
    // 25% in last 3 months
    rangeStart = daysAgo(90, now)
    rangeEnd = daysAgo(30, now)
  } else if (random < 0.85) {
    // 20% in last year
    rangeStart = daysAgo(365, now)
    rangeEnd = daysAgo(90, now)
  } else {
    // 15% older than a year
    rangeStart = threeYearsAgo
    rangeEnd = daysAgo(365, now)
  }

  return randomBusinessDayInRange(rangeStart, rangeEnd)
}

/**
 * Get place of service code based on facility type
 */
function getPlaceOfService(facilityType: OrganizationProfile["facilityType"]): string {
  const posMap: Record<string, string> = {
    physician_office: "11", // Office
    hospital_outpatient: "22", // On Campus-Outpatient Hospital
    asc: "24", // Ambulatory Surgical Center
    clinic: "49", // Independent Clinic
  }
  return posMap[facilityType] || "11"
}

/**
 * Generate denial risk score
 */
function generateDenialRisk(
  orgProfile: OrganizationProfile,
  status: ClaimStatus,
  payerType: string
): number {
  // Base risk from organization profile
  let risk = orgProfile.denialRate

  // Adjust based on current status
  if (status === "denied" || status === "rejected") {
    risk = 0.85 + Math.random() * 0.15
  } else if (status === "appealed") {
    risk = 0.70 + Math.random() * 0.20
  } else if (status === "paid") {
    risk = Math.random() * 0.30
  } else if (status === "pending") {
    risk = 0.30 + Math.random() * 0.40
  }

  // Adjust based on payer type
  if (payerType === "workers_comp") {
    risk += 0.10
  } else if (payerType === "medicaid") {
    risk -= 0.05
  }

  return Math.max(0, Math.min(1, Math.round(risk * 100) / 100))
}

/**
 * Generate denial risk factors
 */
function generateDenialRiskFactors(
  orgProfile: OrganizationProfile,
  denialRisk: number
): string[] {
  const allFactors = [
    "Prior authorization may be required",
    "High-cost procedure",
    "Missing modifier",
    "Documentation may be insufficient",
    "Eligibility concerns",
    "Bundling rules may apply",
    "Medical necessity documentation needed",
    "Coordination of benefits issue",
    "Timely filing approaching deadline",
    "Provider enrollment issue",
  ]

  // Select 1-3 factors based on risk level
  const factorCount = denialRisk > 0.7 ? randomInt(2, 3) : randomInt(1, 2)
  const selected: string[] = []

  // Prioritize factors based on org's common denial categories
  for (const category of orgProfile.commonDenialCategories) {
    if (selected.length >= factorCount) break

    const categoryFactors: Record<string, string[]> = {
      authorization: ["Prior authorization may be required"],
      medical_necessity: ["Medical necessity documentation needed", "Documentation may be insufficient"],
      coding: ["Missing modifier"],
      bundling: ["Bundling rules may apply"],
      eligibility: ["Eligibility concerns"],
      coordination_of_benefits: ["Coordination of benefits issue"],
      timely_filing: ["Timely filing approaching deadline"],
      missing_information: ["Documentation may be insufficient"],
      provider_enrollment: ["Provider enrollment issue"],
    }

    const factors = categoryFactors[category.category] || []
    for (const factor of factors) {
      if (!selected.includes(factor) && selected.length < factorCount) {
        selected.push(factor)
      }
    }
  }

  // Fill remaining with random factors
  while (selected.length < factorCount) {
    const factor = pickRandom(allFactors)
    if (!selected.includes(factor)) {
      selected.push(factor)
    }
  }

  return selected
}

/**
 * Determine claim priority
 */
function determinePriority(
  status: ClaimStatus,
  totalCharges: number,
  denialRisk: number
): "low" | "medium" | "high" | "critical" {
  // Critical: denied/rejected high-value claims
  if ((status === "denied" || status === "rejected") && totalCharges > 10000) {
    return "critical"
  }

  // High: denied claims or high denial risk pending
  if (status === "denied" || status === "rejected") {
    return "high"
  }
  if (status === "pending" && denialRisk > 0.7) {
    return "high"
  }

  // Medium: moderate risk or moderate value
  if (denialRisk > 0.5 || totalCharges > 5000) {
    return "medium"
  }

  // Low: everything else
  return "low"
}

/**
 * Generate multiple claims for an organization
 */
export function generateClaimsForOrg(
  orgProfile: OrganizationProfile,
  patientCount: number,
  claimCount: number,
  payerTypes: Array<"commercial" | "medicare" | "medicaid" | "tricare" | "workers_comp" | "self_pay">,
  startSequence: number = 1
): GeneratedClaimBundle[] {
  const claims: GeneratedClaimBundle[] = []

  for (let i = 0; i < claimCount; i++) {
    const patientIndex = randomInt(0, patientCount - 1)
    const coverageIndex = 0 // Primary coverage
    const payerType = pickRandom(payerTypes)

    claims.push(
      generateClaim(
        orgProfile,
        startSequence + i,
        patientIndex,
        coverageIndex,
        payerType
      )
    )
  }

  return claims
}
