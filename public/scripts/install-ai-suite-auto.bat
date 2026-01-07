@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title MediaVault AI - Installation 1-clic
color 0B

REM ============================================================================
REM  MediaVault AI Suite - INSTALLATION 100%% AUTONOME
REM  Le script PowerShell est EMBARQUE directement - pas besoin de fichier PS1
REM ============================================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Demande des droits administrateur...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "AI_DIR=%USERPROFILE%\MediaVault-AI"
set "LOG_DIR=%AI_DIR%\logs"
if not exist "%AI_DIR%" mkdir "%AI_DIR%" >nul 2>&1
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

for /f "usebackq tokens=1 delims=." %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"`) do set "TS=%%i"
set "INSTALL_LOG=%LOG_DIR%\install-%TS%.log"
set "REPORT_FILE=%LOG_DIR%\report-%TS%.txt"

echo ==============================================================================
echo   MediaVault AI Suite - Installation 1-clic AUTONOME
echo ==============================================================================
echo Dossier: %AI_DIR%
echo.
echo [1/3] Installation des 8 services IA (15-30 min)...
echo.

REM ============================================================================
REM  INSTALLATION POWERSHELL EMBARQUEE
REM ============================================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$ErrorActionPreference = 'Continue'; $ProgressPreference = 'SilentlyContinue'; ^
$AI_DIR = '%AI_DIR%'; $LOG = '%INSTALL_LOG%'; ^
^
function Log($m) { Add-Content -Path $LOG -Value \"[$(Get-Date -f 'HH:mm:ss')] $m\"; Write-Host $m } ^
^
Log '=== INSTALLATION MEDIAVAULT AI ==='; ^
^
# Git ^
if (!(Get-Command git -EA SilentlyContinue)) { ^
    Log 'Installation Git...'; ^
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>$null; ^
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') ^
} ^
Log 'Git OK'; ^
^
# Python ^
$pyOK = $false; ^
try { $v = python --version 2>$null; if ($v -match '3\.(10|11|12|13|14)') { $pyOK = $true } } catch {} ^
if (!$pyOK) { ^
    Log 'Installation Python 3.11...'; ^
    winget install --id Python.Python.3.11 -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>$null; ^
    Start-Sleep 5; ^
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') ^
} ^
Log 'Python OK'; ^
^
# Ollama ^
if (!(Get-Command ollama -EA SilentlyContinue)) { ^
    Log 'Installation Ollama...'; ^
    winget install --id Ollama.Ollama -e --source winget --accept-package-agreements --accept-source-agreements --silent 2>$null; ^
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') ^
} ^
Log 'Ollama OK'; ^
^
# GPU ^
$GPU = 'cpu'; $TORCH = 'torch torchvision torchaudio'; ^
try { $nv = nvidia-smi 2>$null; if ($nv) { $GPU = 'nvidia'; $TORCH = 'torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121' } } catch {} ^
if ($GPU -eq 'cpu') { $arc = Get-CimInstance Win32_VideoController | Where { $_.Name -like '*Arc*' }; if ($arc) { $GPU = 'intel-arc' } } ^
Log \"GPU: $GPU\"; ^
^
Set-Location $AI_DIR; ^
^
# ComfyUI ^
if (!(Test-Path 'ComfyUI')) { ^
    Log '[2/8] ComfyUI...'; ^
    git clone https://github.com/comfyanonymous/ComfyUI.git 2>$null; ^
    Set-Location ComfyUI; ^
    python -m venv venv 2>$null; ^
    .\\venv\\Scripts\\pip install $TORCH --quiet 2>$null; ^
    .\\venv\\Scripts\\pip install -r requirements.txt --quiet 2>$null; ^
    Set-Location .. ^
} ^
Log 'ComfyUI OK'; ^
^
# Whisper ^
if (!(Test-Path 'whisper-api')) { ^
    Log '[3/8] Whisper...'; ^
    New-Item -ItemType Directory whisper-api -Force | Out-Null; ^
    Set-Location whisper-api; ^
    python -m venv venv 2>$null; ^
    .\\venv\\Scripts\\pip install openai-whisper flask flask-cors $TORCH --quiet 2>$null; ^
    @' ^
from flask import Flask, request, jsonify ^
from flask_cors import CORS ^
import whisper, tempfile, os ^
app = Flask(__name__) ^
CORS(app) ^
model = None ^
@app.route('/health') ^
def health(): return jsonify({'status':'ok','service':'whisper'}) ^
@app.route('/transcribe', methods=['POST']) ^
def transcribe(): ^
    global model ^
    if model is None: model = whisper.load_model('base') ^
    f = request.files['audio'] ^
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as t: ^
        f.save(t.name) ^
        r = model.transcribe(t.name) ^
        os.unlink(t.name) ^
        return jsonify(r) ^
if __name__ == '__main__': app.run(host='0.0.0.0', port=9000) ^
'@ | Out-File -FilePath 'whisper_server.py' -Encoding UTF8; ^
    Set-Location .. ^
} ^
Log 'Whisper OK'; ^
^
# XTTS ^
if (!(Test-Path 'xtts-api')) { ^
    Log '[4/8] XTTS...'; ^
    New-Item -ItemType Directory xtts-api -Force | Out-Null; ^
    Set-Location xtts-api; ^
    python -m venv venv 2>$null; ^
    .\\venv\\Scripts\\pip install TTS flask flask-cors --quiet 2>$null; ^
    @' ^
from flask import Flask, request, jsonify, send_file ^
from flask_cors import CORS ^
from TTS.api import TTS ^
import tempfile ^
app = Flask(__name__) ^
CORS(app) ^
tts = None ^
@app.route('/health') ^
def health(): return jsonify({'status':'ok','service':'xtts'}) ^
@app.route('/synthesize', methods=['POST']) ^
def synth(): ^
    global tts ^
    if tts is None: tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2') ^
    d = request.json ^
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as f: ^
        tts.tts_to_file(text=d.get('text',''), language=d.get('language','fr'), file_path=f.name) ^
        return send_file(f.name, mimetype='audio/wav') ^
if __name__ == '__main__': app.run(host='0.0.0.0', port=8020) ^
'@ | Out-File -FilePath 'xtts_server.py' -Encoding UTF8; ^
    Set-Location .. ^
} ^
Log 'XTTS OK'; ^
^
# MusicGen ^
if (!(Test-Path 'musicgen-api')) { ^
    Log '[5/8] MusicGen...'; ^
    New-Item -ItemType Directory musicgen-api -Force | Out-Null; ^
    Set-Location musicgen-api; ^
    python -m venv venv 2>$null; ^
    .\\venv\\Scripts\\pip install audiocraft flask flask-cors --quiet 2>$null; ^
    @' ^
from flask import Flask, request, jsonify, send_file ^
from flask_cors import CORS ^
import tempfile ^
app = Flask(__name__) ^
CORS(app) ^
model = None ^
@app.route('/health') ^
def health(): return jsonify({'status':'ok','service':'musicgen'}) ^
@app.route('/generate', methods=['POST']) ^
def gen(): ^
    global model ^
    from audiocraft.models import MusicGen ^
    import torchaudio ^
    if model is None: model = MusicGen.get_pretrained('facebook/musicgen-small') ^
    d = request.json ^
    model.set_generation_params(duration=min(d.get('duration',10),30)) ^
    wav = model.generate([d.get('prompt','ambient music')]) ^
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as f: ^
        torchaudio.save(f.name, wav[0].cpu(), 32000) ^
        return send_file(f.name, mimetype='audio/wav') ^
if __name__ == '__main__': app.run(host='0.0.0.0', port=8030) ^
'@ | Out-File -FilePath 'musicgen_server.py' -Encoding UTF8; ^
    Set-Location .. ^
} ^
Log 'MusicGen OK'; ^
^
# Demucs ^
if (!(Test-Path 'demucs-api')) { ^
    Log '[6/8] Demucs...'; ^
    New-Item -ItemType Directory demucs-api -Force | Out-Null; ^
    Set-Location demucs-api; ^
    python -m venv venv 2>$null; ^
    .\\venv\\Scripts\\pip install demucs flask flask-cors --quiet 2>$null; ^
    @' ^
from flask import Flask, request, jsonify, send_file ^
from flask_cors import CORS ^
import tempfile, os, subprocess, zipfile ^
app = Flask(__name__) ^
CORS(app) ^
@app.route('/health') ^
def health(): return jsonify({'status':'ok','service':'demucs'}) ^
@app.route('/separate', methods=['POST']) ^
def sep(): ^
    f = request.files['audio'] ^
    with tempfile.TemporaryDirectory() as d: ^
        inp = os.path.join(d,'input.mp3') ^
        f.save(inp) ^
        out = os.path.join(d,'out') ^
        subprocess.run(['demucs','-o',out,inp]) ^
        z = os.path.join(d,'stems.zip') ^
        with zipfile.ZipFile(z,'w') as zf: ^
            for r,ds,fs in os.walk(out): ^
                for fn in fs: zf.write(os.path.join(r,fn), fn) ^
        return send_file(z, mimetype='application/zip', as_attachment=True) ^
if __name__ == '__main__': app.run(host='0.0.0.0', port=8040) ^
'@ | Out-File -FilePath 'demucs_server.py' -Encoding UTF8; ^
    Set-Location .. ^
} ^
Log 'Demucs OK'; ^
^
# CLIP ^
if (!(Test-Path 'clip-api')) { ^
    Log '[7/8] CLIP...'; ^
    New-Item -ItemType Directory clip-api -Force | Out-Null; ^
    Set-Location clip-api; ^
    python -m venv venv 2>$null; ^
    .\\venv\\Scripts\\pip install clip-interrogator flask flask-cors pillow --quiet 2>$null; ^
    @' ^
from flask import Flask, request, jsonify ^
from flask_cors import CORS ^
from PIL import Image ^
import io ^
app = Flask(__name__) ^
CORS(app) ^
ci = None ^
@app.route('/health') ^
def health(): return jsonify({'status':'ok','service':'clip'}) ^
@app.route('/analyze', methods=['POST']) ^
def analyze(): ^
    global ci ^
    from clip_interrogator import Config, Interrogator ^
    if ci is None: ci = Interrogator(Config(clip_model_name='ViT-L-14/openai')) ^
    img = Image.open(io.BytesIO(request.files['image'].read())).convert('RGB') ^
    return jsonify({'description': ci.interrogate_fast(img)}) ^
if __name__ == '__main__': app.run(host='0.0.0.0', port=8060) ^
'@ | Out-File -FilePath 'clip_server.py' -Encoding UTF8; ^
    Set-Location .. ^
} ^
Log 'CLIP OK'; ^
^
# ESRGAN ^
if (!(Test-Path 'esrgan-api')) { ^
    Log '[8/8] ESRGAN...'; ^
    New-Item -ItemType Directory esrgan-api -Force | Out-Null; ^
    Set-Location esrgan-api; ^
    python -m venv venv 2>$null; ^
    .\\venv\\Scripts\\pip install realesrgan flask flask-cors pillow opencv-python --quiet 2>$null; ^
    @' ^
from flask import Flask, request, jsonify, send_file ^
from flask_cors import CORS ^
from PIL import Image ^
import io, tempfile, cv2, numpy as np ^
app = Flask(__name__) ^
CORS(app) ^
up = None ^
@app.route('/health') ^
def health(): return jsonify({'status':'ok','service':'esrgan'}) ^
@app.route('/upscale', methods=['POST']) ^
def upscale(): ^
    global up ^
    from realesrgan import RealESRGANer ^
    from basicsr.archs.rrdbnet_arch import RRDBNet ^
    if up is None: ^
        m = RRDBNet(num_in_ch=3,num_out_ch=3,num_feat=64,num_block=23,num_grow_ch=32,scale=4) ^
        up = RealESRGANer(scale=4, model_path='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth', model=m, half=True) ^
    img = np.array(Image.open(io.BytesIO(request.files['image'].read())).convert('RGB')) ^
    out, _ = up.enhance(cv2.cvtColor(img, cv2.COLOR_RGB2BGR), outscale=4) ^
    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as f: ^
        Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)).save(f.name) ^
        return send_file(f.name, mimetype='image/png') ^
