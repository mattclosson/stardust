import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"

// Initiate a new hold call
export const initiate = mutation({
  args: {
    organizationId: v.id("organizations"),
    payerId: v.id("payers"),
    claimId: v.optional(v.id("claims")),
    denialId: v.optional(v.id("denials")),
    userPhoneNumber: v.string(),
    initiatedBy: v.string(),
    callPurpose: v.optional(v.union(
      v.literal("claims_status"),
      v.literal("eligibility"),
      v.literal("prior_auth"),
      v.literal("appeal"),
      v.literal("general")
    )),
  },
  handler: async (ctx, args) => {
    // Get payer phone number
    const payer = await ctx.db.get(args.payerId)
    if (!payer) throw new Error("Payer not found")

    const phoneNumber = payer.providerServicesPhone || payer.claimsPhone
    if (!phoneNumber) throw new Error("Payer has no phone number configured")

    const now = Date.now()

    const callId = await ctx.db.insert("holdCalls", {
      organizationId: args.organizationId,
      payerId: args.payerId,
      claimId: args.claimId,
      denialId: args.denialId,
      callPurpose: args.callPurpose || "general",
      phoneNumber,
      status: "initiating",
      userPhoneNumber: args.userPhoneNumber,
      initiatedBy: args.initiatedBy,
      startedAt: now,
      createdAt: now,
    })

    return { callId, phoneNumber }
  },
})

// Update call status (used by simulator and eventually Twilio)
export const updateStatus = mutation({
  args: {
    callId: v.id("holdCalls"),
    status: v.union(
      v.literal("initiating"),
      v.literal("dialing"),
      v.literal("ivr_navigation"),
      v.literal("on_hold"),
      v.literal("operator_detected"),
      v.literal("user_connected"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    twilioCallSid: v.optional(v.string()),
    operatorName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId)
    if (!call) throw new Error("Call not found")

    const now = Date.now()
    const updates: Record<string, unknown> = { status: args.status }

    if (args.twilioCallSid) updates.twilioCallSid = args.twilioCallSid
    if (args.operatorName) updates.operatorName = args.operatorName
    if (args.notes) updates.notes = args.notes

    // Track timing based on status transitions
    if (args.status === "on_hold" && !call.holdStartedAt) {
      updates.holdStartedAt = now
    }
    if (args.status === "operator_detected" && !call.operatorDetectedAt) {
      updates.operatorDetectedAt = now
      if (call.holdStartedAt) {
        updates.totalHoldTimeSeconds = Math.floor((now - call.holdStartedAt) / 1000)
      }
    }
    if (args.status === "user_connected" && !call.connectedAt) {
      updates.connectedAt = now
    }
    if (["completed", "failed", "cancelled"].includes(args.status) && !call.endedAt) {
      updates.endedAt = now
    }

    await ctx.db.patch(args.callId, updates)
    return { success: true }
  },
})

// Internal mutation for scheduled status updates
export const internalUpdateStatus = internalMutation({
  args: {
    callId: v.id("holdCalls"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId)
    if (!call) return
    
    // Don't update if call was cancelled or already ended
    if (["completed", "failed", "cancelled"].includes(call.status)) {
      return
    }

    const now = Date.now()
    const updates: Record<string, unknown> = { status: args.status }

    if (args.status === "on_hold" && !call.holdStartedAt) {
      updates.holdStartedAt = now
    }
    if (args.status === "operator_detected" && !call.operatorDetectedAt) {
      updates.operatorDetectedAt = now
      if (call.holdStartedAt) {
        updates.totalHoldTimeSeconds = Math.floor((now - call.holdStartedAt) / 1000)
      }
    }

    await ctx.db.patch(args.callId, updates)
  },
})

// Cancel an active call
export const cancel = mutation({
  args: {
    callId: v.id("holdCalls"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId)
    if (!call) throw new Error("Call not found")

    if (["completed", "failed", "cancelled"].includes(call.status)) {
      throw new Error("Call has already ended")
    }

    const now = Date.now()
    await ctx.db.patch(args.callId, {
      status: "cancelled",
      endedAt: now,
    })

    return { success: true }
  },
})

// Mark call as completed with notes
export const complete = mutation({
  args: {
    callId: v.id("holdCalls"),
    operatorName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId)
    if (!call) throw new Error("Call not found")

    const now = Date.now()
    const updates: Record<string, unknown> = {
      status: "completed",
      endedAt: now,
    }

    if (args.operatorName) updates.operatorName = args.operatorName
    if (args.notes) updates.notes = args.notes

    await ctx.db.patch(args.callId, updates)
    return { success: true }
  },
})

