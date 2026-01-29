import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { enrichAppealWithDenialAndClaim } from "./utils/enrichment"

// List appeals
export const list = query({
  args: {
    claimId: v.optional(v.id("claims")),
    denialId: v.optional(v.id("denials")),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    let appeals

    if (args.denialId) {
      appeals = await ctx.db
        .query("appeals")
        .withIndex("by_denial", (q) => q.eq("denialId", args.denialId!))
        .order("desc")
        .take(limit)
    } else if (args.claimId) {
      appeals = await ctx.db
        .query("appeals")
        .withIndex("by_claim", (q) => q.eq("claimId", args.claimId!))
        .order("desc")
        .take(limit)
    } else {
      appeals = await ctx.db.query("appeals").order("desc").take(limit)
    }

    // Enrich with denial and claim info using shared utility
    const enrichedAppeals = await Promise.all(
      appeals.map((appeal) => enrichAppealWithDenialAndClaim(ctx, appeal))
    )

    return enrichedAppeals
  },
})

// Get appeal by ID
export const getById = query({
  args: { appealId: v.id("appeals") },
  handler: async (ctx, args) => {
    const appeal = await ctx.db.get(args.appealId)
    if (!appeal) return null

    const denial = await ctx.db.get(appeal.denialId)
    const claim = await ctx.db.get(appeal.claimId)

    return {
      ...appeal,
      denial,
      claim,
    }
  },
})

// Create a new appeal
export const create = mutation({
  args: {
    denialId: v.id("denials"),
    claimId: v.id("claims"),
    appealLevel: v.number(),
    appealType: v.union(
      v.literal("reconsideration"),
      v.literal("formal_appeal"),
      v.literal("external_review")
    ),
    submissionMethod: v.union(
      v.literal("electronic"),
      v.literal("fax"),
      v.literal("mail"),
      v.literal("portal")
    ),
    generatedAppealLetter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const appealId = await ctx.db.insert("appeals", {
      denialId: args.denialId,
      claimId: args.claimId,
      appealLevel: args.appealLevel,
      appealType: args.appealType,
      submissionMethod: args.submissionMethod,
      generatedAppealLetter: args.generatedAppealLetter,
      status: "draft",
      createdAt: now,
    })

    // Update denial status
    await ctx.db.patch(args.denialId, {
      status: "appealing",
    })

    return { appealId }
  },
})

// Update appeal
export const update = mutation({
  args: {
    appealId: v.id("appeals"),
    status: v.optional(v.string()),
    outcome: v.optional(v.string()),
    generatedAppealLetter: v.optional(v.string()),
    responseNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { appealId, ...updates } = args
    const now = Date.now()

    const updateData: Record<string, unknown> = {}

    if (updates.status) {
      updateData.status = updates.status
      if (updates.status === "submitted") {
        updateData.submittedAt = now
      }
    }

    if (updates.outcome) {
      updateData.outcome = updates.outcome
      updateData.responseReceivedAt = now
    }

    if (updates.generatedAppealLetter) {
      updateData.generatedAppealLetter = updates.generatedAppealLetter
    }

    if (updates.responseNotes) {
      updateData.responseNotes = updates.responseNotes
    }

    await ctx.db.patch(appealId, updateData)

    // If appeal is decided, update denial and potentially claim status
    if (updates.outcome) {
      const appeal = await ctx.db.get(appealId)
      if (appeal) {
        // Map outcome to denial status
        const denialStatusMap: Record<string, string> = {
          overturned: "overturned",
          partially_overturned: "overturned", // Treat partial as overturned for denial tracking
          upheld: "upheld",
        }
        const denialStatus = denialStatusMap[updates.outcome] || "appeal_submitted"

        await ctx.db.patch(appeal.denialId, {
          status: denialStatus as never,
        })

        // If overturned, update claim status to indicate it should be reprocessed
        if (updates.outcome === "overturned" || updates.outcome === "partially_overturned") {
          const denial = await ctx.db.get(appeal.denialId)
          if (denial) {
            const claim = await ctx.db.get(denial.claimId)
            if (claim && claim.status === "denied") {
              await ctx.db.patch(denial.claimId, {
                status: "appealed",
                updatedAt: Date.now(),
              })
            }
          }
        }
      }
    }

    return { success: true }
  },
})

// Submit appeal
export const submit = mutation({
  args: {
    appealId: v.id("appeals"),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.patch(args.appealId, {
      status: "submitted",
      submittedAt: now,
    })

    // Update denial status
    const appeal = await ctx.db.get(args.appealId)
    if (appeal) {
      await ctx.db.patch(appeal.denialId, {
        status: "appeal_submitted",
      })
    }

    return { success: true }
  },
})
