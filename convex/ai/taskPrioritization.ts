import { mutation, query } from "../_generated/server"
import { v } from "convex/values"

// Priority scoring factors
const PRIORITY_FACTORS = {
  DEADLINE_CRITICAL: { days: 3, score: 40 },
  DEADLINE_URGENT: { days: 7, score: 30 },
  DEADLINE_SOON: { days: 14, score: 20 },
  HIGH_VALUE: { threshold: 5000, score: 25 },
  MEDIUM_VALUE: { threshold: 2000, score: 15 },
  HIGH_OVERTURN: { threshold: 0.7, score: 20 },
  CATEGORY_APPEAL: 15,
  CATEGORY_ELIGIBILITY: 12,
}

// Calculate priority score for a task
export const calculateTaskPriority = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId)
    if (!task) throw new Error("Task not found")

    const claim = task.claimId ? await ctx.db.get(task.claimId) : null
    const denial = task.denialId ? await ctx.db.get(task.denialId) : null

    let score = 0
    const reasoning: string[] = []

    // Deadline urgency
    if (task.dueDate) {
      const daysUntilDue = Math.ceil(
        (new Date(task.dueDate).getTime() - Date.now()) / 86400000
      )

      if (daysUntilDue <= PRIORITY_FACTORS.DEADLINE_CRITICAL.days) {
        score += PRIORITY_FACTORS.DEADLINE_CRITICAL.score
        reasoning.push(`Critical deadline in ${daysUntilDue} days`)
      } else if (daysUntilDue <= PRIORITY_FACTORS.DEADLINE_URGENT.days) {
        score += PRIORITY_FACTORS.DEADLINE_URGENT.score
        reasoning.push(`Urgent deadline in ${daysUntilDue} days`)
      } else if (daysUntilDue <= PRIORITY_FACTORS.DEADLINE_SOON.days) {
        score += PRIORITY_FACTORS.DEADLINE_SOON.score
        reasoning.push(`Deadline approaching in ${daysUntilDue} days`)
      }
    }

    // Financial impact
    if (claim) {
      if (claim.totalCharges >= PRIORITY_FACTORS.HIGH_VALUE.threshold) {
        score += PRIORITY_FACTORS.HIGH_VALUE.score
        reasoning.push(`High-value claim ($${claim.totalCharges.toFixed(0)})`)
      } else if (claim.totalCharges >= PRIORITY_FACTORS.MEDIUM_VALUE.threshold) {
        score += PRIORITY_FACTORS.MEDIUM_VALUE.score
      }
    }

    // Overturn likelihood for denial-related tasks
    if (denial?.overturnLikelihood && denial.overturnLikelihood >= PRIORITY_FACTORS.HIGH_OVERTURN.threshold) {
      score += PRIORITY_FACTORS.HIGH_OVERTURN.score
      reasoning.push(`High overturn likelihood (${(denial.overturnLikelihood * 100).toFixed(0)}%)`)
    }

    // Category-based scoring
    if (task.category === "appeal") {
      score += PRIORITY_FACTORS.CATEGORY_APPEAL
    } else if (task.category === "eligibility") {
      score += PRIORITY_FACTORS.CATEGORY_ELIGIBILITY
    }

    // Determine priority level based on score
    let priority: "low" | "medium" | "high" | "critical"
    if (score >= 70) {
      priority = "critical"
    } else if (score >= 50) {
      priority = "high"
    } else if (score >= 30) {
      priority = "medium"
    } else {
      priority = "low"
    }

    // Update task with AI priority
    await ctx.db.patch(args.taskId, {
      priority,
      aiPriorityScore: score,
      aiReasoning: reasoning.join("; "),
      updatedAt: Date.now(),
    })

    return {
      taskId: args.taskId,
      priority,
      score,
      reasoning,
    }
  },
})

// Get pending tasks for prioritization
export const getPendingTasks = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .collect()

    return tasks
  },
})

// Auto-generate tasks based on high-risk claims
export const generateTasksForHighRiskClaims = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Find high-risk claims
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect()

    const highRiskClaims = claims.filter(
      (c) => c.denialRisk && c.denialRisk >= 0.7 && 
             ["submitted", "pending"].includes(c.status)
    )

    const createdTasks: string[] = []

    for (const claim of highRiskClaims) {
      // Check if task already exists for this claim
      const existingTask = await ctx.db
        .query("tasks")
        .withIndex("by_claim", (q) => q.eq("claimId", claim._id))
        .first()

      if (!existingTask) {
        const taskId = await ctx.db.insert("tasks", {
          organizationId: args.organizationId,
          claimId: claim._id,
          title: `Review high-risk claim ${claim.claimNumber}`,
          description: `This claim has a ${((claim.denialRisk || 0) * 100).toFixed(0)}% denial risk. Review before payer adjudication.`,
          category: "coding_review",
          priority: "high",
          status: "pending",
          source: "ai",
          aiConfidence: 0.85,
          aiReasoning: `High denial risk score of ${((claim.denialRisk || 0) * 100).toFixed(0)}%`,
          createdAt: now,
          updatedAt: now,
        })
        createdTasks.push(taskId)
      }
    }

    return {
      created: createdTasks.length,
      taskIds: createdTasks,
    }
  },
})