// Get call by ID (for real-time subscription)
export const getById = query({
  args: { callId: v.id("holdCalls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId)
    if (!call) return null

    const payer = await ctx.db.get(call.payerId)
    const claim = call.claimId ? await ctx.db.get(call.claimId) : null
    const denial = call.denialId ? await ctx.db.get(call.denialId) : null

    return {
      ...call,
      payer: payer ? { _id: payer._id, name: payer.name } : null,
      claim: claim ? { _id: claim._id, claimNumber: claim.claimNumber } : null,
      denial: denial ? { _id: denial._id, denialCode: denial.denialCode } : null,
    }
  },
})

// Get all active calls for organization (for global banner)
export const getActive = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const activeCalls = await ctx.db
      .query("holdCalls")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "failed"),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect()

    // Enrich with payer info
    return Promise.all(
      activeCalls.map(async (call) => {
        const payer = await ctx.db.get(call.payerId)
        const claim = call.claimId ? await ctx.db.get(call.claimId) : null
        return {
          ...call,
          payer: payer ? { _id: payer._id, name: payer.name } : null,
          claim: claim ? { _id: claim._id, claimNumber: claim.claimNumber } : null,
        }
      })
    )
  },
})

// Get call history for a claim or denial
export const getHistory = query({
  args: {
    claimId: v.optional(v.id("claims")),
    denialId: v.optional(v.id("denials")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    let calls
    if (args.denialId) {
      calls = await ctx.db
        .query("holdCalls")
        .withIndex("by_denial", (q) => q.eq("denialId", args.denialId!))
        .order("desc")
        .take(limit)
    } else if (args.claimId) {
      calls = await ctx.db
        .query("holdCalls")
        .withIndex("by_claim", (q) => q.eq("claimId", args.claimId!))
        .order("desc")
        .take(limit)
    } else {
      return []
    }

    return Promise.all(
      calls.map(async (call) => {
        const payer = await ctx.db.get(call.payerId)
        return {
          ...call,
          payer: payer ? { _id: payer._id, name: payer.name } : null,
        }
      })
    )
  },
})

// Get call statistics
export const getStats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("holdCalls")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect()

    const completedCalls = calls.filter((c) => c.status === "completed")
    const totalHoldTime = completedCalls.reduce(
      (sum, c) => sum + (c.totalHoldTimeSeconds || 0),
      0
    )

    return {
      totalCalls: calls.length,
      completedCalls: completedCalls.length,
      activeCalls: calls.filter((c) =>
        !["completed", "failed", "cancelled"].includes(c.status)
      ).length,
      avgHoldTimeSeconds:
        completedCalls.length > 0
          ? Math.round(totalHoldTime / completedCalls.length)
          : 0,
      successRate:
        calls.length > 0
          ? Math.round((completedCalls.length / calls.length) * 100)
          : 0,
    }
  },
})

// Simulate a call (mock action for testing)
export const simulateCall = action({
  args: {
    callId: v.id("holdCalls"),
  },
  handler: async (ctx, args) => {
    // Schedule status transitions to simulate a real call
    // initiating -> dialing (2s) -> on_hold (3s) -> operator_detected (15-25s)

    // After 2 seconds: dialing
    await ctx.scheduler.runAfter(2000, internal.holdCalls.internalUpdateStatus, {
      callId: args.callId,
      status: "dialing",
    })

    // After 5 seconds: on_hold
    await ctx.scheduler.runAfter(5000, internal.holdCalls.internalUpdateStatus, {
      callId: args.callId,
      status: "on_hold",
    })

    // After 15-25 seconds: operator_detected (random to simulate real hold times)
    const holdTime = 15000 + Math.random() * 10000 // 15-25 seconds
    await ctx.scheduler.runAfter(5000 + holdTime, internal.holdCalls.internalUpdateStatus, {
      callId: args.callId,
      status: "operator_detected",
    })

    return { scheduled: true }
  },
})

