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

// Get all organizations for the RCM company (admin view)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return []

    const rcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!rcmUser) return []

    // Only admins and supervisors can see all organizations
    if (rcmUser.role !== "admin" && rcmUser.role !== "supervisor") {
      return []
    }

    const orgs = await ctx.db
      .query("organizations")
      .withIndex("by_rcmCompany", (q) => q.eq("rcmCompanyId", rcmUser.rcmCompanyId))
      .collect()

    // Get user counts for each org
    const orgsWithCounts = await Promise.all(
      orgs.map(async (org) => {
        const assignments = await ctx.db
          .query("rcmUserAssignments")
          .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
          .collect()
        
        return {
          ...org,
          userCount: assignments.length,
        }
      })
    )

    return orgsWithCounts
  },
})

// Get a single organization by ID
export const getById = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return null

    const rcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!rcmUser) return null

    const org = await ctx.db.get(args.organizationId)
    if (!org) return null

    // Verify the org belongs to the user's RCM company
    if (org.rcmCompanyId !== rcmUser.rcmCompanyId) {
      return null
    }

    return org
  },
})

// Create a new organization
export const create = mutation({
  args: {
    name: v.string(),
    npi: v.string(),
    taxId: v.string(),
    specialty: v.string(),
    facilityType: v.union(
      v.literal("physician_office"),
      v.literal("hospital_outpatient"),
      v.literal("asc"),
      v.literal("clinic")
    ),
    address: v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const rcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!rcmUser) throw new Error("Not a team member")
    if (rcmUser.role !== "admin") {
      throw new Error("Only admins can create organizations")
    }

    const orgId = await ctx.db.insert("organizations", {
      ...args,
      rcmCompanyId: rcmUser.rcmCompanyId,
      claimCount: 0,
      denialCount: 0,
      createdAt: Date.now(),
    })

    return { organizationId: orgId }
  },
})

// Update an organization
export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    npi: v.optional(v.string()),
    taxId: v.optional(v.string()),
    specialty: v.optional(v.string()),
    facilityType: v.optional(v.union(
      v.literal("physician_office"),
      v.literal("hospital_outpatient"),
      v.literal("asc"),
      v.literal("clinic")
    )),
    address: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const rcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!rcmUser) throw new Error("Not a team member")
    if (rcmUser.role !== "admin") {
      throw new Error("Only admins can update organizations")
    }

    const org = await ctx.db.get(args.organizationId)
    if (!org) throw new Error("Organization not found")
    if (org.rcmCompanyId !== rcmUser.rcmCompanyId) {
      throw new Error("Organization belongs to another company")
    }

    const { organizationId, ...updates } = args
    
    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value
      }
    }

    await ctx.db.patch(args.organizationId, filteredUpdates)

    return { success: true }
  },
})

// Delete an organization
export const remove = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const rcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!rcmUser) throw new Error("Not a team member")
    if (rcmUser.role !== "admin") {
      throw new Error("Only admins can delete organizations")
    }

    const org = await ctx.db.get(args.organizationId)
    if (!org) throw new Error("Organization not found")
    if (org.rcmCompanyId !== rcmUser.rcmCompanyId) {
      throw new Error("Organization belongs to another company")
    }

    // Check if org has claims - prevent deletion if so
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first()

    if (claims) {
      throw new Error("Cannot delete organization with existing claims")
    }

    // Delete all user assignments for this org
    const assignments = await ctx.db
      .query("rcmUserAssignments")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect()

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id)
    }

    await ctx.db.delete(args.organizationId)

    return { success: true }
  },
})
