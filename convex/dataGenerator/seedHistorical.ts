/**
 * Historical data seeding
 * Seeds 500,000+ claims across 8 healthcare organizations
 */

import { mutation, internalMutation, internalAction } from "../_generated/server"
import { internal } from "../_generated/api"
import { v } from "convex/values"
import { Id } from "../_generated/dataModel"

import { ORGANIZATION_PROFILES, OrganizationProfile } from "./config/organizations"
import { PAYER_CONFIGS, getPayerById } from "./config/payers"
import { generatePatient, GeneratedPatient, GeneratedCoverage } from "./generators/patientGenerator"
import {
  generateClaim,
  GeneratedClaimBundle,
  ClaimStatus,
} from "./generators/claimGenerator"
import { generateDenial, GeneratedDenialBundle } from "./generators/denialGenerator"
import { generatePaymentForClaim, GeneratedPaymentBundle } from "./generators/paymentGenerator"
import { generateTasksForDenial, generateTaskForPendingClaim } from "./generators/taskGenerator"
import { randomInt, pickRandom, chance } from "./utils/randomUtils"
import { generateSimpleNPI, generateTaxonomyCode } from "./utils/identifierUtils"
import { generateProviderName } from "./utils/nameGenerator"
import { daysBetween } from "./utils/dateUtils"

// Batch size for inserts
const BATCH_SIZE = 500

/**
 * Public mutation to start the seeding process
 */
export const seedHistorical = mutation({
  args: {
    rcmCompanyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if already seeded
    const existingRcm = await ctx.db.query("rcmCompanies").first()
    if (existingRcm) {
      return { success: false, message: "Database already seeded. Use resetAndReseed to clear first." }
    }

    // Create RCM company
    const rcmCompanyId = await ctx.db.insert("rcmCompanies", {
      name: args.rcmCompanyName || "Stardust RCM Solutions",
      npi: "1234567890",
      taxId: "83-1234567",
      address: {
        line1: "500 Revenue Cycle Way",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
      },
      createdAt: now,
    })

    // Create payers
    const payerIdMap: Record<string, Id<"payers">> = {}
    for (const payer of PAYER_CONFIGS) {
      const payerId = await ctx.db.insert("payers", {
        name: payer.name,
        payerId: payer.payerId,
        payerType: payer.payerType,
        submissionMethod: payer.submissionMethod,
        timelyFilingDays: payer.timelyFilingDays,
        appealDeadlineDays: payer.appealDeadlineDays,
        providerServicesPhone: payer.providerServicesPhone,
        claimsPhone: payer.claimsPhone,
        createdAt: now,
      })
      payerIdMap[payer.id] = payerId
    }

    // Create organizations
    const orgIdMap: Record<string, Id<"organizations">> = {}
    for (const org of ORGANIZATION_PROFILES) {
      const orgId = await ctx.db.insert("organizations", {
        name: org.name,
        npi: org.npi,
        taxId: org.taxId,
        specialty: org.specialty,
        facilityType: org.facilityType,
        address: {
          line1: `${randomInt(100, 999)} Healthcare Blvd`,
          city: org.region.city,
          state: org.region.state,
          zip: org.region.zip,
        },
        rcmCompanyId,
        createdAt: now,
      })
      orgIdMap[org.id] = orgId
    }

    // Schedule batch seeding for each organization
    for (const org of ORGANIZATION_PROFILES) {
      await ctx.scheduler.runAfter(0, internal.dataGenerator.seedHistorical.seedOrganizationBatch, {
        orgProfileId: org.id,
        orgId: orgIdMap[org.id],
        rcmCompanyId,
        payerIdMap: JSON.stringify(payerIdMap),
        batchNumber: 0,
        patientsCreated: 0,
        claimsCreated: 0,
      })
    }

    return {
      success: true,
      message: "Seeding started for 8 organizations",
      rcmCompanyId,
      organizationCount: ORGANIZATION_PROFILES.length,
      payerCount: PAYER_CONFIGS.length,
    }
  },
})

/**
 * Internal mutation to seed an organization in batches
 */
