/**
 * Payer configurations
 * Insurance companies with their characteristics and contact info
 */

export interface PayerConfig {
  id: string
  name: string
  payerType: "commercial" | "medicare" | "medicaid" | "tricare" | "workers_comp" | "self_pay"
  payerId: string // EDI payer ID
  submissionMethod: "electronic" | "paper"
  timelyFilingDays: number
  appealDeadlineDays: number
  providerServicesPhone: string
  claimsPhone: string
  // Address for paper claims
  address?: {
    line1: string
    city: string
    state: string
    zip: string
  }
  // Claim processing characteristics
  avgProcessingDays: number
  denialRate: number // Base denial rate for this payer
  allowedPercentage: number // Typical allowed amount as % of billed
}

export const PAYER_CONFIGS: PayerConfig[] = [
  // Commercial Payers
  {
    id: "BCBS",
    name: "Blue Cross Blue Shield",
    payerType: "commercial",
    payerId: "BCBS001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18005214387",
    claimsPhone: "+18005214387",
    avgProcessingDays: 21,
    denialRate: 0.12,
    allowedPercentage: 0.65,
  },
  {
    id: "AETNA",
    name: "Aetna",
    payerType: "commercial",
    payerId: "AETNA001",
    submissionMethod: "electronic",
    timelyFilingDays: 180,
    appealDeadlineDays: 60,
    providerServicesPhone: "+18008727713",
    claimsPhone: "+18008727713",
    avgProcessingDays: 18,
    denialRate: 0.15,
    allowedPercentage: 0.60,
  },
  {
    id: "UHC",
    name: "United Healthcare",
    payerType: "commercial",
    payerId: "UHC001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18778423210",
    claimsPhone: "+18778423210",
    avgProcessingDays: 25,
    denialRate: 0.18,
    allowedPercentage: 0.58,
  },
  {
    id: "CIGNA",
    name: "Cigna",
    payerType: "commercial",
    payerId: "CIGNA001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18005973622",
    claimsPhone: "+18005973622",
    avgProcessingDays: 20,
    denialRate: 0.14,
    allowedPercentage: 0.62,
  },
  {
    id: "HUMANA",
    name: "Humana",
    payerType: "commercial",
    payerId: "HUMANA001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18004486684",
    claimsPhone: "+18004486684",
    avgProcessingDays: 22,
    denialRate: 0.16,
    allowedPercentage: 0.55,
  },
  {
    id: "KAISER",
    name: "Kaiser Permanente",
    payerType: "commercial",
    payerId: "KAISER001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18004647818",
    claimsPhone: "+18004647818",
    avgProcessingDays: 15,
    denialRate: 0.10,
    allowedPercentage: 0.70,
  },
  {
    id: "ANTHEM",
    name: "Anthem Blue Cross",
    payerType: "commercial",
    payerId: "ANTHEM001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18009738687",
    claimsPhone: "+18009738687",
    avgProcessingDays: 24,
    denialRate: 0.17,
    allowedPercentage: 0.60,
  },

  // Medicare
  {
    id: "MEDICARE",
    name: "Medicare",
    payerType: "medicare",
    payerId: "CMS001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 120,
    providerServicesPhone: "+18773235452",
    claimsPhone: "+18773235452",
    avgProcessingDays: 14,
    denialRate: 0.08,
    allowedPercentage: 0.45,
  },
  {
    id: "MEDICARE_ADV_UHC",
    name: "UnitedHealthcare Medicare Advantage",
    payerType: "medicare",
    payerId: "UHCMA001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 60,
    providerServicesPhone: "+18778424240",
    claimsPhone: "+18778424240",
    avgProcessingDays: 21,
    denialRate: 0.20,
    allowedPercentage: 0.50,
  },
  {
    id: "MEDICARE_ADV_HUMANA",
    name: "Humana Medicare Advantage",
    payerType: "medicare",
    payerId: "HUMMA001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 60,
    providerServicesPhone: "+18004576729",
    claimsPhone: "+18004576729",
    avgProcessingDays: 20,
    denialRate: 0.19,
    allowedPercentage: 0.48,
  },
  {
    id: "MEDICARE_ADV_AETNA",
    name: "Aetna Medicare Advantage",
    payerType: "medicare",
    payerId: "AETMA001",
    submissionMethod: "electronic",
    timelyFilingDays: 180,
    appealDeadlineDays: 60,
    providerServicesPhone: "+18002827833",
    claimsPhone: "+18002827833",
    avgProcessingDays: 19,
    denialRate: 0.18,
    allowedPercentage: 0.52,
  },

  // Medicaid (state-specific)
  {
    id: "MEDICAID_CA",
    name: "Medi-Cal",
    payerType: "medicaid",
    payerId: "MEDCA001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 90,
    providerServicesPhone: "+19163260023",
    claimsPhone: "+19163260023",
    avgProcessingDays: 30,
    denialRate: 0.12,
    allowedPercentage: 0.35,
  },
  {
    id: "MEDICAID_IL",
    name: "Illinois Medicaid",
    payerType: "medicaid",
    payerId: "MEDIL001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 90,
    providerServicesPhone: "+18774665161",
    claimsPhone: "+18774665161",
    avgProcessingDays: 35,
    denialRate: 0.14,
    allowedPercentage: 0.32,
  },
  {
    id: "MEDICAID_FL",
    name: "Florida Medicaid",
    payerType: "medicaid",
    payerId: "MEDFL001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 90,
    providerServicesPhone: "+18882034662",
    claimsPhone: "+18882034662",
    avgProcessingDays: 28,
    denialRate: 0.13,
    allowedPercentage: 0.30,
  },
  {
    id: "MEDICAID_TX",
    name: "Texas Medicaid",
    payerType: "medicaid",
    payerId: "MEDTX001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 120,
    providerServicesPhone: "+18005289091",
    claimsPhone: "+18005289091",
    avgProcessingDays: 32,
    denialRate: 0.15,
    allowedPercentage: 0.33,
  },
  {
    id: "MEDICAID_AZ",
    name: "AHCCCS (Arizona Medicaid)",
    payerType: "medicaid",
    payerId: "MEDAZ001",
    submissionMethod: "electronic",
    timelyFilingDays: 180,
    appealDeadlineDays: 60,
    providerServicesPhone: "+16024176000",
    claimsPhone: "+16024176000",
    avgProcessingDays: 25,
    denialRate: 0.11,
    allowedPercentage: 0.38,
  },
  {
    id: "MEDICAID_MN",
    name: "Minnesota Medical Assistance",
    payerType: "medicaid",
    payerId: "MEDMN001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 90,
    providerServicesPhone: "+16512966200",
    claimsPhone: "+16512966200",
    avgProcessingDays: 24,
    denialRate: 0.10,
    allowedPercentage: 0.40,
  },
  {
    id: "MEDICAID_MA",
    name: "MassHealth",
    payerType: "medicaid",
    payerId: "MEDMA001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 90,
    providerServicesPhone: "+18008411900",
    claimsPhone: "+18008411900",
    avgProcessingDays: 26,
    denialRate: 0.09,
    allowedPercentage: 0.42,
  },
  {
    id: "MEDICAID_CO",
    name: "Health First Colorado",
    payerType: "medicaid",
    payerId: "MEDCO001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 60,
    providerServicesPhone: "+18003799989",
    claimsPhone: "+18003799989",
    avgProcessingDays: 22,
    denialRate: 0.10,
    allowedPercentage: 0.38,
  },

  // Workers Compensation
  {
    id: "WORKCOMP_TRAVELERS",
    name: "Travelers Workers Comp",
    payerType: "workers_comp",
    payerId: "TRAVWC001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18002525100",
    claimsPhone: "+18002525100",
    avgProcessingDays: 35,
    denialRate: 0.22,
    allowedPercentage: 0.75,
  },
  {
    id: "WORKCOMP_LIBERTY",
    name: "Liberty Mutual Workers Comp",
    payerType: "workers_comp",
    payerId: "LIBWC001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18882559823",
    claimsPhone: "+18882559823",
    avgProcessingDays: 40,
    denialRate: 0.25,
    allowedPercentage: 0.70,
  },
  {
    id: "WORKCOMP_HARTFORD",
    name: "Hartford Workers Comp",
    payerType: "workers_comp",
    payerId: "HARTWC001",
    submissionMethod: "electronic",
    timelyFilingDays: 365,
    appealDeadlineDays: 180,
    providerServicesPhone: "+18005474823",
    claimsPhone: "+18005474823",
    avgProcessingDays: 38,
    denialRate: 0.23,
    allowedPercentage: 0.72,
  },

  // Self-Pay (placeholder for tracking)
  {
    id: "SELFPAY",
    name: "Self-Pay",
    payerType: "self_pay",
    payerId: "SELF001",
    submissionMethod: "paper",
    timelyFilingDays: 9999,
    appealDeadlineDays: 9999,
    providerServicesPhone: "",
    claimsPhone: "",
    avgProcessingDays: 0,
    denialRate: 0,
    allowedPercentage: 1.0,
  },
]

