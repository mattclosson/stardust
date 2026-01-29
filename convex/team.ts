import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { authComponent } from "./auth"

// Role type for reuse
const roleValidator = v.union(
  v.literal("admin"),
  v.literal("supervisor"),
  v.literal("billing_specialist"),
  v.literal("coder"),
  v.literal("appeals_specialist"),
  v.literal("viewer")
)

// ============================================
// QUERIES
// ============================================

// Get the current user's RCM profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    let user
    try {
      user = await authComponent.getAuthUser(ctx)
    } catch {
      return null
    }
    if (!user) return null

    const rcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!rcmUser) return null

    // Get their RCM company
    const rcmCompany = await ctx.db.get(rcmUser.rcmCompanyId)

    return {
      ...rcmUser,
      rcmCompany,
      authUser: user,
    }
  },
})

// List all team members in the current user's RCM company
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return []

    // Get current user's RCM profile
    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) return []

    // Get all users in the same RCM company
    const teamMembers = await ctx.db
      .query("rcmUsers")
      .withIndex("by_rcmCompany", (q) => q.eq("rcmCompanyId", currentRcmUser.rcmCompanyId))
      .collect()

    // For each team member, get their organization assignments
    const membersWithAssignments = await Promise.all(
      teamMembers.map(async (member) => {
        const assignments = await ctx.db
          .query("rcmUserAssignments")
          .withIndex("by_rcmUser", (q) => q.eq("rcmUserId", member._id))
          .collect()

        // Get org names for each assignment
        const assignmentsWithOrgs = await Promise.all(
          assignments.map(async (assignment) => {
            const org = await ctx.db.get(assignment.organizationId)
            return {
              ...assignment,
              organizationName: org?.name ?? "Unknown",
            }
          })
        )

        return {
          ...member,
          assignments: assignmentsWithOrgs,
          organizationCount: assignments.length,
        }
      })
    )

    return membersWithAssignments
  },
})

// List team members assigned to a specific organization (for AssignDialog)
export const listForOrganization = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return []

    // Get assignments for this org
    const assignments = await ctx.db
      .query("rcmUserAssignments")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect()

    // Get the RCM users for each assignment
    const users = await Promise.all(
      assignments.map(async (assignment) => {
        const rcmUser = await ctx.db.get(assignment.rcmUserId)
        if (!rcmUser || rcmUser.status !== "active") return null
        return {
          _id: rcmUser._id,
          firstName: rcmUser.firstName,
          lastName: rcmUser.lastName,
          email: rcmUser.email,
          role: rcmUser.role,
          canView: assignment.canView,
          canEdit: assignment.canEdit,
          canManage: assignment.canManage,
        }
      })
    )

    return users.filter((u): u is NonNullable<typeof u> => u !== null)
  },
})

// Get pending invites for the current user's RCM company
export const getInvites = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return []

    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) return []

    // Only admins and supervisors can view invites
    if (currentRcmUser.role !== "admin" && currentRcmUser.role !== "supervisor") {
      return []
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_rcmCompany", (q) => q.eq("rcmCompanyId", currentRcmUser.rcmCompanyId))
      .collect()

    // Filter to pending and not expired
    const now = Date.now()
    return invites.filter(
      (invite) => invite.status === "pending" && invite.expiresAt > now
    )
  },
})

// Get invite details by token (public - for invite accept page)
export const getInviteByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first()

    if (!invite) return null

    // Get company name
    const company = await ctx.db.get(invite.rcmCompanyId)

    return {
      _id: invite._id,
      role: invite.role,
      email: invite.email,
      status: invite.status,
      expiresAt: invite.expiresAt,
      companyName: company?.name ?? "Unknown Company",
      isExpired: invite.expiresAt < Date.now(),
      isValid: invite.status === "pending" && invite.expiresAt > Date.now(),
    }
  },
})

// ============================================
// MUTATIONS
// ============================================

// Create an invite link
export const createInvite = mutation({
  args: {
    role: roleValidator,
    email: v.optional(v.string()),
    expiresInDays: v.optional(v.number()), // Default 7 days
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) throw new Error("Not a team member")

    // Only admins and supervisors can create invites
    if (currentRcmUser.role !== "admin" && currentRcmUser.role !== "supervisor") {
      throw new Error("Insufficient permissions")
    }

    // Generate a unique token
    const token = generateToken()

    const expiresInDays = args.expiresInDays ?? 7
    const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000

    const inviteId = await ctx.db.insert("invites", {
      rcmCompanyId: currentRcmUser.rcmCompanyId,
      email: args.email,
      role: args.role,
      token,
      status: "pending",
      createdBy: user._id,
      expiresAt,
      createdAt: Date.now(),
    })

    return {
      inviteId,
      token,
      expiresAt,
    }
  },
})

