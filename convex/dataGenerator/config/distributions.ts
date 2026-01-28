/**
 * Statistical distributions for realistic data generation
 * Defines probabilities and parameters for claim lifecycle
 */

/**
 * Claim status distribution by age
 * These represent the probability of a claim being in each status
 * based on how old the claim is
 */
export const CLAIM_STATUS_DISTRIBUTION = {
  // Claims 0-30 days old
  recent: {
    draft: 0.02,
    ready_to_submit: 0.03,
    submitted: 0.15,
    acknowledged: 0.10,
    pending: 0.35,
    paid: 0.25,
    partial_paid: 0.03,
    denied: 0.05,
    rejected: 0.02,
    appealed: 0.00,
    written_off: 0.00,
    closed: 0.00,
  },
  // Claims 31-90 days old
  aging: {
    draft: 0.00,
    ready_to_submit: 0.00,
    submitted: 0.02,
    acknowledged: 0.02,
    pending: 0.15,
    paid: 0.58,
    partial_paid: 0.08,
    denied: 0.10,
    rejected: 0.00,
    appealed: 0.03,
    written_off: 0.01,
    closed: 0.01,
  },
  // Claims 91+ days old
  historical: {
    draft: 0.00,
    ready_to_submit: 0.00,
    submitted: 0.00,
    acknowledged: 0.00,
    pending: 0.02,
    paid: 0.72,
    partial_paid: 0.06,
    denied: 0.05,
    rejected: 0.00,
    appealed: 0.04,
    written_off: 0.05,
    closed: 0.06,
  },
} as const

/**
 * Payment amount distributions
 * Allowed amount as percentage of billed charges by payer type
 */
export const PAYMENT_DISTRIBUTIONS = {
  commercial: {
    allowedPercentageMean: 0.62,
    allowedPercentageStdDev: 0.10,
    allowedPercentageMin: 0.40,
    allowedPercentageMax: 0.85,
  },
  medicare: {
    allowedPercentageMean: 0.45,
    allowedPercentageStdDev: 0.08,
    allowedPercentageMin: 0.30,
    allowedPercentageMax: 0.60,
  },
  medicaid: {
    allowedPercentageMean: 0.35,
    allowedPercentageStdDev: 0.10,
    allowedPercentageMin: 0.20,
    allowedPercentageMax: 0.50,
  },
  workers_comp: {
    allowedPercentageMean: 0.72,
    allowedPercentageStdDev: 0.08,
    allowedPercentageMin: 0.55,
    allowedPercentageMax: 0.90,
  },
  tricare: {
    allowedPercentageMean: 0.55,
    allowedPercentageStdDev: 0.08,
    allowedPercentageMin: 0.40,
    allowedPercentageMax: 0.70,
  },
  self_pay: {
    allowedPercentageMean: 1.0,
    allowedPercentageStdDev: 0.0,
    allowedPercentageMin: 1.0,
    allowedPercentageMax: 1.0,
  },
} as const

/**
 * Processing time distributions (in days)
 * Time from submission to various statuses
 */
export const PROCESSING_TIME_DISTRIBUTIONS = {
  // Days from submission to acknowledgment
  acknowledgment: {
    mean: 2,
    stdDev: 1,
    min: 1,
    max: 5,
  },
  // Days from submission to adjudication (paid/denied)
  adjudication: {
    mean: 21,
    stdDev: 10,
    min: 7,
    max: 45,
  },
  // Days a claim might stay in pending before resolution
  pendingResolution: {
    mean: 30,
    stdDev: 15,
    min: 14,
    max: 90,
  },
  // Days from denial to appeal submission
  appealSubmission: {
    mean: 14,
    stdDev: 7,
    min: 3,
    max: 30,
  },
  // Days for appeal resolution
  appealResolution: {
    mean: 45,
    stdDev: 15,
    min: 21,
    max: 90,
  },
} as const

/**
 * Line item distributions
 * Number of line items per claim by specialty
 */
export const LINE_ITEM_DISTRIBUTIONS: Record<string, { mean: number; stdDev: number; min: number; max: number }> = {
  "Orthopedic Surgery": { mean: 3.5, stdDev: 1.5, min: 1, max: 8 },
  "Family Practice": { mean: 2.5, stdDev: 1.0, min: 1, max: 6 },
  "Cardiology": { mean: 4.0, stdDev: 1.5, min: 1, max: 10 },
  "Pediatrics": { mean: 3.0, stdDev: 1.5, min: 1, max: 8 },
  "Gastroenterology": { mean: 3.0, stdDev: 1.0, min: 1, max: 6 },
  "OB/GYN": { mean: 2.5, stdDev: 1.0, min: 1, max: 5 },
  "Pain Management": { mean: 3.5, stdDev: 1.0, min: 1, max: 7 },
  "Dermatology": { mean: 2.5, stdDev: 1.0, min: 1, max: 6 },
}

