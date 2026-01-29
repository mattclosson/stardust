# PersonaPlex Voice Assistant Service

This service wraps NVIDIA's PersonaPlex model to provide a voice assistant for healthcare billing specialists. It allows users to have natural voice conversations about claim data.

## Overview

PersonaPlex is a real-time, full-duplex speech-to-speech conversational model. This wrapper adds:

- **Context Injection API**: Set claim context before starting a conversation
- **Session Management**: Track multiple concurrent voice sessions
- **WebSocket Proxy**: Bridge between frontend and PersonaPlex with context awareness

## Requirements

- **NVIDIA GPU** with 16GB+ VRAM (RTX 4090, A10, A100, etc.)
- CUDA 12.1+ drivers
- Python 3.11+
- Hugging Face account with accepted [PersonaPlex license](https://huggingface.co/nvidia/personaplex)

## Local Development

### 1. Clone PersonaPlex

```bash
git clone https://github.com/NVIDIA/personaplex.git
cd personaplex
```

### 2. Install Dependencies

```bash
# Install Opus codec
# Ubuntu/Debian
sudo apt install libopus-dev

# macOS
brew install opus

# Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install PersonaPlex
pip install moshi/.

# Install service dependencies
cd ../services/personaplex
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your HF_TOKEN and other settings
```

### 4. Run the Service

```bash
# With PersonaPlex (requires GPU)
python server.py

# Development mode (skip PersonaPlex, just API)
SKIP_PERSONAPLEX=true python server.py
```

## API Reference

### Create Session

```http
POST /sessions
Content-Type: application/json

{
  "claim_context": {
    "claimNumber": "CLM-2024-001234",
    "patientName": "John Smith",
    "patientMrn": "MRN123456",
    "payerName": "Blue Cross Blue Shield",
    "memberId": "XYZ789012345",
    "dateOfService": "2024-01-15",
    "totalCharges": 1500.00,
    "status": "submitted",
    "diagnoses": ["J06.9: Acute upper respiratory infection"],
    "procedures": ["99213: Office visit, established patient"]
  }
}
```

Response:

```json
{
  "session_id": "abc123...",
  "websocket_url": "wss://localhost:8998",
  "text_prompt": "You are a helpful assistant..."
}
```

### Get Session Info

```http
GET /sessions/{session_id}
```

### Delete Session

```http
DELETE /sessions/{session_id}
```

### WebSocket Connection

Connect to `/ws/{session_id}` for audio streaming:

```javascript
const ws = new WebSocket(`wss://server:8999/ws/${sessionId}`);

// Send audio as binary data
ws.send(audioData);

// Receive audio responses
ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Play audio
  }
};
```

## Docker Deployment

### Build

```bash
docker build -t personaplex-service .
```

### Run

```bash
docker run --gpus all \
  -e HF_TOKEN=your_token \
  -e ALLOWED_ORIGINS=https://your-frontend.com \
  -p 8998:8998 \
  -p 8999:8999 \
  personaplex-service
```

## Cloud GPU Deployment

### RunPod

1. Create a GPU pod with RTX 4090 or A100
2. Select the NVIDIA CUDA template
3. Clone this repo and run setup
4. Expose ports 8998 and 8999

### AWS EC2

1. Launch a `g5.xlarge` or `p4d.24xlarge` instance
2. Use the Deep Learning AMI (CUDA 12.1)
3. Install Docker and run the container

### GCP

1. Create a VM with NVIDIA A100 or T4 GPU
2. Use the Deep Learning VM image
3. Install Docker and run the container

## Voice Options

PersonaPlex supports multiple voice presets:

**Natural (conversational):**
- `NATF0.pt` - `NATF3.pt` (female)
- `NATM0.pt` - `NATM3.pt` (male)

**Variety (diverse styles):**
- `VARF0.pt` - `VARF4.pt` (female)
- `VARM0.pt` - `VARM4.pt` (male)

Set via `VOICE_PROMPT` environment variable.

## Troubleshooting

### Out of Memory

If you see CUDA OOM errors:

```bash
# Enable CPU offload
CPU_OFFLOAD=true python server.py
```

### Model Download Failed

Ensure your HF_TOKEN is set and you've accepted the model license.

### WebSocket Connection Failed

Check that:
1. PersonaPlex server is running on port 8998
2. SSL certificates are generated
3. CORS origins are configured correctly
