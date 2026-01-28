import { query, mutation, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { authComponent } from "./auth"

// Internal mutation to aggregate stats for a single org (called by cron)
export const aggregateOrgStats = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId)
    if (!org) return

    // Count claims using take() to stay under limits
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .take(100000)
    
    const claimCount = claims.length

    // Count denials - need to check via claims
    // This is expensive, so we do it in the background cron
    let denialCount = 0
    const claimIds = new Set(claims.map(c => c._id))
    const denials = await ctx.db.query("denials").take(100000)
    for (const denial of denials) {
      if (claimIds.has(denial.claimId)) {
        denialCount++
      }
    }

    // Update the organization with counts
    await ctx.db.patch(args.organizationId, {
      claimCount,
      denialCount,
    })

    console.log(`[Stats] ${org.name}: ${claimCount} claims, ${denialCount} denials`)
  },
})

// Internal mutation to run stats aggregation for all orgs
export const aggregateAllStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect()
    
    // Schedule aggregation for each org to spread the load
    for (let i = 0; i < orgs.length; i++) {
      // Stagger by 5 seconds each to avoid overwhelming the system
      await ctx.scheduler.runAfter(i * 5000, internal.organizations.aggregateOrgStats, {
        organizationId: orgs[i]._id,
      })
    }
    
    console.log(`[Stats] Scheduled aggregation for ${orgs.length} organizations`)
  },
})

// Backfill denormalized counters for a single organization
// Run this for each org to populate existing counts
export const backfillCountsForOrg = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId)
    if (!org) {
      return { success: false, message: "Organization not found" }
    }

    // Count claims for this org
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .take(100000)
    
    const claimCount = claims.length

    // Update the organization with count
    await ctx.db.patch(args.organizationId, {
      claimCount,
    })

    return { 
      success: true, 
      name: org.name,
      claimCount,
    }
  },
})

// Backfill all organizations - schedules individual backfills
export const backfillAllCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect()
    
    // Return org IDs for client to call backfillCountsForOrg for each
    return {
      message: `Found ${orgs.length} organizations. Call backfillCountsForOrg for each.`,
      organizationIds: orgs.map(o => o._id),
    }
  },
})

// Get the first organization (for single-tenant demos)
export const getFirst = query({
  args: {},
  handler: async (ctx) => {
    const org = await ctx.db.query("organizations").first()
    return org
  },
})

// Get organizations the current RCM user has access to
export const getMyOrganizations = query({
  args: {},
  handler: async (ctx) => {
    let user
    try {
      user = await authComponent.getAuthUser(ctx)
    } catch {
      // User is not authenticated - return empty array instead of throwing
      return []
    }
    if (!user) return []

    // Get RCM user record
    const rcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()
    if (!rcmUser) return []

    // Get assignments
    const assignments = await ctx.db
      .query("rcmUserAssignments")
      .withIndex("by_rcmUser", (q) => q.eq("rcmUserId", rcmUser._id))
      .collect()

    // Fetch organizations with isPrimary flag
    const orgs = await Promise.all(
      assignments.map(async (assignment) => {
        const org = await ctx.db.get(assignment.organizationId)
        return org ? { ...org, isPrimary: assignment.isPrimary } : null
      })
    )

    return orgs.filter((org): org is NonNullable<typeof org> => org !== null)
  },
})
