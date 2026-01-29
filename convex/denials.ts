import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { enrichDenialWithClaimAndPatient } from "./utils/enrichment"

// List denials with filtering
export const list = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    let denials

    if (args.status) {
      denials = await ctx.db
        .query("denials")
        .withIndex("by_status", (q) => q.eq("status", args.status as never))
        .order("desc")
        .take(limit * 2) // Fetch extra to account for org filtering
    } else if (args.category) {
      denials = await ctx.db
        .query("denials")
        .withIndex("by_category", (q) =>
          q.eq("denialCategory", args.category as never)
        )
        .order("desc")
        .take(limit * 2)
    } else {
      denials = await ctx.db.query("denials").order("desc").take(limit * 2)
    }

    // Enrich denials with claim and patient data using shared utility
    const enrichedDenials = await Promise.all(
      denials.map(async (denial) => {
        const enriched = await enrichDenialWithClaimAndPatient(ctx, denial, { includeClaimOrg: true })
        if (!enriched) return null

        // Filter by organization if specified
        if (args.organizationId && enriched.claim?.organizationId !== args.organizationId) {
          return null
        }

        return enriched
      })
    )

    // Filter out nulls and limit results
    return enrichedDenials
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .slice(0, limit)
  },
})

// Get denial by ID with full details
export const getById = query({
  args: { denialId: v.id("denials") },
  handler: async (ctx, args) => {
    const denial = await ctx.db.get(args.denialId)
    if (!denial) return null

    const claim = await ctx.db.get(denial.claimId)
    if (!claim) return { ...denial, claim: null }

    const [patient, coverage, appeals, lineItem] = await Promise.all([
      ctx.db.get(claim.patientId),
      ctx.db.get(claim.coverageId),
      ctx.db
        .query("appeals")
        .withIndex("by_denial", (q) => q.eq("denialId", args.denialId))
        .collect(),
      denial.lineItemId ? ctx.db.get(denial.lineItemId) : null,
    ])

    const payer = coverage ? await ctx.db.get(coverage.payerId) : null

    return {
      ...denial,
      claim,
      patient,
      coverage,
      payer,
      appeals,
      lineItem,
    }
  },
})

// Get similar denials for pattern analysis
export const getSimilarDenials = query({
  args: {
    denialCode: v.string(),
    denialCategory: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10

    // Find denials with same category
    const similarByCategory = await ctx.db
      .query("denials")
      .withIndex("by_category", (q) =>
        q.eq("denialCategory", args.denialCategory as never)
      )
      .take(limit * 2)

    // Filter to same denial code and calculate overturn rate
    const sameDenialCode = similarByCategory.filter(
      (d) => d.denialCode === args.denialCode
    )

    const overturned = sameDenialCode.filter((d) => d.status === "overturned")
    const decided = sameDenialCode.filter((d) =>
      ["overturned", "upheld", "written_off"].includes(d.status)
    )

    const overturnRate =
      decided.length > 0 ? overturned.length / decided.length : 0

    return {
      similarDenials: sameDenialCode.slice(0, limit),
      totalCount: sameDenialCode.length,
      overturnRate,
      overturnedCount: overturned.length,
      decidedCount: decided.length,
    }
  },
})

// Update denial status
export const updateStatus = mutation({
  args: {
    denialId: v.id("denials"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.denialId, {
      status: args.status as never,
    })
    return { success: true }
  },
})

// Get denial statistics
// Uses sampling to avoid hitting byte limits on large datasets
export const getStats = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Very small sample to avoid byte limits - denials have large documents
    const DENIAL_SAMPLE = 100
    const CLAIM_SAMPLE = 200
    
    const stats = {
      total: 0,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      totalAtRisk: 0,
      appealRate: 0,
      overturnRate: 0,
      avgOverturnLikelihood: 0,
    }

    let sampleDenials: Array<{
      _id: string;
      claimId: string;
      status: string;
      denialCategory: string;
      overturnLikelihood?: number;
      [key: string]: unknown;
    }> = []

    if (args.organizationId) {
      // Get a sample of recent claims for this org first
      const orgClaims = await ctx.db
        .query("claims")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .order("desc")
        .take(CLAIM_SAMPLE)
      
      const claimIds = new Set(orgClaims.map(c => c._id))
      
      // Fetch denials in small batches, filtering by claim IDs
      const denialSample = await ctx.db
        .query("denials")
        .order("desc")
        .take(DENIAL_SAMPLE)
      
      sampleDenials = denialSample.filter(d => claimIds.has(d.claimId))
      
      // Estimate total based on org's denial count (if available)
      const org = await ctx.db.get(args.organizationId)
      stats.total = org?.denialCount ?? sampleDenials.length
    } else {
      // Global stats - just sample recent denials
      sampleDenials = await ctx.db
        .query("denials")
        .order("desc")
        .take(DENIAL_SAMPLE)
      stats.total = sampleDenials.length
    }

    let appealedCount = 0
    let decidedCount = 0
    let overturnedCount = 0
    let likelihoodSum = 0
    let likelihoodCount = 0

    for (const denial of sampleDenials) {
      stats.byStatus[denial.status] = (stats.byStatus[denial.status] || 0) + 1
      stats.byCategory[denial.denialCategory] =
        (stats.byCategory[denial.denialCategory] || 0) + 1

      if (["appealing", "appeal_submitted", "overturned", "upheld"].includes(denial.status)) {
        appealedCount++
      }

      if (["overturned", "upheld", "written_off"].includes(denial.status)) {
        decidedCount++
        if (denial.status === "overturned") {
          overturnedCount++
        }
      }

      if (denial.overturnLikelihood !== undefined) {
        likelihoodSum += denial.overturnLikelihood
        likelihoodCount++
      }
    }

    // Calculate rates (these are percentages, so sampling is fine)
    stats.appealRate = sampleDenials.length > 0 ? appealedCount / sampleDenials.length : 0
    stats.overturnRate = decidedCount > 0 ? overturnedCount / decidedCount : 0
    stats.avgOverturnLikelihood =
      likelihoodCount > 0 ? likelihoodSum / likelihoodCount : 0

    return stats
  },
})
