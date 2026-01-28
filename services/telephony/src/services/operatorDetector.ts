import OpenAI from "openai";

type OperatorDetectionCallback = (
  isOperator: boolean,
  confidence: number,
  reason: string
) => Promise<void>;

interface TranscriptionEntry {
  text: string;
  timestamp: number;
}

/**
 * OperatorDetector uses OpenAI to analyze call transcription
 * and determine if a human operator is now on the line.
 */
export class OperatorDetector {
  private openai: OpenAI | null = null;
  private transcriptionBuffer: TranscriptionEntry[] = [];
  private payerName: string;
  private onOperatorDetected: OperatorDetectionCallback;
  private analysisInterval: NodeJS.Timeout | null = null;
  private lastAnalysisTime = 0;
  private operatorDetected = false;

  // Configuration
  private readonly BUFFER_DURATION_MS = 30000; // Keep last 30 seconds
  private readonly ANALYSIS_INTERVAL_MS = 5000; // Analyze every 5 seconds
  private readonly MIN_TEXT_LENGTH = 20; // Minimum text to analyze

  constructor(payerName: string, onOperatorDetected: OperatorDetectionCallback) {
    this.payerName = payerName;
    this.onOperatorDetected = onOperatorDetected;

    // Initialize OpenAI if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.startAnalysisLoop();
    } else {
      console.warn("[OperatorDetector] No OpenAI API key, detection disabled");
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

    // Prune old entries
    this.pruneBuffer(now);
  }

  /**
   * Remove transcriptions older than BUFFER_DURATION_MS
   */
  private pruneBuffer(now: number): void {
    const cutoff = now - this.BUFFER_DURATION_MS;
    this.transcriptionBuffer = this.transcriptionBuffer.filter(
      (entry) => entry.timestamp >= cutoff
    );
  }

  /**
   * Get the full transcription text from buffer
   */
  private getBufferedText(): string {
    return this.transcriptionBuffer.map((entry) => entry.text).join(" ");
  }

  /**
   * Start the periodic analysis loop
   */
  private startAnalysisLoop(): void {
    this.analysisInterval = setInterval(async () => {
      await this.analyzeTranscription();
    }, this.ANALYSIS_INTERVAL_MS);
  }

  /**
   * Analyze the current transcription buffer
   */
  private async analyzeTranscription(): Promise<void> {
    // Skip if already detected operator or no OpenAI client
    if (this.operatorDetected || !this.openai) {
      return;
    }

    const text = this.getBufferedText();
    
    // Skip if not enough text
    if (text.length < this.MIN_TEXT_LENGTH) {
      return;
    }

    // Debounce: don't analyze more than once per interval
    const now = Date.now();
    if (now - this.lastAnalysisTime < this.ANALYSIS_INTERVAL_MS - 100) {
      return;
    }
    this.lastAnalysisTime = now;

    try {
      const result = await this.detectOperator(text);
      
      if (result.isOperator && result.confidence > 0.7) {
        this.operatorDetected = true;
        this.stopAnalysisLoop();
        await this.onOperatorDetected(true, result.confidence, result.reason);
      }
    } catch (error) {
      console.error("[OperatorDetector] Analysis error:", error);
    }
  }

  /**
   * Use OpenAI to detect if an operator is speaking
   */
  private async detectOperator(transcription: string): Promise<{
    isOperator: boolean;
    confidence: number;
    reason: string;
  }> {
    if (!this.openai) {
      return { isOperator: false, confidence: 0, reason: "No OpenAI client" };
    }

    const systemPrompt = `You are analyzing a phone call transcription to ${this.payerName} (an insurance company).
Your task is to determine if a HUMAN OPERATOR is now speaking on the line.

IMPORTANT DISTINCTIONS:
- IVR/Automated System: Pre-recorded messages, menu options, "Press 1 for...", hold music announcements
- Human Operator: Natural speech, introduces themselves by name, asks for specific information, responds to context

Signs of a HUMAN OPERATOR:
1. Personal greeting: "Thank you for calling [company], this is [name]"
2. Asking for caller identification: "May I have your member ID?" or "How can I help you today?"
3. Natural conversation patterns with pauses and acknowledgments
4. Responding to specific situations (not generic scripts)
5. Asking clarifying questions

Signs of IVR/HOLD:
1. Menu options: "Press 1 for claims, press 2 for..."
2. Generic hold messages: "Your call is important to us"
3. Music or silence between messages
4. Repetitive announcements
5. Estimated wait time messages

Respond with a JSON object only, no other text:
{"isOperator": boolean, "confidence": number between 0 and 1, "reason": "brief explanation"}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Current transcription (last 30 seconds):\n\n"${transcription}"` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { isOperator: false, confidence: 0, reason: "No response" };
    }

    try {
      const result = JSON.parse(content);
      console.log(`[OperatorDetector] Analysis result: ${JSON.stringify(result)}`);
      return {
        isOperator: Boolean(result.isOperator),
        confidence: Number(result.confidence) || 0,
        reason: String(result.reason) || "Unknown",
      };
    } catch {
      console.error("[OperatorDetector] Failed to parse response:", content);
      return { isOperator: false, confidence: 0, reason: "Parse error" };
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
   * Clean up resources
   */
  destroy(): void {
    this.stopAnalysisLoop();
    this.transcriptionBuffer = [];
  }
}
