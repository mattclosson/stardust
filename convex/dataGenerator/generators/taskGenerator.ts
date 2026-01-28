/**
 * Task generator
 * Creates realistic worklist tasks based on claims and denials
 */

import { formatDate, addDays, daysBetween, daysAgo } from "../utils/dateUtils"
import { randomInt, chance, pickRandom } from "../utils/randomUtils"
import { ClaimStatus } from "./claimGenerator"
import { TASK_GENERATION_RATES } from "../config/distributions"

/**
 * Generated task data
 */
export interface GeneratedTask {
  title: string
  description?: string
  category: "follow_up" | "appeal" | "eligibility" | "coding_review" | "patient_contact" | "auth_request" | "other"
  priority: "low" | "medium" | "high" | "critical"
  dueDate?: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  completedAt?: number
  source: "manual" | "system" | "ai"
  aiConfidence?: number
  aiReasoning?: string
  aiPriorityScore?: number
  // For linking
  claimIndex?: number
  denialIndex?: number
  appealIndex?: number
  patientIndex?: number
  authorizationIndex?: number
}

/**
 * Generate tasks for denied claims
 */
export function generateTasksForDenial(
  claimIndex: number,
  denialIndex: number,
  denialCode: string,
  denialCategory: string,
  totalCharges: number,
  appealDeadline?: string
): GeneratedTask[] {
  const tasks: GeneratedTask[] = []
  const now = new Date()
  
  // Always create a denial review task
  tasks.push({
    title: `Review denial - ${denialCode}`,
    description: `Review ${denialCategory.replace("_", " ")} denial and determine appeal strategy. Charges: $${totalCharges.toFixed(2)}`,
    category: "appeal",
    priority: totalCharges > 5000 ? "high" : totalCharges > 1000 ? "medium" : "low",
    dueDate: appealDeadline ? formatDate(addDays(new Date(appealDeadline), -14)) : undefined,
    status: pickRandom(["pending", "in_progress"]),
    source: "ai",
    aiConfidence: 0.85 + Math.random() * 0.10,
    aiReasoning: `Denial identified for ${denialCategory.replace("_", " ")}. High-value claim requires prompt review.`,
    aiPriorityScore: Math.round(70 + Math.random() * 25),
    claimIndex,
    denialIndex,
  })
  
  // Create appeal deadline warning if deadline is approaching
  if (appealDeadline) {
    const daysUntilDeadline = daysBetween(now, new Date(appealDeadline))
    
    if (daysUntilDeadline <= 14 && daysUntilDeadline > 0) {
      tasks.push({
        title: `URGENT: Appeal deadline in ${daysUntilDeadline} days`,
        description: `Appeal must be submitted by ${appealDeadline}. Immediate action required.`,
        category: "appeal",
        priority: daysUntilDeadline <= 7 ? "critical" : "high",
        dueDate: formatDate(addDays(new Date(appealDeadline), -3)),
        status: "pending",
        source: "system",
        claimIndex,
        denialIndex,
      })
    }
  }
  
  // Eligibility verification task for eligibility denials
  if (denialCategory === "eligibility" && chance(TASK_GENERATION_RATES.eligibilityVerification)) {
    tasks.push({
      title: "Verify patient eligibility",
      description: "Patient eligibility needs verification. Contact payer to confirm coverage status.",
      category: "eligibility",
      priority: "high",
      dueDate: formatDate(addDays(now, 3)),
      status: "pending",
      source: "ai",
      aiConfidence: 0.90,
      aiReasoning: "Eligibility denial detected. Verification required before appeal.",
      aiPriorityScore: 85,
      claimIndex,
    })
  }
  
  // Coding review task for coding denials
  if (denialCategory === "coding" && chance(0.80)) {
    tasks.push({
      title: "Review coding for denied claim",
      description: "Review procedure and diagnosis codes for accuracy. Check modifier usage.",
      category: "coding_review",
      priority: "medium",
      dueDate: formatDate(addDays(now, 5)),
      status: "pending",
      source: "ai",
      aiConfidence: 0.82,
      aiReasoning: "Coding-related denial. Review suggests potential modifier or diagnosis issue.",
      aiPriorityScore: 72,
      claimIndex,
    })
  }
  
  return tasks
}

/**
 * Generate tasks for pending claims
 */
