/**
 * Denial and appeal generator
 * Creates realistic denial records with appeals and AI analysis
 */

import { formatDate, addDays, daysAgo } from "../utils/dateUtils"
import { randomInt, chance, pickRandom } from "../utils/randomUtils"
import { OrganizationProfile } from "../config/organizations"
import {
  selectRandomDenialCode,
  selectRandomDenialCategory,
  generateAISuggestedAction,
  generateAIAnalysis,
  DenialCodeConfig,
  DENIAL_CODES,
} from "../config/denialCodes"
import { selectAppealOutcome } from "../config/distributions"
import { ClaimStatus } from "./claimGenerator"

/**
 * Generated denial data
 */
export interface GeneratedDenial {
  denialCode: string
  denialReason: string
  denialCategory: "eligibility" | "authorization" | "medical_necessity" | "coding" | "duplicate" | "timely_filing" | "bundling" | "coordination_of_benefits" | "missing_information" | "provider_enrollment" | "other"
  receivedAt: number
  appealDeadline?: string
  status: "new" | "in_review" | "appealing" | "appeal_submitted" | "overturned" | "upheld" | "written_off"
  suggestedAction?: string
  similarDenialCount?: number
  overturnLikelihood?: number
  aiAnalysis?: string
  // For linking
  claimIndex: number
  lineItemIndex?: number
}

/**
 * Generated appeal data
 */
export interface GeneratedAppeal {
  appealLevel: number
  appealType: "reconsideration" | "formal_appeal" | "external_review"
  submittedAt?: number
  submissionMethod: "electronic" | "fax" | "mail" | "portal"
  generatedAppealLetter?: string
  status: "draft" | "submitted" | "in_review" | "decided"
  outcome?: "overturned" | "partially_overturned" | "upheld"
  responseReceivedAt?: number
  responseNotes?: string
  // For linking
  denialIndex: number
  claimIndex: number
}

/**
 * Full denial bundle with optional appeal
 */
export interface GeneratedDenialBundle {
  denial: GeneratedDenial
  appeal?: GeneratedAppeal
}

/**
 * Generate a denial for a denied claim
 */
export function generateDenial(
  orgProfile: OrganizationProfile,
  claimIndex: number,
  claimStatus: ClaimStatus,
  dateOfService: string,
  totalCharges: number,
  lineItemIndex?: number
): GeneratedDenialBundle {
  // Select denial category based on org profile weights
  const category = selectRandomDenialCategory(orgProfile.commonDenialCategories)
  
  // Select denial code for category
  const denialCodeConfig = selectRandomDenialCode(category as DenialCodeConfig["category"])
  
  // Calculate when denial was received (typically 14-45 days after DOS)
  const dosDate = new Date(dateOfService)
  const receivedDate = addDays(dosDate, randomInt(14, 45))
  const receivedAt = receivedDate.getTime()
  
  // Calculate appeal deadline (typically 60-180 days from denial)
  const appealDeadline = addDays(receivedDate, denialCodeConfig.overturnLikelihood > 0.5 ? 180 : 60)
  
  // Determine denial status based on claim status
  let denialStatus: GeneratedDenial["status"]
  
  if (claimStatus === "appealed") {
    denialStatus = pickRandom(["appealing", "appeal_submitted"])
  } else if (claimStatus === "closed" || claimStatus === "written_off") {
    denialStatus = pickRandom(["overturned", "upheld", "written_off"])
  } else {
    // Active denial
    denialStatus = pickRandom(["new", "in_review", "appealing"])
  }
  
  // Generate AI fields
  const suggestedAction = generateAISuggestedAction(denialCodeConfig)
  const similarDenialCount = randomInt(1, 25)
  const overturnLikelihood = denialCodeConfig.overturnLikelihood + (Math.random() - 0.5) * 0.2
  const aiAnalysis = generateAIAnalysis(denialCodeConfig)
  
  const denial: GeneratedDenial = {
    denialCode: denialCodeConfig.code,
    denialReason: denialCodeConfig.description,
    denialCategory: denialCodeConfig.category,
    receivedAt,
    appealDeadline: formatDate(appealDeadline),
    status: denialStatus,
    suggestedAction,
    similarDenialCount,
    overturnLikelihood: Math.max(0, Math.min(1, Math.round(overturnLikelihood * 100) / 100)),
    aiAnalysis,
    claimIndex,
    lineItemIndex,
  }
  
  // Generate appeal if denial is being appealed
  let appeal: GeneratedAppeal | undefined
  
  if (["appealing", "appeal_submitted", "overturned", "partially_overturned", "upheld"].includes(denialStatus)) {
    appeal = generateAppeal(
      denial,
      claimIndex,
      0, // Will be set to actual denial index when inserted
      receivedDate,
      totalCharges
    )
  }
  
  return { denial, appeal }
}

/**
 * Generate an appeal for a denial
 */