if __name__ == '__main__': app.run(host='0.0.0.0', port=8070) ^
'@ | Out-File -FilePath 'esrgan_server.py' -Encoding UTF8; ^
    Set-Location .. ^
} ^
Log 'ESRGAN OK'; ^
^
# Scripts démarrage/arrêt ^
@' ^
@echo off ^
start \"Ollama\" /min ollama serve ^
timeout /t 3 /nobreak >nul ^
cd /d \"%AI_DIR%\\ComfyUI\" && start \"ComfyUI\" /min cmd /c \"venv\\Scripts\\python main.py --listen 0.0.0.0 --port 8188\" ^
for %%%%S in (whisper xtts musicgen demucs clip esrgan) do ( ^
    if exist \"%AI_DIR%\\%%%%S-api\\%%%%S_server.py\" ( ^
        cd /d \"%AI_DIR%\\%%%%S-api\" ^
        start \"%%%%S\" /min cmd /c \"venv\\Scripts\\python %%%%S_server.py\" ^
    ) ^
) ^
'@ -replace '%AI_DIR%',$AI_DIR | Out-File -FilePath 'start-ai-services.bat' -Encoding ASCII; ^
^
@' ^
@echo off ^
taskkill /F /IM ollama.exe 2>nul ^
taskkill /F /IM python.exe 2>nul ^
echo Services arretes. ^
'@ | Out-File -FilePath 'stop-ai-services.bat' -Encoding ASCII; ^
^
Log '=== INSTALLATION TERMINEE ==='"

