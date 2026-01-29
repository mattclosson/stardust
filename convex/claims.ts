import { query, mutation } from "./_generated/server"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { claimsByOrg, claimsByStatus, getClaimStatsBatch } from "./aggregates"
import { enrichClaimsWithPatientAndPayer } from "./utils/enrichment"

// List claims with filtering and pagination
export const list = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    status: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    let claimsQuery

    if (args.organizationId && args.status) {
      claimsQuery = ctx.db
        .query("claims")
        .withIndex("by_status", (q) =>
          q.eq("organizationId", args.organizationId!).eq("status", args.status as never)
        )
        .order("desc")
    } else if (args.organizationId) {
      claimsQuery = ctx.db
        .query("claims")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .order("desc")
    } else {
      claimsQuery = ctx.db.query("claims").order("desc")
    }

    const paginatedClaims = await claimsQuery.paginate(args.paginationOpts)

    // Enrich claims with patient and payer data using shared utility
    const enrichedPage = await enrichClaimsWithPatientAndPayer(ctx, paginatedClaims.page)

    return {
      ...paginatedClaims,
      page: enrichedPage,
    }
  },
})

// Search claims by claim number using search index
export const search = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    // Use search index for claim number search
    let searchQuery = ctx.db
      .query("claims")
      .withSearchIndex("search_claimNumber", (q) => {
        let search = q.search("claimNumber", args.searchTerm)
        search = search.eq("organizationId", args.organizationId)
        if (args.status) {
          search = search.eq("status", args.status as never)
        }
        return search
      })

    const claims = await searchQuery.take(limit)

    // Enrich with patient and payer data using shared utility
    return enrichClaimsWithPatientAndPayer(ctx, claims)
  },
})

// Get a single claim by ID with all related data
export const getById = query({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId)
    if (!claim) return null

    const [patient, coverage, lineItems, diagnoses, statusEvents, denials] =
      await Promise.all([
        ctx.db.get(claim.patientId),
        ctx.db.get(claim.coverageId),
        ctx.db
          .query("lineItems")
          .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
          .collect(),
        ctx.db
          .query("claimDiagnoses")
          .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
          .collect(),
        ctx.db
          .query("claimStatusEvents")
          .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
          .order("desc")
          .collect(),
        ctx.db
          .query("denials")
          .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
          .collect(),
      ])

    const payer = coverage ? await ctx.db.get(coverage.payerId) : null
    const billingProvider = await ctx.db.get(claim.billingProviderId)
    const renderingProvider = await ctx.db.get(claim.renderingProviderId)

    return {
      ...claim,
      patient,
      coverage,
      payer,
      billingProvider,
      renderingProvider,
      lineItems,
      diagnoses,
      statusEvents,
      denials,
    }
  },
})

// Get claim timeline (status history)
export const getTimeline = query({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("claimStatusEvents")
      .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
      .order("desc")
      .collect()
  },
})

// Update claim status
export const updateStatus = mutation({
  args: {
    claimId: v.id("claims"),
    status: v.string(),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    actorType: v.union(v.literal("system"), v.literal("user"), v.literal("payer")),
    actorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId)
    if (!claim) throw new Error("Claim not found")

    const now = Date.now()

    // Update claim status
    await ctx.db.patch(args.claimId, {
      status: args.status as never,
      updatedAt: now,
    })

    // Record status change event
    await ctx.db.insert("claimStatusEvents", {
      claimId: args.claimId,
      fromStatus: claim.status,
      toStatus: args.status,
      reason: args.reason,
      notes: args.notes,
      actorType: args.actorType,
      actorId: args.actorId,
      createdAt: now,
    })

    return { success: true }
  },
})

// Assign claim to user
export const assign = mutation({
  args: {
    claimId: v.id("claims"),
    assignedTo: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.claimId, {
      assignedTo: args.assignedTo,
      updatedAt: Date.now(),
    })
    return { success: true }
  },
})

// Update claim fields
export const update = mutation({
  args: {
    claimId: v.id("claims"),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { claimId, ...updates } = args
    const now = Date.now()

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    }

    if (updates.priority !== undefined) {
      updateData.priority = updates.priority
    }

    if (updates.assignedTo !== undefined) {
      updateData.assignedTo = updates.assignedTo
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes
    }

    await ctx.db.patch(claimId, updateData)
    return { success: true }
  },
})

// Get total count of claims for pagination
// Uses aggregate component for O(log n) efficient counting
export const count = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If filtering by status, we still need to query (aggregate doesn't support this filter)
    if (args.status) {
      const MAX_COUNT = 1000
      let query
      
      if (args.organizationId) {
        query = ctx.db
          .query("claims")
          .withIndex("by_status", (q) =>
            q.eq("organizationId", args.organizationId!).eq("status", args.status as never)
          )
      } else {
        query = ctx.db.query("claims")
      }
      
      const claims = await query.take(MAX_COUNT)
      return claims.length
    }
    
    // Use aggregate for organization total - O(log n) lookup
    if (args.organizationId) {
      // Try aggregate first
      const aggCount = await claimsByOrg.count(ctx, { namespace: args.organizationId })
      if (aggCount > 0) {
        return aggCount
      }
      // Fallback to denormalized counter if aggregate not populated
      const org = await ctx.db.get(args.organizationId)
      if (org?.claimCount && org.claimCount > 0) {
        return org.claimCount
      }
      // Last resort: sample count
      const sample = await ctx.db
        .query("claims")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId!))
        .take(1000)
      return sample.length
    }
    
    // For global count, sum across all orgs
    const orgs = await ctx.db.query("organizations").collect()
    let total = 0
    for (const org of orgs) {
      const aggCount = await claimsByOrg.count(ctx, { namespace: org._id })
      if (aggCount > 0) {
        total += aggCount
      } else if (org.claimCount && org.claimCount > 0) {
        total += org.claimCount
      }
    }
    return total
  },
})

