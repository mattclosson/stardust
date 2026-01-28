import { mutation } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// Migration: Add phone numbers to existing payers
export const addPayerPhoneNumbers = mutation({
  args: {},
  handler: async (ctx) => {
    const phoneMap: Record<string, { providerServicesPhone: string; claimsPhone: string }> = {
      "BCBS001": { providerServicesPhone: "+18005214387", claimsPhone: "+18005214387" },
      "CMS001": { providerServicesPhone: "+18773235452", claimsPhone: "+18773235452" },
      "AETNA001": { providerServicesPhone: "+18008727713", claimsPhone: "+18008727713" },
      "UHC001": { providerServicesPhone: "+18778423210", claimsPhone: "+18778423210" },
      "MDIL001": { providerServicesPhone: "+18774665161", claimsPhone: "+18774665161" },
    }

    const payers = await ctx.db.query("payers").collect()
    let updated = 0

    for (const payer of payers) {
      const phones = phoneMap[payer.payerId]
      if (phones && !payer.providerServicesPhone) {
        await ctx.db.patch(payer._id, phones)
        updated++
        // #region agent log
        console.log("[DEBUG][Migration] Updated payer:", payer.name, "with phone:", phones.providerServicesPhone)
        // #endregion
      }
    }

    return { message: `Updated ${updated} payers with phone numbers`, updated }
  },
})