// Accept an invite (called after signup or by logged-in user)
export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    // Find the invite
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first()

    if (!invite) throw new Error("Invite not found")
    if (invite.status !== "pending") throw new Error("Invite already used or revoked")
    if (invite.expiresAt < Date.now()) throw new Error("Invite expired")

    // Check if user already has an RCM profile
    const existingRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (existingRcmUser) {
      throw new Error("User already belongs to a team")
    }

    // Create the RCM user
    const rcmUserId = await ctx.db.insert("rcmUsers", {
      rcmCompanyId: invite.rcmCompanyId,
      userId: user._id,
      email: user.email,
      firstName: user.name?.split(" ")[0] ?? "",
      lastName: user.name?.split(" ").slice(1).join(" ") ?? "",
      role: invite.role,
      status: "active",
      joinedAt: Date.now(),
      createdAt: Date.now(),
    })

    // Mark invite as accepted
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedBy: user._id,
      acceptedAt: Date.now(),
    })

    return { rcmUserId }
  },
})

// Revoke an invite
export const revokeInvite = mutation({
  args: {
    inviteId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) throw new Error("Not a team member")
    if (currentRcmUser.role !== "admin" && currentRcmUser.role !== "supervisor") {
      throw new Error("Insufficient permissions")
    }

    const invite = await ctx.db.get(args.inviteId)
    if (!invite) throw new Error("Invite not found")
    if (invite.rcmCompanyId !== currentRcmUser.rcmCompanyId) {
      throw new Error("Invite belongs to another company")
    }

    await ctx.db.patch(args.inviteId, { status: "revoked" })

    return { success: true }
  },
})

// Update a team member's role
export const updateRole = mutation({
  args: {
    rcmUserId: v.id("rcmUsers"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) throw new Error("Not a team member")
    if (currentRcmUser.role !== "admin") {
      throw new Error("Only admins can change roles")
    }

    const targetUser = await ctx.db.get(args.rcmUserId)
    if (!targetUser) throw new Error("User not found")
    if (targetUser.rcmCompanyId !== currentRcmUser.rcmCompanyId) {
      throw new Error("User belongs to another company")
    }

    // Prevent demoting the last admin
    if (targetUser.role === "admin" && args.role !== "admin") {
      const admins = await ctx.db
        .query("rcmUsers")
        .withIndex("by_rcmCompany", (q) => q.eq("rcmCompanyId", currentRcmUser.rcmCompanyId))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect()

      if (admins.length <= 1) {
        throw new Error("Cannot demote the last admin")
      }
    }

    await ctx.db.patch(args.rcmUserId, { role: args.role })

    return { success: true }
  },
})

// Update a team member's status (enable/disable)
export const updateStatus = mutation({
  args: {
    rcmUserId: v.id("rcmUsers"),
    status: v.union(v.literal("active"), v.literal("disabled")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) throw new Error("Not a team member")
    if (currentRcmUser.role !== "admin" && currentRcmUser.role !== "supervisor") {
      throw new Error("Insufficient permissions")
    }

    const targetUser = await ctx.db.get(args.rcmUserId)
    if (!targetUser) throw new Error("User not found")
    if (targetUser.rcmCompanyId !== currentRcmUser.rcmCompanyId) {
      throw new Error("User belongs to another company")
    }

    // Cannot disable yourself
    if (targetUser._id === currentRcmUser._id) {
      throw new Error("Cannot change your own status")
    }

    // Cannot disable the last admin
    if (targetUser.role === "admin" && args.status === "disabled") {
      const activeAdmins = await ctx.db
        .query("rcmUsers")
        .withIndex("by_rcmCompany", (q) => q.eq("rcmCompanyId", currentRcmUser.rcmCompanyId))
        .filter((q) =>
          q.and(
            q.eq(q.field("role"), "admin"),
            q.eq(q.field("status"), "active")
          )
        )
        .collect()

      if (activeAdmins.length <= 1) {
        throw new Error("Cannot disable the last active admin")
      }
    }

    await ctx.db.patch(args.rcmUserId, { status: args.status })

    return { success: true }
  },
})

