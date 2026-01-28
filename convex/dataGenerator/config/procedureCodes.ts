/**
 * Procedure codes (CPT/HCPCS) by specialty
 * Each code includes charge ranges and frequency weights
 */

export interface ProcedureCode {
  code: string
  type: "CPT" | "HCPCS"
  description: string
  chargeMin: number
  chargeMax: number
  weight: number // Frequency weight (higher = more common)
  modifiers?: string[] // Common modifiers for this code
  authRequired?: boolean
  units?: { min: number; max: number }
}

export const PROCEDURE_CODES_BY_SPECIALTY: Record<string, ProcedureCode[]> = {
  "Orthopedic Surgery": [
    // Joint Replacements
    { code: "27447", type: "CPT", description: "Total knee replacement", chargeMin: 45000, chargeMax: 65000, weight: 15, authRequired: true },
    { code: "27130", type: "CPT", description: "Total hip replacement", chargeMin: 50000, chargeMax: 75000, weight: 12, authRequired: true },
    { code: "27446", type: "CPT", description: "Partial knee replacement", chargeMin: 35000, chargeMax: 50000, weight: 8, authRequired: true },
    // Arthroscopy
    { code: "29881", type: "CPT", description: "Arthroscopy knee with meniscectomy", chargeMin: 8000, chargeMax: 15000, weight: 20 },
    { code: "29880", type: "CPT", description: "Arthroscopy knee with meniscectomy medial and lateral", chargeMin: 10000, chargeMax: 18000, weight: 10 },
    { code: "29877", type: "CPT", description: "Arthroscopy knee debridement", chargeMin: 6000, chargeMax: 12000, weight: 15 },
    { code: "29876", type: "CPT", description: "Arthroscopy knee synovectomy", chargeMin: 7000, chargeMax: 14000, weight: 8 },
    { code: "29827", type: "CPT", description: "Arthroscopy shoulder rotator cuff repair", chargeMin: 12000, chargeMax: 25000, weight: 12, authRequired: true },
    // Fracture Care
    { code: "27236", type: "CPT", description: "ORIF femoral fracture", chargeMin: 15000, chargeMax: 30000, weight: 8, authRequired: true },
    { code: "27244", type: "CPT", description: "ORIF intertrochanteric fracture", chargeMin: 18000, chargeMax: 35000, weight: 6, authRequired: true },
    { code: "25607", type: "CPT", description: "ORIF distal radius fracture", chargeMin: 8000, chargeMax: 15000, weight: 10 },
    // Office Visits
    { code: "99213", type: "CPT", description: "Office visit established moderate", chargeMin: 150, chargeMax: 250, weight: 30 },
    { code: "99214", type: "CPT", description: "Office visit established high", chargeMin: 200, chargeMax: 350, weight: 25 },
    { code: "99203", type: "CPT", description: "Office visit new moderate", chargeMin: 200, chargeMax: 300, weight: 15 },
    // Injections
    { code: "20610", type: "CPT", description: "Arthrocentesis major joint", chargeMin: 200, chargeMax: 400, weight: 20 },
    { code: "J3301", type: "HCPCS", description: "Triamcinolone injection", chargeMin: 50, chargeMax: 150, weight: 18 },
    { code: "J7325", type: "HCPCS", description: "Synvisc injection", chargeMin: 800, chargeMax: 1500, weight: 10, authRequired: true },
    // Imaging
    { code: "73721", type: "CPT", description: "MRI lower extremity without contrast", chargeMin: 1200, chargeMax: 2500, weight: 15, authRequired: true },
    { code: "73721", type: "CPT", description: "MRI lower extremity with contrast", chargeMin: 1500, chargeMax: 3000, weight: 8, authRequired: true },
    { code: "73560", type: "CPT", description: "X-ray knee 2 views", chargeMin: 150, chargeMax: 300, weight: 25 },
  ],

  "Family Practice": [
    // Office Visits
    { code: "99213", type: "CPT", description: "Office visit established moderate", chargeMin: 120, chargeMax: 200, weight: 35 },
    { code: "99214", type: "CPT", description: "Office visit established high", chargeMin: 180, chargeMax: 280, weight: 20 },
    { code: "99215", type: "CPT", description: "Office visit established comprehensive", chargeMin: 250, chargeMax: 400, weight: 8 },
    { code: "99203", type: "CPT", description: "Office visit new moderate", chargeMin: 180, chargeMax: 280, weight: 12 },
    { code: "99204", type: "CPT", description: "Office visit new high", chargeMin: 250, chargeMax: 380, weight: 8 },
    // Preventive
    { code: "99395", type: "CPT", description: "Preventive visit 18-39", chargeMin: 200, chargeMax: 350, weight: 15 },
    { code: "99396", type: "CPT", description: "Preventive visit 40-64", chargeMin: 220, chargeMax: 380, weight: 15 },
    { code: "99397", type: "CPT", description: "Preventive visit 65+", chargeMin: 240, chargeMax: 400, weight: 12 },
    // Labs
    { code: "85025", type: "CPT", description: "Complete blood count", chargeMin: 30, chargeMax: 80, weight: 25 },
    { code: "80053", type: "CPT", description: "Comprehensive metabolic panel", chargeMin: 50, chargeMax: 120, weight: 25 },
    { code: "83036", type: "CPT", description: "Hemoglobin A1C", chargeMin: 40, chargeMax: 100, weight: 20 },
    { code: "80061", type: "CPT", description: "Lipid panel", chargeMin: 60, chargeMax: 150, weight: 18 },
    // Vaccines
    { code: "90471", type: "CPT", description: "Immunization administration", chargeMin: 25, chargeMax: 50, weight: 20, units: { min: 1, max: 3 } },
    { code: "90686", type: "CPT", description: "Flu vaccine quadrivalent", chargeMin: 40, chargeMax: 80, weight: 15 },
    { code: "90715", type: "CPT", description: "Tdap vaccine", chargeMin: 60, chargeMax: 120, weight: 10 },
    // Procedures
    { code: "11102", type: "CPT", description: "Skin biopsy tangential", chargeMin: 150, chargeMax: 300, weight: 8 },
    { code: "17110", type: "CPT", description: "Destruction benign lesions up to 14", chargeMin: 150, chargeMax: 350, weight: 10 },
  ],

  "Cardiology": [
    // Echo/Imaging
    { code: "93306", type: "CPT", description: "TTE complete with Doppler", chargeMin: 1200, chargeMax: 2500, weight: 25 },
    { code: "93303", type: "CPT", description: "TTE complete", chargeMin: 800, chargeMax: 1800, weight: 15 },
    { code: "93350", type: "CPT", description: "Stress echocardiography", chargeMin: 1500, chargeMax: 3000, weight: 12, authRequired: true },
    { code: "78452", type: "CPT", description: "Myocardial perfusion SPECT", chargeMin: 2000, chargeMax: 4000, weight: 10, authRequired: true },
    // Catheterization
    { code: "93458", type: "CPT", description: "Left heart cath with angiography", chargeMin: 15000, chargeMax: 25000, weight: 8, authRequired: true },
    { code: "93459", type: "CPT", description: "Combined right and left heart cath", chargeMin: 18000, chargeMax: 30000, weight: 5, authRequired: true },
    { code: "92928", type: "CPT", description: "PCI single vessel", chargeMin: 25000, chargeMax: 45000, weight: 6, authRequired: true },
    { code: "92941", type: "CPT", description: "PCI acute MI", chargeMin: 30000, chargeMax: 55000, weight: 4, authRequired: true },
    // Electrophysiology
    { code: "93000", type: "CPT", description: "ECG 12-lead", chargeMin: 100, chargeMax: 250, weight: 30 },
    { code: "93224", type: "CPT", description: "Holter monitor 24hr", chargeMin: 300, chargeMax: 600, weight: 15 },
    { code: "93653", type: "CPT", description: "EP ablation SVT", chargeMin: 20000, chargeMax: 40000, weight: 5, authRequired: true },
    // Device Implants
    { code: "33208", type: "CPT", description: "Pacemaker insertion", chargeMin: 25000, chargeMax: 45000, weight: 4, authRequired: true },
    { code: "33249", type: "CPT", description: "ICD insertion", chargeMin: 40000, chargeMax: 70000, weight: 3, authRequired: true },
    // Office Visits
    { code: "99213", type: "CPT", description: "Office visit established moderate", chargeMin: 150, chargeMax: 250, weight: 20 },
    { code: "99214", type: "CPT", description: "Office visit established high", chargeMin: 220, chargeMax: 350, weight: 18 },
    { code: "99215", type: "CPT", description: "Office visit established comprehensive", chargeMin: 300, chargeMax: 450, weight: 10 },
  ],

  "Pediatrics": [
    // Well Child Visits
    { code: "99381", type: "CPT", description: "Preventive visit new infant", chargeMin: 200, chargeMax: 350, weight: 12 },
    { code: "99382", type: "CPT", description: "Preventive visit new 1-4", chargeMin: 180, chargeMax: 320, weight: 15 },
    { code: "99383", type: "CPT", description: "Preventive visit new 5-11", chargeMin: 180, chargeMax: 320, weight: 12 },
    { code: "99384", type: "CPT", description: "Preventive visit new 12-17", chargeMin: 200, chargeMax: 350, weight: 10 },
    { code: "99391", type: "CPT", description: "Preventive visit established infant", chargeMin: 180, chargeMax: 300, weight: 15 },
    { code: "99392", type: "CPT", description: "Preventive visit established 1-4", chargeMin: 160, chargeMax: 280, weight: 18 },
    { code: "99393", type: "CPT", description: "Preventive visit established 5-11", chargeMin: 160, chargeMax: 280, weight: 15 },
    { code: "99394", type: "CPT", description: "Preventive visit established 12-17", chargeMin: 180, chargeMax: 300, weight: 12 },
    // Sick Visits
    { code: "99213", type: "CPT", description: "Office visit established moderate", chargeMin: 120, chargeMax: 200, weight: 25 },
    { code: "99214", type: "CPT", description: "Office visit established high", chargeMin: 180, chargeMax: 280, weight: 15 },
    // Vaccines (major revenue driver)
    { code: "90471", type: "CPT", description: "Immunization administration first", chargeMin: 25, chargeMax: 50, weight: 30 },
    { code: "90472", type: "CPT", description: "Immunization administration additional", chargeMin: 20, chargeMax: 40, weight: 25 },
    { code: "90707", type: "CPT", description: "MMR vaccine", chargeMin: 80, chargeMax: 150, weight: 18 },
    { code: "90681", type: "CPT", description: "Rotavirus vaccine", chargeMin: 150, chargeMax: 250, weight: 12 },
    { code: "90723", type: "CPT", description: "DTaP-HepB-IPV vaccine", chargeMin: 100, chargeMax: 180, weight: 15 },
    { code: "90686", type: "CPT", description: "Flu vaccine quadrivalent", chargeMin: 40, chargeMax: 80, weight: 20 },
  ],

  "Gastroenterology": [
    // Colonoscopy (main revenue)
    { code: "45378", type: "CPT", description: "Colonoscopy diagnostic", chargeMin: 2500, chargeMax: 4500, weight: 20 },
    { code: "45380", type: "CPT", description: "Colonoscopy with biopsy", chargeMin: 3000, chargeMax: 5500, weight: 25, modifiers: ["59"] },
    { code: "45385", type: "CPT", description: "Colonoscopy with polypectomy snare", chargeMin: 3500, chargeMax: 6000, weight: 20, modifiers: ["59"] },
    { code: "45384", type: "CPT", description: "Colonoscopy with ablation", chargeMin: 4000, chargeMax: 7000, weight: 10, modifiers: ["59"] },
    // EGD
    { code: "43239", type: "CPT", description: "EGD with biopsy", chargeMin: 2000, chargeMax: 4000, weight: 18 },
    { code: "43235", type: "CPT", description: "EGD diagnostic", chargeMin: 1500, chargeMax: 3000, weight: 12 },
    { code: "43249", type: "CPT", description: "EGD with balloon dilation", chargeMin: 3000, chargeMax: 5500, weight: 8, authRequired: true },
    // Office Visits
    { code: "99213", type: "CPT", description: "Office visit established moderate", chargeMin: 150, chargeMax: 250, weight: 15 },
    { code: "99214", type: "CPT", description: "Office visit established high", chargeMin: 220, chargeMax: 350, weight: 12 },
    { code: "99215", type: "CPT", description: "Office visit established comprehensive", chargeMin: 300, chargeMax: 450, weight: 8 },
    // Pathology
    { code: "88305", type: "CPT", description: "Surgical pathology GI biopsy", chargeMin: 150, chargeMax: 350, weight: 20 },
    // Anesthesia (facility fee)
    { code: "00810", type: "CPT", description: "Anesthesia lower GI endoscopy", chargeMin: 800, chargeMax: 1500, weight: 25 },
  ],

  "OB/GYN": [
    // Office Visits
    { code: "99213", type: "CPT", description: "Office visit established moderate", chargeMin: 120, chargeMax: 200, weight: 20 },
    { code: "99214", type: "CPT", description: "Office visit established high", chargeMin: 180, chargeMax: 280, weight: 15 },
    // OB Care (global packages)
    { code: "59400", type: "CPT", description: "OB care including delivery vaginal", chargeMin: 4000, chargeMax: 7000, weight: 8 },
    { code: "59510", type: "CPT", description: "OB care including cesarean delivery", chargeMin: 5500, chargeMax: 9000, weight: 5, authRequired: true },
    { code: "59426", type: "CPT", description: "Antepartum care only 7+ visits", chargeMin: 2500, chargeMax: 4000, weight: 6 },
    // GYN Procedures
    { code: "58558", type: "CPT", description: "Hysteroscopy with biopsy", chargeMin: 3000, chargeMax: 5500, weight: 10 },
    { code: "58661", type: "CPT", description: "Laparoscopy with adnexal surgery", chargeMin: 8000, chargeMax: 15000, weight: 6, authRequired: true },
    { code: "58571", type: "CPT", description: "Laparoscopic hysterectomy", chargeMin: 12000, chargeMax: 22000, weight: 5, authRequired: true },
    // Ultrasound
    { code: "76801", type: "CPT", description: "OB ultrasound first trimester", chargeMin: 350, chargeMax: 600, weight: 15 },
    { code: "76805", type: "CPT", description: "OB ultrasound complete", chargeMin: 400, chargeMax: 700, weight: 18 },
    { code: "76817", type: "CPT", description: "Transvaginal ultrasound", chargeMin: 300, chargeMax: 550, weight: 12 },
    // Preventive
    { code: "99395", type: "CPT", description: "Preventive visit 18-39", chargeMin: 200, chargeMax: 350, weight: 15 },
    { code: "99396", type: "CPT", description: "Preventive visit 40-64", chargeMin: 220, chargeMax: 380, weight: 12 },
  ],

  "Pain Management": [
    // Epidural/Spinal Injections
    { code: "62322", type: "CPT", description: "Epidural injection lumbar", chargeMin: 1500, chargeMax: 3000, weight: 18, authRequired: true },
    { code: "62323", type: "CPT", description: "Epidural injection lumbar with imaging", chargeMin: 2000, chargeMax: 4000, weight: 20, authRequired: true },
    { code: "64483", type: "CPT", description: "Transforaminal epidural lumbar", chargeMin: 2500, chargeMax: 4500, weight: 15, authRequired: true },
    // Nerve Blocks
    { code: "64493", type: "CPT", description: "Facet joint injection lumbar L1-2", chargeMin: 1200, chargeMax: 2500, weight: 12, authRequired: true },
    { code: "64494", type: "CPT", description: "Facet joint injection lumbar L3-4", chargeMin: 800, chargeMax: 1800, weight: 12, modifiers: ["59"] },
    { code: "64635", type: "CPT", description: "Facet neurolysis lumbar", chargeMin: 3000, chargeMax: 5500, weight: 8, authRequired: true },
    // Trigger Point
    { code: "20552", type: "CPT", description: "Trigger point injection 1-2 muscles", chargeMin: 200, chargeMax: 450, weight: 18 },
    { code: "20553", type: "CPT", description: "Trigger point injection 3+ muscles", chargeMin: 300, chargeMax: 600, weight: 12 },
    // Office Visits
    { code: "99213", type: "CPT", description: "Office visit established moderate", chargeMin: 150, chargeMax: 250, weight: 15 },
    { code: "99214", type: "CPT", description: "Office visit established high", chargeMin: 220, chargeMax: 350, weight: 18 },
    { code: "99215", type: "CPT", description: "Office visit established comprehensive", chargeMin: 300, chargeMax: 450, weight: 10 },
    // Imaging
    { code: "77003", type: "CPT", description: "Fluoroscopic guidance", chargeMin: 300, chargeMax: 600, weight: 25 },
  ],

  "Dermatology": [
    // Office Visits
    { code: "99213", type: "CPT", description: "Office visit established moderate", chargeMin: 130, chargeMax: 220, weight: 25 },
    { code: "99214", type: "CPT", description: "Office visit established high", chargeMin: 190, chargeMax: 300, weight: 18 },
    { code: "99203", type: "CPT", description: "Office visit new moderate", chargeMin: 180, chargeMax: 280, weight: 12 },
    // Destruction
    { code: "17110", type: "CPT", description: "Destruction benign lesions up to 14", chargeMin: 200, chargeMax: 450, weight: 20 },
    { code: "17111", type: "CPT", description: "Destruction benign lesions 15+", chargeMin: 300, chargeMax: 600, weight: 10 },
    { code: "17000", type: "CPT", description: "Destruction premalignant lesion first", chargeMin: 150, chargeMax: 300, weight: 15 },
    { code: "17003", type: "CPT", description: "Destruction premalignant lesion each addl", chargeMin: 50, chargeMax: 120, weight: 12, units: { min: 1, max: 10 } },
    // Excision/Biopsy
    { code: "11102", type: "CPT", description: "Tangential biopsy single", chargeMin: 200, chargeMax: 400, weight: 20 },
    { code: "11104", type: "CPT", description: "Punch biopsy single", chargeMin: 250, chargeMax: 450, weight: 18 },
    { code: "11600", type: "CPT", description: "Excision malignant lesion trunk", chargeMin: 400, chargeMax: 800, weight: 10 },
    // Mohs Surgery
    { code: "17311", type: "CPT", description: "Mohs first stage head/neck", chargeMin: 1500, chargeMax: 3000, weight: 8, authRequired: true },
    { code: "17312", type: "CPT", description: "Mohs each additional stage", chargeMin: 800, chargeMax: 1500, weight: 6 },
    // Pathology
    { code: "88305", type: "CPT", description: "Surgical pathology skin", chargeMin: 100, chargeMax: 250, weight: 20 },
  ],
}

/**
 * Get procedure codes for a specialty
 */
export function getProcedureCodesForSpecialty(specialty: string): ProcedureCode[] {
  return PROCEDURE_CODES_BY_SPECIALTY[specialty] || PROCEDURE_CODES_BY_SPECIALTY["Family Practice"]
}

/**
 * Select a weighted random procedure code
 */
export function selectRandomProcedureCode(specialty: string): ProcedureCode {
  const codes = getProcedureCodesForSpecialty(specialty)
  const totalWeight = codes.reduce((sum, code) => sum + code.weight, 0)
  let random = Math.random() * totalWeight

  for (const code of codes) {
    random -= code.weight
    if (random <= 0) {
      return code
    }
  }

  return codes[codes.length - 1]
}

/**
 * Generate a random charge amount for a procedure
 */
export function generateChargeAmount(code: ProcedureCode): number {
  const range = code.chargeMax - code.chargeMin
  const charge = code.chargeMin + Math.random() * range
  return Math.round(charge * 100) / 100
}
