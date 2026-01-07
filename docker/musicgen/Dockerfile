FROM nvidia/cuda:12.1-runtime-ubuntu22.04

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

# Install AudioCraft
RUN pip3 install --no-cache-dir \
    audiocraft \
    flask \
    flask-cors \
    torch --index-url https://download.pytorch.org/whl/cu121

# Copy server script
COPY musicgen_server.py .

EXPOSE 8030

CMD ["python3", "musicgen_server.py"]
