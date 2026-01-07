FROM nvidia/cuda:12.1-runtime-ubuntu22.04

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip curl \
    && rm -rf /var/lib/apt/lists/*

# Install CLIP
RUN pip3 install --no-cache-dir \
    clip-interrogator \
    flask \
    flask-cors \
    torch --index-url https://download.pytorch.org/whl/cu121 \
    Pillow

# Copy server script
COPY clip_server.py .

EXPOSE 8060

CMD ["python3", "clip_server.py"]
