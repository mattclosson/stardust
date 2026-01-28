import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes on the Convex HTTP router
// CORS handling is required for client-side frameworks
authComponent.registerRoutes(http, createAuth, { cors: true });

// Webhook endpoint for telephony service to update call status
http.route({
  path: "/webhooks/telephony/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { callId, status, twilioCallSid, totalHoldTimeSeconds, operatorName, notes } = body;

      if (!callId || !status) {
        return new Response(JSON.stringify({ error: "Missing callId or status" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update the call status in the database
      await ctx.runMutation(api.holdCalls.updateStatus, {
        callId: callId as Id<"holdCalls">,
        status,
        twilioCallSid,
        operatorName,
        notes,
      });

      // If hold time was provided, update it separately
      if (totalHoldTimeSeconds !== undefined) {
        // This will be handled in the updateStatus mutation
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Webhook] Error updating call status:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Webhook endpoint for operator detection
http.route({
  path: "/webhooks/telephony/operator-detected",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { callId, confidence, reason, transcription } = body;

      if (!callId) {
        return new Response(JSON.stringify({ error: "Missing callId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update status to operator_detected
      await ctx.runMutation(api.holdCalls.updateStatus, {
        callId: callId as Id<"holdCalls">,
        status: "operator_detected",
        notes: `Operator detected (confidence: ${confidence}). Reason: ${reason}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Webhook] Error handling operator detection:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
