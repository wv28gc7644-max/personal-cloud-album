FROM nvidia/cuda:12.1-runtime-ubuntu22.04

WORKDIR /app

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

# Install Whisper
RUN pip3 install --no-cache-dir \
    openai-whisper \
    flask \
    flask-cors \
    torch --index-url https://download.pytorch.org/whl/cu121

# Copy server script
COPY whisper_server.py .

EXPOSE 9000

CMD ["python3", "whisper_server.py"]