export const seedOrganizationBatch = internalMutation({
  args: {
    orgProfileId: v.string(),
    orgId: v.id("organizations"),
    rcmCompanyId: v.id("rcmCompanies"),
    payerIdMap: v.string(),
    batchNumber: v.number(),
    patientsCreated: v.number(),
    claimsCreated: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const payerIdMap: Record<string, Id<"payers">> = JSON.parse(args.payerIdMap)

    const orgProfile = ORGANIZATION_PROFILES.find(o => o.id === args.orgProfileId)
    if (!orgProfile) {
      console.error(`Organization profile not found: ${args.orgProfileId}`)
      return
    }

    // Create providers on first batch
    if (args.batchNumber === 0) {
      const providerIds: Id<"providers">[] = []
      for (let i = 0; i < orgProfile.providerCount; i++) {
        const { firstName, lastName } = generateProviderName()
        const providerId = await ctx.db.insert("providers", {
          organizationId: args.orgId,
          firstName,
          lastName,
          npi: generateSimpleNPI(),
          taxonomy: generateTaxonomyCode(orgProfile.specialty),
          isRendering: i < orgProfile.providerCount - 1,
          isBilling: i === orgProfile.providerCount - 1,
          createdAt: now,
        })
        providerIds.push(providerId)
      }
    }

    // Calculate how many patients and claims to create this batch
    const targetPatients = orgProfile.patientCount
    const targetClaims = orgProfile.claimVolume.historical
    
    const patientsRemaining = targetPatients - args.patientsCreated
    const claimsRemaining = targetClaims - args.claimsCreated

    // Patients to create this batch (if any remaining)
    const patientsThisBatch = Math.min(BATCH_SIZE, patientsRemaining)
    
    // Claims to create this batch
    const claimsThisBatch = Math.min(BATCH_SIZE, claimsRemaining)

    // Create patients
    const patientIds: Id<"patients">[] = []
    const coveragesByPatient: Map<Id<"patients">, Id<"coverages">[]> = new Map()

    for (let i = 0; i < patientsThisBatch; i++) {
      const seq = args.patientsCreated + i + 1
      const { patient, coverages } = generatePatient(orgProfile, seq)

      const patientId = await ctx.db.insert("patients", {
        organizationId: args.orgId,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        phone: patient.phone,
        email: patient.email,
        createdAt: now,
      })

      patientIds.push(patientId)
      const covIds: Id<"coverages">[] = []

      for (const cov of coverages) {
        const payerId = payerIdMap[cov.payerConfigId]
        if (payerId) {
          const covId = await ctx.db.insert("coverages", {
            patientId,
            payerId,
            priority: cov.priority,
            memberId: cov.memberId,
            groupNumber: cov.groupNumber,
            planName: cov.planName,
            effectiveDate: cov.effectiveDate,
            terminationDate: cov.terminationDate,
            copay: cov.copay,
            deductible: cov.deductible,
            deductibleMet: cov.deductibleMet,
            outOfPocketMax: cov.outOfPocketMax,
            outOfPocketMet: cov.outOfPocketMet,
            verificationStatus: cov.verificationStatus,
            createdAt: now,
          })
          covIds.push(covId)
        }
      }

      coveragesByPatient.set(patientId, covIds)
    }

    // Get existing patients and coverages if we're past patient creation phase
    let allPatients: Id<"patients">[]
    let allCoverages: Map<string, Id<"coverages">[]>

    if (args.patientsCreated >= targetPatients) {
      // Query existing patients for this org
      const existingPatients = await ctx.db
        .query("patients")
        .withIndex("by_organization", q => q.eq("organizationId", args.orgId))
        .take(targetPatients)
      
      allPatients = existingPatients.map(p => p._id)
      allCoverages = new Map()
      
      for (const patient of existingPatients) {
        const covs = await ctx.db
          .query("coverages")
          .withIndex("by_patient", q => q.eq("patientId", patient._id))
          .collect()
        allCoverages.set(patient._id, covs.map(c => c._id))
      }
    } else {
      allPatients = patientIds
      allCoverages = new Map()
      for (const [pid, cids] of coveragesByPatient) {
        allCoverages.set(pid, cids)
      }
    }

    // Get providers for this org
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_organization", q => q.eq("organizationId", args.orgId))
      .collect()

    const billingProvider = providers.find(p => p.isBilling) || providers[0]
    const renderingProviders = providers.filter(p => p.isRendering)

    // Create claims
    for (let i = 0; i < claimsThisBatch && allPatients.length > 0; i++) {
      const claimSeq = args.claimsCreated + i + 1

      // Pick random patient
      const patientId = pickRandom(allPatients)
      const patientCoverages = allCoverages.get(patientId) || []
      
      if (patientCoverages.length === 0) continue

      const coverageId = patientCoverages[0] // Primary coverage

      // Get payer type for this coverage
      const coverage = await ctx.db.get(coverageId)
      if (!coverage) continue

      const payer = await ctx.db.get(coverage.payerId)
      if (!payer) continue

      const renderingProvider = renderingProviders.length > 0 
        ? pickRandom(renderingProviders) 
        : billingProvider

      // Generate claim data
      const claimBundle = generateClaim(
        orgProfile,
        claimSeq,
        0, // Not used for linking in this context
        0,
        payer.payerType
      )

      const claim = claimBundle.claim

      // Insert claim
      const claimId = await ctx.db.insert("claims", {
        organizationId: args.orgId,
        patientId,
        coverageId,
        claimNumber: claim.claimNumber,
        payerClaimNumber: claim.payerClaimNumber,
        dateOfService: claim.dateOfService,
        statementFromDate: claim.statementFromDate,
        statementToDate: claim.statementToDate,
        submittedAt: claim.submittedAt,
        placeOfService: claim.placeOfService,
        billingProviderId: billingProvider._id,
        renderingProviderId: renderingProvider._id,
        priorAuthNumber: claim.priorAuthNumber,
        priorAuthRequired: claim.priorAuthRequired,
        totalCharges: claim.totalCharges,
        totalAllowed: claim.totalAllowed,
        totalPaid: claim.totalPaid,
        totalAdjustments: claim.totalAdjustments,
        totalPatientResponsibility: claim.totalPatientResponsibility,
        status: claim.status,
        priority: claim.priority,
        denialRisk: claim.denialRisk,
        denialRiskFactors: claim.denialRiskFactors,
        createdAt: now - randomInt(1, 365) * 86400000,
        updatedAt: now,
      })

      // Insert line items
      for (const lineItem of claimBundle.lineItems) {
        await ctx.db.insert("lineItems", {
          claimId,
          lineNumber: lineItem.lineNumber,
          procedureCode: lineItem.procedureCode,
          procedureType: lineItem.procedureType,
          modifiers: lineItem.modifiers,
          description: lineItem.description,
          diagnosisPointers: lineItem.diagnosisPointers,
          units: lineItem.units,
          chargeAmount: lineItem.chargeAmount,
          allowedAmount: lineItem.allowedAmount,
          paidAmount: lineItem.paidAmount,
          status: lineItem.status,
          createdAt: now,
        })
      }

      // Insert diagnoses
      for (const dx of claimBundle.diagnoses) {
        await ctx.db.insert("claimDiagnoses", {
          claimId,
          sequence: dx.sequence,
          code: dx.code,
          description: dx.description,
          isPrimary: dx.isPrimary,
        })
      }

      // Generate denial if claim is denied/appealed
      if (["denied", "rejected", "appealed"].includes(claim.status)) {
        const denialBundle = generateDenial(
          orgProfile,
          0,
          claim.status,
          claim.dateOfService,
          claim.totalCharges
        )

        const denial = denialBundle.denial
        const denialId = await ctx.db.insert("denials", {
          claimId,
          denialCode: denial.denialCode,
          denialReason: denial.denialReason,
          denialCategory: denial.denialCategory,
          receivedAt: denial.receivedAt,
          appealDeadline: denial.appealDeadline,
          status: denial.status,
          suggestedAction: denial.suggestedAction,
          similarDenialCount: denial.similarDenialCount,
          overturnLikelihood: denial.overturnLikelihood,
          aiAnalysis: denial.aiAnalysis,
          createdAt: denial.receivedAt,
        })

        // Generate appeal if applicable
        if (denialBundle.appeal) {
          const appeal = denialBundle.appeal
          await ctx.db.insert("appeals", {
            denialId,
            claimId,
            appealLevel: appeal.appealLevel,
            appealType: appeal.appealType,
            submittedAt: appeal.submittedAt,
            submissionMethod: appeal.submissionMethod,
            generatedAppealLetter: appeal.generatedAppealLetter,
            status: appeal.status,
            outcome: appeal.outcome,
            responseReceivedAt: appeal.responseReceivedAt,
            responseNotes: appeal.responseNotes,
            createdAt: now,
          })
        }

        // Generate task for denial
        if (chance(0.7)) {
          const tasks = generateTasksForDenial(
            0, 0,
            denial.denialCode,
            denial.denialCategory,
            claim.totalCharges,
            denial.appealDeadline
          )
          
          for (const task of tasks.slice(0, 1)) { // Just one task per denial
            await ctx.db.insert("tasks", {
              organizationId: args.orgId,
              claimId,
              denialId,
              title: task.title,
              description: task.description,
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate,
              status: task.status,
              source: task.source,
              aiConfidence: task.aiConfidence,
              aiReasoning: task.aiReasoning,
              aiPriorityScore: task.aiPriorityScore,
              createdAt: now,
              updatedAt: now,
            })
          }
        }
      }

      // Generate payment if claim is paid
      if (["paid", "partial_paid", "closed"].includes(claim.status)) {
        const paymentBundle = generatePaymentForClaim(
          0,
          claim.status,
          claim.dateOfService,
          claim.totalCharges,
          claim.totalAllowed,
          claim.totalPaid,
          claimBundle.lineItems.length,
          payer.payerType
        )

        for (const payment of paymentBundle.payments) {
          await ctx.db.insert("payments", {
            claimId,
            organizationId: args.orgId,
            paymentType: payment.paymentType,
            paymentMethod: payment.paymentMethod,
            checkNumber: payment.checkNumber,
            traceNumber: payment.traceNumber,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            postedAt: payment.postedAt,
            eraId: payment.eraId,
            createdAt: now,
          })
        }
      }

      // Generate follow-up task for pending claims
      if (claim.status === "pending" && chance(0.3)) {
        const daysOld = daysBetween(new Date(claim.dateOfService), new Date())
        const task = generateTaskForPendingClaim(
          0,
          claim.dateOfService,
          claim.totalCharges,
          claim.claimNumber,
          daysOld
        )

        if (task) {
          await ctx.db.insert("tasks", {
            organizationId: args.orgId,
            claimId,
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
            dueDate: task.dueDate,
            status: task.status,
            source: task.source,
            aiConfidence: task.aiConfidence,
            aiReasoning: task.aiReasoning,
            aiPriorityScore: task.aiPriorityScore,
            createdAt: now,
            updatedAt: now,
          })
        }
      }
    }

    // Calculate new totals
    const newPatientsCreated = args.patientsCreated + patientsThisBatch
    const newClaimsCreated = args.claimsCreated + claimsThisBatch

    // Update denormalized claim counter on organization
    const org = await ctx.db.get(args.orgId)
    if (org) {
      await ctx.db.patch(args.orgId, {
        claimCount: newClaimsCreated,
      })
    }

    // Log progress
    console.log(`[${orgProfile.name}] Batch ${args.batchNumber}: Patients ${newPatientsCreated}/${targetPatients}, Claims ${newClaimsCreated}/${targetClaims}`)

    // Schedule next batch if more work to do
    if (newClaimsCreated < targetClaims) {
      await ctx.scheduler.runAfter(100, internal.dataGenerator.seedHistorical.seedOrganizationBatch, {
        orgProfileId: args.orgProfileId,
        orgId: args.orgId,
        rcmCompanyId: args.rcmCompanyId,
        payerIdMap: args.payerIdMap,
        batchNumber: args.batchNumber + 1,
        patientsCreated: newPatientsCreated,
        claimsCreated: newClaimsCreated,
      })
    } else {
      console.log(`[${orgProfile.name}] Seeding complete!`)
    }
  },
})