// Start a real call via the telephony service (production)
export const startRealCall = action({
  args: {
    callId: v.id("holdCalls"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; twilioCallSid: string }> => {
    // Get call details
    const call = await ctx.runQuery(internal.holdCalls.getCallInternal, {
      callId: args.callId,
    })
    if (!call) throw new Error("Call not found")

    const telephonyServiceUrl = process.env.TELEPHONY_SERVICE_URL
    if (!telephonyServiceUrl) {
      throw new Error("TELEPHONY_SERVICE_URL not configured")
    }

    // Call the telephony service to initiate the real call
    // Include IVR navigation context
    const response: Response = await fetch(`${telephonyServiceUrl}/signalwire/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        convexCallId: args.callId,
        toNumber: call.phoneNumber,
        payerName: call.payerName,
        userPhoneNumber: call.userPhoneNumber,
        // IVR navigation context
        callPurpose: call.callPurpose || "general",
        organizationNpi: call.organizationNpi,
        memberId: call.memberId,
        claimNumber: call.claimNumber,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to start call: ${error}`)
    }

    const result = await response.json() as { callSid: string }
    
    // Update the call record with Twilio call SID
    await ctx.runMutation(internal.holdCalls.setTwilioCallSid, {
      callId: args.callId,
      twilioCallSid: result.callSid,
    })

    return { success: true, twilioCallSid: result.callSid }
  },
})

// Internal query to get call details for the action
export const getCallInternal = internalQuery({
  args: { callId: v.id("holdCalls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId)
    if (!call) return null

    const payer = await ctx.db.get(call.payerId)
    const organization = await ctx.db.get(call.organizationId)
    
    // Get claim details if we have a claimId
    let claimNumber: string | undefined
    let memberId: string | undefined
    
    if (call.claimId) {
      const claim = await ctx.db.get(call.claimId)
      if (claim) {
        claimNumber = claim.claimNumber
        
        // Get patient coverage for member ID
        if (claim.patientId) {
          const coverage = await ctx.db
            .query("coverages")
            .withIndex("by_patient", (q) => q.eq("patientId", claim.patientId))
            .filter((q) => q.eq(q.field("payerId"), call.payerId))
            .first()
          
          if (coverage) {
            memberId = coverage.memberId
          }
        }
      }
    }
    
    // If we have a denialId but no claimId, get claim from denial
    if (call.denialId && !claimNumber) {
      const denial = await ctx.db.get(call.denialId)
      if (denial) {
        const claim = await ctx.db.get(denial.claimId)
        if (claim) {
          claimNumber = claim.claimNumber
          
          if (claim.patientId) {
            const coverage = await ctx.db
              .query("coverages")
              .withIndex("by_patient", (q) => q.eq("patientId", claim.patientId))
              .filter((q) => q.eq(q.field("payerId"), call.payerId))
              .first()
            
            if (coverage) {
              memberId = coverage.memberId
            }
          }
        }
      }
    }
    
    return {
      ...call,
      payerName: payer?.name,
      organizationNpi: organization?.npi,
      memberId,
      claimNumber,
    }
  },
})

// Internal mutation to set Twilio call SID
export const setTwilioCallSid = internalMutation({
  args: {
    callId: v.id("holdCalls"),
    twilioCallSid: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.callId, {
      twilioCallSid: args.twilioCallSid,
    })
  },
})

// Bridge call to user's phone (calls telephony service)
export const bridgeCall = action({
  args: {
    callId: v.id("holdCalls"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const call = await ctx.runQuery(internal.holdCalls.getCallInternal, {
      callId: args.callId,
    })
    if (!call) throw new Error("Call not found")
    if (!call.twilioCallSid) throw new Error("No Twilio call SID - call may not be active")

    const telephonyServiceUrl = process.env.TELEPHONY_SERVICE_URL
    if (!telephonyServiceUrl) {
      throw new Error("TELEPHONY_SERVICE_URL not configured")
    }

    const response: Response = await fetch(`${telephonyServiceUrl}/signalwire/bridge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callSid: call.twilioCallSid,
        userPhoneNumber: call.userPhoneNumber,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to bridge call: ${error}`)
    }

    return { success: true }
  },
})
