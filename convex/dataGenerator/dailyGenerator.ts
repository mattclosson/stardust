/**
 * Daily data generation
 * Generates new claims and progresses existing claims through their lifecycle
 */

import { mutation, internalMutation } from "../_generated/server"
import { internal } from "../_generated/api"
import { v } from "convex/values"
import { Id } from "../_generated/dataModel"

import { ORGANIZATION_PROFILES } from "./config/organizations"
import {
  generateClaim,
  ClaimStatus,
} from "./generators/claimGenerator"
import { generateDenial } from "./generators/denialGenerator"
import { generatePaymentForClaim } from "./generators/paymentGenerator"
import { generateTasksForDenial, generateTaskForPendingClaim } from "./generators/taskGenerator"
import { pickRandom, chance, randomInt } from "./utils/randomUtils"
import { formatDate, daysBetween, addDays, isWeekend } from "./utils/dateUtils"
import { DAILY_STATUS_TRANSITIONS } from "./config/distributions"

/**
 * Manual trigger to generate daily claims
 * Can be called from the dashboard or scheduled
 */
export const generateDailyClaimsManual = mutation({
  args: {
    targetDate: v.optional(v.string()), // YYYY-MM-DD, defaults to today
  },
  handler: async (ctx, args) => {
    const targetDate = args.targetDate ? new Date(args.targetDate) : new Date()
    const isWeekendDay = isWeekend(targetDate)
    const now = Date.now()

    // Get all organizations
    const orgs = await ctx.db.query("organizations").collect()
    
    let totalClaimsCreated = 0

    for (const org of orgs) {
      const profile = ORGANIZATION_PROFILES.find(p => p.name === org.name)
      if (!profile) continue

      // Calculate claims to generate
      const claimCount = isWeekendDay 
        ? profile.claimVolume.dailyWeekend 
        : profile.claimVolume.dailyWeekday

      // Get org's patients, providers, and payers
      const patients = await ctx.db
        .query("patients")
        .withIndex("by_organization", q => q.eq("organizationId", org._id))
        .take(1000) // Sample of patients

      if (patients.length === 0) continue

      const providers = await ctx.db
        .query("providers")
        .withIndex("by_organization", q => q.eq("organizationId", org._id))
        .collect()

      const billingProvider = providers.find(p => p.isBilling) || providers[0]
      const renderingProviders = providers.filter(p => p.isRendering)

      // Get existing claim count for sequence numbering
      const existingClaims = await ctx.db
        .query("claims")
        .withIndex("by_organization", q => q.eq("organizationId", org._id))
        .collect()
      
      let claimSeq = existingClaims.length + 1

      // Generate new claims
      for (let i = 0; i < claimCount; i++) {
        const patient = pickRandom(patients)
        
        const coverages = await ctx.db
          .query("coverages")
          .withIndex("by_patient", q => q.eq("patientId", patient._id))
          .collect()

        if (coverages.length === 0) continue

        const coverage = coverages[0] // Primary
        const payer = await ctx.db.get(coverage.payerId)
        if (!payer) continue

        const renderingProvider = renderingProviders.length > 0 
          ? pickRandom(renderingProviders) 
          : billingProvider

        // Generate claim for target date
        const claimBundle = generateClaim(
          profile,
          claimSeq++,
          0, 0,
          payer.payerType,
          targetDate
        )

        const claim = claimBundle.claim

        // New claims are typically draft or ready_to_submit
        const newClaimStatus: ClaimStatus = chance(0.3) ? "draft" : "ready_to_submit"

        const claimId = await ctx.db.insert("claims", {
          organizationId: org._id,
          patientId: patient._id,
          coverageId: coverage._id,
          claimNumber: claim.claimNumber,
          dateOfService: formatDate(targetDate),
          statementFromDate: formatDate(targetDate),
          statementToDate: formatDate(targetDate),
          placeOfService: claim.placeOfService,
          billingProviderId: billingProvider._id,
          renderingProviderId: renderingProvider._id,
          priorAuthNumber: claim.priorAuthNumber,
          priorAuthRequired: claim.priorAuthRequired,
          totalCharges: claim.totalCharges,
          status: newClaimStatus,
          priority: "low",
          denialRisk: claim.denialRisk,
          denialRiskFactors: claim.denialRiskFactors,
          createdAt: now,
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
            status: "pending",
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

        totalClaimsCreated++
      }
    }

    return {
      success: true,
      date: formatDate(targetDate),
      isWeekend: isWeekendDay,
      claimsCreated: totalClaimsCreated,
    }
  },
})

/**
 * Progress claim statuses through their lifecycle
 */
export const progressClaimStatusesManual = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const today = new Date()
    
    let transitioned = {
      submittedToAcknowledged: 0,
      acknowledgedToPending: 0,
      pendingToPaid: 0,
      pendingToDenied: 0,
      deniedToAppealing: 0,
    }

    // Get all claims that can be transitioned
    const orgs = await ctx.db.query("organizations").collect()

    for (const org of orgs) {
      const profile = ORGANIZATION_PROFILES.find(p => p.name === org.name)
      if (!profile) continue

      // Get claims for this org
      const claims = await ctx.db
        .query("claims")
        .withIndex("by_organization", q => q.eq("organizationId", org._id))
        .collect()

      for (const claim of claims) {
        const claimAge = daysBetween(new Date(claim.dateOfService), today)
        const submittedAge = claim.submittedAt 
          ? Math.floor((now - claim.submittedAt) / 86400000) 
          : 0

        // Submitted -> Acknowledged
        if (claim.status === "submitted" && submittedAge >= 1) {
          if (chance(DAILY_STATUS_TRANSITIONS.submitted_to_acknowledged.probability)) {
            await ctx.db.patch(claim._id, {
              status: "acknowledged",
              updatedAt: now,
            })
            transitioned.submittedToAcknowledged++
            continue
          }
        }

        // Acknowledged -> Pending
        if (claim.status === "acknowledged" && submittedAge >= 2) {
          if (chance(DAILY_STATUS_TRANSITIONS.acknowledged_to_pending.probability)) {
            await ctx.db.patch(claim._id, {
              status: "pending",
              updatedAt: now,
            })
            transitioned.acknowledgedToPending++
            continue
          }
        }

        // Pending -> Paid or Denied
        if (claim.status === "pending" && submittedAge >= DAILY_STATUS_TRANSITIONS.pending_to_paid.minDays) {
          // Check for denial first
          if (chance(DAILY_STATUS_TRANSITIONS.pending_to_denied.dailyProbability * profile.denialRate * 2)) {
            // Create denial
            const denialBundle = generateDenial(
              profile,
              0,
              "denied",
              claim.dateOfService,
              claim.totalCharges
            )

            const denialId = await ctx.db.insert("denials", {
              claimId: claim._id,
              denialCode: denialBundle.denial.denialCode,
              denialReason: denialBundle.denial.denialReason,
              denialCategory: denialBundle.denial.denialCategory,
              receivedAt: now,
              appealDeadline: denialBundle.denial.appealDeadline,
              status: "new",
              suggestedAction: denialBundle.denial.suggestedAction,
              similarDenialCount: denialBundle.denial.similarDenialCount,
              overturnLikelihood: denialBundle.denial.overturnLikelihood,
              aiAnalysis: denialBundle.denial.aiAnalysis,
              createdAt: now,
            })

            await ctx.db.patch(claim._id, {
              status: "denied",
              priority: claim.totalCharges > 5000 ? "high" : "medium",
              updatedAt: now,
            })

            // Create denial task
            const tasks = generateTasksForDenial(
              0, 0,
              denialBundle.denial.denialCode,
              denialBundle.denial.denialCategory,
              claim.totalCharges,
              denialBundle.denial.appealDeadline
            )

            if (tasks.length > 0) {
              await ctx.db.insert("tasks", {
                organizationId: org._id,
                claimId: claim._id,
                denialId,
                title: tasks[0].title,
                description: tasks[0].description,
                category: tasks[0].category,
                priority: tasks[0].priority,
                dueDate: tasks[0].dueDate,
                status: "pending",
                source: "ai",
                aiConfidence: tasks[0].aiConfidence,
                aiReasoning: tasks[0].aiReasoning,
                aiPriorityScore: tasks[0].aiPriorityScore,
                createdAt: now,
                updatedAt: now,
              })
            }

            transitioned.pendingToDenied++
            continue
          }

          // Otherwise, check for payment
          if (chance(DAILY_STATUS_TRANSITIONS.pending_to_paid.dailyProbability)) {
            // Get coverage first, then payer
            const coverage = await ctx.db.get(claim.coverageId)
            const payer = coverage ? await ctx.db.get(coverage.payerId) : null

            const paymentBundle = generatePaymentForClaim(
              0,
              "paid",
              claim.dateOfService,
              claim.totalCharges,
              undefined,
              undefined,
              1,
              payer?.payerType || "commercial"
            )

            // Calculate amounts
            const totalAllowed = claim.totalCharges * (0.5 + Math.random() * 0.2)
            const totalPaid = totalAllowed * 0.8

            await ctx.db.patch(claim._id, {
              status: "paid",
              totalAllowed: Math.round(totalAllowed * 100) / 100,
              totalPaid: Math.round(totalPaid * 100) / 100,
              totalAdjustments: Math.round((claim.totalCharges - totalAllowed) * 100) / 100,
              totalPatientResponsibility: Math.round((totalAllowed - totalPaid) * 100) / 100,
              priority: "low",
              updatedAt: now,
            })

            // Create payment record
            if (paymentBundle.payments.length > 0) {
              const payment = paymentBundle.payments[0]
              await ctx.db.insert("payments", {
                claimId: claim._id,
                organizationId: org._id,
                paymentType: payment.paymentType,
                paymentMethod: payment.paymentMethod,
                checkNumber: payment.checkNumber,
                traceNumber: payment.traceNumber,
                amount: Math.round(totalPaid * 100) / 100,
                paymentDate: formatDate(today),
                postedAt: now,
                eraId: payment.eraId,
                createdAt: now,
              })
            }

            transitioned.pendingToPaid++
            continue
          }
        }

        // Denied -> Appealing (within 30 days)
        if (claim.status === "denied") {
          const denial = await ctx.db
            .query("denials")
            .withIndex("by_claim", q => q.eq("claimId", claim._id))
            .first()

          if (denial && denial.status === "new") {
            const denialAge = Math.floor((now - denial.receivedAt) / 86400000)
            
            if (denialAge <= 30 && chance(DAILY_STATUS_TRANSITIONS.denied_to_appealing.probability * 0.1)) {
              await ctx.db.patch(denial._id, {
                status: "in_review",
              })

              await ctx.db.patch(claim._id, {
                status: "appealed",
                updatedAt: now,
              })

              transitioned.deniedToAppealing++
            }
          }
        }
      }
    }

    return {
      success: true,
      transitions: transitioned,
      totalTransitions: Object.values(transitioned).reduce((a, b) => a + b, 0),
    }
  },
})

