import { WebSocket } from "ws";
import { AudioProcessor } from "./audioProcessor.js";
import { OperatorDetector } from "./operatorDetector.js";
import { IvrNavigator, CallContext } from "./ivrNavigator.js";
import { ConvexClient } from "convex/browser";

interface CallInfo {
  convexCallId: string;
  toNumber: string;
  payerName?: string;
  userPhoneNumber?: string;
  status: string;
  twilioCallSid?: string;
  startedAt?: number;
  holdStartedAt?: number;
  // IVR navigation context
  callPurpose?: "claims_status" | "eligibility" | "prior_auth" | "appeal" | "general";
  organizationNpi?: string;
  memberId?: string;
  claimNumber?: string;
}

interface ActiveCall {
  info: CallInfo;
  ws?: WebSocket;
  audioProcessor?: AudioProcessor;
  operatorDetector?: OperatorDetector;
  ivrNavigator?: IvrNavigator;
}

export class CallManager {
  private calls: Map<string, ActiveCall> = new Map();
  private convexClient: ConvexClient | null = null;

  constructor() {
    // Initialize Convex client if credentials are available
    if (process.env.CONVEX_URL) {
      this.convexClient = new ConvexClient(process.env.CONVEX_URL);
    }
  }

  /**
   * Register a new call
   */
  registerCall(twilioCallSid: string, info: CallInfo): void {
    this.calls.set(twilioCallSid, {
      info: {
        ...info,
        twilioCallSid,
        startedAt: Date.now(),
      },
    });
    console.log(`[CallManager] Registered call: ${twilioCallSid}`);
  }

  /**
   * Get call info
   */
  getCall(twilioCallSid: string): ActiveCall | undefined {
    return this.calls.get(twilioCallSid);
  }

  /**
   * Start audio processing for a call
   * Preserves IvrNavigator and OperatorDetector state across stream reconnections
   */
  async startAudioProcessing(twilioCallSid: string, ws: WebSocket): Promise<void> {
    const call = this.calls.get(twilioCallSid);
    if (!call) {
      console.error(`[CallManager] Call not found: ${twilioCallSid}`);
      return;
    }

    call.ws = ws;

    // Always create a new audio processor (old one was closed on stream stop)
    call.audioProcessor = new AudioProcessor();
    await call.audioProcessor.initialize();

    // Check if this is a reconnection (IvrNavigator already exists)
    const isReconnection = !!call.ivrNavigator;

    if (!isReconnection) {
      // First connection - create IvrNavigator and OperatorDetector
      const callContext: CallContext = {
        payerName: call.info.payerName,
        callPurpose: call.info.callPurpose || "general",
        organizationNpi: call.info.organizationNpi,
        memberId: call.info.memberId,
        claimNumber: call.info.claimNumber,
      };

      // Initialize IVR navigator with callbacks
      call.ivrNavigator = new IvrNavigator(
        callContext,
        // DTMF callback
        async (digits: string) => {
          await this.sendDtmf(twilioCallSid, digits);
        },
        // Operator detected callback
        async () => {
          console.log(`[CallManager] Operator detected by IVR navigator for ${twilioCallSid}`);
          await this.handleOperatorDetected(twilioCallSid);
        },
        // Status update callback
        async (status: string) => {
          await this.updateCallStatus(twilioCallSid, status);
        }
      );

      // Initialize operator detector as backup (IvrNavigator also detects operators)
      call.operatorDetector = new OperatorDetector(
        call.info.payerName || "insurance company",
        async (isOperator, confidence, reason) => {
          // Only trigger if IvrNavigator hasn't already detected
          if (isOperator && confidence > 0.7 && !call.ivrNavigator?.isOperatorDetectedStatus()) {
            console.log(`[CallManager] Operator detected by backup detector for ${twilioCallSid}: ${reason}`);
            await this.handleOperatorDetected(twilioCallSid);
          }
        }
      );

      console.log(`[CallManager] Audio processing started for: ${twilioCallSid}`);
      console.log(`[CallManager] IVR context: purpose=${callContext.callPurpose}, hasNpi=${!!callContext.organizationNpi}, hasMemberId=${!!callContext.memberId}`);
    } else {
      // Reconnection - reuse existing IvrNavigator and OperatorDetector (preserves action history)
      // Resume analysis that was paused during DTMF sending
      call.ivrNavigator.resume();
      console.log(`[CallManager] Audio processing reconnected for: ${twilioCallSid} (preserving IVR state)`);
    }

    // Connect audio processor to IVR navigator (which also feeds operator detector)
    call.audioProcessor.onTranscription((text) => {
      // Feed transcription to IVR navigator (handles navigation + operator detection)
      call.ivrNavigator?.addTranscription(text);
      // Also feed to backup operator detector
      call.operatorDetector?.addTranscription(text);
    });
  }