// Seed the database with sample data for development
export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // Check if data already exists
    const existingOrg = await ctx.db.query("organizations").first()
    if (existingOrg) {
      return { message: "Database already seeded" }
    }

    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: "Midwest Medical Group",
      npi: "1234567890",
      taxId: "12-3456789",
      specialty: "Multi-specialty",
      facilityType: "physician_office",
      address: {
        line1: "100 Healthcare Way",
        city: "Chicago",
        state: "IL",
        zip: "60601",
      },
      createdAt: now,
    })

    // Create payers
    const payerData = [
      {
        name: "Blue Cross Blue Shield",
        payerId: "BCBS001",
        payerType: "commercial" as const,
        submissionMethod: "electronic" as const,
        timelyFilingDays: 365,
        appealDeadlineDays: 180,
        providerServicesPhone: "+18005214387",
        claimsPhone: "+18005214387",
      },
      {
        name: "Medicare",
        payerId: "CMS001",
        payerType: "medicare" as const,
        submissionMethod: "electronic" as const,
        timelyFilingDays: 365,
        appealDeadlineDays: 120,
        providerServicesPhone: "+18773235452",
        claimsPhone: "+18773235452",
      },
      {
        name: "Aetna",
        payerId: "AETNA001",
        payerType: "commercial" as const,
        submissionMethod: "electronic" as const,
        timelyFilingDays: 180,
        appealDeadlineDays: 60,
        providerServicesPhone: "+18008727713",
        claimsPhone: "+18008727713",
      },
      {
        name: "United Healthcare",
        payerId: "UHC001",
        payerType: "commercial" as const,
        submissionMethod: "electronic" as const,
        timelyFilingDays: 365,
        appealDeadlineDays: 180,
        providerServicesPhone: "+18778423210",
        claimsPhone: "+18778423210",
      },
      {
        name: "Medicaid IL",
        payerId: "MDIL001",
        payerType: "medicaid" as const,
        submissionMethod: "electronic" as const,
        timelyFilingDays: 365,
        appealDeadlineDays: 90,
        providerServicesPhone: "+18774665161",
        claimsPhone: "+18774665161",
      },
    ]

    const payerIdMap: Record<string, Id<"payers">> = {}
    for (const payer of payerData) {
      const id = await ctx.db.insert("payers", {
        ...payer,
        createdAt: now,
      })
      payerIdMap[payer.payerId] = id
    }

    // Create providers
    const billingProviderId = await ctx.db.insert("providers", {
      organizationId: orgId,
      firstName: "Robert",
      lastName: "Smith",
      npi: "1122334455",
      taxonomy: "207Q00000X",
      isRendering: false,
      isBilling: true,
      createdAt: now,
    })

    const renderingProviderId = await ctx.db.insert("providers", {
      organizationId: orgId,
      firstName: "Sarah",
      lastName: "Johnson",
      npi: "2233445566",
      taxonomy: "207R00000X",
      isRendering: true,
      isBilling: false,
      createdAt: now,
    })

    // Create patients
    const patientData = [
      {
        mrn: "MRN001",
        firstName: "John",
        lastName: "Anderson",
        dateOfBirth: "1965-03-15",
        gender: "M" as const,
        address: { line1: "123 Oak St", city: "Chicago", state: "IL", zip: "60602" },
        phone: "312-555-0101",
      },
      {
        mrn: "MRN002",
        firstName: "Mary",
        lastName: "Williams",
        dateOfBirth: "1978-07-22",
        gender: "F" as const,
        address: { line1: "456 Elm Ave", city: "Chicago", state: "IL", zip: "60603" },
        phone: "312-555-0102",
      },
      {
        mrn: "MRN003",
        firstName: "James",
        lastName: "Brown",
        dateOfBirth: "1952-11-08",
        gender: "M" as const,
        address: { line1: "789 Pine Rd", city: "Evanston", state: "IL", zip: "60201" },
        phone: "847-555-0103",
      },
      {
        mrn: "MRN004",
        firstName: "Patricia",
        lastName: "Davis",
        dateOfBirth: "1985-01-30",
        gender: "F" as const,
        address: { line1: "321 Maple Dr", city: "Oak Park", state: "IL", zip: "60301" },
        phone: "708-555-0104",
      },
      {
        mrn: "MRN005",
        firstName: "Michael",
        lastName: "Miller",
        dateOfBirth: "1970-09-12",
        gender: "M" as const,
        address: { line1: "654 Cedar Ln", city: "Chicago", state: "IL", zip: "60604" },
        phone: "312-555-0105",
      },
    ]

    const patientIdMap: Record<string, Id<"patients">> = {}
    for (const patient of patientData) {
      const id = await ctx.db.insert("patients", {
        organizationId: orgId,
        ...patient,
        createdAt: now,
      })
      patientIdMap[patient.mrn] = id
    }

    // Create coverages
    const coverageData = [
      { patientMrn: "MRN001", payerCode: "BCBS001", memberId: "BCB123456789", priority: "primary" as const },
      { patientMrn: "MRN002", payerCode: "AETNA001", memberId: "AET987654321", priority: "primary" as const },
      { patientMrn: "MRN003", payerCode: "CMS001", memberId: "1EG4TE5MK72", priority: "primary" as const },
      { patientMrn: "MRN004", payerCode: "UHC001", memberId: "UHC456789012", priority: "primary" as const },
      { patientMrn: "MRN005", payerCode: "MDIL001", memberId: "MDIL789012345", priority: "primary" as const },
    ]

    const coverageIdMap: Record<string, Id<"coverages">> = {}
    for (const coverage of coverageData) {
      const id = await ctx.db.insert("coverages", {
        patientId: patientIdMap[coverage.patientMrn],
        payerId: payerIdMap[coverage.payerCode],
        priority: coverage.priority,
        memberId: coverage.memberId,
        effectiveDate: "2024-01-01",
        verificationStatus: "verified",
        createdAt: now,
      })
      coverageIdMap[coverage.patientMrn] = id
    }

    // Create claims with various statuses
    const claimsData = [
      {
        patientMrn: "MRN001",
        claimNumber: "CLM-2024-00001",
        dateOfService: "2024-12-15",
        totalCharges: 1250.00,
        totalPaid: 875.00,
        status: "paid" as const,
        priority: "low" as const,
        denialRisk: 0.15,
      },
      {
        patientMrn: "MRN002",
        claimNumber: "CLM-2024-00002",
        dateOfService: "2024-12-18",
        totalCharges: 3500.00,
        status: "pending" as const,
        priority: "medium" as const,
        denialRisk: 0.45,
        denialRiskFactors: ["Missing modifier", "High-cost procedure"],
      },
      {
        patientMrn: "MRN003",
        claimNumber: "CLM-2024-00003",
        dateOfService: "2024-12-20",
        totalCharges: 2800.00,
        status: "denied" as const,
        priority: "high" as const,
        denialRisk: 0.92,
        denialRiskFactors: ["Prior auth required", "Documentation insufficient"],
      },
      {
        patientMrn: "MRN001",
        claimNumber: "CLM-2024-00004",
        dateOfService: "2025-01-02",
        totalCharges: 950.00,
        status: "submitted" as const,
        priority: "medium" as const,
        denialRisk: 0.28,
      },
      {
        patientMrn: "MRN004",
        claimNumber: "CLM-2024-00005",
        dateOfService: "2025-01-05",
        totalCharges: 4200.00,
        status: "pending" as const,
        priority: "high" as const,
        denialRisk: 0.78,
        denialRiskFactors: ["Bundling issue", "Coordination of benefits"],
      },
      {
        patientMrn: "MRN005",
        claimNumber: "CLM-2024-00006",
        dateOfService: "2025-01-08",
        totalCharges: 1800.00,
        status: "denied" as const,
        priority: "critical" as const,
        denialRisk: 0.95,
        denialRiskFactors: ["Eligibility inactive"],
      },
      {
        patientMrn: "MRN002",
        claimNumber: "CLM-2024-00007",
        dateOfService: "2025-01-10",
        totalCharges: 650.00,
        status: "acknowledged" as const,
        priority: "low" as const,
        denialRisk: 0.12,
      },
      {
        patientMrn: "MRN003",
        claimNumber: "CLM-2024-00008",
        dateOfService: "2025-01-12",
        totalCharges: 5500.00,
        status: "appealed" as const,
        priority: "critical" as const,
        denialRisk: 0.88,
        denialRiskFactors: ["Medical necessity", "Documentation"],
      },
      {
        patientMrn: "MRN004",
        claimNumber: "CLM-2024-00009",
        dateOfService: "2025-01-15",
        totalCharges: 1100.00,
        totalPaid: 880.00,
        status: "partial_paid" as const,
        priority: "medium" as const,
        denialRisk: 0.35,
      },
      {
        patientMrn: "MRN005",
        claimNumber: "CLM-2024-00010",
        dateOfService: "2025-01-18",
        totalCharges: 2200.00,
        status: "ready_to_submit" as const,
        priority: "medium" as const,
        denialRisk: 0.22,
      },
    ]

    const claimIdMap: Record<string, Id<"claims">> = {}
    for (const claim of claimsData) {
      const patientId = patientIdMap[claim.patientMrn]
      const coverageId = coverageIdMap[claim.patientMrn]

      const shouldHaveSubmittedAt = !["draft", "ready_to_submit"].includes(claim.status)

      const claimId = await ctx.db.insert("claims", {
        organizationId: orgId,
        patientId,
        coverageId,
        claimNumber: claim.claimNumber,
        dateOfService: claim.dateOfService,
        statementFromDate: claim.dateOfService,
        statementToDate: claim.dateOfService,
        submittedAt: shouldHaveSubmittedAt ? now - 86400000 : undefined,
        placeOfService: "11",
        billingProviderId,
        renderingProviderId,
        priorAuthRequired: false,
        totalCharges: claim.totalCharges,
        totalPaid: claim.totalPaid,
        status: claim.status,
        priority: claim.priority,
        denialRisk: claim.denialRisk,
        denialRiskFactors: claim.denialRiskFactors,
        createdAt: now - 86400000 * 7,
        updatedAt: now,
      })

      claimIdMap[claim.claimNumber] = claimId

      // Add line items
      await ctx.db.insert("lineItems", {
        claimId,
        lineNumber: 1,
        procedureCode: "99213",
        procedureType: "CPT",
        modifiers: [],
        description: "Office visit, established patient",
        diagnosisPointers: [1],
        units: 1,
        chargeAmount: claim.totalCharges * 0.6,
        status: claim.status === "paid" ? "paid" : "pending",
        createdAt: now,
      })

      await ctx.db.insert("lineItems", {
        claimId,
        lineNumber: 2,
        procedureCode: "85025",
        procedureType: "CPT",
        modifiers: [],
        description: "Complete blood count",
        diagnosisPointers: [1],
        units: 1,
        chargeAmount: claim.totalCharges * 0.4,
        status: claim.status === "paid" ? "paid" : "pending",
        createdAt: now,
      })

      // Add diagnosis
      await ctx.db.insert("claimDiagnoses", {
        claimId,
        sequence: 1,
        code: "E11.9",
        description: "Type 2 diabetes mellitus without complications",
        isPrimary: true,
      })
    }

    // Create denials for denied claims
    const denialsData = [
      {
        claimNumber: "CLM-2024-00003",
        denialCode: "CO-4",
        denialReason: "The procedure code is inconsistent with the modifier used",
        denialCategory: "coding" as const,
        status: "new" as const,
        overturnLikelihood: 0.72,
        suggestedAction: "Review modifier usage and resubmit with correct modifier",
      },
      {
        claimNumber: "CLM-2024-00006",
        denialCode: "CO-27",
        denialReason: "Expenses incurred after coverage terminated",
        denialCategory: "eligibility" as const,
        status: "in_review" as const,
        overturnLikelihood: 0.25,
        suggestedAction: "Verify patient eligibility and contact payer",
      },
      {
        claimNumber: "CLM-2024-00008",
        denialCode: "CO-50",
        denialReason: "These are non-covered services because this is not deemed a medical necessity",
        denialCategory: "medical_necessity" as const,
        status: "appealing" as const,
        overturnLikelihood: 0.65,
        suggestedAction: "Submit appeal with supporting clinical documentation",
      },
    ]

    for (const denial of denialsData) {
      const denialId = await ctx.db.insert("denials", {
        claimId: claimIdMap[denial.claimNumber],
        denialCode: denial.denialCode,
        denialReason: denial.denialReason,
        denialCategory: denial.denialCategory,
        receivedAt: now - 86400000 * 3,
        appealDeadline: new Date(now + 86400000 * 60).toISOString().split("T")[0],
        status: denial.status,
        overturnLikelihood: denial.overturnLikelihood,
        suggestedAction: denial.suggestedAction,
        similarDenialCount: Math.floor(Math.random() * 15) + 1,
        createdAt: now - 86400000 * 3,
      })

      // Create appeal for the appealing denial
      if (denial.status === "appealing") {
        await ctx.db.insert("appeals", {
          denialId,
          claimId: claimIdMap[denial.claimNumber],
          appealLevel: 1,
          appealType: "reconsideration",
          submissionMethod: "electronic",
          status: "draft",
          generatedAppealLetter: `Dear Claims Review Department,\n\nWe are writing to appeal the denial of claim ${denial.claimNumber}.\n\nThe services provided were medically necessary for the patient's condition...\n\nPlease reconsider this claim.\n\nSincerely,\nMidwest Medical Group`,
          createdAt: now - 86400000,
        })
      }
    }

    // Create tasks
    const tasksData = [
      {
        title: "Review denied claim CLM-2024-00003",
        description: "Review coding denial and determine appeal strategy",
        category: "appeal" as const,
        priority: "high" as const,
        claimNumber: "CLM-2024-00003",
        source: "ai" as const,
        aiConfidence: 0.89,
        aiReasoning: "High overturn likelihood based on similar denials",
        aiPriorityScore: 85,
      },
      {
        title: "Verify eligibility for patient MRN005",
        description: "Patient coverage may have lapsed - verify with payer",
        category: "eligibility" as const,
        priority: "critical" as const,
        source: "system" as const,
      },
      {
        title: "Follow up on pending claim CLM-2024-00005",
        description: "Claim has been pending for 20 days - contact payer",
        category: "follow_up" as const,
        priority: "medium" as const,
        claimNumber: "CLM-2024-00005",
        source: "ai" as const,
        aiConfidence: 0.76,
        aiPriorityScore: 62,
      },
      {
        title: "Submit appeal for medical necessity denial",
        description: "Prepare and submit Level 1 appeal with clinical documentation",
        category: "appeal" as const,
        priority: "high" as const,
        claimNumber: "CLM-2024-00008",
        dueDate: new Date(now + 86400000 * 7).toISOString().split("T")[0],
        source: "manual" as const,
      },
    ]

    for (const task of tasksData) {
      await ctx.db.insert("tasks", {
        organizationId: orgId,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        claimId: task.claimNumber ? claimIdMap[task.claimNumber] : undefined,
        dueDate: task.dueDate,
        status: "pending",
        source: task.source,
        aiConfidence: task.aiConfidence,
        aiReasoning: task.aiReasoning,
        aiPriorityScore: task.aiPriorityScore,
        createdAt: now,
        updatedAt: now,
      })
    }

    return {
      message: "Database seeded successfully",
      counts: {
        organizations: 1,
        payers: payerData.length,
        providers: 2,
        patients: patientData.length,
        coverages: coverageData.length,
        claims: claimsData.length,
        denials: denialsData.length,
        tasks: tasksData.length,
      },
    }
  },
})
