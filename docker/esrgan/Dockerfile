FROM nvidia/cuda:12.1-runtime-ubuntu22.04

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip curl \
    && rm -rf /var/lib/apt/lists/*

# Install RealESRGAN
RUN pip3 install --no-cache-dir \
    realesrgan \
    flask \
    flask-cors \
    torch --index-url https://download.pytorch.org/whl/cu121 \
    Pillow \
    opencv-python-headless

# Create models directory
RUN mkdir -p /app/models

# Copy server script
COPY esrgan_server.py .

EXPOSE 8070

CMD ["python3", "esrgan_server.py"]
