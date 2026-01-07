from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import subprocess
import tempfile
import os
import zipfile
import shutil

app = Flask(__name__)
CORS(app)

OUTPUT_DIR = "/app/output"

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "demucs",
        "models": ["htdemucs", "htdemucs_ft", "mdx_extra"]
    })

@app.route("/separate", methods=["POST"])
def separate():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio = request.files["audio"]
    model = request.form.get("model", "htdemucs")
    stems = request.form.get("stems", "all")  # all, vocals, drums, bass, other
    
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.wav")
        audio.save(input_path)
        
        try:
            # Run demucs
            cmd = [
                "python3", "-m", "demucs",
                "--model", model,
                "--out", tmpdir,
                input_path
            ]
            
            if stems != "all":
                cmd.extend(["--two-stems", stems])
            
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Find output directory
            output_subdir = os.path.join(tmpdir, model, "input")
            
            if not os.path.exists(output_subdir):
                return jsonify({"error": "Separation failed"}), 500
            
            # Create zip with all stems
            zip_path = os.path.join(tmpdir, "stems.zip")
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for stem_file in os.listdir(output_subdir):
                    stem_path = os.path.join(output_subdir, stem_file)
                    zipf.write(stem_path, stem_file)
            
            return send_file(
                zip_path,
                mimetype="application/zip",
                as_attachment=True,
                download_name="stems.zip"
            )
            
        except subprocess.CalledProcessError as e:
            return jsonify({"error": f"Demucs error: {e.stderr.decode()}"}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route("/separate-stem", methods=["POST"])
def separate_single_stem():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio = request.files["audio"]
    stem = request.form.get("stem", "vocals")  # vocals, drums, bass, other
    model = request.form.get("model", "htdemucs")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.wav")
        audio.save(input_path)
        
        try:
            cmd = [
                "python3", "-m", "demucs",
                "--model", model,
                "--two-stems", stem,
                "--out", tmpdir,
                input_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            
            output_subdir = os.path.join(tmpdir, model, "input")
            stem_path = os.path.join(output_subdir, f"{stem}.wav")
            
            if not os.path.exists(stem_path):
                return jsonify({"error": f"Stem {stem} not found"}), 500
            
            return send_file(
                stem_path,
                mimetype="audio/wav",
                as_attachment=True,
                download_name=f"{stem}.wav"
            )
            
        except subprocess.CalledProcessError as e:
            return jsonify({"error": f"Demucs error: {e.stderr.decode()}"}), 500

if __name__ == "__main__":
    print("Starting Demucs API server")
    print("Listening on http://0.0.0.0:8040")
    app.run(host="0.0.0.0", port=8040)
