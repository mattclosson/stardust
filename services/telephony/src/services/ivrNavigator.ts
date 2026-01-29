import OpenAI from "openai";

/**
 * Action types that the IVR navigator can take
 */
export type IvrActionType = 
  | "press_digit" 
  | "enter_npi" 
  | "enter_member_id" 
  | "enter_claim_number"
  | "wait" 
  | "on_hold"
  | "operator_detected";

export interface IvrAction {
  type: IvrActionType;
  value?: string;
  reason: string;
  confidence?: number;
}

export interface CallContext {
  organizationNpi?: string;
  memberId?: string;
  callPurpose: "claims_status" | "eligibility" | "prior_auth" | "appeal" | "general";
  claimNumber?: string;
  payerName?: string;
}

type DtmfCallback = (digits: string) => Promise<void>;
type OperatorDetectedCallback = () => Promise<void>;
type StatusUpdateCallback = (status: string) => Promise<void>;

interface TranscriptionEntry {
  text: string;
  timestamp: number;
}

/**
 * IvrNavigator uses OpenAI to analyze IVR prompts and decide
 * what actions to take (press buttons, enter IDs, etc.)
 */
export class IvrNavigator {
  private openai: OpenAI | null = null;
  private transcriptionBuffer: TranscriptionEntry[] = [];
  private context: CallContext;
  private onSendDtmf: DtmfCallback;
  private onOperatorDetected: OperatorDetectedCallback;
  private onStatusUpdate: StatusUpdateCallback;
  private analysisInterval: NodeJS.Timeout | null = null;
  private lastAnalysisTime = 0;
  private lastActionTime = 0;
  private operatorDetected = false;
  private isOnHold = false;
  private isPaused = false; // Pause analysis during DTMF sending
  private actionHistory: IvrAction[] = [];

  // Configuration
  private readonly BUFFER_DURATION_MS = 15000; // Keep last 15 seconds for IVR analysis
  private readonly ANALYSIS_INTERVAL_MS = 3000; // Analyze every 3 seconds (faster than operator detection)
  private readonly MIN_TEXT_LENGTH = 10;
  private readonly ACTION_COOLDOWN_MS = 2000; // Wait 2 seconds between actions
  private readonly OPERATOR_CONFIDENCE_THRESHOLD = 0.85; // High bar for operator detection