  /**
   * Send DTMF tones to a call
   */
  async sendDtmf(twilioCallSid: string, digits: string): Promise<void> {
    const call = this.calls.get(twilioCallSid);
    if (!call) {
      console.warn(`[CallManager] Call not found for DTMF: ${twilioCallSid}`);
      return;
    }

    try {
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      
      // Call our own DTMF endpoint
      const response = await fetch(`${baseUrl}/signalwire/dtmf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callSid: twilioCallSid,
          digits,
        }),
      });

      if (!response.ok) {
        console.error(`[CallManager] Failed to send DTMF: ${response.status}`);
      } else {
        console.log(`[CallManager] Sent DTMF '${digits}' to call ${twilioCallSid}`);
      }
    } catch (error) {
      console.error("[CallManager] Error sending DTMF:", error);
    }
  }

  /**
   * Process an audio chunk from Twilio
   */
  async processAudioChunk(twilioCallSid: string, base64Audio: string): Promise<void> {
    const call = this.calls.get(twilioCallSid);
    if (!call?.audioProcessor) {
      return;
    }

    // Feed audio to processor
    await call.audioProcessor.processChunk(base64Audio);
  }

  /**
   * Stop audio processing for a call
   * Only closes AudioProcessor - IvrNavigator and OperatorDetector are preserved for reconnection
   */
  async stopAudioProcessing(twilioCallSid: string): Promise<void> {
    const call = this.calls.get(twilioCallSid);
    if (!call) return;

    // Pause IvrNavigator analysis during stream disconnection
    // This prevents re-analyzing stale transcription data
    if (call.ivrNavigator) {
      call.ivrNavigator.pause();
    }

    // Only close AudioProcessor - it will be recreated on reconnection
    // IvrNavigator and OperatorDetector are preserved to maintain action history
    if (call.audioProcessor) {
      await call.audioProcessor.close();
      call.audioProcessor = undefined;
    }

    console.log(`[CallManager] Audio processing stopped for: ${twilioCallSid} (IVR state preserved)`);
  }

  /**
   * Update call status
   */
  async updateCallStatus(
    twilioCallSid: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const call = this.calls.get(twilioCallSid);
    if (!call) {
      console.warn(`[CallManager] Call not found for status update: ${twilioCallSid}`);
      return;
    }

    call.info.status = status;

    // Track hold start time
    if (status === "on_hold" && !call.info.holdStartedAt) {
      call.info.holdStartedAt = Date.now();
    }

    // Update Convex
    await this.updateConvexStatus(call.info.convexCallId, status, {
      twilioCallSid,
      ...metadata,
    });

    console.log(`[CallManager] Status updated: ${twilioCallSid} -> ${status}`);
  }

  /**
   * Handle operator detection
   */
  private async handleOperatorDetected(twilioCallSid: string): Promise<void> {
    const call = this.calls.get(twilioCallSid);
    if (!call) return;

    // Calculate hold time
    const holdTimeSeconds = call.info.holdStartedAt
      ? Math.floor((Date.now() - call.info.holdStartedAt) / 1000)
      : 0;

    // Update status to operator_detected
    await this.updateConvexStatus(call.info.convexCallId, "operator_detected", {
      twilioCallSid,
      totalHoldTimeSeconds: holdTimeSeconds,
    });

    call.info.status = "operator_detected";
  }

  /**
   * Update Convex with call status
   */
  private async updateConvexStatus(
    convexCallId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.convexClient) {
      console.log(`[CallManager] Convex client not initialized, skipping status update`);
      return;
    }

    try {
      // We'll call the Convex HTTP endpoint to update status
      // Convex HTTP routes are at .convex.site, not .convex.cloud
      const convexUrl = process.env.CONVEX_URL;
      if (!convexUrl) return;

      // Convert .convex.cloud to .convex.site for HTTP routes
      const httpUrl = convexUrl.replace(".convex.cloud", ".convex.site");

      const response = await fetch(`${httpUrl}/webhooks/telephony/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: convexCallId,
          status,
          ...metadata,
        }),
      });

      if (!response.ok) {
        console.error(`[CallManager] Failed to update Convex status: ${response.status}`);
      }
    } catch (error) {
      console.error("[CallManager] Error updating Convex status:", error);
    }
  }

  /**
   * Clean up a call completely (called when call ends)
   */
  async cleanup(twilioCallSid: string): Promise<void> {
    const call = this.calls.get(twilioCallSid);
    if (call) {
      // Close audio processor
      if (call.audioProcessor) {
        await call.audioProcessor.close();
        call.audioProcessor = undefined;
      }

      // Destroy IVR navigator
      if (call.ivrNavigator) {
        call.ivrNavigator.destroy();
        call.ivrNavigator = undefined;
      }

      // Clear operator detector
      if (call.operatorDetector) {
        call.operatorDetector = undefined;
      }
    }

    this.calls.delete(twilioCallSid);
    console.log(`[CallManager] Cleaned up call: ${twilioCallSid}`);
  }
}
