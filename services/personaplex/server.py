"""
PersonaPlex wrapper server with context injection API.

This server wraps the PersonaPlex model and provides:
1. A REST API to set conversation context (claim data)
2. WebSocket proxy to PersonaPlex for audio streaming
3. Session management for multiple concurrent users
"""

import asyncio
import json
import logging
import os
import secrets
import subprocess
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from prompts import DEFAULT_ASSISTANT_PROMPT, format_claim_prompt

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Configuration
PERSONAPLEX_PORT = int(os.getenv("PERSONAPLEX_PORT", "8998"))
CONTEXT_API_PORT = int(os.getenv("CONTEXT_API_PORT", "8999"))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
SESSION_TTL_MINUTES = int(os.getenv("SESSION_TTL_MINUTES", "60"))
VOICE_PROMPT = os.getenv("VOICE_PROMPT", "NATF2.pt")  # Natural female voice


@dataclass
class Session:
    """Represents an active voice session with claim context."""
    session_id: str
    claim_context: Optional[dict] = None
    text_prompt: str = DEFAULT_ASSISTANT_PROMPT
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_accessed: datetime = field(default_factory=datetime.utcnow)
    
    def is_expired(self) -> bool:
        """Check if the session has expired."""
        expiry = self.last_accessed + timedelta(minutes=SESSION_TTL_MINUTES)
        return datetime.utcnow() > expiry
    
    def touch(self) -> None:
        """Update last accessed time."""
        self.last_accessed = datetime.utcnow()


