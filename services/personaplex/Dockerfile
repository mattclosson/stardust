# PersonaPlex Service Dockerfile
# Requires NVIDIA GPU with CUDA support

FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    git \
    libopus-dev \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

# Create app directory
WORKDIR /app

# Clone PersonaPlex repository
RUN git clone https://github.com/NVIDIA/personaplex.git /app/personaplex

# Install PyTorch with CUDA support
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install PersonaPlex (moshi package)
RUN pip install --no-cache-dir /app/personaplex/moshi/.

# Copy service files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY prompts.py .
COPY server.py .

# Create SSL directory
RUN mkdir -p /tmp/personaplex-ssl

# Expose ports
# 8998 - PersonaPlex WebSocket
# 8999 - Context API
EXPOSE 8998 8999

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8999/health || exit 1

# Run the context API server (which starts PersonaPlex)
CMD ["python", "server.py"]