set "PS_EXIT=%ERRORLEVEL%"
echo.
echo [2/3] Demarrage des services...

start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul

if exist "%AI_DIR%\ComfyUI\venv\Scripts\python.exe" (
    cd /d "%AI_DIR%\ComfyUI"
    start "ComfyUI" /min cmd /c "venv\Scripts\python main.py --listen 0.0.0.0 --port 8188"
)

for %%S in (whisper xtts musicgen demucs clip esrgan) do (
    if exist "%AI_DIR%\%%S-api\%%S_server.py" (
        cd /d "%AI_DIR%\%%S-api"
        start "%%S" /min cmd /c "venv\Scripts\python %%S_server.py"
    )
)

echo Attente demarrage (20s)...
timeout /t 20 /nobreak >nul

echo.
echo [3/3] Generation du rapport...

echo ═══════════════════════════════════════════════════════> "%REPORT_FILE%"
echo RAPPORT MEDIAVAULT AI - %date% %time%>> "%REPORT_FILE%"
echo ═══════════════════════════════════════════════════════>> "%REPORT_FILE%"
echo INSTALL DIR: %AI_DIR%>> "%REPORT_FILE%"
echo EXIT CODE: %PS_EXIT%>> "%REPORT_FILE%"
echo.>> "%REPORT_FILE%"

