import { Router, Request, Response } from "express";

const router = Router();

/**
 * Test IVR that simulates an insurance company phone system
 * Use this to test the Hold-for-Me feature without calling real insurance
 */

// Entry point - answers the call with welcome message
router.post("/answer", (req: Request, res: Response) => {
  console.log("[Test IVR] Call answered");
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you for calling Acme Insurance Provider Services.
    Your call may be recorded for quality assurance.
  </Say>
  <Pause length="1"/>
  <Gather numDigits="1" action="/test-ivr/menu" method="POST" timeout="10">
    <Say voice="Polly.Joanna">
      For claims status, press 1.
      For eligibility and benefits verification, press 2.
      For prior authorization, press 3.
      For provider enrollment, press 4.
      To repeat this menu, press 9.
    </Say>
  </Gather>
  <Redirect>/test-ivr/answer</Redirect>
</Response>`;

  res.type("text/xml").send(twiml);
});

// Handle menu selection
router.post("/menu", (req: Request, res: Response) => {
  const digit = req.body.Digits;
  console.log(`[Test IVR] Menu selection: ${digit}`);

  if (digit === "9") {
    // Repeat menu
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>/test-ivr/answer</Redirect>
</Response>`;
    res.type("text/xml").send(twiml);
    return;
  }

  const menuOptions: Record<string, string> = {
    "1": "claims status",
    "2": "eligibility and benefits",
    "3": "prior authorization",
    "4": "provider enrollment",
  };

  const selection = menuOptions[digit] || "general inquiries";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    You selected ${selection}.
  </Say>
  <Pause length="1"/>
  <Gather numDigits="10" action="/test-ivr/npi" method="POST" timeout="15">
    <Say voice="Polly.Joanna">
      Please enter your 10 digit National Provider Identifier, followed by the pound key.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">We did not receive your input.</Say>
  <Redirect>/test-ivr/menu-retry</Redirect>
</Response>`;

  res.type("text/xml").send(twiml);
});

// Handle NPI entry
router.post("/npi", (req: Request, res: Response) => {
  const npi = req.body.Digits;
  console.log(`[Test IVR] NPI entered: ${npi}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you. I found your provider record.
  </Say>
  <Pause length="1"/>
  <Gather numDigits="10" action="/test-ivr/member" method="POST" timeout="15">
    <Say voice="Polly.Joanna">
      Please enter the member's 10 digit ID number from their insurance card.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">We did not receive your input.</Say>
  <Redirect>/test-ivr/npi</Redirect>
</Response>`;

  res.type("text/xml").send(twiml);
});

// Handle member ID entry, then go to hold
router.post("/member", (req: Request, res: Response) => {
  const memberId = req.body.Digits;
  console.log(`[Test IVR] Member ID entered: ${memberId}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you. I found the member's account.
    Please hold while I connect you to the next available representative.
    Your estimated wait time is approximately 25 minutes.
    Please remain on the line and your call will be answered in the order it was received.
  </Say>
  <Redirect>/test-ivr/hold</Redirect>
</Response>`;

  res.type("text/xml").send(twiml);
});

// Hold music loop - plays for a configurable time then connects to "operator"
router.post("/hold", (req: Request, res: Response) => {
  console.log("[Test IVR] Playing hold music");

  // Get hold duration from query param, default to 30 seconds for testing
  const holdSeconds = parseInt(req.query.duration as string) || 30;
  const loops = Math.ceil(holdSeconds / 30); // Each loop is ~30 seconds

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="${loops}">https://api.twilio.com/cowbell.mp3</Play>
  <Redirect>/test-ivr/operator</Redirect>
</Response>`;

  res.type("text/xml").send(twiml);
});

// Operator greeting - this should trigger operator detection
router.post("/operator", (req: Request, res: Response) => {
  console.log("[Test IVR] Connecting to operator");

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Matthew">
    Thank you for holding. This is Michael with Acme Insurance Provider Services. 
    How may I help you today?
  </Say>
  <Pause length="30"/>
  <Say voice="Polly.Matthew">
    Hello? Are you still there?
  </Say>
  <Pause length="15"/>
  <Say voice="Polly.Matthew">
    I'm sorry, I didn't hear a response. If you need further assistance, please call back.
    Thank you for calling Acme Insurance. Goodbye.
  </Say>
</Response>`;

  res.type("text/xml").send(twiml);
});

// Retry menu if no input
router.post("/menu-retry", (req: Request, res: Response) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/test-ivr/menu" method="POST" timeout="10">
    <Say voice="Polly.Joanna">
      I'm sorry, I didn't receive your selection.
      For claims status, press 1.
      For eligibility and benefits verification, press 2.
      For prior authorization, press 3.
      For provider enrollment, press 4.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">
    We're sorry, we did not receive a response. Goodbye.
  </Say>
</Response>`;

  res.type("text/xml").send(twiml);
});

export default router;
