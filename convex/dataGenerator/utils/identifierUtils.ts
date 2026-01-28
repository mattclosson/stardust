/**
 * Identifier generation utilities
 * Generates realistic NPIs, MRNs, claim numbers, member IDs, etc.
 */

import { randomInt } from "./randomUtils"

/**
 * Generate a valid NPI (National Provider Identifier)
 * NPIs are 10-digit numbers that pass the Luhn check
 */
export function generateNPI(): string {
  // Start with the healthcare provider prefix "80840"
  const prefix = "80840"
  
  // Generate 4 random digits
  let base = ""
  for (let i = 0; i < 4; i++) {
    base += randomInt(0, 9).toString()
  }
  
  const withoutCheck = prefix + base
  
  // Calculate Luhn check digit
  let sum = 0
  let alternate = false
  
  for (let i = withoutCheck.length - 1; i >= 0; i--) {
    let digit = parseInt(withoutCheck[i], 10)
    
    if (alternate) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    
    sum += digit
    alternate = !alternate
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  
  // Return only the 10-digit NPI (without the 80840 prefix used for calculation)
  return base + checkDigit.toString() + randomInt(10000, 99999).toString()
}

/**
 * Generate a simpler but still realistic-looking NPI
 * Format: 1XXXXXXXXX (starts with 1, 10 digits total)
 */
export function generateSimpleNPI(): string {
  return "1" + String(randomInt(100000000, 999999999))
}

/**
 * Generate a Medical Record Number (MRN)
 * Format varies by organization, typically alphanumeric
 */
export function generateMRN(orgPrefix: string, sequence: number): string {
  const paddedSequence = String(sequence).padStart(6, "0")
  return `${orgPrefix}-${paddedSequence}`
}

/**
 * Generate a unique claim number
 * Format: CLM-YYYY-XXXXXXXX
 */
export function generateClaimNumber(
  year: number,
  orgCode: string,
  sequence: number
): string {
  const paddedSequence = String(sequence).padStart(8, "0")
  return `${orgCode}-${year}-${paddedSequence}`
}

/**
 * Generate a payer claim number (assigned by the payer)
 * Format varies by payer
 */
export function generatePayerClaimNumber(payerPrefix: string): string {
  const randomPart = randomInt(100000000000, 999999999999)
  return `${payerPrefix}${randomPart}`
}

/**
 * Generate a member ID
 * Format varies by payer type
 */
export function generateMemberId(
  payerType: "commercial" | "medicare" | "medicaid" | "tricare" | "workers_comp" | "self_pay",
  payerPrefix: string
): string {
  switch (payerType) {
    case "medicare":
      // Medicare Beneficiary Identifier (MBI) format: 1AN9-AN9-AA99
      return generateMBI()
    case "medicaid":
      // State-specific format, typically 9-12 digits
      return `${payerPrefix}${randomInt(100000000, 999999999)}`
    case "tricare":
      // DoD Benefits Number format
      return `${randomInt(1000000000, 9999999999)}`
    case "commercial":
    case "workers_comp":
    default:
      // Alphanumeric format
      return `${payerPrefix}${randomInt(100000000, 999999999)}`
  }
}

/**
 * Generate a Medicare Beneficiary Identifier (MBI)
 * Format: CANNNNNCAN where C=letter (not S,L,O,I,B,Z), A=letter or number, N=number
 */
function generateMBI(): string {
  const validLetters = "ACDEFGHJKMNPQRTUVWXY"
  const alphanumeric = "ACDEFGHJKMNPQRTUVWXY0123456789"
  
  const c1 = validLetters[randomInt(0, validLetters.length - 1)]
  const a1 = alphanumeric[randomInt(0, alphanumeric.length - 1)]
  const n1 = randomInt(0, 9)
  const n2 = randomInt(0, 9)
  const a2 = alphanumeric[randomInt(0, alphanumeric.length - 1)]
  const a3 = alphanumeric[randomInt(0, alphanumeric.length - 1)]
  const n3 = randomInt(0, 9)
  const c2 = validLetters[randomInt(0, validLetters.length - 1)]
  const a4 = alphanumeric[randomInt(0, alphanumeric.length - 1)]
  const n4 = randomInt(0, 9)
  const n5 = randomInt(0, 9)
  
  return `${c1}${a1}${n1}${n2}${a2}${a3}${n3}${c2}${a4}${n4}${n5}`
}

/**
 * Generate a group number for insurance
 */
export function generateGroupNumber(companyCode: string): string {
  return `${companyCode}${randomInt(100000, 999999)}`
}

/**
 * Generate a Tax ID (EIN format)
 * Format: XX-XXXXXXX
 */
export function generateTaxId(): string {
  const prefix = randomInt(10, 99)
  const suffix = randomInt(1000000, 9999999)
  return `${prefix}-${suffix}`
}

/**
 * Generate a prior authorization number
 */
export function generateAuthNumber(payerPrefix: string): string {
  return `${payerPrefix}AUTH${randomInt(10000000, 99999999)}`
}

/**
 * Generate a check number
 */
export function generateCheckNumber(): string {
  return String(randomInt(100000, 999999))
}

/**
 * Generate an EFT trace number
 */
export function generateTraceNumber(): string {
  return String(randomInt(100000000000000, 999999999999999))
}

/**
 * Generate an ERA ID
 */
export function generateERAId(): string {
  const date = new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
  return `ERA${dateStr}${randomInt(100000, 999999)}`
}

/**
 * Generate a phone number (US format)
 */
export function generatePhoneNumber(areaCode?: string): string {
  const area = areaCode || String(randomInt(200, 999))
  const exchange = randomInt(200, 999)
  const subscriber = randomInt(1000, 9999)
  return `${area}-${exchange}-${subscriber}`
}

/**
 * Generate a ZIP code
 */
export function generateZipCode(statePrefix?: string): string {
  // If state prefix provided, use realistic ranges
  if (statePrefix) {
    const zipRanges: Record<string, [number, number]> = {
      CA: [90001, 96162],
      NY: [10001, 14925],
      TX: [73301, 79999],
      FL: [32003, 34997],
      IL: [60001, 62999],
      PA: [15001, 19640],
      AZ: [85001, 86556],
      CO: [80001, 81658],
      MA: [1001, 2791],
      MN: [55001, 56763],
    }
    
    const range = zipRanges[statePrefix] || [10000, 99999]
    return String(randomInt(range[0], range[1])).padStart(5, "0")
  }
  
  return String(randomInt(10000, 99999))
}

/**
 * Generate a provider taxonomy code
 * These are NUCC Healthcare Provider Taxonomy codes
 */
export function generateTaxonomyCode(specialty: string): string {
  const taxonomyCodes: Record<string, string[]> = {
    "Orthopedic Surgery": ["207X00000X", "207XS0114X", "207XS0106X"],
    "Family Practice": ["207Q00000X", "207QA0505X", "207QA0000X"],
    "Cardiology": ["207RC0000X", "207RI0011X", "207RC0001X"],
    "Pediatrics": ["208000000X", "2080A0000X", "2080P0006X"],
    "Gastroenterology": ["207RG0100X", "207RG0300X"],
    "OB/GYN": ["207V00000X", "207VX0201X", "207VG0400X"],
    "Pain Management": ["208VP0014X", "208VP0000X"],
    "Dermatology": ["207N00000X", "207ND0900X", "207NI0002X"],
    "Internal Medicine": ["207R00000X", "207RA0000X"],
    "General Practice": ["208D00000X"],
  }
  
  const codes = taxonomyCodes[specialty] || ["208D00000X"]
  return codes[randomInt(0, codes.length - 1)]
}
