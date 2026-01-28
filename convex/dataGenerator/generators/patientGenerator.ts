/**
 * Patient and coverage generator
 * Creates realistic patient records with insurance coverage
 */

import { Id } from "../../_generated/dataModel"
import {
  generateMRN,
  generateMemberId,
  generateGroupNumber,
  generatePhoneNumber,
  generateZipCode,
} from "../utils/identifierUtils"
import {
  generateFullName,
  generateStreetAddress,
  generateUnit,
  generateCity,
  generateEmail,
  generateDateOfBirth,
} from "../utils/nameGenerator"
import { pickRandom, chance, randomInt } from "../utils/randomUtils"
import { OrganizationProfile } from "../config/organizations"
import { PayerConfig, PAYER_CONFIGS, getMedicaidPayerForState, selectRandomCommercialPayer, selectRandomMedicareAdvantage, selectRandomWorkersComp, getPayerById } from "../config/payers"

/**
 * Generate patient data for database insertion
 */
export interface GeneratedPatient {
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: "M" | "F" | "U"
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    zip: string
  }
  phone?: string
  email?: string
}

/**
 * Generate coverage data for database insertion
 */
export interface GeneratedCoverage {
  priority: "primary" | "secondary" | "tertiary"
  memberId: string
  groupNumber?: string
  planName?: string
  effectiveDate: string
  terminationDate?: string
  copay?: number
  deductible?: number
  deductibleMet?: number
  outOfPocketMax?: number
  outOfPocketMet?: number
  verificationStatus: "unverified" | "verified" | "failed"
  payerConfigId: string // Reference to PAYER_CONFIGS
}

/**
 * Generate a single patient with their coverages
 */
export function generatePatient(
  orgProfile: OrganizationProfile,
  sequence: number
): { patient: GeneratedPatient; coverages: GeneratedCoverage[] } {
  // Generate demographics based on specialty
  const { firstName, lastName, gender } = generateFullName()
  const state = orgProfile.region.state

  const patient: GeneratedPatient = {
    mrn: generateMRN(orgProfile.id, sequence),
    firstName,
    lastName,
    dateOfBirth: generateDateOfBirth(
      orgProfile.patientDemographics.meanAge,
      orgProfile.patientDemographics.ageStdDev,
      orgProfile.patientDemographics.minAge,
      orgProfile.patientDemographics.maxAge
    ),
    gender,
    address: {
      line1: generateStreetAddress(),
      line2: generateUnit(),
      city: generateCity(state),
      state,
      zip: generateZipCode(state),
    },
    phone: chance(0.85) ? generatePhoneNumber(orgProfile.region.areaCode) : undefined,
    email: chance(0.60) ? generateEmail(firstName, lastName) : undefined,
  }

  // Generate coverages based on payer mix
  const coverages = generateCoveragesForPatient(orgProfile, patient)

  return { patient, coverages }
}

/**
 * Generate coverages for a patient based on organization's payer mix
 */
