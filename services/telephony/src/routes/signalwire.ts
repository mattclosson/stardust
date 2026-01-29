import { Router, Request, Response } from "express";
import { RestClient, Webhook } from "@signalwire/compatibility-api";
import { callManager } from "../index.js";

const router = Router();

// SignalWire client
const signalwireClient = RestClient(
  process.env.SIGNALWIRE_PROJECT_ID!,
  process.env.SIGNALWIRE_API_TOKEN!,
  { signalwireSpaceUrl: process.env.SIGNALWIRE_SPACE_URL! }
);

// Validate SignalWire signature middleware (for production)
const validateSignalWireRequest = (req: Request, res: Response, next: Function) => {
  // Skip validation in development
  if (process.env.NODE_ENV === "development") {
    return next();
  }
  
  const signature = req.headers["x-signalwire-signature"] as string;
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  
  if (Webhook.validateRequest(
    process.env.SIGNALWIRE_API_TOKEN!,
    signature,
    url,
    req.body
  )) {
    next();
  } else {
    res.status(403).send("Invalid SignalWire signature");
  }
};

/**
 * POST /signalwire/call
 * Initiates an outbound call to an insurance company
 */
router.post("/call", async (req: Request, res: Response) => {
  try {
    const { 
      convexCallId,
      toNumber,
      payerName,
      userPhoneNumber,
      // IVR navigation context
      callPurpose,
      organizationNpi,
      memberId,
      claimNumber,
    } = req.body;

    if (!toNumber || !convexCallId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    
    // Create the outbound call
    const call = await signalwireClient.calls.create({
      to: toNumber,
      from: process.env.SIGNALWIRE_PHONE_NUMBER!,
      url: `${baseUrl}/signalwire/cxml/connect?convexCallId=${convexCallId}`,
      statusCallback: `${baseUrl}/signalwire/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      machineDetection: "Enable", // Detect answering machines
      machineDetectionTimeout: 5,
    });

    console.log(`[SignalWire] Call initiated: ${call.sid} to ${toNumber}`);

    // Register the call in our manager with IVR context
    callManager.registerCall(call.sid, {
      convexCallId,
      toNumber,
      payerName,
      userPhoneNumber,
      status: "initiating",
      // IVR navigation context
      callPurpose: callPurpose || "general",
      organizationNpi,
      memberId,
      claimNumber,
    });

    res.json({ 
      success: true, 
      callSid: call.sid,
      status: call.status 
    });
  } catch (error) {
    console.error("[SignalWire] Error initiating call:", error);
    res.status(500).json({ error: "Failed to initiate call" });
  }
});

/**
 * POST /signalwire/cxml/connect
 * Returns cXML to connect the call and start media streaming
 */
router.post("/cxml/connect", (req: Request, res: Response) => {
  const { convexCallId } = req.query;
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const wsUrl = baseUrl.replace("http", "ws");

  // cXML response that streams audio to our WebSocket
  const cxml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/media-stream">
      <Parameter name="convexCallId" value="${convexCallId}" />
    </Stream>
  </Connect>
</Response>`;

  res.type("text/xml");
  res.send(cxml);
});

/**
 * POST /signalwire/status
 * Receives call status updates from SignalWire
 */
router.post("/status", validateSignalWireRequest, async (req: Request, res: Response) => {
  const { CallSid, CallStatus, AnsweredBy, CallDuration } = req.body;

  console.log(`[SignalWire] Status update: ${CallSid} -> ${CallStatus}`);

  // Map SignalWire status to our status
  const statusMap: Record<string, string> = {
    "queued": "initiating",
    "initiated": "initiating",
    "ringing": "dialing",
    "in-progress": "on_hold", // Assume on hold until operator detected
    "completed": "completed",
    "busy": "failed",
    "failed": "failed",
    "no-answer": "failed",
    "canceled": "cancelled",
  };

  const mappedStatus = statusMap[CallStatus] || "on_hold";

  // Update call status
  await callManager.updateCallStatus(CallSid, mappedStatus, {
    answeredBy: AnsweredBy,
    duration: CallDuration,
  });

  res.sendStatus(200);
});

/**
 * POST /signalwire/dtmf
 * Sends DTMF tones to navigate IVR menus
 * After sending digits, reconnects the media stream to continue listening
 */
router.post("/dtmf", async (req: Request, res: Response) => {
  try {
    const { callSid, digits } = req.body;

    if (!callSid || !digits) {
      return res.status(400).json({ error: "Missing callSid or digits" });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const wsUrl = baseUrl.replace("http", "ws");

    // Get the call info to retrieve convexCallId
    const call = callManager.getCall(callSid);
    const convexCallId = call?.info.convexCallId || "";

    // Send DTMF tones then reconnect the media stream
    // The Play verb with digits sends DTMF, then Connect resumes streaming
    await signalwireClient.calls(callSid).update({
      twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play digits="${digits}"/>
  <Pause length="1"/>
  <Connect>
    <Stream url="${wsUrl}/media-stream">
      <Parameter name="convexCallId" value="${convexCallId}" />
    </Stream>
  </Connect>
</Response>`,
    });

    console.log(`[SignalWire] Sent DTMF: ${digits} to call ${callSid}, reconnecting stream`);
    res.json({ success: true });
  } catch (error) {
    console.error("[SignalWire] Error sending DTMF:", error);
    res.status(500).json({ error: "Failed to send DTMF" });
  }
});

/**
 * POST /signalwire/bridge
 * Bridges the call to the user's phone when operator is detected
 */
router.post("/bridge", async (req: Request, res: Response) => {
  try {
    const { callSid, userPhoneNumber } = req.body;

    if (!callSid || !userPhoneNumber) {
      return res.status(400).json({ error: "Missing callSid or userPhoneNumber" });
    }

    // Update the call to dial the user
    await signalwireClient.calls(callSid).update({
      twiml: `<Response>
        <Say>Connecting you to the operator now.</Say>
        <Dial callerId="${process.env.SIGNALWIRE_PHONE_NUMBER}">
          <Number>${userPhoneNumber}</Number>
        </Dial>
      </Response>`,
    });

    console.log(`[SignalWire] Bridging call ${callSid} to ${userPhoneNumber}`);
    
    await callManager.updateCallStatus(callSid, "user_connected");
    
    res.json({ success: true });
  } catch (error) {
    console.error("[SignalWire] Error bridging call:", error);
    res.status(500).json({ error: "Failed to bridge call" });
  }
});

/**
 * POST /signalwire/hangup
 * Ends the call
 */
router.post("/hangup", async (req: Request, res: Response) => {
  try {
    const { callSid } = req.body;

    if (!callSid) {
      return res.status(400).json({ error: "Missing callSid" });
    }

    await signalwireClient.calls(callSid).update({ status: "completed" });

    console.log(`[SignalWire] Ended call ${callSid}`);
    res.json({ success: true });
  } catch (error) {
    console.error("[SignalWire] Error ending call:", error);
    res.status(500).json({ error: "Failed to end call" });
  }
});

export { router as signalwireRouter };