// Assign a user to an organization with permissions
export const assignToOrganization = mutation({
  args: {
    rcmUserId: v.id("rcmUsers"),
    organizationId: v.id("organizations"),
    isPrimary: v.boolean(),
    canView: v.boolean(),
    canEdit: v.boolean(),
    canManage: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) throw new Error("Not a team member")
    if (currentRcmUser.role !== "admin" && currentRcmUser.role !== "supervisor") {
      throw new Error("Insufficient permissions")
    }

    const targetUser = await ctx.db.get(args.rcmUserId)
    if (!targetUser) throw new Error("User not found")
    if (targetUser.rcmCompanyId !== currentRcmUser.rcmCompanyId) {
      throw new Error("User belongs to another company")
    }

    // Check if assignment already exists
    const existingAssignment = await ctx.db
      .query("rcmUserAssignments")
      .withIndex("by_rcmUser", (q) => q.eq("rcmUserId", args.rcmUserId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first()

    if (existingAssignment) {
      // Update existing assignment
      await ctx.db.patch(existingAssignment._id, {
        isPrimary: args.isPrimary,
        canView: args.canView,
        canEdit: args.canEdit,
        canManage: args.canManage,
      })
    } else {
      // Create new assignment
      await ctx.db.insert("rcmUserAssignments", {
        rcmUserId: args.rcmUserId,
        organizationId: args.organizationId,
        assignedAt: Date.now(),
        assignedBy: user._id,
        isPrimary: args.isPrimary,
        canView: args.canView,
        canEdit: args.canEdit,
        canManage: args.canManage,
      })
    }

    // If this is set as primary, unset other primaries
    if (args.isPrimary) {
      const otherAssignments = await ctx.db
        .query("rcmUserAssignments")
        .withIndex("by_rcmUser", (q) => q.eq("rcmUserId", args.rcmUserId))
        .filter((q) => q.neq(q.field("organizationId"), args.organizationId))
        .collect()

      for (const assignment of otherAssignments) {
        if (assignment.isPrimary) {
          await ctx.db.patch(assignment._id, { isPrimary: false })
        }
      }
    }

    return { success: true }
  },
})

// Remove a user from an organization
export const removeFromOrganization = mutation({
  args: {
    rcmUserId: v.id("rcmUsers"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) throw new Error("Not a team member")
    if (currentRcmUser.role !== "admin" && currentRcmUser.role !== "supervisor") {
      throw new Error("Insufficient permissions")
    }

    const targetUser = await ctx.db.get(args.rcmUserId)
    if (!targetUser) throw new Error("User not found")
    if (targetUser.rcmCompanyId !== currentRcmUser.rcmCompanyId) {
      throw new Error("User belongs to another company")
    }

    const assignment = await ctx.db
      .query("rcmUserAssignments")
      .withIndex("by_rcmUser", (q) => q.eq("rcmUserId", args.rcmUserId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first()

    if (!assignment) throw new Error("Assignment not found")

    await ctx.db.delete(assignment._id)

    return { success: true }
  },
})

// Get all organizations for assigning to users
export const getAllOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return []

    const currentRcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!currentRcmUser) return []

    // Get organizations linked to this RCM company
    const orgs = await ctx.db
      .query("organizations")
      .withIndex("by_rcmCompany", (q) => q.eq("rcmCompanyId", currentRcmUser.rcmCompanyId))
      .collect()

    return orgs.map((org) => ({
      _id: org._id,
      name: org.name,
      specialty: org.specialty,
    }))
  },
})

// Update notification preferences for the current user
export const updateNotificationPreferences = mutation({
  args: {
    preferences: v.object({
      emailNotifications: v.boolean(),
      taskAssignments: v.boolean(),
      taskDueDates: v.boolean(),
      claimStatusChanges: v.boolean(),
      denialAlerts: v.boolean(),
      appealDeadlines: v.boolean(),
      teamUpdates: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error("Not authenticated")

    const rcmUser = await ctx.db
      .query("rcmUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    if (!rcmUser) throw new Error("User profile not found")

    await ctx.db.patch(rcmUser._id, {
      notificationPreferences: args.preferences,
    })

    return { success: true }
  },
})

// ============================================
// HELPERS
// ============================================

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