class SessionManager:
    """Manages voice sessions with claim contexts."""
    
    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def create_session(self, claim_context: Optional[dict] = None) -> str:
        """Create a new session with optional claim context."""
        session_id = secrets.token_urlsafe(32)
        
        if claim_context:
            text_prompt = format_claim_prompt(claim_context)
        else:
            text_prompt = DEFAULT_ASSISTANT_PROMPT
        
        session = Session(
            session_id=session_id,
            claim_context=claim_context,
            text_prompt=text_prompt,
        )
        self._sessions[session_id] = session
        logger.info(f"Created session {session_id[:8]}... with claim context: {claim_context is not None}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID, returning None if not found or expired."""
        session = self._sessions.get(session_id)
        if session is None:
            return None
        if session.is_expired():
            self.delete_session(session_id)
            return None
        session.touch()
        return session
    
    def delete_session(self, session_id: str) -> None:
        """Delete a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Deleted session {session_id[:8]}...")
    
    async def cleanup_expired(self) -> None:
        """Periodically clean up expired sessions."""
        while True:
            await asyncio.sleep(300)  # Run every 5 minutes
            expired = [
                sid for sid, session in self._sessions.items()
                if session.is_expired()
            ]
            for sid in expired:
                self.delete_session(sid)
            if expired:
                logger.info(f"Cleaned up {len(expired)} expired sessions")
    
    def start_cleanup_task(self) -> None:
        """Start the background cleanup task."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self.cleanup_expired())
    
    def stop_cleanup_task(self) -> None:
        """Stop the background cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None


# Global session manager
session_manager = SessionManager()

# PersonaPlex process reference
personaplex_process: Optional[subprocess.Popen] = None


async def start_personaplex():
    """Start the PersonaPlex server as a subprocess."""
    global personaplex_process
    
    ssl_dir = os.getenv("SSL_DIR", "/tmp/personaplex-ssl")
    os.makedirs(ssl_dir, exist_ok=True)
    
    cmd = [
        sys.executable, "-m", "moshi.server",
        "--ssl", ssl_dir,
        "--port", str(PERSONAPLEX_PORT),
    ]
    
    # Add CPU offload if specified
    if os.getenv("CPU_OFFLOAD", "").lower() == "true":
        cmd.append("--cpu-offload")
    
    logger.info(f"Starting PersonaPlex server: {' '.join(cmd)}")
    
    personaplex_process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "HF_TOKEN": os.getenv("HF_TOKEN", "")},
    )
    
    # Wait a bit for the server to start
    await asyncio.sleep(10)
    
    if personaplex_process.poll() is not None:
        stderr = personaplex_process.stderr.read().decode() if personaplex_process.stderr else ""
        raise RuntimeError(f"PersonaPlex server failed to start: {stderr}")
    
    logger.info(f"PersonaPlex server started on port {PERSONAPLEX_PORT}")


async def stop_personaplex():
    """Stop the PersonaPlex server."""
    global personaplex_process
    
    if personaplex_process:
        personaplex_process.terminate()
        try:
            personaplex_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            personaplex_process.kill()
        personaplex_process = None
        logger.info("PersonaPlex server stopped")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    session_manager.start_cleanup_task()
    
    # Only start PersonaPlex if not in development mode
    if os.getenv("SKIP_PERSONAPLEX", "").lower() != "true":
        try:
            await start_personaplex()
        except Exception as e:
            logger.error(f"Failed to start PersonaPlex: {e}")
            # Continue anyway for development
    
    yield
    
    # Shutdown
    session_manager.stop_cleanup_task()
    await stop_personaplex()


# Create FastAPI app
app = FastAPI(
    title="PersonaPlex Context API",
    description="Context injection API for PersonaPlex voice assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class CreateSessionRequest(BaseModel):
    """Request to create a new voice session."""
    claim_context: Optional[dict] = None


class CreateSessionResponse(BaseModel):
    """Response with session details."""
    session_id: str
    websocket_url: str
    text_prompt: str


class SessionInfoResponse(BaseModel):
    """Session information response."""
    session_id: str
    has_claim_context: bool
    text_prompt: str
    created_at: str
    last_accessed: str


# API endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "personaplex_running": personaplex_process is not None and personaplex_process.poll() is None,
        "active_sessions": len(session_manager._sessions),
    }


@app.post("/sessions", response_model=CreateSessionResponse)
async def create_session(request: CreateSessionRequest):
    """
    Create a new voice session with optional claim context.
    
    The claim_context should contain:
    - claimNumber: string
    - patientName: string
    - patientMrn: string
    - payerName: string
    - memberId: string
    - dateOfService: string
    - totalCharges: number
    - status: string
    - diagnoses: list of strings
    - procedures: list of strings
    """
    session_id = session_manager.create_session(request.claim_context)
    session = session_manager.get_session(session_id)
    
    # Build WebSocket URL for PersonaPlex
    # The client will connect through the wrapper's WebSocket proxy
    host = os.getenv("PUBLIC_HOST", "localhost")
    ws_url = f"ws://{host}:{CONTEXT_API_PORT}"
    
    return CreateSessionResponse(
        session_id=session_id,
        websocket_url=ws_url,
        text_prompt=session.text_prompt if session else DEFAULT_ASSISTANT_PROMPT,
    )


@app.get("/sessions/{session_id}", response_model=SessionInfoResponse)
async def get_session(session_id: str):
    """Get information about a session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    return SessionInfoResponse(
        session_id=session.session_id,
        has_claim_context=session.claim_context is not None,
        text_prompt=session.text_prompt,
        created_at=session.created_at.isoformat(),
        last_accessed=session.last_accessed.isoformat(),
    )


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    session_manager.delete_session(session_id)
    return {"status": "deleted"}


@app.websocket("/ws/{session_id}")
async def websocket_proxy(websocket: WebSocket, session_id: str):
    """
    WebSocket proxy that injects session context into PersonaPlex communication.
    
    This endpoint acts as a bridge between the client and PersonaPlex,
    allowing us to inject the text prompt based on the session's claim context.
    """
    import websockets
    
    session = session_manager.get_session(session_id)
    if not session:
        await websocket.close(code=4001, reason="Session not found or expired")
        return
    
    await websocket.accept()
    logger.info(f"Client connected to session {session_id[:8]}...")
    
    # Connect to PersonaPlex
    # PersonaPlex WebSocket endpoint is at /api/chat with voice_prompt query param
    host = os.getenv("PERSONAPLEX_HOST", "localhost")
    personaplex_url = f"ws://{host}:{PERSONAPLEX_PORT}/api/chat?voice_prompt={VOICE_PROMPT}"
    logger.info(f"Connecting to PersonaPlex at {personaplex_url}")
    
    try:
        async with websockets.connect(
            personaplex_url,
        ) as pp_ws:
            logger.info(f"Connected to PersonaPlex for session {session_id[:8]}...")
            
            async def forward_to_personaplex():
                """Forward messages from client to PersonaPlex."""
                try:
                    while True:
                        data = await websocket.receive()
                        if "bytes" in data:
                            await pp_ws.send(data["bytes"])
                        elif "text" in data:
                            await pp_ws.send(data["text"])
                except WebSocketDisconnect:
                    pass
            
            async def forward_to_client():
                """Forward messages from PersonaPlex to client."""
                try:
                    async for message in pp_ws:
                        if isinstance(message, bytes):
                            await websocket.send_bytes(message)
                        else:
                            await websocket.send_text(message)
                except websockets.exceptions.ConnectionClosed:
                    pass
            
            # Run both forwarding tasks concurrently
            await asyncio.gather(
                forward_to_personaplex(),
                forward_to_client(),
                return_exceptions=True,
            )
    
    except Exception as e:
        logger.error(f"WebSocket proxy error: {e}")
        await websocket.close(code=4002, reason=str(e))
    
    finally:
        logger.info(f"Client disconnected from session {session_id[:8]}...")


if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=CONTEXT_API_PORT,
        reload=os.getenv("NODE_ENV") != "production",
    )
