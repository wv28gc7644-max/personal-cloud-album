from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from audiocraft.models import MusicGen
from audiocraft.data.audio import audio_write
import tempfile
import os
import torch

app = Flask(__name__)
CORS(app)

model = None
model_size = os.environ.get("MODEL_SIZE", "small")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "musicgen",
        "model": f"facebook/musicgen-{model_size}",
        "loaded": model is not None,
        "gpu": torch.cuda.is_available()
    })

@app.route("/generate", methods=["POST"])
def generate():
    global model
    if model is None:
        print(f"Loading MusicGen model: {model_size}")
        model = MusicGen.get_pretrained(f"facebook/musicgen-{model_size}")
    
    data = request.json
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    duration = min(data.get("duration", 10), 30)  # Max 30 seconds
    
    try:
        model.set_generation_params(duration=duration)
        wav = model.generate([prompt])
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "music")
            audio_write(output_path, wav[0].cpu(), model.sample_rate, strategy="loudness")
            
            return send_file(
                f"{output_path}.wav",
                mimetype="audio/wav",
                as_attachment=True,
                download_name="generated_music.wav"
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/continue", methods=["POST"])
def continue_music():
    global model
    if model is None:
        model = MusicGen.get_pretrained(f"facebook/musicgen-{model_size}")
    
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    prompt = request.form.get("prompt", "")
    duration = min(int(request.form.get("duration", 10)), 30)
    audio = request.files["audio"]
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as input_file:
        audio.save(input_file.name)
        
        try:
            import torchaudio
            melody, sr = torchaudio.load(input_file.name)
            
            model.set_generation_params(duration=duration)
            wav = model.generate_with_chroma([prompt], melody[None].expand(1, -1, -1), sr)
            
            with tempfile.TemporaryDirectory() as tmpdir:
                output_path = os.path.join(tmpdir, "continued_music")
                audio_write(output_path, wav[0].cpu(), model.sample_rate, strategy="loudness")
                
                return send_file(
                    f"{output_path}.wav",
                    mimetype="audio/wav",
                    as_attachment=True,
                    download_name="continued_music.wav"
                )
        finally:
            os.unlink(input_file.name)

if __name__ == "__main__":
    print(f"Starting MusicGen API server with model size: {model_size}")
    print(f"GPU available: {torch.cuda.is_available()}")
    print("Listening on http://0.0.0.0:8030")
    app.run(host="0.0.0.0", port=8030)