  constructor(
    context: CallContext,
    onSendDtmf: DtmfCallback,
    onOperatorDetected: OperatorDetectedCallback,
    onStatusUpdate: StatusUpdateCallback
  ) {
    this.context = context;
    this.onSendDtmf = onSendDtmf;
    this.onOperatorDetected = onOperatorDetected;
    this.onStatusUpdate = onStatusUpdate;

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.startAnalysisLoop();
    } else {
      console.warn("[IvrNavigator] No OpenAI API key, navigation disabled");
    }
  }

  /**
   * Add a new transcription to the buffer
   */
  addTranscription(text: string): void {
    const now = Date.now();
    
    this.transcriptionBuffer.push({
      text,
      timestamp: now,
    });

    this.pruneBuffer(now);
  }

  /**
   * Remove old transcriptions
   */
  private pruneBuffer(now: number): void {
    const cutoff = now - this.BUFFER_DURATION_MS;
    this.transcriptionBuffer = this.transcriptionBuffer.filter(
      (entry) => entry.timestamp >= cutoff
    );
  }

  /**
   * Get the full transcription text
   */
  private getBufferedText(): string {
    return this.transcriptionBuffer.map((entry) => entry.text).join(" ");
  }

  /**
   * Start the periodic analysis loop
   */
  private startAnalysisLoop(): void {
    this.analysisInterval = setInterval(async () => {
      await this.analyzeAndAct();
    }, this.ANALYSIS_INTERVAL_MS);
  }

  /**
   * Analyze transcription and take action if needed
   */
  private async analyzeAndAct(): Promise<void> {
    // Skip if paused (during DTMF sending), operator detected, or no client
    if (this.isPaused || this.operatorDetected || !this.openai) {
      return;
    }

    const text = this.getBufferedText();
    
    if (text.length < this.MIN_TEXT_LENGTH) {
      return;
    }

    // Debounce
    const now = Date.now();
    if (now - this.lastAnalysisTime < this.ANALYSIS_INTERVAL_MS - 100) {
      return;
    }
    this.lastAnalysisTime = now;

    // Check cooldown for actions
    const canAct = now - this.lastActionTime >= this.ACTION_COOLDOWN_MS;

    try {
      const action = await this.analyzeIvrPrompt(text);
      console.log(`[IvrNavigator] Action decided: ${JSON.stringify(action)}`);

      if (action.type === "operator_detected") {
        // Require high confidence for operator detection to avoid false positives
        const confidence = action.confidence ?? 0;
        if (confidence >= this.OPERATOR_CONFIDENCE_THRESHOLD) {
          console.log(`[IvrNavigator] Operator detected with confidence ${confidence}`);
          this.operatorDetected = true;
          this.stopAnalysisLoop();
          await this.onOperatorDetected();
          return;
        } else {
          console.log(`[IvrNavigator] Operator detection rejected - confidence ${confidence} < ${this.OPERATOR_CONFIDENCE_THRESHOLD}`);
          // Continue listening, don't trigger operator detection yet
        }
      }

      if (action.type === "on_hold" && !this.isOnHold) {
        this.isOnHold = true;
        await this.onStatusUpdate("on_hold");
        return;
      }

      if (!canAct) {
        console.log(`[IvrNavigator] Skipping action due to cooldown`);
        return;
      }

      // Execute the action
      await this.executeAction(action);
      
    } catch (error) {
      console.error("[IvrNavigator] Analysis error:", error);
    }
  }

  /**
   * Execute an IVR action
   */
  private async executeAction(action: IvrAction): Promise<void> {
    this.lastActionTime = Date.now();
    this.actionHistory.push(action);

    switch (action.type) {
      case "press_digit":
        if (action.value) {
          console.log(`[IvrNavigator] Pressing digit: ${action.value}`);
          // Clear buffer before DTMF - prevents re-triggering same action
          this.clearTranscriptionBuffer();
          await this.onSendDtmf(action.value);
        }
        break;

      case "enter_npi":
        if (this.context.organizationNpi) {
          console.log(`[IvrNavigator] Entering NPI: ${this.context.organizationNpi}`);
          // Clear buffer before DTMF - prevents re-triggering same action
          this.clearTranscriptionBuffer();
          // Add # at the end as most systems expect it
          await this.onSendDtmf(this.context.organizationNpi + "#");
        } else {
          console.warn("[IvrNavigator] No NPI configured, cannot enter");
        }
        break;

      case "enter_member_id":
        if (this.context.memberId) {
          // Strip non-numeric characters for DTMF
          const numericMemberId = this.context.memberId.replace(/\D/g, "");
          console.log(`[IvrNavigator] Entering member ID: ${numericMemberId}`);
          // Clear buffer before DTMF - prevents re-triggering same action
          this.clearTranscriptionBuffer();
          await this.onSendDtmf(numericMemberId + "#");
        } else {
          console.warn("[IvrNavigator] No member ID configured, cannot enter");
        }
        break;

      case "enter_claim_number":
        if (this.context.claimNumber) {
          const numericClaim = this.context.claimNumber.replace(/\D/g, "");
          console.log(`[IvrNavigator] Entering claim number: ${numericClaim}`);
          // Clear buffer before DTMF - prevents re-triggering same action
          this.clearTranscriptionBuffer();
          await this.onSendDtmf(numericClaim + "#");
        } else {
          console.warn("[IvrNavigator] No claim number configured, cannot enter");
        }
        break;

      case "wait":
        console.log(`[IvrNavigator] Waiting: ${action.reason}`);
        break;
    }
  }

  /**
   * Clear the transcription buffer (called after taking an action)
   */
  private clearTranscriptionBuffer(): void {
    this.transcriptionBuffer = [];
    console.log(`[IvrNavigator] Transcription buffer cleared`);
  }

  /**
   * Use OpenAI to analyze the IVR prompt and decide action
   */
  private async analyzeIvrPrompt(transcription: string): Promise<IvrAction> {
    if (!this.openai) {
      return { type: "wait", reason: "No OpenAI client" };
    }

    const purposeDescriptions: Record<string, string> = {
      claims_status: "checking on a claim status",
      eligibility: "verifying patient eligibility and benefits",
      prior_auth: "inquiring about prior authorization",
      appeal: "filing or checking on an appeal",
      general: "general provider inquiry",
    };

    const systemPrompt = `You are an AI assistant navigating an insurance company's phone IVR system.

CALL CONTEXT:
- Payer: ${this.context.payerName || "Unknown insurance company"}
- Purpose: ${purposeDescriptions[this.context.callPurpose] || "general inquiry"}
- Have NPI: ${this.context.organizationNpi ? "Yes" : "No"}
- Have Member ID: ${this.context.memberId ? "Yes" : "No"}
- Have Claim Number: ${this.context.claimNumber ? "Yes" : "No"}

RECENT ACTIONS TAKEN:
${this.actionHistory.slice(-5).map(a => `- ${a.type}: ${a.reason}`).join("\n") || "None yet"}

YOUR TASK:
Analyze the IVR transcription and decide the SINGLE best action to take.

CRITICAL RULES FOR OPERATOR DETECTION:
A HUMAN OPERATOR must meet ALL of these criteria:
1. INTRODUCES THEMSELVES BY NAME (e.g., "This is Michael", "My name is Sarah")
2. ASKS AN OPEN-ENDED QUESTION (e.g., "How can I help you today?", "What can I do for you?")
3. Uses NATURAL conversational speech, not scripted prompts

DO NOT return operator_detected for:
- Automated confirmations like "Thank you", "I found your record", "Your information has been verified"
- System acknowledgments after data entry
- Pre-recorded messages that sound personalized
- Any prompt that asks you to enter digits or information
- Hold messages or queue position updates

IVR NAVIGATION RULES (in priority order):
1. DATA ENTRY (highest priority - if asked to enter data, do NOT press menu digits):
   - NPI: Look for "NPI", "national provider identifier", "national provider ID", "provider ID", "10 digit provider", "provider number". Return enter_npi.
   - Member ID: Look for "member ID", "member number", "subscriber ID", "subscriber number", "patient ID", "ID from insurance card". Return enter_member_id.
   - Claim number: Look for "claim number", "reference number", "claim ID". Return enter_claim_number.

2. HOLD STATUS: If you hear hold music, "please hold", "please wait", "estimated wait time", "your call will be answered", return on_hold

3. MENU NAVIGATION (only if NOT asked for data entry):
   - For claims_status: prefer "claims", "claim status", "billing" - typically press 1
   - For eligibility: prefer "eligibility", "benefits", "verification" - typically press 2
   - For prior_auth: prefer "prior authorization", "pre-certification" - typically press 3
   - For appeal: prefer "appeals", "grievances", "disputes"
   - To speak to representative: typically 0 or 9

4. If the prompt is incomplete, being cut off, or unclear, return wait
5. NEVER enter information we don't have (check the "Have NPI/Member ID/Claim Number" context above)
6. If you already took an action for a prompt (check RECENT ACTIONS), wait for new IVR prompt before acting again

Respond with JSON only:
{"type": "press_digit" | "enter_npi" | "enter_member_id" | "enter_claim_number" | "wait" | "on_hold" | "operator_detected", "value": "digit(s) to press if applicable", "confidence": number 0-1 (REQUIRED for operator_detected), "reason": "brief explanation"}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Current IVR transcription:\n\n"${transcription}"` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { type: "wait", reason: "No response from LLM" };
    }

    try {
      const result = JSON.parse(content);
      return {
        type: result.type || "wait",
        value: result.value,
        reason: result.reason || "Unknown",
        confidence: typeof result.confidence === "number" ? result.confidence : undefined,
      };
    } catch {
      console.error("[IvrNavigator] Failed to parse response:", content);
      return { type: "wait", reason: "Parse error" };
    }
  }

  /**
   * Stop the analysis loop
   */
  private stopAnalysisLoop(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  /**
   * Check if operator has been detected
   */
  isOperatorDetectedStatus(): boolean {
    return this.operatorDetected;
  }

  /**
   * Pause analysis (called when sending DTMF - stream will disconnect)
   */
  pause(): void {
    this.isPaused = true;
    console.log(`[IvrNavigator] Analysis paused`);
  }

  /**
   * Resume analysis (called when stream reconnects after DTMF)
   */
  resume(): void {
    this.isPaused = false;
    console.log(`[IvrNavigator] Analysis resumed`);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAnalysisLoop();
    this.transcriptionBuffer = [];
    this.actionHistory = [];
  }
}
