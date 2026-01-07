FROM nvidia/cuda:12.1-runtime-ubuntu22.04

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

# Install Demucs
RUN pip3 install --no-cache-dir \
    demucs \
    flask \
    flask-cors \
    torch --index-url https://download.pytorch.org/whl/cu121

# Create output directory
RUN mkdir -p /app/output

# Copy server script
COPY demucs_server.py .

EXPOSE 8040

CMD ["python3", "demucs_server.py"]
