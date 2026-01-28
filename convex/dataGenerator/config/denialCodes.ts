/**
 * Denial codes (CARC/RARC) and denial categories
 * Maps denial codes to categories with overturn likelihood
 */

export interface DenialCodeConfig {
  code: string
  groupCode: "CO" | "PR" | "OA" | "PI" | "CR"
  description: string
  category: "eligibility" | "authorization" | "medical_necessity" | "coding" | "duplicate" | "timely_filing" | "bundling" | "coordination_of_benefits" | "missing_information" | "provider_enrollment" | "other"
  overturnLikelihood: number // 0-1, likelihood of successful appeal
  suggestedAction: string
  remarkCodes?: string[]
}

export const DENIAL_CODES: DenialCodeConfig[] = [
  // Eligibility denials
  {
    code: "CO-27",
    groupCode: "CO",
    description: "Expenses incurred after coverage terminated",
    category: "eligibility",
    overturnLikelihood: 0.25,
    suggestedAction: "Verify patient eligibility dates and resubmit with correct insurance information",
    remarkCodes: ["N130"],
  },
  {
    code: "CO-29",
    groupCode: "CO",
    description: "The time limit for filing has expired",
    category: "timely_filing",
    overturnLikelihood: 0.15,
    suggestedAction: "Review submission dates and check for proof of timely filing",
    remarkCodes: ["M86"],
  },
  {
    code: "CO-109",
    groupCode: "CO",
    description: "Claim not covered by this payer - submit to correct payer",
    category: "eligibility",
    overturnLikelihood: 0.40,
    suggestedAction: "Verify correct payer and resubmit to appropriate insurance",
  },
  {
    code: "PR-1",
    groupCode: "PR",
    description: "Deductible amount",
    category: "other",
    overturnLikelihood: 0.05,
    suggestedAction: "Bill patient for deductible amount",
  },
  {
    code: "PR-2",
    groupCode: "PR",
    description: "Coinsurance amount",
    category: "other",
    overturnLikelihood: 0.05,
    suggestedAction: "Bill patient for coinsurance amount",
  },
  {
    code: "PR-3",
    groupCode: "PR",
    description: "Co-payment amount",
    category: "other",
    overturnLikelihood: 0.05,
    suggestedAction: "Bill patient for co-payment amount",
  },

  // Authorization denials
  {
    code: "CO-15",
    groupCode: "CO",
    description: "Authorization was not obtained",
    category: "authorization",
    overturnLikelihood: 0.55,
    suggestedAction: "Request retro-authorization or submit medical records demonstrating urgency",
    remarkCodes: ["MA130", "N386"],
  },
  {
    code: "CO-197",
    groupCode: "CO",
    description: "Precertification/authorization/notification absent",
    category: "authorization",
    overturnLikelihood: 0.50,
    suggestedAction: "Obtain retro-authorization with supporting documentation",
    remarkCodes: ["N386"],
  },
  {
    code: "CO-198",
    groupCode: "CO",
    description: "Precertification/authorization/notification exceeded",
    category: "authorization",
    overturnLikelihood: 0.45,
    suggestedAction: "Request authorization for additional units/visits with clinical justification",
    remarkCodes: ["N387"],
  },

  // Medical necessity denials
  {
    code: "CO-50",
    groupCode: "CO",
    description: "These are non-covered services because this is not deemed a medical necessity",
    category: "medical_necessity",
    overturnLikelihood: 0.65,
    suggestedAction: "Submit appeal with comprehensive clinical documentation supporting medical necessity",
    remarkCodes: ["MA26", "N115"],
  },
  {
    code: "CO-167",
    groupCode: "CO",
    description: "This is not covered by this payer based on medical necessity",
    category: "medical_necessity",
    overturnLikelihood: 0.60,
    suggestedAction: "Gather peer-reviewed literature and clinical notes for appeal",
    remarkCodes: ["N115"],
  },
  {
    code: "CO-236",
    groupCode: "CO",
    description: "This procedure/service not approved for this diagnosis",
    category: "medical_necessity",
    overturnLikelihood: 0.55,
    suggestedAction: "Review diagnosis codes and ensure proper medical necessity documentation",
    remarkCodes: ["M76"],
  },

  // Coding denials
  {
    code: "CO-4",
    groupCode: "CO",
    description: "The procedure code is inconsistent with the modifier used",
    category: "coding",
    overturnLikelihood: 0.80,
    suggestedAction: "Review modifier usage and resubmit with correct modifier",
    remarkCodes: ["M18"],
  },
  {
    code: "CO-11",
    groupCode: "CO",
    description: "The diagnosis is inconsistent with the procedure",
    category: "coding",
    overturnLikelihood: 0.70,
    suggestedAction: "Review diagnosis-procedure pairing and correct coding",
    remarkCodes: ["M20"],
  },
  {
    code: "CO-16",
    groupCode: "CO",
    description: "Claim lacks information or has submission errors",
    category: "missing_information",
    overturnLikelihood: 0.85,
    suggestedAction: "Review claim for errors and resubmit with complete information",
    remarkCodes: ["MA04"],
  },
  {
    code: "CO-252",
    groupCode: "CO",
    description: "An attachment/other documentation is required to adjudicate this claim",
    category: "missing_information",
    overturnLikelihood: 0.90,
    suggestedAction: "Submit requested documentation with claim reference",
    remarkCodes: ["N479"],
  },

  // Bundling denials
  {
    code: "CO-97",
    groupCode: "CO",
    description: "The benefit for this service is included in another service performed on same day",
    category: "bundling",
    overturnLikelihood: 0.45,
    suggestedAction: "Review NCCI edits and add appropriate modifier if separate procedure",
    remarkCodes: ["M15"],
  },
  {
    code: "CO-59",
    groupCode: "CO",
    description: "Processed based on multiple or concurrent procedure rules",
    category: "bundling",
    overturnLikelihood: 0.50,
    suggestedAction: "Review bundling rules and add modifier 59 or X modifier if appropriate",
  },

  // Duplicate denials
  {
    code: "CO-18",
    groupCode: "CO",
    description: "Exact duplicate claim/service",
    category: "duplicate",
    overturnLikelihood: 0.30,
    suggestedAction: "Review for actual duplicate submission or adjust date/modifier for distinct service",
    remarkCodes: ["MA07"],
  },
  {
    code: "OA-18",
    groupCode: "OA",
    description: "Exact duplicate claim/service",
    category: "duplicate",
    overturnLikelihood: 0.35,
    suggestedAction: "Verify original claim status and appeal if not previously paid",
  },

  // Coordination of benefits
  {
    code: "CO-22",
    groupCode: "CO",
    description: "This care may be covered by another payer per coordination of benefits",
    category: "coordination_of_benefits",
    overturnLikelihood: 0.60,
    suggestedAction: "Verify primary/secondary payer order and submit to primary first",
    remarkCodes: ["N6"],
  },
  {
    code: "OA-23",
    groupCode: "OA",
    description: "The impact of prior payer adjudication including payments and adjustments",
    category: "coordination_of_benefits",
    overturnLikelihood: 0.55,
    suggestedAction: "Submit with primary EOB showing payment/adjustment",
  },
  {
    code: "CO-24",
    groupCode: "CO",
    description: "Charges are covered under a capitation agreement/managed care plan",
    category: "coordination_of_benefits",
    overturnLikelihood: 0.20,
    suggestedAction: "Verify patient's managed care plan assignment",
  },

  // Provider enrollment
  {
    code: "CO-185",
    groupCode: "CO",
    description: "The rendering provider is not eligible to perform the service billed",
    category: "provider_enrollment",
    overturnLikelihood: 0.70,
    suggestedAction: "Verify provider enrollment and credentials with payer",
    remarkCodes: ["N95"],
  },
  {
    code: "CO-150",
    groupCode: "CO",
    description: "Payer deems the information submitted does not support this level of service",
    category: "coding",
    overturnLikelihood: 0.60,
    suggestedAction: "Submit documentation supporting the billed level of service",
  },

  // Other common denials
  {
    code: "CO-96",
    groupCode: "CO",
    description: "Non-covered charge(s). These are non-covered services under the plan",
    category: "other",
    overturnLikelihood: 0.25,
    suggestedAction: "Verify plan coverage and consider patient self-pay",
  },
  {
    code: "CO-45",
    groupCode: "CO",
    description: "Charge exceeds fee schedule/maximum allowable",
    category: "other",
    overturnLikelihood: 0.10,
    suggestedAction: "Accept contracted rate or verify correct fee schedule applied",
  },
  {
    code: "CO-B7",
    groupCode: "CO",
    description: "Provider not certified to perform this service",
    category: "provider_enrollment",
    overturnLikelihood: 0.65,
    suggestedAction: "Verify provider certification or refer to qualified provider",
  },
]

