from flask import Flask, request, jsonify
from flask_cors import CORS
from clip_interrogator import Config, Interrogator
from PIL import Image
import tempfile
import os
import torch

app = Flask(__name__)
CORS(app)

interrogator = None

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "clip",
        "loaded": interrogator is not None,
        "gpu": torch.cuda.is_available()
    })

def get_interrogator():
    global interrogator
    if interrogator is None:
        print("Loading CLIP Interrogator...")
        config = Config(
            clip_model_name="ViT-L-14/openai",
            device="cuda" if torch.cuda.is_available() else "cpu"
        )
        interrogator = Interrogator(config)
    return interrogator

@app.route("/analyze", methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files["image"]
    mode = request.form.get("mode", "fast")  # fast, classic, best
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as f:
        image_file.save(f.name)
        
        try:
            image = Image.open(f.name).convert("RGB")
            ci = get_interrogator()
            
            if mode == "best":
                result = ci.interrogate(image)
            elif mode == "classic":
                result = ci.interrogate_classic(image)
            else:
                result = ci.interrogate_fast(image)
            
            return jsonify({
                "description": result,
                "mode": mode
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            os.unlink(f.name)

@app.route("/embed", methods=["POST"])
def embed():
    ci = get_interrogator()
    
    if "image" in request.files:
        image_file = request.files["image"]
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as f:
            image_file.save(f.name)
            try:
                image = Image.open(f.name).convert("RGB")
                embedding = ci.image_to_features(image)
                return jsonify({
                    "embedding": embedding.cpu().numpy().tolist(),
                    "type": "image"
                })
            finally:
                os.unlink(f.name)
    
    elif request.json and "text" in request.json:
        text = request.json["text"]
        embedding = ci.text_to_features(text)
        return jsonify({
            "embedding": embedding.cpu().numpy().tolist(),
            "type": "text"
        })
    
    return jsonify({"error": "No image or text provided"}), 400

@app.route("/similarity", methods=["POST"])
def similarity():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    embedding1 = torch.tensor(data.get("embedding1", []))
    embedding2 = torch.tensor(data.get("embedding2", []))
    
    if embedding1.numel() == 0 or embedding2.numel() == 0:
        return jsonify({"error": "Invalid embeddings"}), 400
    
    similarity = torch.nn.functional.cosine_similarity(
        embedding1.unsqueeze(0),
        embedding2.unsqueeze(0)
    ).item()
    
    return jsonify({"similarity": similarity})

@app.route("/tags", methods=["POST"])
def generate_tags():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files["image"]
    max_tags = int(request.form.get("max_tags", 10))
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as f:
        image_file.save(f.name)
        
        try:
            image = Image.open(f.name).convert("RGB")
            ci = get_interrogator()
            
            # Get description and extract tags
            description = ci.interrogate_fast(image)
            
            # Parse tags from description
            tags = [tag.strip() for tag in description.split(",")][:max_tags]
            
            return jsonify({
                "tags": tags,
                "full_description": description
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            os.unlink(f.name)

if __name__ == "__main__":
    print("Starting CLIP API server")
    print(f"GPU available: {torch.cuda.is_available()}")
    print("Listening on http://0.0.0.0:8060")
    app.run(host="0.0.0.0", port=8060)