function generateAppeal(
  denial: GeneratedDenial,
  claimIndex: number,
  denialIndex: number,
  denialReceivedDate: Date,
  totalCharges: number
): GeneratedAppeal {
  // Determine appeal level (most are level 1)
  const appealLevel = chance(0.85) ? 1 : chance(0.70) ? 2 : 3
  
  // Determine appeal type based on level
  let appealType: GeneratedAppeal["appealType"]
  if (appealLevel === 1) {
    appealType = "reconsideration"
  } else if (appealLevel === 2) {
    appealType = "formal_appeal"
  } else {
    appealType = "external_review"
  }
  
  // Calculate submission date (typically 7-21 days after denial received)
  const submittedDate = addDays(denialReceivedDate, randomInt(7, 21))
  
  // Determine status and outcome
  let status: GeneratedAppeal["status"]
  let outcome: GeneratedAppeal["outcome"] | undefined
  let responseReceivedAt: number | undefined
  let responseNotes: string | undefined
  
  const isDecided = denial.status === "overturned" || denial.status === "upheld"
  
  if (isDecided) {
    status = "decided"
    outcome = selectAppealOutcome()
    responseReceivedAt = addDays(submittedDate, randomInt(30, 60)).getTime()
    responseNotes = generateResponseNotes(outcome, totalCharges)
  } else if (denial.status === "appeal_submitted") {
    status = "in_review"
  } else if (denial.status === "appealing") {
    status = pickRandom(["draft", "submitted"])
  } else {
    status = "draft"
  }
  
  // Generate appeal letter
  const generatedAppealLetter = generateAppealLetter(denial, totalCharges)
  
  // Select submission method
  const submissionMethod = pickRandom(["electronic", "fax", "mail", "portal"] as const)
  
  return {
    appealLevel,
    appealType,
    submittedAt: status !== "draft" ? submittedDate.getTime() : undefined,
    submissionMethod,
    generatedAppealLetter,
    status,
    outcome,
    responseReceivedAt,
    responseNotes,
    denialIndex,
    claimIndex,
  }
}

/**
 * Generate appeal letter content
 */
function generateAppealLetter(denial: GeneratedDenial, totalCharges: number): string {
  const templates = [
    `Dear Claims Review Department,

We are writing to formally appeal the denial of the referenced claim. The denial reason stated was: "${denial.denialReason}"

We believe this denial should be reconsidered for the following reasons:

1. The services provided were medically necessary for the patient's documented condition
2. All required documentation was submitted with the original claim
3. The procedure was performed in accordance with accepted medical standards

We respectfully request that you review the enclosed clinical documentation and reconsider this denial.

Total charges: $${totalCharges.toFixed(2)}

Please contact our office if additional information is needed.

Sincerely,
Provider Billing Department`,

    `RE: Appeal for Denied Claim

To Whom It May Concern,

This letter serves as our formal appeal of the above-referenced claim denial. The claim was denied with reason code ${denial.denialCode}: "${denial.denialReason}"

After careful review of the patient's medical record and the payer's coverage guidelines, we have determined that this service meets all criteria for coverage. Specifically:

- The patient's condition necessitated the services rendered
- Prior authorization requirements were met (if applicable)
- All coding accurately reflects the services provided

We have attached supporting documentation for your review and request immediate reconsideration of this claim.

Expected reimbursement: $${totalCharges.toFixed(2)}

Thank you for your prompt attention to this matter.

Respectfully,
Appeals Department`,
  ]
  
  return pickRandom(templates)
}

/**
 * Generate response notes for decided appeals
 */
function generateResponseNotes(
  outcome: "overturned" | "partially_overturned" | "upheld",
  totalCharges: number
): string {
  switch (outcome) {
    case "overturned":
      return `Appeal approved. Claim will be reprocessed for full payment of $${totalCharges.toFixed(2)}. Allow 7-10 business days for payment.`
    case "partially_overturned":
      const partialAmount = totalCharges * (0.4 + Math.random() * 0.3)
      return `Appeal partially approved. Additional payment of $${partialAmount.toFixed(2)} authorized. Remaining balance upheld due to fee schedule limitations.`
    case "upheld":
      return `Appeal denied. The original decision has been upheld. The services do not meet medical necessity criteria per plan guidelines. Patient may be responsible for charges.`
  }
}

/**
 * Generate denials for a batch of denied claims
 */
export function generateDenialsForClaims(
  orgProfile: OrganizationProfile,
  deniedClaimIndices: number[],
  claimData: Array<{ status: ClaimStatus; dateOfService: string; totalCharges: number }>
): GeneratedDenialBundle[] {
  return deniedClaimIndices.map((claimIndex, idx) => {
    const claim = claimData[claimIndex]
    return generateDenial(
      orgProfile,
      claimIndex,
      claim.status,
      claim.dateOfService,
      claim.totalCharges
    )
  })
}
