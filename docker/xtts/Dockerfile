FROM nvidia/cuda:12.1-runtime-ubuntu22.04

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip ffmpeg espeak-ng curl \
    && rm -rf /var/lib/apt/lists/*

# Install TTS
RUN pip3 install --no-cache-dir \
    TTS \
    flask \
    flask-cors \
    torch --index-url https://download.pytorch.org/whl/cu121

# Create speakers directory
RUN mkdir -p /app/speakers

# Copy server script
COPY xtts_server.py .

EXPOSE 8020

CMD ["python3", "xtts_server.py"]
