import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// ============================================
// REDOX WEBHOOK ENDPOINTS
// ============================================

// Main Redox webhook endpoint
// Redox sends data to: POST /webhooks/redox/:organizationId
http.route({
  path: "/webhooks/redox/{organizationId}",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Extract organization ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const organizationId = pathParts[pathParts.length - 1];

      if (!organizationId) {
        return new Response(JSON.stringify({ error: "Missing organizationId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse the Redox payload
      const payload = await request.json();

      // Validate it's a Redox payload
      if (!payload.Meta || !payload.Meta.DataModel) {
        return new Response(JSON.stringify({ error: "Invalid Redox payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`[Redox Webhook] Received ${payload.Meta.DataModel}.${payload.Meta.EventType} for org ${organizationId}`);

      // Process the webhook
      const result = await ctx.runMutation(api.integrations.redox.processWebhook, {
        organizationId: organizationId as Id<"organizations">,
        payload,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Redox Webhook] Error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      const status = errorMessage.includes("not found") ? 404 : 500;

      return new Response(JSON.stringify({ error: errorMessage }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Redox verification endpoint (Redox pings this to verify webhook URL)
http.route({
  path: "/webhooks/redox/{organizationId}",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Redox verification challenge
    const url = new URL(request.url);
    const challenge = url.searchParams.get("challenge");

    if (challenge) {
      // Return the challenge for Redox verification
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response(JSON.stringify({ status: "Redox webhook endpoint active" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

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
