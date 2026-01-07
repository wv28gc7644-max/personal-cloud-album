from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os

app = Flask(__name__)
CORS(app)

model = None
model_name = os.environ.get("WHISPER_MODEL", "base")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "whisper",
        "model": model_name,
        "loaded": model is not None
    })

@app.route("/transcribe", methods=["POST"])
def transcribe():
    global model
    if model is None:
        print(f"Loading Whisper model: {model_name}")
        model = whisper.load_model(model_name)
    
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio = request.files["audio"]
    language = request.form.get("language", None)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        audio.save(f.name)
        try:
            options = {}
            if language:
                options["language"] = language
            
            result = model.transcribe(f.name, **options)
            return jsonify({
                "text": result["text"],
                "segments": result["segments"],
                "language": result.get("language", "unknown")
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            os.unlink(f.name)

@app.route("/detect-language", methods=["POST"])
def detect_language():
    global model
    if model is None:
        model = whisper.load_model(model_name)
    
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio = request.files["audio"]
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        audio.save(f.name)
        try:
            audio_data = whisper.load_audio(f.name)
            audio_data = whisper.pad_or_trim(audio_data)
            mel = whisper.log_mel_spectrogram(audio_data).to(model.device)
            _, probs = model.detect_language(mel)
            
            detected = max(probs, key=probs.get)
            return jsonify({
                "language": detected,
                "confidence": probs[detected],
                "all_probabilities": dict(sorted(probs.items(), key=lambda x: x[1], reverse=True)[:5])
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            os.unlink(f.name)

if __name__ == "__main__":
    print(f"Starting Whisper API server with model: {model_name}")
    print("Listening on http://0.0.0.0:9000")
    app.run(host="0.0.0.0", port=9000)
