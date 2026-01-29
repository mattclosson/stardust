import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { enrichTaskWithRelatedEntities } from "./utils/enrichment"

// List tasks with filtering
export const list = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    status: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    let tasks

    if (args.organizationId && args.status) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) =>
          q.eq("organizationId", args.organizationId!).eq("status", args.status as never)
        )
        .order("desc")
        .take(limit)
    } else if (args.assignedTo) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_assignedTo", (q) => q.eq("assignedTo", args.assignedTo!))
        .order("desc")
        .take(limit)
    } else if (args.organizationId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .order("desc")
        .take(limit)
    } else {
      tasks = await ctx.db.query("tasks").order("desc").take(limit)
    }

    // Enrich with related entity info using shared utility
    const enrichedTasks = await Promise.all(
      tasks.map((task) => enrichTaskWithRelatedEntities(ctx, task))
    )

    return enrichedTasks
  },
})

// Get task by ID
export const getById = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId)
    if (!task) return null

    const notes = await ctx.db
      .query("taskNotes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect()

    const claim = task.claimId ? await ctx.db.get(task.claimId) : null
    const denial = task.denialId ? await ctx.db.get(task.denialId) : null
    const patient = task.patientId ? await ctx.db.get(task.patientId) : null

    return {
      ...task,
      notes,
      claim,
      denial,
      patient,
    }
  },
})

// Create task
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("follow_up"),
      v.literal("appeal"),
      v.literal("eligibility"),
      v.literal("coding_review"),
      v.literal("patient_contact"),
      v.literal("auth_request"),
      v.literal("other")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    claimId: v.optional(v.id("claims")),
    denialId: v.optional(v.id("denials")),
    patientId: v.optional(v.id("patients")),
    dueDate: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    source: v.union(v.literal("manual"), v.literal("system"), v.literal("ai")),
    aiConfidence: v.optional(v.number()),
    aiReasoning: v.optional(v.string()),
    aiPriorityScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      status: "pending",
      assignedAt: args.assignedTo ? now : undefined,
      createdAt: now,
      updatedAt: now,
    })

    return { taskId }
  },
})

// Update task
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { taskId, ...updates } = args
    const now = Date.now()

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    }

    if (updates.status) {
      updateData.status = updates.status
      if (updates.status === "completed") {
        updateData.completedAt = now
      }
    }

    if (updates.assignedTo !== undefined) {
      updateData.assignedTo = updates.assignedTo
      updateData.assignedAt = now
    }

    if (updates.priority) {
      updateData.priority = updates.priority
    }

    await ctx.db.patch(taskId, updateData)
    return { success: true }
  },
})

// Add note to task
export const addNote = mutation({
  args: {
    taskId: v.id("tasks"),
    note: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("taskNotes", {
      taskId: args.taskId,
      note: args.note,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    })

    return { noteId }
  },
})

// Get task statistics
export const getStats = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    let tasks

    if (args.organizationId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .collect()
    } else {
      tasks = await ctx.db.query("tasks").collect()
    }

    const stats = {
      total: tasks.length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      overdue: 0,
      aiGenerated: 0,
    }

    const now = Date.now()

    for (const task of tasks) {
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1
      stats.byCategory[task.category] = (stats.byCategory[task.category] || 0) + 1

      if (
        task.dueDate &&
        new Date(task.dueDate).getTime() < now &&
        task.status !== "completed"
      ) {
        stats.overdue++
      }

      if (task.source === "ai") {
        stats.aiGenerated++
      }
    }

    return stats
  },
})
