/**
 * Diagnosis codes (ICD-10) by specialty
 * Each code includes description and frequency weight
 */

export interface DiagnosisCode {
  code: string
  description: string
  weight: number // Frequency weight
}

export const DIAGNOSIS_CODES_BY_SPECIALTY: Record<string, DiagnosisCode[]> = {
  "Orthopedic Surgery": [
    // Knee
    { code: "M17.11", description: "Primary osteoarthritis, right knee", weight: 20 },
    { code: "M17.12", description: "Primary osteoarthritis, left knee", weight: 20 },
    { code: "M23.21", description: "Derangement meniscus due to tear, right knee", weight: 15 },
    { code: "M23.22", description: "Derangement meniscus due to tear, left knee", weight: 15 },
    { code: "S83.511A", description: "Sprain ACL right knee, initial", weight: 8 },
    { code: "S83.512A", description: "Sprain ACL left knee, initial", weight: 8 },
    // Hip
    { code: "M16.11", description: "Primary osteoarthritis, right hip", weight: 15 },
    { code: "M16.12", description: "Primary osteoarthritis, left hip", weight: 15 },
    { code: "M87.051", description: "Avascular necrosis, right femur", weight: 5 },
    // Shoulder
    { code: "M75.101", description: "Rotator cuff tear, right shoulder", weight: 12 },
    { code: "M75.102", description: "Rotator cuff tear, left shoulder", weight: 12 },
    { code: "M19.011", description: "Primary osteoarthritis, right shoulder", weight: 8 },
    // Fractures
    { code: "S72.001A", description: "Fracture femoral neck, right, initial", weight: 6 },
    { code: "S52.501A", description: "Fracture lower end radius, right, initial", weight: 8 },
    // Back
    { code: "M54.5", description: "Low back pain", weight: 15 },
    { code: "M47.816", description: "Spondylosis lumbar region", weight: 10 },
  ],

  "Family Practice": [
    // Chronic conditions
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications", weight: 20 },
    { code: "E11.65", description: "Type 2 diabetes mellitus with hyperglycemia", weight: 12 },
    { code: "I10", description: "Essential hypertension", weight: 25 },
    { code: "E78.5", description: "Hyperlipidemia, unspecified", weight: 18 },
    { code: "E66.9", description: "Obesity, unspecified", weight: 15 },
    // Acute conditions
    { code: "J06.9", description: "Acute upper respiratory infection", weight: 20 },
    { code: "J20.9", description: "Acute bronchitis, unspecified", weight: 12 },
    { code: "J02.9", description: "Acute pharyngitis, unspecified", weight: 15 },
    { code: "N39.0", description: "Urinary tract infection", weight: 12 },
    // Preventive
    { code: "Z00.00", description: "Encounter for general adult exam without findings", weight: 15 },
    { code: "Z23", description: "Encounter for immunization", weight: 20 },
    { code: "Z12.11", description: "Screening for malignant neoplasm colon", weight: 8 },
    // Mental Health
    { code: "F32.9", description: "Major depressive disorder, single episode", weight: 10 },
    { code: "F41.1", description: "Generalized anxiety disorder", weight: 10 },
    // Musculoskeletal
    { code: "M54.5", description: "Low back pain", weight: 15 },
  ],

  "Cardiology": [
    // CAD/Ischemic
    { code: "I25.10", description: "Atherosclerotic heart disease native coronary", weight: 20 },
    { code: "I25.110", description: "Atherosclerotic heart disease native coronary with angina", weight: 15 },
    { code: "I21.3", description: "ST elevation MI of unspecified site", weight: 8 },
    // Heart Failure
    { code: "I50.9", description: "Heart failure, unspecified", weight: 15 },
    { code: "I50.22", description: "Chronic systolic heart failure", weight: 12 },
    { code: "I50.32", description: "Chronic diastolic heart failure", weight: 10 },
    // Arrhythmias
    { code: "I48.91", description: "Unspecified atrial fibrillation", weight: 18 },
    { code: "I48.0", description: "Paroxysmal atrial fibrillation", weight: 12 },
    { code: "I47.1", description: "Supraventricular tachycardia", weight: 8 },
    // Valvular
    { code: "I35.0", description: "Aortic valve stenosis", weight: 10 },
    { code: "I34.0", description: "Mitral valve insufficiency", weight: 8 },
    // Hypertension
    { code: "I10", description: "Essential hypertension", weight: 20 },
    { code: "I11.0", description: "Hypertensive heart disease with heart failure", weight: 10 },
    // Symptoms
    { code: "R00.0", description: "Tachycardia, unspecified", weight: 8 },
    { code: "R00.2", description: "Palpitations", weight: 10 },
    { code: "R07.9", description: "Chest pain, unspecified", weight: 12 },
  ],

  "Pediatrics": [
    // Well child
    { code: "Z00.129", description: "Encounter routine child health exam without findings", weight: 25 },
    { code: "Z00.121", description: "Encounter routine child health exam with findings", weight: 15 },
    { code: "Z23", description: "Encounter for immunization", weight: 25 },
    // Acute illnesses
    { code: "J06.9", description: "Acute upper respiratory infection", weight: 20 },
    { code: "J20.9", description: "Acute bronchitis", weight: 12 },
    { code: "H66.90", description: "Otitis media, unspecified", weight: 18 },
    { code: "J02.9", description: "Acute pharyngitis", weight: 15 },
    { code: "K52.9", description: "Gastroenteritis noninfective", weight: 10 },
    // Asthma
    { code: "J45.20", description: "Mild intermittent asthma uncomplicated", weight: 12 },
    { code: "J45.30", description: "Mild persistent asthma uncomplicated", weight: 10 },
    // ADHD
    { code: "F90.0", description: "ADHD predominantly inattentive", weight: 8 },
    { code: "F90.2", description: "ADHD combined type", weight: 10 },
    // Allergies
    { code: "J30.9", description: "Allergic rhinitis, unspecified", weight: 12 },
    // Dermatologic
    { code: "L20.9", description: "Atopic dermatitis, unspecified", weight: 8 },
  ],

  "Gastroenterology": [
    // Screening/Surveillance
    { code: "Z12.11", description: "Encounter screening malignant neoplasm colon", weight: 20 },
    { code: "Z86.010", description: "Personal history colonic polyps", weight: 15 },
    // Polyps/Neoplasms
    { code: "K63.5", description: "Polyp of colon", weight: 18 },
    { code: "D12.6", description: "Benign neoplasm colon unspecified", weight: 12 },
    // GERD
    { code: "K21.0", description: "GERD with esophagitis", weight: 15 },
    { code: "K21.9", description: "GERD without esophagitis", weight: 12 },
    // IBD
    { code: "K50.90", description: "Crohn disease unspecified without complications", weight: 8 },
    { code: "K51.90", description: "Ulcerative colitis unspecified without complications", weight: 8 },
    // Other GI
    { code: "K58.9", description: "Irritable bowel syndrome without diarrhea", weight: 10 },
    { code: "K57.30", description: "Diverticulosis large intestine without hemorrhage", weight: 12 },
    { code: "K29.70", description: "Gastritis unspecified without bleeding", weight: 10 },
    { code: "K44.9", description: "Diaphragmatic hernia without obstruction", weight: 8 },
    // Symptoms
    { code: "R10.9", description: "Unspecified abdominal pain", weight: 10 },
    { code: "R19.7", description: "Diarrhea, unspecified", weight: 8 },
  ],

  "OB/GYN": [
    // Pregnancy
    { code: "Z34.90", description: "Encounter supervision normal pregnancy unspecified", weight: 20 },
    { code: "Z34.00", description: "Encounter supervision normal first pregnancy", weight: 15 },
    { code: "O80", description: "Encounter full-term uncomplicated delivery", weight: 8 },
    // Pregnancy complications
    { code: "O24.419", description: "Gestational diabetes unspecified trimester", weight: 8 },
    { code: "O13.9", description: "Gestational hypertension unspecified trimester", weight: 6 },
    // GYN conditions
    { code: "N92.0", description: "Excessive and frequent menstruation regular cycle", weight: 12 },
    { code: "N94.6", description: "Dysmenorrhea, unspecified", weight: 10 },
    { code: "D25.9", description: "Leiomyoma of uterus, unspecified", weight: 10 },
    { code: "N83.20", description: "Unspecified ovarian cyst", weight: 8 },
    { code: "N80.0", description: "Endometriosis of uterus", weight: 8 },
    // Preventive
    { code: "Z01.419", description: "Encounter gynecological exam without findings", weight: 15 },
    { code: "Z12.4", description: "Encounter screening malignant neoplasm cervix", weight: 15 },
    // Menopause
    { code: "N95.1", description: "Menopausal and perimenopausal symptoms", weight: 8 },
    // Contraception
    { code: "Z30.09", description: "Encounter other contraceptive management", weight: 10 },
  ],

  "Pain Management": [
    // Spine
    { code: "M54.5", description: "Low back pain", weight: 20 },
    { code: "M54.16", description: "Radiculopathy lumbar region", weight: 18 },
    { code: "M54.17", description: "Radiculopathy lumbosacral region", weight: 15 },
    { code: "M47.816", description: "Spondylosis without myelopathy lumbar", weight: 12 },
    { code: "M51.16", description: "Intervertebral disc degeneration lumbar", weight: 15 },
    { code: "M51.26", description: "Intervertebral disc degeneration with radiculopathy lumbar", weight: 12 },
    // Cervical
    { code: "M54.2", description: "Cervicalgia", weight: 12 },
    { code: "M54.12", description: "Radiculopathy cervical region", weight: 10 },
    // Joint pain
    { code: "M25.561", description: "Pain in right knee", weight: 8 },
    { code: "M25.511", description: "Pain in right shoulder", weight: 8 },
    { code: "M25.551", description: "Pain in right hip", weight: 8 },
    // Chronic pain syndromes
    { code: "G89.29", description: "Other chronic pain", weight: 15 },
    { code: "G89.4", description: "Chronic pain syndrome", weight: 10 },
    // Neuropathy
    { code: "G62.9", description: "Polyneuropathy, unspecified", weight: 8 },
    // Fibromyalgia
    { code: "M79.7", description: "Fibromyalgia", weight: 8 },
  ],

  "Dermatology": [
    // Skin cancer
    { code: "C44.91", description: "Basal cell carcinoma of skin unspecified", weight: 12 },
    { code: "C44.92", description: "Squamous cell carcinoma skin unspecified", weight: 10 },
    { code: "D04.9", description: "Carcinoma in situ of skin unspecified", weight: 8 },
    // Premalignant
    { code: "L57.0", description: "Actinic keratosis", weight: 20 },
    // Benign lesions
    { code: "L82.1", description: "Other seborrheic keratosis", weight: 15 },
    { code: "L72.0", description: "Epidermal cyst", weight: 8 },
    { code: "D22.9", description: "Melanocytic nevi unspecified", weight: 12 },
    // Inflammatory
    { code: "L30.9", description: "Dermatitis, unspecified", weight: 15 },
    { code: "L20.9", description: "Atopic dermatitis, unspecified", weight: 12 },
    { code: "L40.0", description: "Psoriasis vulgaris", weight: 10 },
    { code: "L70.0", description: "Acne vulgaris", weight: 15 },
    // Infections
    { code: "B35.1", description: "Tinea unguium", weight: 8 },
    { code: "L03.119", description: "Cellulitis of unspecified part of limb", weight: 6 },
    // Encounters
    { code: "Z01.89", description: "Encounter other special examination", weight: 12 },
    // Rosacea
    { code: "L71.9", description: "Rosacea, unspecified", weight: 10 },
  ],
}

/**
 * Get diagnosis codes for a specialty
 */
export function getDiagnosisCodesForSpecialty(specialty: string): DiagnosisCode[] {
  return DIAGNOSIS_CODES_BY_SPECIALTY[specialty] || DIAGNOSIS_CODES_BY_SPECIALTY["Family Practice"]
}

/**
 * Select a weighted random diagnosis code
 */
export function selectRandomDiagnosisCode(specialty: string): DiagnosisCode {
  const codes = getDiagnosisCodesForSpecialty(specialty)
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
 * Select multiple diagnosis codes (1-4, with primary first)
 */
export function selectDiagnosisCodes(specialty: string, count: number = 1): DiagnosisCode[] {
  const allCodes = getDiagnosisCodesForSpecialty(specialty)
  const selected: DiagnosisCode[] = []
  const usedIndices = new Set<number>()

  const actualCount = Math.min(count, allCodes.length)

  while (selected.length < actualCount) {
    const code = selectRandomDiagnosisCode(specialty)
    const index = allCodes.indexOf(code)

    if (!usedIndices.has(index)) {
      usedIndices.add(index)
      selected.push(code)
    }
  }

  return selected
}