/**
 * Query to check seeding progress
 */
export const getSeedingProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect()
    
    const progress = await Promise.all(
      orgs.map(async (org) => {
        const claims = await ctx.db
          .query("claims")
          .withIndex("by_organization", q => q.eq("organizationId", org._id))
          .collect()
        
        const patients = await ctx.db
          .query("patients")
          .withIndex("by_organization", q => q.eq("organizationId", org._id))
          .collect()

        const profile = ORGANIZATION_PROFILES.find(p => p.name === org.name)
        
        return {
          name: org.name,
          claimsCreated: claims.length,
          claimsTarget: profile?.claimVolume.historical || 0,
          patientsCreated: patients.length,
          patientsTarget: profile?.patientCount || 0,
          percentComplete: profile 
            ? Math.round((claims.length / profile.claimVolume.historical) * 100) 
            : 0,
        }
      })
    )

    const totalClaims = progress.reduce((sum, p) => sum + p.claimsCreated, 0)
    const totalTarget = progress.reduce((sum, p) => sum + p.claimsTarget, 0)

    return {
      organizations: progress,
      totalClaims,
      totalTarget,
      overallPercent: totalTarget > 0 ? Math.round((totalClaims / totalTarget) * 100) : 0,
    }
  },
})

/**
 * Reset and reseed - clears all data and starts fresh
 */
export const resetAndReseed = mutation({
  args: {
    confirmReset: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirmReset) {
      return { success: false, message: "Must confirm reset by passing confirmReset: true" }
    }

    // Delete in order to respect foreign keys
    const tables = [
      "taskNotes", "tasks", "appeals", "denials", "adjustments", 
      "payments", "claimStatusEvents", "lineItems", "claimDiagnoses", 
      "claims", "authorizations", "eligibilityChecks", "coverages", 
      "correspondence", "documents", "holdCalls", "patients", 
      "providers", "rcmUserAssignments", "rcmUsers", "organizationUsers",
      "organizations", "payers", "rcmCompanies"
    ] as const

    for (const table of tables) {
      const docs = await ctx.db.query(table as any).collect()
      for (const doc of docs) {
        await ctx.db.delete(doc._id)
      }
    }

    return { success: true, message: "All data cleared. Run seedHistorical to reseed." }
  },
})
