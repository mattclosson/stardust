# Stardust Telephony Service

Real-time phone calling service for the "Hold for Me" feature. Uses Twilio for outbound calls, Deepgram for speech-to-text, and OpenAI for operator detection.

## Architecture

```
Convex Dashboard → This Service → Twilio → Insurance Company
                        ↓
                   Deepgram STT
                        ↓
                   OpenAI GPT-4o-mini
                        ↓
                   Operator Detection
                        ↓
                   Convex (status update)
```

## Setup

### Prerequisites

1. **Twilio Account**: Sign up at https://twilio.com
   - Get Account SID and Auth Token
   - Purchase a phone number (~$1/month)

2. **Deepgram Account**: Sign up at https://deepgram.com
   - Free tier: 12,000 minutes/year
   - Get API key

3. **OpenAI API Key**: Get from https://platform.openai.com

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Deepgram
DEEPGRAM_API_KEY=...

# OpenAI
OPENAI_API_KEY=sk-...

# Convex
CONVEX_URL=https://your-deployment.convex.cloud

# Server
PORT=3001
BASE_URL=https://your-service.railway.app  # or ngrok URL for local dev
```

## Development

### Local with ngrok

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the service:
   ```bash
   npm run dev
   ```

3. In another terminal, expose via ngrok:
   ```bash
   ngrok http 3001
   ```

4. Update `BASE_URL` in `.env` with the ngrok URL

5. Set `TELEPHONY_SERVICE_URL` in Convex environment to the ngrok URL

### Testing

1. Enable real calls in the dashboard (toggle in call dialog)
2. Accept the consent checkbox
3. Click "Start Holding"
4. Watch the status progress in the banner

## Deployment

### Railway

1. Create a new project in Railway
2. Connect this repository
3. Set the root directory to `services/telephony`
4. Add environment variables
5. Deploy!

Railway will automatically:
- Build using the Dockerfile
- Set up health checks
- Provide a public URL

### Post-deployment

1. Update `BASE_URL` in Railway environment to the Railway URL
2. Update `TELEPHONY_SERVICE_URL` in Convex to the Railway URL
3. Set `VITE_ENABLE_REAL_CALLS=true` in the frontend

## API Endpoints

### `POST /twilio/call`
Initiates an outbound call.

```json
{
  "convexCallId": "abc123",
  "toNumber": "+18001234567",
  "payerName": "Aetna",
  "userPhoneNumber": "+15551234567"
}
```

### `POST /twilio/bridge`
Bridges the call to the user's phone.

```json
{
  "callSid": "CA...",
  "userPhoneNumber": "+15551234567"
}
```

### `POST /twilio/hangup`
Ends a call.

```json
{
  "callSid": "CA..."
}
```

### `GET /health`
Health check endpoint.

## WebSocket

The `/media-stream` WebSocket endpoint receives audio from Twilio:

- Receives mulaw audio at 8kHz
- Streams to Deepgram for real-time transcription
- Analyzes transcription with OpenAI every 5 seconds
- Updates Convex when operator is detected
