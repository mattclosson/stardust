import { createClient, LiveTranscriptionEvents, LiveClient } from "@deepgram/sdk";

type TranscriptionCallback = (text: string) => void;

/**
 * AudioProcessor handles converting Twilio's mulaw audio to PCM
 * and streaming it to Deepgram for real-time transcription.
 */
export class AudioProcessor {
  private deepgram: ReturnType<typeof createClient> | null = null;
  private connection: LiveClient | null = null;
  private transcriptionCallbacks: TranscriptionCallback[] = [];
  private isConnected = false;

  /**
   * Initialize Deepgram connection
   */
  async initialize(): Promise<void> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn("[AudioProcessor] No Deepgram API key, transcription disabled");
      return;
    }

    this.deepgram = createClient(apiKey);

    // Create a live transcription connection
    this.connection = this.deepgram.listen.live({
      model: "nova-2-phonecall", // Optimized for phone calls
      language: "en-US",
      smart_format: true,
      punctuate: true,
      interim_results: true,
      endpointing: 300,
      encoding: "mulaw", // Twilio sends mulaw audio
      sample_rate: 8000, // Twilio's sample rate
      channels: 1,
    });

    // Set up event handlers
    this.connection.on(LiveTranscriptionEvents.Open, () => {
      console.log("[AudioProcessor] Deepgram connection opened");
      this.isConnected = true;
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript && transcript.trim()) {
        console.log(`[AudioProcessor] Transcription: ${transcript}`);
        this.notifyTranscription(transcript);
      }
    });

    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error("[AudioProcessor] Deepgram error:", error);
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("[AudioProcessor] Deepgram connection closed");
      this.isConnected = false;
    });

    // Wait for connection to open
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Deepgram connection timeout"));
      }, 10000);

      this.connection!.on(LiveTranscriptionEvents.Open, () => {
        clearTimeout(timeout);
        resolve();
      });

      this.connection!.on(LiveTranscriptionEvents.Error, (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Process an audio chunk from Twilio
   * @param base64Audio - Base64 encoded mulaw audio from Twilio
   */
  async processChunk(base64Audio: string): Promise<void> {
    if (!this.connection || !this.isConnected) {
      return;
    }

    try {
      // Decode base64 to buffer
      const audioBuffer = Buffer.from(base64Audio, "base64");
      
      // Send to Deepgram
      this.connection.send(audioBuffer);
    } catch (error) {
      console.error("[AudioProcessor] Error processing chunk:", error);
    }
  }

  /**
   * Register a callback for transcription results
   */
  onTranscription(callback: TranscriptionCallback): void {
    this.transcriptionCallbacks.push(callback);
  }

  /**
   * Notify all callbacks of a new transcription
   */
  private notifyTranscription(text: string): void {
    for (const callback of this.transcriptionCallbacks) {
      try {
        callback(text);
      } catch (error) {
        console.error("[AudioProcessor] Callback error:", error);
      }
    }
  }

  /**
   * Close the Deepgram connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      this.connection.requestClose();
      this.connection = null;
    }
    this.isConnected = false;
    this.transcriptionCallbacks = [];
    console.log("[AudioProcessor] Closed");
  }
}