export function generateTaskForPendingClaim(
  claimIndex: number,
  dateOfService: string,
  totalCharges: number,
  claimNumber: string,
  daysOld: number
): GeneratedTask | null {
  // Only generate follow-up tasks for claims older than 30 days
  if (daysOld < 30) return null
  
  const shouldGenerate =
    daysOld >= 60 ||
    (daysOld >= 30 && chance(TASK_GENERATION_RATES.pendingFollowUp.threshold30Days))
  
  if (!shouldGenerate) return null
  
  const now = new Date()
  
  return {
    title: `Follow up on pending claim ${claimNumber}`,
    description: `Claim pending for ${daysOld} days. Contact payer to check status. Charges: $${totalCharges.toFixed(2)}`,
    category: "follow_up",
    priority: daysOld >= 60 ? "high" : "medium",
    dueDate: formatDate(addDays(now, 3)),
    status: "pending",
    source: "ai",
    aiConfidence: 0.78 + Math.random() * 0.12,
    aiReasoning: `Claim has been pending ${daysOld} days. Average processing time for this payer is 21 days.`,
    aiPriorityScore: Math.min(95, 50 + daysOld),
    claimIndex,
  }
}

/**
 * Generate tasks for auth requests
 */
export function generateTaskForAuth(
  patientIndex: number,
  authorizationIndex: number,
  procedureDescription: string,
  expirationDate?: string
): GeneratedTask[] {
  const tasks: GeneratedTask[] = []
  const now = new Date()
  
  // Expiring auth warning
  if (expirationDate) {
    const daysUntilExpiry = daysBetween(now, new Date(expirationDate))
    
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      tasks.push({
        title: `Authorization expiring in ${daysUntilExpiry} days`,
        description: `Authorization for ${procedureDescription} expires ${expirationDate}. Request extension if needed.`,
        category: "auth_request",
        priority: daysUntilExpiry <= 7 ? "high" : "medium",
        dueDate: formatDate(addDays(new Date(expirationDate), -7)),
        status: "pending",
        source: "system",
        patientIndex,
        authorizationIndex,
      })
    }
  }
  
  return tasks
}

/**
 * Generate patient contact tasks
 */
export function generatePatientContactTask(
  patientIndex: number,
  claimIndex: number,
  reason: string,
  patientResponsibility: number
): GeneratedTask {
  const now = new Date()
  
  return {
    title: `Contact patient regarding balance`,
    description: `${reason}. Patient balance: $${patientResponsibility.toFixed(2)}`,
    category: "patient_contact",
    priority: patientResponsibility > 500 ? "medium" : "low",
    dueDate: formatDate(addDays(now, 7)),
    status: "pending",
    source: "system",
    patientIndex,
    claimIndex,
  }
}

/**
 * Generate a batch of tasks for an organization
 */
export function generateTasksForOrganization(
  claimData: Array<{
    index: number
    status: ClaimStatus
    dateOfService: string
    totalCharges: number
    claimNumber: string
    patientIndex: number
    hasDenial: boolean
    denialIndex?: number
    denialCode?: string
    denialCategory?: string
    appealDeadline?: string
    totalPatientResponsibility?: number
  }>
): GeneratedTask[] {
  const tasks: GeneratedTask[] = []
  const now = new Date()
  
  for (const claim of claimData) {
    const daysOld = daysBetween(new Date(claim.dateOfService), now)
    
    // Tasks for denied claims
    if (claim.hasDenial && claim.denialIndex !== undefined && claim.denialCode && claim.denialCategory) {
      const denialTasks = generateTasksForDenial(
        claim.index,
        claim.denialIndex,
        claim.denialCode,
        claim.denialCategory,
        claim.totalCharges,
        claim.appealDeadline
      )
      tasks.push(...denialTasks)
    }
    
    // Tasks for pending claims
    if (claim.status === "pending") {
      const pendingTask = generateTaskForPendingClaim(
        claim.index,
        claim.dateOfService,
        claim.totalCharges,
        claim.claimNumber,
        daysOld
      )
      if (pendingTask) {
        tasks.push(pendingTask)
      }
    }
    
    // Patient contact tasks for balances
    if (
      claim.totalPatientResponsibility &&
      claim.totalPatientResponsibility > 100 &&
      chance(0.30)
    ) {
      tasks.push(
        generatePatientContactTask(
          claim.patientIndex,
          claim.index,
          "Patient responsibility after insurance payment",
          claim.totalPatientResponsibility
        )
      )
    }
  }
  
  return tasks
}