/**
 * Diagnosis count distributions
 * Number of diagnosis codes per claim
 */
export const DIAGNOSIS_COUNT_DISTRIBUTIONS = {
  mean: 3,
  stdDev: 1.5,
  min: 1,
  max: 8,
}

/**
 * Appeal outcome distributions
 */
export const APPEAL_OUTCOME_DISTRIBUTION = {
  overturned: 0.40,
  partially_overturned: 0.15,
  upheld: 0.45,
}

/**
 * Task generation rates
 * Probability of generating certain task types
 */
export const TASK_GENERATION_RATES = {
  // Tasks for denied claims
  denialReview: 1.0, // Always create task for denial
  // Tasks for pending claims over N days
  pendingFollowUp: {
    threshold30Days: 0.80,
    threshold60Days: 1.0,
  },
  // Tasks for approaching appeal deadlines
  appealDeadlineWarning: {
    days30Before: 0.50,
    days14Before: 0.90,
    days7Before: 1.0,
  },
  // Tasks for eligibility issues
  eligibilityVerification: 0.70,
}

/**
 * Daily status transition probabilities
 * Used for progressing claims through their lifecycle
 */
export const DAILY_STATUS_TRANSITIONS = {
  // Probability of transitioning from submitted to acknowledged
  submitted_to_acknowledged: {
    probability: 0.60,
    minDays: 1,
    maxDays: 3,
  },
  // Probability of transitioning from acknowledged to pending
  acknowledged_to_pending: {
    probability: 0.70,
    minDays: 1,
    maxDays: 5,
  },
  // Daily probability of transitioning from pending (after min days)
  pending_to_paid: {
    dailyProbability: 0.10,
    minDays: 14,
  },
  pending_to_denied: {
    dailyProbability: 0.02,
    minDays: 14,
  },
  // Probability of denied claim getting appealed
  denied_to_appealing: {
    probability: 0.40,
    withinDays: 30,
  },
}

/**
 * Helper function to select based on status distribution
 */
export function selectClaimStatus(
  ageCategory: "recent" | "aging" | "historical"
): string {
  const distribution = CLAIM_STATUS_DISTRIBUTION[ageCategory]
  const entries = Object.entries(distribution)
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (const [status, weight] of entries) {
    random -= weight
    if (random <= 0) {
      return status
    }
  }

  return "pending"
}

/**
 * Helper function to calculate allowed amount
 */
export function calculateAllowedAmount(
  chargedAmount: number,
  payerType: keyof typeof PAYMENT_DISTRIBUTIONS
): number {
  const dist = PAYMENT_DISTRIBUTIONS[payerType]

  // Generate allowed percentage with normal distribution
  let percentage = dist.allowedPercentageMean +
    (Math.random() * 2 - 1) * dist.allowedPercentageStdDev

  // Clamp to min/max
  percentage = Math.max(dist.allowedPercentageMin, Math.min(dist.allowedPercentageMax, percentage))

  const allowed = chargedAmount * percentage
  return Math.round(allowed * 100) / 100
}

/**
 * Helper function to get line item count
 */
export function getLineItemCount(specialty: string): number {
  const dist = LINE_ITEM_DISTRIBUTIONS[specialty] || LINE_ITEM_DISTRIBUTIONS["Family Practice"]

  let count = Math.round(dist.mean + (Math.random() * 2 - 1) * dist.stdDev)
  return Math.max(dist.min, Math.min(dist.max, count))
}

/**
 * Helper function to get diagnosis count
 */
export function getDiagnosisCount(): number {
  const dist = DIAGNOSIS_COUNT_DISTRIBUTIONS

  let count = Math.round(dist.mean + (Math.random() * 2 - 1) * dist.stdDev)
  return Math.max(dist.min, Math.min(dist.max, count))
}

/**
 * Helper to select appeal outcome
 */
export function selectAppealOutcome(): "overturned" | "partially_overturned" | "upheld" {
  const random = Math.random()

  if (random < APPEAL_OUTCOME_DISTRIBUTION.overturned) {
    return "overturned"
  }
  if (random < APPEAL_OUTCOME_DISTRIBUTION.overturned + APPEAL_OUTCOME_DISTRIBUTION.partially_overturned) {
    return "partially_overturned"
  }
  return "upheld"
}