echo === PREREQUIS ===>> "%REPORT_FILE%"
where git >nul 2>&1 && (echo [OK] git>> "%REPORT_FILE%") || (echo [X] git>> "%REPORT_FILE%")
python --version >> "%REPORT_FILE%" 2>&1
ollama --version >> "%REPORT_FILE%" 2>&1
echo.>> "%REPORT_FILE%"

echo === GPU ===>> "%REPORT_FILE%"
powershell -Command "Get-CimInstance Win32_VideoController | Select Name | Format-List" >> "%REPORT_FILE%"

echo === DOSSIERS ===>> "%REPORT_FILE%"
if exist "%AI_DIR%\ComfyUI" (echo [OK] ComfyUI>> "%REPORT_FILE%") else (echo [X] ComfyUI>> "%REPORT_FILE%")
if exist "%AI_DIR%\whisper-api" (echo [OK] whisper-api>> "%REPORT_FILE%") else (echo [X] whisper-api>> "%REPORT_FILE%")
if exist "%AI_DIR%\xtts-api" (echo [OK] xtts-api>> "%REPORT_FILE%") else (echo [X] xtts-api>> "%REPORT_FILE%")
if exist "%AI_DIR%\musicgen-api" (echo [OK] musicgen-api>> "%REPORT_FILE%") else (echo [X] musicgen-api>> "%REPORT_FILE%")
if exist "%AI_DIR%\demucs-api" (echo [OK] demucs-api>> "%REPORT_FILE%") else (echo [X] demucs-api>> "%REPORT_FILE%")
if exist "%AI_DIR%\clip-api" (echo [OK] clip-api>> "%REPORT_FILE%") else (echo [X] clip-api>> "%REPORT_FILE%")
if exist "%AI_DIR%\esrgan-api" (echo [OK] esrgan-api>> "%REPORT_FILE%") else (echo [X] esrgan-api>> "%REPORT_FILE%")
echo.>> "%REPORT_FILE%"

echo === SERVICES HTTP ===>> "%REPORT_FILE%"
call :Chk "Ollama" "http://localhost:11434/api/tags"
call :Chk "ComfyUI" "http://localhost:8188/system_stats"
call :Chk "Whisper" "http://localhost:9000/health"
call :Chk "XTTS" "http://localhost:8020/health"
call :Chk "MusicGen" "http://localhost:8030/health"
call :Chk "Demucs" "http://localhost:8040/health"
call :Chk "CLIP" "http://localhost:8060/health"
call :Chk "ESRGAN" "http://localhost:8070/health"
echo.>> "%REPORT_FILE%"

echo === LOG INSTALL ===>> "%REPORT_FILE%"
if exist "%INSTALL_LOG%" (powershell -Command "Get-Content -Tail 20 '%INSTALL_LOG%'" >> "%REPORT_FILE%") else (echo [Vide]>> "%REPORT_FILE%")

echo.
echo ==============================================================================
type "%REPORT_FILE%"
echo ==============================================================================
echo Rapport: %REPORT_FILE%
echo.

choice /C OC /M "Ouvrir (O) ou Copier (C)"
if %ERRORLEVEL%==1 notepad "%REPORT_FILE%"
if %ERRORLEVEL%==2 powershell -Command "Get-Content -Raw '%REPORT_FILE%' | Set-Clipboard" & echo Copie!

pause
exit /b 0

:Chk
set "N=%~1"
set "U=%~2"
for /f %%c in ('powershell -Command "try{(Invoke-WebRequest -Uri '%U%' -TimeoutSec 5 -UseBasicParsing).StatusCode}catch{0}"') do set "C=%%c"
if "%C%"=="200" (echo [OK] %N%>> "%REPORT_FILE%") else (echo [X] %N%>> "%REPORT_FILE%")
exit /b 0