/**
 * Get payers by type
 */
export function getPayersByType(type: PayerConfig["payerType"]): PayerConfig[] {
  return PAYER_CONFIGS.filter(p => p.payerType === type)
}

/**
 * Get payer by ID
 */
export function getPayerById(id: string): PayerConfig | undefined {
  return PAYER_CONFIGS.find(p => p.id === id)
}

/**
 * Get payers for a specific state (Medicaid)
 */
export function getMedicaidPayerForState(state: string): PayerConfig | undefined {
  const stateMap: Record<string, string> = {
    CA: "MEDICAID_CA",
    IL: "MEDICAID_IL",
    FL: "MEDICAID_FL",
    TX: "MEDICAID_TX",
    AZ: "MEDICAID_AZ",
    MN: "MEDICAID_MN",
    MA: "MEDICAID_MA",
    CO: "MEDICAID_CO",
  }
  
  const payerId = stateMap[state]
  if (payerId) {
    return getPayerById(payerId)
  }
  
  // Default to a generic Medicaid if state not found
  return getPayerById("MEDICAID_CA")
}

/**
 * Select a random commercial payer
 */
export function selectRandomCommercialPayer(): PayerConfig {
  const commercial = getPayersByType("commercial")
  return commercial[Math.floor(Math.random() * commercial.length)]
}

/**
 * Select a random Medicare Advantage payer
 */
export function selectRandomMedicareAdvantage(): PayerConfig {
  const ma = PAYER_CONFIGS.filter(p => p.id.startsWith("MEDICARE_ADV"))
  if (ma.length === 0) {
    return getPayerById("MEDICARE")!
  }
  return ma[Math.floor(Math.random() * ma.length)]
}

/**
 * Select a random workers comp payer
 */
export function selectRandomWorkersComp(): PayerConfig {
  const wc = getPayersByType("workers_comp")
  return wc[Math.floor(Math.random() * wc.length)]
}
