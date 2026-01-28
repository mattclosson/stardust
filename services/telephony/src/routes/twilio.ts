import { Router, Request, Response } from "express";
import twilio from "twilio";
import { callManager } from "../index.js";

const router = Router();

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Validate Twilio signature middleware (for production)
const validateTwilioRequest = (req: Request, res: Response, next: Function) => {
  // Skip validation in development
  if (process.env.NODE_ENV === "development") {
    return next();
  }
  
  const twilioSignature = req.headers["x-twilio-signature"] as string;
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  
  if (twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    url,
    req.body
  )) {
    next();
  } else {
    res.status(403).send("Invalid Twilio signature");
  }
};

/**
 * POST /twilio/call
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
    const call = await twilioClient.calls.create({
      to: toNumber,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: `${baseUrl}/twilio/twiml/connect?convexCallId=${convexCallId}`,
      statusCallback: `${baseUrl}/twilio/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      machineDetection: "Enable", // Detect answering machines
      machineDetectionTimeout: 5,
    });

    console.log(`[Twilio] Call initiated: ${call.sid} to ${toNumber}`);

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
    console.error("[Twilio] Error initiating call:", error);
    res.status(500).json({ error: "Failed to initiate call" });
  }
});

/**
 * POST /twilio/twiml/connect
 * Returns TwiML to connect the call and start media streaming
 */
router.post("/twiml/connect", (req: Request, res: Response) => {
  const { convexCallId } = req.query;
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const wsUrl = baseUrl.replace("http", "ws");

  // TwiML response that streams audio to our WebSocket
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/media-stream">
      <Parameter name="convexCallId" value="${convexCallId}" />
    </Stream>
  </Connect>
</Response>`;

  res.type("text/xml");
  res.send(twiml);
});

/**
 * POST /twilio/status
 * Receives call status updates from Twilio
 */
router.post("/status", validateTwilioRequest, async (req: Request, res: Response) => {
  const { CallSid, CallStatus, AnsweredBy, CallDuration } = req.body;

  console.log(`[Twilio] Status update: ${CallSid} -> ${CallStatus}`);

  // Map Twilio status to our status
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
 * POST /twilio/dtmf
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
    await twilioClient.calls(callSid).update({
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

    console.log(`[Twilio] Sent DTMF: ${digits} to call ${callSid}, reconnecting stream`);
    res.json({ success: true });
  } catch (error) {
    console.error("[Twilio] Error sending DTMF:", error);
    res.status(500).json({ error: "Failed to send DTMF" });
  }
});

/**
 * POST /twilio/bridge
 * Bridges the call to the user's phone when operator is detected
 */
router.post("/bridge", async (req: Request, res: Response) => {
  try {
    const { callSid, userPhoneNumber } = req.body;

    if (!callSid || !userPhoneNumber) {
      return res.status(400).json({ error: "Missing callSid or userPhoneNumber" });
    }

    // Update the call to dial the user
    await twilioClient.calls(callSid).update({
      twiml: `<Response>
        <Say>Connecting you to the operator now.</Say>
        <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}">
          <Number>${userPhoneNumber}</Number>
        </Dial>
      </Response>`,
    });

    console.log(`[Twilio] Bridging call ${callSid} to ${userPhoneNumber}`);
    
    await callManager.updateCallStatus(callSid, "user_connected");
    
    res.json({ success: true });
  } catch (error) {
    console.error("[Twilio] Error bridging call:", error);
    res.status(500).json({ error: "Failed to bridge call" });
  }
});

/**
 * POST /twilio/hangup
 * Ends the call
 */
router.post("/hangup", async (req: Request, res: Response) => {
  try {
    const { callSid } = req.body;

    if (!callSid) {
      return res.status(400).json({ error: "Missing callSid" });
    }

    await twilioClient.calls(callSid).update({ status: "completed" });

    console.log(`[Twilio] Ended call ${callSid}`);
    res.json({ success: true });
  } catch (error) {
    console.error("[Twilio] Error ending call:", error);
    res.status(500).json({ error: "Failed to end call" });
  }
});

export { router as twilioRouter };