// Get claim context for voice assistant
// Returns formatted data suitable for PersonaPlex voice prompts
export const getVoiceContext = query({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId)
    if (!claim) return null

    const [patient, coverage, diagnoses, lineItems] = await Promise.all([
      ctx.db.get(claim.patientId),
      ctx.db.get(claim.coverageId),
      ctx.db
        .query("claimDiagnoses")
        .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
        .collect(),
      ctx.db
        .query("lineItems")
        .withIndex("by_claim", (q) => q.eq("claimId", args.claimId))
        .collect(),
    ])

    const payer = coverage ? await ctx.db.get(coverage.payerId) : null

    return {
      claimNumber: claim.claimNumber,
      payerClaimNumber: claim.payerClaimNumber,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown",
      patientMrn: patient?.mrn ?? "Unknown",
      payerName: payer?.name ?? "Unknown",
      memberId: coverage?.memberId ?? "Unknown",
      groupNumber: coverage?.groupNumber,
      dateOfService: claim.dateOfService,
      dateOfServiceEnd: claim.dateOfServiceEnd,
      totalCharges: claim.totalCharges,
      totalAllowed: claim.totalAllowed,
      totalPaid: claim.totalPaid,
      totalAdjustments: claim.totalAdjustments,
      totalPatientResponsibility: claim.totalPatientResponsibility,
      status: claim.status,
      priority: claim.priority,
      priorAuthNumber: claim.priorAuthNumber,
      diagnoses: diagnoses.map((d) => `${d.code}${d.description ? `: ${d.description}` : ""}`),
      procedures: lineItems.map(
        (l) => `${l.procedureCode}${l.description ? `: ${l.description}` : ""} (${l.units} units, $${l.chargeAmount})`
      ),
    }
  },
})

// Get claims statistics for dashboard
// Uses batch aggregate operations for exact counts, samples for other metrics
export const getStats = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const stats = {
      total: 0,
      byStatus: {} as Record<string, number>,
      totalCharges: 0,
      totalPaid: 0,
      totalPending: 0,
      deniedCount: 0,
      highRiskCount: 0,
    }

    // If we have an organizationId, use batch aggregates for exact counts
    if (args.organizationId) {
      try {
        const batchStats = await getClaimStatsBatch(ctx, args.organizationId, {
          startTime: args.startTime,
          endTime: args.endTime,
        })
        
        if (batchStats.total > 0) {
          stats.total = batchStats.total
          stats.totalCharges = batchStats.totalCharges
          
          // Convert byStatus from {count, charges} to just count
          for (const [status, data] of Object.entries(batchStats.byStatus)) {
            stats.byStatus[status] = data.count
          }
          
          // Get denied count from byStatus
          stats.deniedCount = batchStats.byStatus["denied"]?.count ?? 0
          
          // Calculate pending from relevant statuses
          const pendingStatuses = ["submitted", "acknowledged", "pending"]
          for (const status of pendingStatuses) {
            if (batchStats.byStatus[status]) {
              stats.totalPending += batchStats.byStatus[status].charges
            }
          }
        }
      } catch {
        // Aggregate not backfilled yet - fall through to sample
      }
    }

    // For totalPaid and highRiskCount, we still need to sample
    // (these aren't tracked in aggregates)
    const SAMPLE_SIZE = 200
    
    let query
    if (args.organizationId) {
      query = ctx.db
        .query("claims")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .order("desc")
    } else {
      query = ctx.db.query("claims").order("desc")
    }

    const sampleClaims = await query.take(SAMPLE_SIZE)

    // If aggregate didn't give us data, use sample for totals
    if (stats.total === 0) {
      stats.total = sampleClaims.length
      for (const claim of sampleClaims) {
        stats.byStatus[claim.status] = (stats.byStatus[claim.status] || 0) + 1
        stats.totalCharges += claim.totalCharges
        if (claim.status === "denied") stats.deniedCount++
      }
    }

    // Calculate sample-based metrics
    let samplePaid = 0
    let sampleHighRisk = 0
    for (const claim of sampleClaims) {
      samplePaid += claim.totalPaid || 0
      if (claim.denialRisk && claim.denialRisk > 0.7) {
        sampleHighRisk++
      }
    }

    // Scale up sample-based metrics if needed
    if (stats.total > sampleClaims.length && sampleClaims.length > 0) {
      const ratio = stats.total / sampleClaims.length
      stats.totalPaid = Math.round(samplePaid * ratio)
      stats.highRiskCount = Math.round(sampleHighRisk * ratio)
    } else {
      stats.totalPaid = samplePaid
      stats.highRiskCount = sampleHighRisk
    }

    return stats
  },
})
