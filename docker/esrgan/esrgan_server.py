from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet
import cv2
import numpy as np
import tempfile
import os
import torch

app = Flask(__name__)
CORS(app)

upsampler = None

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "esrgan",
        "loaded": upsampler is not None,
        "gpu": torch.cuda.is_available(),
        "scales": [2, 4, 8]
    })

def get_upsampler(scale=4):
    global upsampler
    if upsampler is None or upsampler.scale != scale:
        print(f"Loading RealESRGAN model with scale {scale}x...")
        
        model = RRDBNet(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_block=23,
            num_grow_ch=32,
            scale=scale
        )
        
        upsampler = RealESRGANer(
            scale=scale,
            model_path=None,
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=torch.cuda.is_available(),
            gpu_id=0 if torch.cuda.is_available() else None
        )
    
    return upsampler

@app.route("/upscale", methods=["POST"])
def upscale():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files["image"]
    scale = int(request.form.get("scale", 4))
    
    if scale not in [2, 4, 8]:
        return jsonify({"error": "Scale must be 2, 4, or 8"}), 400
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as input_file:
        image_file.save(input_file.name)
        
        try:
            # Read image
            img = cv2.imread(input_file.name, cv2.IMREAD_UNCHANGED)
            if img is None:
                return jsonify({"error": "Failed to read image"}), 400
            
            # Upscale
            upsampler = get_upsampler(scale)
            output, _ = upsampler.enhance(img, outscale=scale)
            
            # Save output
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as output_file:
                cv2.imwrite(output_file.name, output)
                
                return send_file(
                    output_file.name,
                    mimetype="image/png",
                    as_attachment=True,
                    download_name=f"upscaled_{scale}x.png"
                )
                
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            os.unlink(input_file.name)

@app.route("/upscale-face", methods=["POST"])
def upscale_face():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files["image"]
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as input_file:
        image_file.save(input_file.name)
        
        try:
            from gfpgan import GFPGANer
            
            # Read image
            img = cv2.imread(input_file.name, cv2.IMREAD_UNCHANGED)
            
            # Face enhancement
            face_enhancer = GFPGANer(
                model_path='GFPGANv1.4.pth',
                upscale=2,
                arch='clean',
                channel_multiplier=2,
                bg_upsampler=get_upsampler(2)
            )
            
            _, _, output = face_enhancer.enhance(img, has_aligned=False, only_center_face=False, paste_back=True)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as output_file:
                cv2.imwrite(output_file.name, output)
                
                return send_file(
                    output_file.name,
                    mimetype="image/png",
                    as_attachment=True,
                    download_name="face_enhanced.png"
                )
                
        except ImportError:
            return jsonify({"error": "GFPGAN not installed for face enhancement"}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            os.unlink(input_file.name)

if __name__ == "__main__":
    print("Starting RealESRGAN API server")
    print(f"GPU available: {torch.cuda.is_available()}")
    print("Listening on http://0.0.0.0:8070")
    app.run(host="0.0.0.0", port=8070)