/**
 * Get denial codes by category
 */
export function getDenialCodesByCategory(category: DenialCodeConfig["category"]): DenialCodeConfig[] {
  return DENIAL_CODES.filter(d => d.category === category)
}

/**
 * Select a random denial code for a category
 */
export function selectRandomDenialCode(category: DenialCodeConfig["category"]): DenialCodeConfig {
  const codes = getDenialCodesByCategory(category)
  if (codes.length === 0) {
    // Fallback to any denial code
    return DENIAL_CODES[Math.floor(Math.random() * DENIAL_CODES.length)]
  }
  return codes[Math.floor(Math.random() * codes.length)]
}

/**
 * Select a weighted random denial category based on organization profile
 */
export function selectRandomDenialCategory(
  categoryWeights: { category: string; weight: number }[]
): string {
  const totalWeight = categoryWeights.reduce((sum, cw) => sum + cw.weight, 0)
  let random = Math.random() * totalWeight

  for (const cw of categoryWeights) {
    random -= cw.weight
    if (random <= 0) {
      return cw.category
    }
  }

  return categoryWeights[categoryWeights.length - 1].category
}

/**
 * Get all unique denial categories
 */
export function getAllDenialCategories(): string[] {
  return [...new Set(DENIAL_CODES.map(d => d.category))]
}

/**
 * Generate a suggested action for AI analysis
 */
export function generateAISuggestedAction(code: DenialCodeConfig): string {
  return code.suggestedAction
}

/**
 * Generate AI analysis text
 */
export function generateAIAnalysis(code: DenialCodeConfig): string {
  const analyses = [
    `Based on historical data, this ${code.category} denial (${code.code}) has a ${Math.round(code.overturnLikelihood * 100)}% success rate on appeal. ${code.suggestedAction}`,
    `Denial code ${code.code} indicates ${code.description.toLowerCase()}. Similar denials in your organization have been overturned ${Math.round(code.overturnLikelihood * 100)}% of the time when properly documented.`,
    `This denial falls under the ${code.category.replace("_", " ")} category. Recommended approach: ${code.suggestedAction}`,
  ]

  return analyses[Math.floor(Math.random() * analyses.length)]
}
