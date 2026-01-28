/**
 * 8 Healthcare Organization Profiles
 * Each with unique characteristics, specialties, and user stories
 */

export interface OrganizationProfile {
  id: string
  name: string
  npi: string
  taxId: string
  specialty: string
  facilityType: "physician_office" | "hospital_outpatient" | "asc" | "clinic"
  size: "small" | "medium" | "large"
  region: {
    city: string
    state: string
    zip: string
    areaCode: string
  }
  // Data generation parameters
  claimVolume: {
    historical: number // Total historical claims to generate
    dailyWeekday: number // New claims per weekday
    dailyWeekend: number // New claims per weekend day
  }
  patientCount: number
  providerCount: number
  // Payer mix (percentages that sum to 1)
  payerMix: {
    commercial: number
    medicare: number
    medicaid: number
    workersComp: number
    selfPay: number
  }
  // Denial characteristics
  denialRate: number // Overall denial rate (0-1)
  commonDenialCategories: {
    category: string
    weight: number
  }[]
  // Patient demographics
  patientDemographics: {
    meanAge: number
    ageStdDev: number
    minAge: number
    maxAge: number
  }
  // User story / narrative
  story: string
}

export const ORGANIZATION_PROFILES: OrganizationProfile[] = [
  {
    id: "SUMMIT",
    name: "Summit Orthopedic Institute",
    npi: "1234567001",
    taxId: "84-1234501",
    specialty: "Orthopedic Surgery",
    facilityType: "asc",
    size: "large",
    region: {
      city: "Denver",
      state: "CO",
      zip: "80202",
      areaCode: "303",
    },
    claimVolume: {
      historical: 100000,
      dailyWeekday: 150,
      dailyWeekend: 30,
    },
    patientCount: 25000,
    providerCount: 25,
    payerMix: {
      commercial: 0.55,
      medicare: 0.30,
      medicaid: 0.05,
      workersComp: 0.08,
      selfPay: 0.02,
    },
    denialRate: 0.18,
    commonDenialCategories: [
      { category: "authorization", weight: 0.35 },
      { category: "medical_necessity", weight: 0.25 },
      { category: "coding", weight: 0.15 },
      { category: "bundling", weight: 0.10 },
      { category: "eligibility", weight: 0.10 },
      { category: "other", weight: 0.05 },
    ],
    patientDemographics: {
      meanAge: 58,
      ageStdDev: 15,
      minAge: 18,
      maxAge: 95,
    },
    story: "High-volume joint replacement center serving the Denver metro area. Struggles with prior authorization denials for total knee and hip replacements. Strong commercial payer mix but dealing with increasing Medicare Advantage penetration and their stricter auth requirements.",
  },
  {
    id: "LAKESIDE",
    name: "Lakeside Family Medicine",
    npi: "1234567002",
    taxId: "41-1234502",
    specialty: "Family Practice",
    facilityType: "physician_office",
    size: "small",
    region: {
      city: "Minneapolis",
      state: "MN",
      zip: "55401",
      areaCode: "612",
    },
    claimVolume: {
      historical: 10000,
      dailyWeekday: 20,
      dailyWeekend: 5,
    },
    patientCount: 3000,
    providerCount: 4,
    payerMix: {
      commercial: 0.40,
      medicare: 0.25,
      medicaid: 0.28,
      workersComp: 0.02,
      selfPay: 0.05,
    },
    denialRate: 0.12,
    commonDenialCategories: [
      { category: "eligibility", weight: 0.30 },
      { category: "coordination_of_benefits", weight: 0.25 },
      { category: "missing_information", weight: 0.20 },
      { category: "coding", weight: 0.15 },
      { category: "other", weight: 0.10 },
    ],
    patientDemographics: {
      meanAge: 42,
      ageStdDev: 22,
      minAge: 0,
      maxAge: 95,
    },
    story: "Rural-adjacent family practice serving diverse population including many Medicaid patients. Frequent issues with eligibility verification and coordination of benefits. Small staff means delayed claim submissions and occasional timely filing issues.",
  },
  {
    id: "PACIFIC",
    name: "Pacific Cardiology Associates",
    npi: "1234567003",
    taxId: "94-1234503",
    specialty: "Cardiology",
    facilityType: "hospital_outpatient",
    size: "large",
    region: {
      city: "San Francisco",
      state: "CA",
      zip: "94102",
      areaCode: "415",
    },
    claimVolume: {
      historical: 100000,
      dailyWeekday: 150,
      dailyWeekend: 30,
    },
    patientCount: 25000,
    providerCount: 25,
    payerMix: {
      commercial: 0.50,
      medicare: 0.40,
      medicaid: 0.07,
      workersComp: 0.01,
      selfPay: 0.02,
    },
    denialRate: 0.22,
    commonDenialCategories: [
      { category: "medical_necessity", weight: 0.40 },
      { category: "authorization", weight: 0.25 },
      { category: "coding", weight: 0.15 },
      { category: "duplicate", weight: 0.10 },
      { category: "other", weight: 0.10 },
    ],
    patientDemographics: {
      meanAge: 65,
      ageStdDev: 12,
      minAge: 35,
      maxAge: 95,
    },
    story: "Prestigious cardiac center performing complex interventional procedures. High Medicare population with many MA plans. Struggles with medical necessity denials for advanced imaging and interventional procedures. Documentation is strong but payer policies are aggressive.",
  },
  {
    id: "SUNSHINE",
    name: "Sunshine Pediatrics Group",
    npi: "1234567004",
    taxId: "59-1234504",
    specialty: "Pediatrics",
    facilityType: "clinic",
    size: "medium",
    region: {
      city: "Miami",
      state: "FL",
      zip: "33101",
      areaCode: "305",
    },
    claimVolume: {
      historical: 60000,
      dailyWeekday: 80,
      dailyWeekend: 15,
    },
    patientCount: 12000,
    providerCount: 12,
    payerMix: {
      commercial: 0.30,
      medicare: 0.02,
      medicaid: 0.55,
      workersComp: 0.00,
      selfPay: 0.13,
    },
    denialRate: 0.15,
    commonDenialCategories: [
      { category: "coordination_of_benefits", weight: 0.30 },
      { category: "eligibility", weight: 0.25 },
      { category: "missing_information", weight: 0.20 },
      { category: "coding", weight: 0.15 },
      { category: "other", weight: 0.10 },
    ],
    patientDemographics: {
      meanAge: 8,
      ageStdDev: 5,
      minAge: 0,
      maxAge: 18,
    },
    story: "Busy pediatric practice serving Miami's diverse community. Heavy Medicaid population with many patients having divorced parents and complex COB situations. Vaccine administration is a major revenue driver but requires careful documentation for state Medicaid programs.",
  },
  {
    id: "METRO",
    name: "Metro Gastroenterology",
    npi: "1234567005",
    taxId: "36-1234505",
    specialty: "Gastroenterology",
    facilityType: "asc",
    size: "medium",
    region: {
      city: "Chicago",
      state: "IL",
      zip: "60601",
      areaCode: "312",
    },
    claimVolume: {
      historical: 60000,
      dailyWeekday: 80,
      dailyWeekend: 15,
    },
    patientCount: 12000,
    providerCount: 12,
    payerMix: {
      commercial: 0.45,
      medicare: 0.35,
      medicaid: 0.15,
      workersComp: 0.00,
      selfPay: 0.05,
    },
    denialRate: 0.20,
    commonDenialCategories: [
      { category: "bundling", weight: 0.30 },
      { category: "coding", weight: 0.25 },
      { category: "authorization", weight: 0.20 },
      { category: "medical_necessity", weight: 0.15 },
      { category: "other", weight: 0.10 },
    ],
    patientDemographics: {
      meanAge: 55,
      ageStdDev: 15,
      minAge: 18,
      maxAge: 90,
    },
    story: "High-volume colonoscopy screening center. Modifier usage is critical - frequently deals with bundling denials and modifier 25/59 issues. Screening vs diagnostic colonoscopy coding is a constant challenge. Strong focus on preventive care.",
  },
  {
    id: "VALLEY",
    name: "Valley Women's Health",
    npi: "1234567006",
    taxId: "86-1234506",
    specialty: "OB/GYN",
    facilityType: "physician_office",
    size: "small",
    region: {
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
      areaCode: "602",
    },
    claimVolume: {
      historical: 10000,
      dailyWeekday: 20,
      dailyWeekend: 5,
    },
    patientCount: 3000,
    providerCount: 4,
    payerMix: {
      commercial: 0.50,
      medicare: 0.10,
      medicaid: 0.30,
      workersComp: 0.00,
      selfPay: 0.10,
    },
    denialRate: 0.14,
    commonDenialCategories: [
      { category: "timely_filing", weight: 0.25 },
      { category: "eligibility", weight: 0.25 },
      { category: "authorization", weight: 0.20 },
      { category: "coding", weight: 0.15 },
      { category: "other", weight: 0.15 },
    ],
    patientDemographics: {
      meanAge: 32,
      ageStdDev: 10,
      minAge: 14,
      maxAge: 75,
    },
    story: "Small but growing OB/GYN practice with mix of routine care and surgical procedures. Global OB packages create billing complexity. Timely filing is a challenge due to delayed insurance information from pregnant patients. Growing AHCCCS (Arizona Medicaid) population.",
  },
  {
    id: "NORTHEAST",
    name: "Northeast Pain Management",
    npi: "1234567007",
    taxId: "04-1234507",
    specialty: "Pain Management",
    facilityType: "clinic",
    size: "medium",
    region: {
      city: "Boston",
      state: "MA",
      zip: "02101",
      areaCode: "617",
    },
    claimVolume: {
      historical: 60000,
      dailyWeekday: 80,
      dailyWeekend: 15,
    },
    patientCount: 12000,
    providerCount: 12,
    payerMix: {
      commercial: 0.35,
      medicare: 0.35,
      medicaid: 0.10,
      workersComp: 0.18,
      selfPay: 0.02,
    },
    denialRate: 0.25,
    commonDenialCategories: [
      { category: "medical_necessity", weight: 0.40 },
      { category: "authorization", weight: 0.25 },
      { category: "coding", weight: 0.15 },
      { category: "duplicate", weight: 0.10 },
      { category: "other", weight: 0.10 },
    ],
    patientDemographics: {
      meanAge: 52,
      ageStdDev: 14,
      minAge: 25,
      maxAge: 85,
    },
    story: "Pain management clinic with highest denial rate due to aggressive medical necessity scrutiny from payers. Epidural injections and nerve blocks require extensive documentation. Workers comp cases add complexity with different fee schedules and requirements.",
  },
  {
    id: "COASTAL",
    name: "Coastal Dermatology Center",
    npi: "1234567008",
    taxId: "95-1234508",
    specialty: "Dermatology",
    facilityType: "physician_office",
    size: "large",
    region: {
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
      areaCode: "213",
    },
    claimVolume: {
      historical: 100000,
      dailyWeekday: 150,
      dailyWeekend: 30,
    },
    patientCount: 25000,
    providerCount: 25,
    payerMix: {
      commercial: 0.65,
      medicare: 0.20,
      medicaid: 0.05,
      workersComp: 0.02,
      selfPay: 0.08,
    },
    denialRate: 0.16,
    commonDenialCategories: [
      { category: "coding", weight: 0.35 },
      { category: "medical_necessity", weight: 0.25 },
      { category: "bundling", weight: 0.15 },
      { category: "duplicate", weight: 0.10 },
      { category: "other", weight: 0.15 },
    ],
    patientDemographics: {
      meanAge: 45,
      ageStdDev: 18,
      minAge: 5,
      maxAge: 90,
    },
    story: "High-volume dermatology practice with mix of medical and cosmetic services. Key challenge is proper coding separation between cosmetic (non-covered) and medical (covered) procedures. Mohs surgery for skin cancer is a major revenue driver with specific billing requirements.",
  },
]

/**
 * Get organization profile by ID
 */
export function getOrganizationProfile(id: string): OrganizationProfile | undefined {
  return ORGANIZATION_PROFILES.find(org => org.id === id)
}

/**
 * Get organization size category
 */
export function getOrganizationsBySize(size: "small" | "medium" | "large"): OrganizationProfile[] {
  return ORGANIZATION_PROFILES.filter(org => org.size === size)
}

/**
 * Calculate total historical claims to generate
 */
export function getTotalHistoricalClaims(): number {
  return ORGANIZATION_PROFILES.reduce((sum, org) => sum + org.claimVolume.historical, 0)
}

/**
 * Calculate total patients to generate
 */
export function getTotalPatients(): number {
  return ORGANIZATION_PROFILES.reduce((sum, org) => sum + org.patientCount, 0)
}
