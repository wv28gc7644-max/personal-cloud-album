from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from TTS.api import TTS
import tempfile
import os
import torch

app = Flask(__name__)
CORS(app)

tts = None
model_name = os.environ.get("TTS_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "xtts",
        "model": model_name,
        "loaded": tts is not None,
        "gpu": torch.cuda.is_available()
    })

@app.route("/synthesize", methods=["POST"])
def synthesize():
    global tts
    if tts is None:
        print(f"Loading XTTS model: {model_name}")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tts = TTS(model_name).to(device)
    
    data = request.json
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    language = data.get("language", "fr")
    speaker_wav = data.get("speaker_wav")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            if speaker_wav and os.path.exists(speaker_wav):
                # Voice cloning
                tts.tts_to_file(
                    text=text,
                    speaker_wav=speaker_wav,
                    language=language,
                    file_path=f.name
                )
            else:
                # Default speaker
                tts.tts_to_file(
                    text=text,
                    language=language,
                    file_path=f.name
                )
            
            return send_file(f.name, mimetype="audio/wav", as_attachment=True, download_name="speech.wav")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/clone", methods=["POST"])
def clone_voice():
    global tts
    if tts is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tts = TTS(model_name).to(device)
    
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    text = request.form.get("text", "")
    language = request.form.get("language", "fr")
    audio = request.files["audio"]
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as speaker_file:
        audio.save(speaker_file.name)
        
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as output_file:
                tts.tts_to_file(
                    text=text,
                    speaker_wav=speaker_file.name,
                    language=language,
                    file_path=output_file.name
                )
                return send_file(output_file.name, mimetype="audio/wav", as_attachment=True, download_name="cloned_speech.wav")
        finally:
            os.unlink(speaker_file.name)

@app.route("/speakers", methods=["GET"])
def list_speakers():
    speakers_dir = "/app/speakers"
    speakers = []
    
    if os.path.exists(speakers_dir):
        for f in os.listdir(speakers_dir):
            if f.endswith((".wav", ".mp3", ".ogg")):
                speakers.append({
                    "name": os.path.splitext(f)[0],
                    "path": os.path.join(speakers_dir, f)
                })
    
    return jsonify({"speakers": speakers})

if __name__ == "__main__":
    print(f"Starting XTTS API server with model: {model_name}")
    print(f"GPU available: {torch.cuda.is_available()}")
    print("Listening on http://0.0.0.0:8020")
    app.run(host="0.0.0.0", port=8020)