function generateCoveragesForPatient(
  orgProfile: OrganizationProfile,
  patient: GeneratedPatient
): GeneratedCoverage[] {
  const coverages: GeneratedCoverage[] = []
  const payerMix = orgProfile.payerMix

  // Determine primary payer type based on payer mix
  const payerTypeRandom = Math.random()
  let primaryPayerType: "commercial" | "medicare" | "medicaid" | "workers_comp" | "self_pay"
  let cumulative = 0

  cumulative += payerMix.commercial
  if (payerTypeRandom < cumulative) {
    primaryPayerType = "commercial"
  } else {
    cumulative += payerMix.medicare
    if (payerTypeRandom < cumulative) {
      primaryPayerType = "medicare"
    } else {
      cumulative += payerMix.medicaid
      if (payerTypeRandom < cumulative) {
        primaryPayerType = "medicaid"
      } else {
        cumulative += payerMix.workersComp
        if (payerTypeRandom < cumulative) {
          primaryPayerType = "workers_comp"
        } else {
          primaryPayerType = "self_pay"
        }
      }
    }
  }

  // Get the actual payer config
  let primaryPayer: PayerConfig

  switch (primaryPayerType) {
    case "commercial":
      primaryPayer = selectRandomCommercialPayer()
      break
    case "medicare":
      // 60% Medicare Advantage, 40% Original Medicare
      primaryPayer = chance(0.60) ? selectRandomMedicareAdvantage() : getPayerById("MEDICARE")!
      break
    case "medicaid":
      primaryPayer = getMedicaidPayerForState(orgProfile.region.state) || PAYER_CONFIGS.find(p => p.payerType === "medicaid")!
      break
    case "workers_comp":
      primaryPayer = selectRandomWorkersComp()
      break
    case "self_pay":
    default:
      primaryPayer = getPayerById("SELFPAY")!
      break
  }

  // Create primary coverage
  const effectiveDate = generateEffectiveDate()
  
  coverages.push(generateCoverage(primaryPayer, "primary", effectiveDate))

  // Some patients have secondary coverage (15% chance)
  if (chance(0.15) && primaryPayerType !== "self_pay") {
    let secondaryPayer: PayerConfig

    // Secondary is often Medicare for older patients or commercial for Medicare patients
    if (primaryPayerType === "medicare") {
      secondaryPayer = selectRandomCommercialPayer()
    } else if (primaryPayerType === "commercial") {
      // Could be another commercial (spouse's plan) or Medicare
      secondaryPayer = chance(0.30) ? getPayerById("MEDICARE")! : selectRandomCommercialPayer()
    } else {
      secondaryPayer = selectRandomCommercialPayer()
    }

    coverages.push(generateCoverage(secondaryPayer, "secondary", effectiveDate))
  }

  return coverages
}

/**
 * Generate a single coverage record
 */
function generateCoverage(
  payer: PayerConfig,
  priority: "primary" | "secondary" | "tertiary",
  effectiveDate: string
): GeneratedCoverage {
  const coverage: GeneratedCoverage = {
    priority,
    memberId: generateMemberId(payer.payerType, payer.id.substring(0, 3)),
    effectiveDate,
    verificationStatus: chance(0.85) ? "verified" : chance(0.50) ? "unverified" : "failed",
    payerConfigId: payer.id,
  }

  // Add group number for commercial
  if (payer.payerType === "commercial") {
    coverage.groupNumber = generateGroupNumber(payer.id.substring(0, 3))
    coverage.planName = pickRandom([
      "PPO Standard",
      "PPO Premium",
      "HMO Basic",
      "HMO Plus",
      "EPO Select",
      "POS Flex",
      "High Deductible Health Plan",
    ])
  }

  // Add benefit details for commercial/medicare
  if (payer.payerType === "commercial" || payer.payerType === "medicare") {
    coverage.copay = pickRandom([20, 25, 30, 35, 40, 50])
    coverage.deductible = pickRandom([500, 1000, 1500, 2000, 2500, 3000, 5000])
    coverage.deductibleMet = Math.round(Math.random() * coverage.deductible * 100) / 100
    coverage.outOfPocketMax = pickRandom([3000, 4000, 5000, 6000, 7500, 8000, 10000])
    coverage.outOfPocketMet = Math.round(Math.random() * coverage.outOfPocketMax * 0.3 * 100) / 100
  }

  // Termination date for some coverages (10% terminated)
  if (chance(0.10)) {
    const effDate = new Date(effectiveDate)
    const termDate = new Date(effDate)
    termDate.setMonth(termDate.getMonth() + randomInt(6, 24))
    coverage.terminationDate = termDate.toISOString().split("T")[0]
  }

  return coverage
}

/**
 * Generate a realistic effective date
 * Most coverages start Jan 1 of some year
 */
function generateEffectiveDate(): string {
  const currentYear = new Date().getFullYear()
  const year = currentYear - randomInt(0, 5)
  
  // 70% chance of Jan 1 start
  if (chance(0.70)) {
    return `${year}-01-01`
  }
  
  // Otherwise random month
  const month = String(randomInt(1, 12)).padStart(2, "0")
  return `${year}-${month}-01`
}

/**
 * Generate multiple patients for an organization
 */
export function generatePatientsForOrg(
  orgProfile: OrganizationProfile,
  count: number,
  startSequence: number = 1
): Array<{ patient: GeneratedPatient; coverages: GeneratedCoverage[] }> {
  const results: Array<{ patient: GeneratedPatient; coverages: GeneratedCoverage[] }> = []

  for (let i = 0; i < count; i++) {
    results.push(generatePatient(orgProfile, startSequence + i))
  }

  return results
}
