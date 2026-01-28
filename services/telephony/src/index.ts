import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { twilioRouter } from "./routes/twilio.js";
import testIvrRouter from "./routes/test-ivr.js";
import { CallManager } from "./services/callManager.js";

const app = express();
const server = createServer(app);

// WebSocket server for Twilio media streams
const wss = new WebSocketServer({ server, path: "/media-stream" });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize call manager (singleton)
export const callManager = new CallManager();

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Twilio routes
app.use("/twilio", twilioRouter);

// Test IVR routes (for testing Hold-for-Me without real insurance calls)
app.use("/test-ivr", testIvrRouter);

// WebSocket connection handler for Twilio media streams
wss.on("connection", (ws: WebSocket, req) => {
  console.log("[WebSocket] New connection from Twilio media stream");
  
  let callSid: string | null = null;
  let streamSid: string | null = null;

  ws.on("message", async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.event) {
        case "connected":
          console.log("[WebSocket] Media stream connected");
          break;
          
        case "start":
          // Stream started - extract call info
          callSid = message.start.callSid;
          streamSid = message.start.streamSid;
          console.log(`[WebSocket] Stream started for call ${callSid}`);
          
          // Initialize audio processing for this call
          if (callSid) {
            await callManager.startAudioProcessing(callSid, ws);
          }
          break;
          
        case "media":
          // Audio data received
          if (callSid && message.media?.payload) {
            await callManager.processAudioChunk(callSid, message.media.payload);
          }
          break;
          
        case "stop":
          console.log(`[WebSocket] Stream stopped for call ${callSid}`);
          if (callSid) {
            await callManager.stopAudioProcessing(callSid);
          }
          break;
          
        default:
          console.log(`[WebSocket] Unknown event: ${message.event}`);
      }
    } catch (error) {
      console.error("[WebSocket] Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log(`[WebSocket] Connection closed for call ${callSid}`);
    if (callSid) {
      callManager.stopAudioProcessing(callSid);
    }
  });

  ws.on("error", (error) => {
    console.error("[WebSocket] Error:", error);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Telephony service running on port ${PORT}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}/media-stream`);
});