/**
 * Submit ready_to_submit claims
 */
export const submitReadyClaims = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    let submitted = 0

    const readyClaims = await ctx.db
      .query("claims")
      .filter(q => q.eq(q.field("status"), "ready_to_submit"))
      .collect()

    for (const claim of readyClaims) {
      // 70% chance to submit each ready claim
      if (chance(0.70)) {
        await ctx.db.patch(claim._id, {
          status: "submitted",
          submittedAt: now,
          updatedAt: now,
        })
        submitted++
      }
    }

    return { submitted }
  },
})

/**
 * Internal mutation for scheduled daily generation
 */
export const scheduledDailyGeneration = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This will be called by cron
    // First, submit ready claims
    const readyClaims = await ctx.db
      .query("claims")
      .filter(q => q.eq(q.field("status"), "ready_to_submit"))
      .take(100)

    const now = Date.now()
    let submitted = 0

    for (const claim of readyClaims) {
      if (chance(0.70)) {
        await ctx.db.patch(claim._id, {
          status: "submitted",
          submittedAt: now,
          updatedAt: now,
        })
        submitted++
      }
    }

    console.log(`[Daily Generation] Submitted ${submitted} claims`)
  },
})

/**
 * Internal mutation for scheduled status progression
 */
export const scheduledStatusProgression = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Progress a batch of claims
    const now = Date.now()
    const today = new Date()

    // Get submitted claims older than 1 day
    const submittedClaims = await ctx.db
      .query("claims")
      .filter(q => q.eq(q.field("status"), "submitted"))
      .take(50)

    for (const claim of submittedClaims) {
      if (claim.submittedAt && now - claim.submittedAt > 86400000) {
        if (chance(0.60)) {
          await ctx.db.patch(claim._id, {
            status: "acknowledged",
            updatedAt: now,
          })
        }
      }
    }

    // Get acknowledged claims
    const acknowledgedClaims = await ctx.db
      .query("claims")
      .filter(q => q.eq(q.field("status"), "acknowledged"))
      .take(50)

    for (const claim of acknowledgedClaims) {
      if (claim.submittedAt && now - claim.submittedAt > 172800000) { // 2 days
        if (chance(0.70)) {
          await ctx.db.patch(claim._id, {
            status: "pending",
            updatedAt: now,
          })
        }
      }
    }

    console.log(`[Status Progression] Processed ${submittedClaims.length + acknowledgedClaims.length} claims`)
  },
})
