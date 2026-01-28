import { mutation, query } from "../_generated/server"
import { v } from "convex/values"

// Risk factors that contribute to denial likelihood
const RISK_FACTORS = {
  HIGH_COST_PROCEDURE: { weight: 0.15, label: "High-cost procedure" },
  COMPLEX_MODIFIER: { weight: 0.12, label: "Complex modifier combination" },
  BUNDLING_RISK: { weight: 0.18, label: "Potential bundling issue" },
  AUTH_REQUIRED: { weight: 0.25, label: "Prior authorization required" },
  COVERAGE_GAP: { weight: 0.35, label: "Potential coverage gap" },
}

// Analyze a claim and calculate denial risk
export const analyzeClaim = mutation({
  args: {
    claimId: v.id("claims"),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId)
    if (!claim) throw new Error("Claim not found")

    const lineItems = await ctx.db
      .query("lineItems")
      .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
      .collect()

    const coverage = await ctx.db.get(claim.coverageId)

    // Calculate risk factors
    const riskFactors: string[] = []
    let totalRisk = 0

    // Check for prior auth requirement
    if (claim.priorAuthRequired && !claim.priorAuthNumber) {
      riskFactors.push(RISK_FACTORS.AUTH_REQUIRED.label)
      totalRisk += RISK_FACTORS.AUTH_REQUIRED.weight
    }

    // Check for high-cost procedures
    if (claim.totalCharges > 2000) {
      riskFactors.push(RISK_FACTORS.HIGH_COST_PROCEDURE.label)
      totalRisk += RISK_FACTORS.HIGH_COST_PROCEDURE.weight
    }

    // Check line items for modifiers
    const hasComplexModifiers = lineItems.some(
      (li) => li.modifiers && li.modifiers.length > 1
    )
    if (hasComplexModifiers) {
      riskFactors.push(RISK_FACTORS.COMPLEX_MODIFIER.label)
      totalRisk += RISK_FACTORS.COMPLEX_MODIFIER.weight
    }

    // Check for potential bundling issues
    if (lineItems.length > 3) {
      riskFactors.push(RISK_FACTORS.BUNDLING_RISK.label)
      totalRisk += RISK_FACTORS.BUNDLING_RISK.weight
    }

    // Check coverage verification
    if (coverage?.verificationStatus !== "verified") {
      riskFactors.push(RISK_FACTORS.COVERAGE_GAP.label)
      totalRisk += RISK_FACTORS.COVERAGE_GAP.weight
    }

    // Cap risk at 0.99
    const finalRisk = Math.min(totalRisk, 0.99)

    // Update the claim with risk analysis
    await ctx.db.patch(args.claimId, {
      denialRisk: finalRisk,
      denialRiskFactors: riskFactors,
      updatedAt: Date.now(),
    })

    return {
      claimId: args.claimId,
      denialRisk: finalRisk,
      denialRiskFactors: riskFactors,
    }
  },
})

// Get claims that need risk analysis
export const getClaimsNeedingAnalysis = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    const claims = await ctx.db
      .query("claims")
      .filter((q) => q.eq(q.field("denialRisk"), undefined))
      .take(limit)

    return claims.map((c) => c._id)
  },
})
