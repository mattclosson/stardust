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
  private actionHistory: IvrAction[] = [];

  // Configuration
  private readonly BUFFER_DURATION_MS = 15000; // Keep last 15 seconds for IVR analysis
  private readonly ANALYSIS_INTERVAL_MS = 3000; // Analyze every 3 seconds (faster than operator detection)
  private readonly MIN_TEXT_LENGTH = 10;
  private readonly ACTION_COOLDOWN_MS = 2000; // Wait 2 seconds between actions

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
    if (this.operatorDetected || !this.openai) {
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
        this.operatorDetected = true;
        this.stopAnalysisLoop();
        await this.onOperatorDetected();
        return;
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
          await this.onSendDtmf(action.value);
        }
        break;

      case "enter_npi":
        if (this.context.organizationNpi) {
          console.log(`[IvrNavigator] Entering NPI: ${this.context.organizationNpi}`);
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
          await this.onSendDtmf(numericMemberId + "#");
        } else {
          console.warn("[IvrNavigator] No member ID configured, cannot enter");
        }
        break;

      case "enter_claim_number":
        if (this.context.claimNumber) {
          const numericClaim = this.context.claimNumber.replace(/\D/g, "");
          console.log(`[IvrNavigator] Entering claim number: ${numericClaim}`);
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

IMPORTANT RULES:
1. If you hear a HUMAN OPERATOR (personal greeting, asking how they can help, natural conversation), return operator_detected
2. If you hear hold music, "please hold", "estimated wait time", return on_hold
3. If asked for NPI or provider identifier, return enter_npi
4. If asked for member ID, subscriber number, or patient ID, return enter_member_id
5. If asked for claim number or reference number, return enter_claim_number
6. If you hear a menu with options, choose the option that best matches our purpose:
   - For claims_status: prefer "claims", "claim status", "billing"
   - For eligibility: prefer "eligibility", "benefits", "verification"
   - For prior_auth: prefer "prior authorization", "pre-certification"
   - For appeal: prefer "appeals", "grievances", "disputes"
   - To speak to representative: typically 0 or 9
7. If the prompt is incomplete or unclear, return wait
8. NEVER enter information we don't have
9. Prefer lower menu numbers when multiple options match

Respond with JSON only:
{"type": "press_digit" | "enter_npi" | "enter_member_id" | "enter_claim_number" | "wait" | "on_hold" | "operator_detected", "value": "digit(s) to press if applicable", "reason": "brief explanation"}`;

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
   * Clean up resources
   */
  destroy(): void {
    this.stopAnalysisLoop();
    this.transcriptionBuffer = [];
    this.actionHistory = [];
  }
}
