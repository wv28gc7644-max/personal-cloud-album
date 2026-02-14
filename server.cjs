/**
 * MediaVault - Serveur Local avec API IA Complète
 * ================================================
 * Ce serveur gère les médias locaux ET tous les moteurs IA
 * 
 * INSTRUCTIONS:
 * 1. Modifiez MEDIA_FOLDER avec le chemin de vos médias
 * 2. Lancez: node server.cjs
 * 3. Ouvrez http://localhost:3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION - MODIFIEZ CES VALEURS
// ═══════════════════════════════════════════════════════════════════

let MEDIA_FOLDER = process.env.MEDIAVAULT_MEDIA_FOLDER || 'C:\MediaVault\media';
const PORT = 3001;
const DIST_FOLDER = path.join(__dirname, 'dist');
const DATA_FILE = path.join(__dirname, 'data.json');
const LOG_FILE = path.join(__dirname, 'ai-logs.json');

// Résolution robuste du dossier média (évite que le serveur refuse de démarrer)
const resolveMediaFolder = () => {
  const candidates = [];

  // 1) Variable d'environnement
  if (process.env.MEDIAVAULT_MEDIA_FOLDER) candidates.push(process.env.MEDIAVAULT_MEDIA_FOLDER);

  // 2) Valeur par défaut (peut être un placeholder)
  if (MEDIA_FOLDER) candidates.push(MEDIA_FOLDER);

  // 3) Dossiers utilisateur classiques
  const userProfile = process.env.USERPROFILE || '';
  if (userProfile) {
    candidates.push(path.join(userProfile, 'Videos'));
    candidates.push(path.join(userProfile, 'Pictures'));
    candidates.push(path.join(userProfile, 'Desktop'));
    candidates.push(path.join(userProfile, 'Downloads'));
  }

  // 4) Fallback interne MediaVault-AI
  const fallback = path.join(userProfile || __dirname, 'MediaVault-AI', 'media');
  candidates.push(fallback);

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }

  // Si rien n'existe, on crée le fallback
  try {
    fs.mkdirSync(fallback, { recursive: true });
  } catch {
    // ignore
  }
  return fallback;
};

MEDIA_FOLDER = resolveMediaFolder();

// Buffer circulaire pour les logs (max 1000 entrées)
let logsBuffer = [];
const MAX_LOGS = 1000;

const addLog = (level, service, message) => {
  const entry = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level,
    service,
    message
  };
  logsBuffer.push(entry);
  if (logsBuffer.length > MAX_LOGS) {
    logsBuffer = logsBuffer.slice(-MAX_LOGS);
  }
  return entry;
};

// URLs des services IA locaux
const AI_CONFIG = {
  ollama: 'http://localhost:11434',
  comfyui: 'http://localhost:8188',
  whisper: 'http://localhost:9000',
  xtts: 'http://localhost:8020',
  musicgen: 'http://localhost:9001',
  demucs: 'http://localhost:9002',
  clip: 'http://localhost:9003',
  esrgan: 'http://localhost:9004',
  insightface: 'http://localhost:8050',
  animatediff: 'http://localhost:8070',
  lipsync: 'http://localhost:8080',
  rife: 'http://localhost:8090',
};

// ═══════════════════════════════════════════════════════════════════
// VÉRIFICATIONS AU DÉMARRAGE
// ═══════════════════════════════════════════════════════════════════

if (!fs.existsSync(MEDIA_FOLDER)) {
  // Ne plus bloquer le démarrage : on crée un dossier fallback et on continue.
  const userProfile = process.env.USERPROFILE || __dirname;
  const fallback = path.join(userProfile, 'MediaVault-AI', 'media');
  try {
    fs.mkdirSync(fallback, { recursive: true });
    MEDIA_FOLDER = fallback;
  } catch {
    // dernier recours : dossier du projet
    MEDIA_FOLDER = __dirname;
  }
  console.warn('⚠️ MEDIA_FOLDER introuvable, fallback activé:', MEDIA_FOLDER);
  addLog('warn', 'server', `MEDIA_FOLDER introuvable, fallback: ${MEDIA_FOLDER}`);
}

// Créer le fichier de données s'il n'existe pas
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tags: [], playlists: [], media: [] }, null, 2));
}

// ═══════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════

const getMimeType = (ext) => {
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
};

const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
};

const proxyRequest = async (targetUrl, method, body, headers = {}) => {
  const https = targetUrl.startsWith('https') ? require('https') : require('http');
  const url = new URL(targetUrl);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// ═══════════════════════════════════════════════════════════════════
// SERVEUR HTTP
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// ÉTAT DE MISE À JOUR (mode maintenance)
// ═══════════════════════════════════════════════════════════════════
let isUpdating = false;
const UPDATE_PROGRESS_FILE = path.join(__dirname, 'update-progress.json');

const getUpdateProgress = () => {
  try {
    if (fs.existsSync(UPDATE_PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(UPDATE_PROGRESS_FILE, 'utf8'));
    }
  } catch {}
  return { step: 0, percent: 0, status: 'En attente...', complete: false };
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── Middleware maintenance : bloquer tout sauf /api/update/status ──
  if (isUpdating && pathname !== '/api/update/status' && pathname !== '/api/health') {
    const progress = getUpdateProgress();
    if (progress.complete) {
      isUpdating = false;
    } else {
      const maintenancePath = path.join(__dirname, 'dist', 'maintenance.html');
      const fallbackPath = path.join(__dirname, 'public', 'maintenance.html');
      const htmlPath = fs.existsSync(maintenancePath) ? maintenancePath : fallbackPath;
      try {
        const html = fs.readFileSync(htmlPath, 'utf8');
        res.writeHead(503, { 'Content-Type': 'text/html', 'Retry-After': '10' });
        return res.end(html);
      } catch {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        return res.end('Mise à jour en cours, veuillez patienter...');
      }
    }
  }

  try {
    // ═══════════════════════════════════════════════════════════════
    // API: Santé et Status
    // ═══════════════════════════════════════════════════════════════
    
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', folder: MEDIA_FOLDER }));
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Miniatures en résolution réduite (Solution 1)
    // ═══════════════════════════════════════════════════════════════

    if (pathname.startsWith('/api/thumbnail/')) {
      // Semaphore: limit concurrent thumbnail generation
      if (typeof global.__thumbActive === 'undefined') global.__thumbActive = 0;
      if (global.__thumbActive >= 10) {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '2' });
        return res.end(JSON.stringify({ error: 'Trop de requêtes de miniatures simultanées' }));
      }
      global.__thumbActive++;
      try {
        const encodedPath = pathname.slice('/api/thumbnail/'.length);
        const filePath = Buffer.from(encodedPath, 'base64url').toString('utf8');
        const normalizedFilePath = path.normalize(filePath);

        if (!fs.existsSync(normalizedFilePath) || !fs.statSync(normalizedFilePath).isFile()) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Fichier introuvable' }));
        }

        const ext = path.extname(normalizedFilePath).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'].includes(ext);
        const isVideo = ['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext);

        // Thumbnail cache directory
        const cacheDir = path.join(__dirname, '.thumbnail-cache');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }

        const hash = Buffer.from(normalizedFilePath).toString('base64url').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
        const cachePath = path.join(cacheDir, hash + '.jpg');

        // Serve from cache if available
        if (fs.existsSync(cachePath)) {
          const stat = fs.statSync(cachePath);
          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': stat.size,
            'Cache-Control': 'public, max-age=31536000, immutable'
          });
          return fs.createReadStream(cachePath).pipe(res);
        }

        if (isImage) {
          // Try to use sharp for resized thumbnails
          try {
            const sharp = require('sharp');
            const buffer = await sharp(normalizedFilePath)
              .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 75 })
              .toBuffer();
            fs.writeFileSync(cachePath, buffer);
            res.writeHead(200, {
              'Content-Type': 'image/jpeg',
              'Content-Length': buffer.length,
              'Cache-Control': 'public, max-age=31536000, immutable'
            });
            return res.end(buffer);
          } catch {
            // sharp not available, serve original with aggressive caching
            const stat = fs.statSync(normalizedFilePath);
            res.writeHead(200, {
              'Content-Type': getMimeType(ext),
              'Content-Length': stat.size,
              'Cache-Control': 'public, max-age=31536000'
            });
            return fs.createReadStream(normalizedFilePath).pipe(res);
          }
        }

        if (isVideo) {
          // For videos, try ffmpeg to extract a frame
          const ffmpegPath = (() => {
            try {
              const userProfile = process.env.USERPROFILE || '';
              const installRoot = path.join(userProfile, 'MediaVault-AI', 'ffmpeg');
              if (fs.existsSync(installRoot)) {
                const dirs = fs.readdirSync(installRoot).filter(d => {
                  try { return fs.statSync(path.join(installRoot, d)).isDirectory() && d.startsWith('ffmpeg'); } catch { return false; }
                });
                if (dirs.length > 0) {
                  const exe = path.join(installRoot, dirs[0], 'bin', 'ffmpeg.exe');
                  if (fs.existsSync(exe)) return exe;
                }
              }
            } catch {}
            return 'ffmpeg'; // fallback to PATH
          })();

          try {
            await new Promise((resolve, reject) => {
              exec(`"${ffmpegPath}" -i "${normalizedFilePath}" -ss 00:00:01 -vframes 1 -vf "scale=400:-2" -q:v 5 "${cachePath}" -y`,
                { timeout: 15000 },
                (error) => error ? reject(error) : resolve()
              );
            });
            if (fs.existsSync(cachePath)) {
              const stat = fs.statSync(cachePath);
              res.writeHead(200, {
                'Content-Type': 'image/jpeg',
                'Content-Length': stat.size,
                'Cache-Control': 'public, max-age=31536000, immutable'
              });
              return fs.createReadStream(cachePath).pipe(res);
            }
          } catch {
            // ffmpeg failed, return a placeholder or 204
          }

          // No thumbnail possible, return 204
          res.writeHead(204);
          return res.end();
        }

        // Unsupported type
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Type non supporté pour miniature' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      } finally {
        global.__thumbActive--;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Révéler un fichier dans l'explorateur natif (Solution 4)
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/reveal-in-explorer' && req.method === 'POST') {
      const body = await parseBody(req);
      const filePath = body.path;

      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Chemin requis' }));
      }

      const normalizedFilePath = path.normalize(filePath);
      const platform = process.platform;

      try {
        if (platform === 'win32') {
          const winPath = normalizedFilePath.replace(/\//g, '\\');
          exec('C:\\Windows\\explorer.exe /select,"' + winPath + '"', (err) => {
            if (err) {
              console.error('reveal-in-explorer error:', err.message);
              addLog('error', 'server', `reveal-in-explorer: ${err.message}`);
            }
          });
        } else if (platform === 'darwin') {
          exec(`open -R "${normalizedFilePath}"`, (err) => {
            if (err) { console.error('reveal-in-explorer error:', err.message); addLog('error', 'server', `reveal-in-explorer: ${err.message}`); }
          });
        } else {
          const parentDir = path.dirname(normalizedFilePath);
          exec(`xdg-open "${parentDir}"`, (err) => {
            if (err) { console.error('reveal-in-explorer error:', err.message); addLog('error', 'server', `reveal-in-explorer: ${err.message}`); }
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error('reveal-in-explorer exception:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Vérifier/Installer Sharp + Cache stats
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/check-sharp' && req.method === 'GET') {
      try {
        require('sharp');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ installed: true }));
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ installed: false }));
      }
    }

    if (pathname === '/api/install-sharp' && req.method === 'POST') {
      try {
        addLog('info', 'server', 'Installation de sharp en cours...');
        const child = exec('npm install sharp', { cwd: __dirname, timeout: 120000 }, (error, stdout, stderr) => {
          if (error) {
            addLog('error', 'server', `Erreur installation sharp: ${error.message}`);
          } else {
            addLog('info', 'server', 'sharp installé avec succès');
          }
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ started: true, message: 'Installation lancée. Redémarrez le serveur après.' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    if (pathname === '/api/cache-stats' && req.method === 'GET') {
      const cacheDir = path.join(__dirname, '.thumbnail-cache');
      try {
        if (!fs.existsSync(cacheDir)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ files: 0, sizeBytes: 0, sizeFormatted: '0 B' }));
        }
        const files = fs.readdirSync(cacheDir);
        let totalSize = 0;
        for (const f of files) {
          try { totalSize += fs.statSync(path.join(cacheDir, f)).size; } catch {}
        }
        const fmt = totalSize < 1024 ? totalSize + ' B' : totalSize < 1048576 ? (totalSize / 1024).toFixed(1) + ' KB' : (totalSize / 1048576).toFixed(1) + ' MB';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ files: files.length, sizeBytes: totalSize, sizeFormatted: fmt }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    if (pathname === '/api/cache' && req.method === 'DELETE') {
      const cacheDir = path.join(__dirname, '.thumbnail-cache');
      try {
        if (fs.existsSync(cacheDir)) {
          const files = fs.readdirSync(cacheDir);
          for (const f of files) {
            try { fs.unlinkSync(path.join(cacheDir, f)); } catch {}
          }
        }
        addLog('info', 'server', 'Cache des miniatures vidé');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // Rapport diagnostic exportable (à envoyer au support)
    if (pathname === '/api/debug/report' && req.method === 'GET') {
      const now = new Date();
      const userProfile = process.env.USERPROFILE || '';
      const logsDir = path.join(userProfile || __dirname, 'MediaVault-AI', 'logs');
      try {
        fs.mkdirSync(logsDir, { recursive: true });
      } catch {
        // ignore
      }

      const safeExec = (cmd) =>
        new Promise((resolve) => {
          exec(cmd, { timeout: 4000 }, (error, stdout, stderr) => {
            resolve({ ok: !error, error: error?.message || null, stdout: String(stdout || ''), stderr: String(stderr || '') });
          });
        });

      // Vérif FFmpeg (PATH + fallback MediaVault-AI)
      let ffmpeg = { installed: false, version: null, source: null, path: null, error: null };
      const viaPath = await safeExec('ffmpeg -version');
      if (viaPath.ok) {
        const m = viaPath.stdout.match(/ffmpeg version ([^\s]+)/);
        ffmpeg = { installed: true, version: m ? m[1] : 'unknown', source: 'PATH', path: null, error: null };
      } else {
        try {
          const installRoot = path.join(userProfile, 'MediaVault-AI', 'ffmpeg');
          if (fs.existsSync(installRoot)) {
            const dirs = fs.readdirSync(installRoot).filter(d => {
              try {
                return fs.statSync(path.join(installRoot, d)).isDirectory() && d.startsWith('ffmpeg');
              } catch {
                return false;
              }
            });
            if (dirs.length > 0) {
              const binDir = path.join(installRoot, dirs[0], 'bin');
              const ffmpegExe = path.join(binDir, 'ffmpeg.exe');
              if (fs.existsSync(ffmpegExe)) {
                const viaExe = await safeExec(`"${ffmpegExe}" -version`);
                if (viaExe.ok) {
                  const m = viaExe.stdout.match(/ffmpeg version ([^\s]+)/);
                  ffmpeg = { installed: true, version: m ? m[1] : 'unknown', source: 'mediavault-install', path: binDir, error: null };
                } else {
                  ffmpeg = { installed: false, version: null, source: 'mediavault-install', path: binDir, error: viaExe.error || 'ffmpeg.exe not executable' };
                }
              }
            }
          }
        } catch (e) {
          ffmpeg.error = e?.message || String(e);
        }
        if (!ffmpeg.installed) ffmpeg.error = ffmpeg.error || viaPath.error || 'ffmpeg not found';
      }

      const report = {
        generatedAt: now.toISOString(),
        port: PORT,
        mediaFolder: MEDIA_FOLDER,
        mediaFolderExists: (() => {
          try { return fs.existsSync(MEDIA_FOLDER); } catch { return false; }
        })(),
        cwd: process.cwd(),
        projectDir: __dirname,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        env: {
          USERPROFILE: process.env.USERPROFILE || null,
          MEDIAVAULT_MEDIA_FOLDER: process.env.MEDIAVAULT_MEDIA_FOLDER || null,
          PATH_length: (process.env.PATH || '').length
        },
        ffmpeg
      };

      const stamp = now.toISOString().replace(/[:.]/g, '-');
      const filename = `mediavault-diagnostic-${stamp}.json`;
      const filePath = path.join(logsDir, filename);
      try {
        fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
      } catch {
        // ignore
      }

      addLog('info', 'server', `Diagnostic généré: ${filename}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ...report, savedTo: filePath }));
    }
    if (pathname === '/api/ai/status') {
      // Multi-port configuration: Windows/BAT ports first, then Docker ports
      const SERVICE_PORT_CANDIDATES = {
        ollama: [11434],
        comfyui: [8188],
        whisper: [9000],
        xtts: [8020],
        musicgen: [9001, 8030], // Windows, Docker
        demucs: [9002, 8040],
        clip: [9003, 8060],
        esrgan: [9004, 8070]
      };

      const HEALTH_ENDPOINTS = {
        ollama: '/api/tags',
        comfyui: '/system_stats',
        whisper: '/health',
        xtts: '/health',
        musicgen: '/health',
        demucs: '/health',
        clip: '/health',
        esrgan: '/health'
      };
      
      const statuses = {};
      
      // Check each service, trying multiple ports
      const checks = Object.entries(SERVICE_PORT_CANDIDATES).map(async ([name, ports]) => {
        const endpoint = HEALTH_ENDPOINTS[name] || '/health';
        
        for (const port of ports) {
          const startTime = Date.now();
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(`http://localhost:${port}${endpoint}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const latencyMs = Date.now() - startTime;
            
            if (response.ok) {
              statuses[name] = { 
                ok: true, 
                latencyMs, 
                port,
                url: `http://localhost:${port}`
              };
              addLog('info', name, `Service en ligne sur :${port} (${latencyMs}ms)`);
              return; // Found working port, stop checking
            }
          } catch (err) {
            // Continue to next port
          }
        }
        
        // All ports failed
        statuses[name] = { 
          ok: false, 
          error: `Aucun port actif (${ports.join('/')})`,
          ports // Return attempted ports for debugging
        };
      });
      
      await Promise.all(checks);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(statuses));
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Vérification des installations IA
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/check-installed' && req.method === 'GET') {
      const checkCommand = (cmd) => {
        return new Promise((resolve) => {
          exec(cmd, (error, stdout) => {
            resolve({ installed: !error, version: stdout?.trim() || null });
          });
        });
      };

      const checkPath = (p) => {
        return { installed: fs.existsSync(p), path: p };
      };

      const results = {
        ollama: await checkCommand('ollama --version'),
        python: await checkCommand('python --version'),
        pip: await checkCommand('pip --version'),
        git: await checkCommand('git --version'),
        comfyui: checkPath(path.join(process.env.USERPROFILE || '', 'ComfyUI')),
        whisper: checkPath(path.join(__dirname, 'docker', 'whisper')),
        xtts: checkPath(path.join(__dirname, 'docker', 'xtts')),
        demucs: checkPath(path.join(__dirname, 'docker', 'demucs')),
        esrgan: checkPath(path.join(__dirname, 'docker', 'esrgan')),
        musicgen: checkPath(path.join(__dirname, 'docker', 'musicgen')),
        clip: checkPath(path.join(__dirname, 'docker', 'clip')),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(results));
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Logs des services IA
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/logs' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ logs: logsBuffer }));
    }

    if (pathname === '/api/ai/logs' && req.method === 'DELETE') {
      logsBuffer = [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Dernier log d'installation (pour diagnostic)
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/install-logs' && req.method === 'GET') {
      const logsDir = path.join(process.env.USERPROFILE || '', 'MediaVault-AI', 'logs');
      
      try {
        if (!fs.existsSync(logsDir)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Dossier logs introuvable', path: logsDir }));
        }
        
        // Trouver tous les fichiers log
        const logFiles = fs.readdirSync(logsDir)
          .filter(f => f.endsWith('.log') || f.endsWith('.txt'))
          .map(f => ({
            name: f,
            path: path.join(logsDir, f),
            mtime: fs.statSync(path.join(logsDir, f)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime);
        
        if (logFiles.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Aucun fichier log trouvé', path: logsDir }));
        }
        
        // Retourner le dernier log
        const latestLog = logFiles[0];
        const content = fs.readFileSync(latestLog.path, 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          filename: latestLog.name,
          path: latestLog.path,
          modified: latestLog.mtime.toISOString(),
          content: content,
          allLogs: logFiles.map(f => ({ name: f.name, modified: f.mtime.toISOString() }))
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }


    // ═══════════════════════════════════════════════════════════════
    // API: Webhooks de notification
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/webhooks/send' && req.method === 'POST') {
      const body = await parseBody(req);
      const { type, webhookUrl, payload } = body;
      
      try {
        if (type === 'discord') {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else if (type === 'telegram') {
          const { botToken, chatId, message } = payload;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
          });
        }
        addLog('info', 'server', `Webhook ${type} envoyé avec succès`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        addLog('error', 'server', `Erreur webhook ${type}: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Gestion des données (tags, playlists, médias)
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/data' && req.method === 'GET') {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    }

    if (pathname === '/api/data' && req.method === 'POST') {
      const body = await parseBody(req);
      fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Fichiers médias
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/files') {
      const isSupported = (name) => /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|mp3|wav)$/i.test(name);
      const listFiles = (dir, baseDir) => {
        const out = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              out.push(...listFiles(abs, baseDir));
            } else if (entry.isFile() && isSupported(entry.name)) {
              const rel = path.relative(baseDir, abs);
              const stats = fs.statSync(abs);
              const ext = path.extname(entry.name).toLowerCase();
              const urlPath = rel.split(path.sep).map(encodeURIComponent).join('/');
              const encodedAbsPath = Buffer.from(abs).toString('base64url');
              out.push({
                name: rel,
                url: `http://localhost:${PORT}/media/${urlPath}`,
                thumbnailUrl: `http://localhost:${PORT}/api/thumbnail/${encodedAbsPath}`,
                size: stats.size,
                type: ['.mp4', '.webm', '.mov'].includes(ext) ? 'video' : 
                      ['.mp3', '.wav'].includes(ext) ? 'audio' : 'image',
                createdAt: stats.birthtime.toISOString()
              });
            }
          }
        } catch (e) {
          console.error('Erreur listFiles:', e.message);
        }
        return out;
      };
      const files = listFiles(MEDIA_FOLDER, MEDIA_FOLDER);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(files));
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Ouvrir un sélecteur de dossier natif
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/browse-folder' && req.method === 'POST') {
      const platform = process.platform;
      let cmd;

      if (platform === 'win32') {
        // PowerShell: ouvre un dialog de sélection de dossier natif Windows
        cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Sélectionnez un dossier média'; $f.ShowNewFolderButton = $false; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath } else { '' }"`;
      } else if (platform === 'darwin') {
        // macOS: utilise osascript
        cmd = `osascript -e 'POSIX path of (choose folder with prompt "Sélectionnez un dossier média")'`;
      } else {
        // Linux: zenity ou kdialog
        cmd = `zenity --file-selection --directory --title="Sélectionnez un dossier média" 2>/dev/null || kdialog --getexistingdirectory ~ 2>/dev/null`;
      }

      try {
        const result = await new Promise((resolve, reject) => {
          exec(cmd, { timeout: 120000 }, (error, stdout) => {
            if (error) {
              // L'utilisateur a annulé ou erreur
              resolve('');
            } else {
              resolve(stdout.trim());
            }
          });
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ path: result || '' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Scanner un dossier externe (lier sans copier)
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/scan-folder' && req.method === 'POST') {
      const body = await parseBody(req);
      const folderPath = body.path;
      
      if (!folderPath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Chemin du dossier requis' }));
      }

      const normalizedPath = path.normalize(folderPath);
      
      if (!fs.existsSync(normalizedPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: `Dossier introuvable: ${normalizedPath}` }));
      }

      const stats = fs.statSync(normalizedPath);
      if (!stats.isDirectory()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Le chemin spécifié n\'est pas un dossier' }));
      }

      const isSupported = (name) => /\.(jpg|jpeg|png|gif|webp|bmp|tiff|mp4|webm|mov|avi|mkv|mp3|wav|flac|ogg)$/i.test(name);
      
      const scanFolder = (dir, baseDir, maxDepth = 10, currentDepth = 0) => {
        if (currentDepth > maxDepth) return [];
        const out = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              out.push(...scanFolder(abs, baseDir, maxDepth, currentDepth + 1));
            } else if (entry.isFile() && isSupported(entry.name)) {
              const rel = path.relative(baseDir, abs);
              const fileStats = fs.statSync(abs);
              const ext = path.extname(entry.name).toLowerCase();
              // Encode the absolute path for serving via /linked-media/
              const encodedAbsPath = Buffer.from(abs).toString('base64url');
              out.push({
                name: entry.name,
                relativePath: rel,
                absolutePath: abs,
                folder: path.relative(baseDir, dir) || '.',
                url: `http://localhost:${PORT}/linked-media/${encodedAbsPath}`,
                thumbnailUrl: `http://localhost:${PORT}/api/thumbnail/${encodedAbsPath}`,
                size: fileStats.size,
                type: ['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext) ? 'video' : 
                      ['.mp3', '.wav', '.flac', '.ogg'].includes(ext) ? 'audio' : 'image',
                createdAt: fileStats.birthtime.toISOString(),
                modifiedAt: fileStats.mtime.toISOString()
              });
            }
          }
        } catch (e) {
          console.error('Erreur scan dossier:', e.message);
        }
        return out;
      };

      const files = scanFolder(normalizedPath, normalizedPath);
      const folders = [...new Set(files.map(f => f.folder))].sort();
      
      addLog('info', 'server', `Scan dossier: ${normalizedPath} → ${files.length} fichiers trouvés`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        path: normalizedPath,
        totalFiles: files.length,
        folders,
        files,
        stats: {
          images: files.filter(f => f.type === 'image').length,
          videos: files.filter(f => f.type === 'video').length,
          audio: files.filter(f => f.type === 'audio').length,
          totalSize: files.reduce((acc, f) => acc + f.size, 0)
        }
      }));
    }

    // API: Lister les dossiers liés sauvegardés
    if (pathname === '/api/linked-folders' && req.method === 'GET') {
      try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(data.linkedFolders || []));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify([]));
      }
    }

    // API: Sauvegarder un dossier lié
    if (pathname === '/api/linked-folders' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!data.linkedFolders) data.linkedFolders = [];
        
        // Éviter les doublons
        const exists = data.linkedFolders.find(f => f.path === body.path);
        if (!exists) {
          data.linkedFolders.push({
            id: Date.now().toString(),
            path: body.path,
            name: body.name || path.basename(body.path),
            addedAt: new Date().toISOString(),
            fileCount: body.fileCount || 0
          });
          fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // API: Supprimer un dossier lié
    if (pathname === '/api/linked-folders' && req.method === 'DELETE') {
      const body = await parseBody(req);
      try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (data.linkedFolders) {
          data.linkedFolders = data.linkedFolders.filter(f => f.id !== body.id && f.path !== body.path);
          fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Mise à jour et Restauration
    // ═══════════════════════════════════════════════════════════════

    // GET /api/update/status - Progression de la mise à jour
    if (pathname === '/api/update/status' && req.method === 'GET') {
      const progress = getUpdateProgress();
      if (progress.complete) {
        isUpdating = false;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ updating: isUpdating, ...progress }));
    }

    if (pathname === '/api/update' && req.method === 'POST') {
      const body = await parseBody(req);
      const silent = body.silent === true;
      const updateScript = path.join(__dirname, 'Mettre a jour MediaVault.bat');
      if (fs.existsSync(updateScript)) {
        // Initialiser le fichier de progression
        try {
          fs.writeFileSync(UPDATE_PROGRESS_FILE, JSON.stringify({
            step: 0, percent: 0, status: 'Démarrage de la mise à jour...', complete: false
          }));
        } catch {}

        isUpdating = true;
        addLog('info', 'update', `Mise à jour lancée (mode ${silent ? 'silencieux' : 'terminal'})`);

        if (silent) {
          // Mode silencieux : PowerShell en arrière-plan, pas de fenêtre
          const psCmd = `powershell -WindowStyle Hidden -Command "& cmd /c '${updateScript.replace(/'/g, "''")}'"`; 
          exec(psCmd, { cwd: __dirname }, (err) => {
            if (err) {
              addLog('error', 'update', `Erreur mise à jour silencieuse: ${err.message}`);
            }
          });
        } else {
          exec(`start cmd /c "${updateScript}"`, (err) => {
            if (err) {
              addLog('error', 'update', `Erreur mise à jour: ${err.message}`);
            }
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'Mise à jour lancée', silent }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Script de mise à jour introuvable' }));
      }
    }

    if (pathname === '/api/restore' && req.method === 'POST') {
      const body = await parseBody(req);
      const version = body.version;
      if (!version) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Version requise' }));
      }
      exec(`git checkout ${version}`, { cwd: __dirname }, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: err.message }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Restauration vers ${version}` }));
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // API: OLLAMA - Génération de texte
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/ollama/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      addLog('info', 'ollama', `Génération de texte: ${body.prompt?.substring(0, 50)}...`);
      try {
        const result = await proxyRequest(`${AI_CONFIG.ollama}/api/generate`, 'POST', body);
        addLog('info', 'ollama', 'Génération terminée');
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'ollama', `Erreur: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Ollama non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/ollama/chat' && req.method === 'POST') {
      const body = await parseBody(req);
      addLog('info', 'ollama', 'Chat démarré');
      try {
        const result = await proxyRequest(`${AI_CONFIG.ollama}/api/chat`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Ollama non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/ollama/models') {
      try {
        const result = await proxyRequest(`${AI_CONFIG.ollama}/api/tags`, 'GET');
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Ollama non disponible' }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: COMFYUI - Génération d'images
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/comfyui/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.comfyui}/prompt`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ComfyUI non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/comfyui/history') {
      try {
        const result = await proxyRequest(`${AI_CONFIG.comfyui}/history`, 'GET');
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ComfyUI non disponible' }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: WHISPER - Transcription audio
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/whisper/transcribe' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.whisper}/transcribe`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Whisper non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: XTTS - Clonage vocal
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/xtts/synthesize' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.xtts}/tts_to_audio`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'XTTS non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/xtts/clone' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.xtts}/clone_speaker`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'XTTS non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: MUSICGEN - Génération de musique
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/musicgen/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.musicgen}/generate`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'MusicGen non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: DEMUCS - Séparation de pistes audio
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/demucs/separate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.demucs}/separate`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Demucs non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: INSIGHTFACE - Reconnaissance faciale
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/insightface/detect' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.insightface}/detect`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'InsightFace non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/insightface/recognize' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.insightface}/recognize`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'InsightFace non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: CLIP - Recherche sémantique et tagging
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/clip/embed' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.clip}/embed`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'CLIP non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/clip/search' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.clip}/search`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'CLIP non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/clip/classify' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.clip}/classify`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'CLIP non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: ANIMATEDIFF - Génération vidéo
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/animatediff/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.animatediff}/generate`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'AnimateDiff non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/animatediff/img2vid' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.animatediff}/img2vid`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'AnimateDiff non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: LIPSYNC - Synchronisation labiale
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/lipsync/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.lipsync}/generate`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'LipSync non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: RIFE - Interpolation de frames
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/rife/interpolate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.rife}/interpolate`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'RIFE non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: ESRGAN - Upscaling d'images
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/esrgan/upscale' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(`${AI_CONFIG.esrgan}/upscale`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ESRGAN non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Workflows et Batch Processing
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/workflow/execute' && req.method === 'POST') {
      const body = await parseBody(req);
      const { steps } = body;
      const results = [];
      
      for (const step of steps) {
        try {
          const serviceUrl = AI_CONFIG[step.service];
          if (!serviceUrl) {
            results.push({ step: step.id, error: `Service ${step.service} inconnu` });
            continue;
          }
          const result = await proxyRequest(`${serviceUrl}${step.endpoint}`, 'POST', step.params);
          results.push({ step: step.id, success: true, data: result.data });
        } catch (e) {
          results.push({ step: step.id, error: e.message });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ results }));
    }

    // Exécuter une seule étape de workflow
    if (pathname === '/api/workflow/run-step' && req.method === 'POST') {
      const body = await parseBody(req);
      const { service, endpoint, params } = body;
      
      try {
        const serviceUrl = AI_CONFIG[service];
        if (!serviceUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `Service ${service} inconnu` }));
        }
        
        addLog('info', 'workflow', `Exécution étape: ${service}${endpoint}`);
        const result = await proxyRequest(`${serviceUrl}${endpoint}`, 'POST', params);
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'workflow', `Échec étape ${service}: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: INPAINTING/OUTPAINTING - Édition d'images via ComfyUI
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/image/inpaint' && req.method === 'POST') {
      const body = await parseBody(req);
      const { image, mask, prompt, negativePrompt } = body;
      
      try {
        // Workflow ComfyUI pour inpainting
        const workflow = {
          prompt: {
            "3": {
              inputs: { image: image, upload: "image" },
              class_type: "LoadImage"
            },
            "4": {
              inputs: { image: mask, upload: "image" },
              class_type: "LoadImage"
            },
            "5": {
              inputs: {
                text: prompt || "high quality, detailed",
                clip: ["6", 0]
              },
              class_type: "CLIPTextEncode"
            },
            "6": {
              inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
              class_type: "CheckpointLoaderSimple"
            },
            "7": {
              inputs: {
                samples: ["10", 0],
                vae: ["6", 2]
              },
              class_type: "VAEDecode"
            },
            "10": {
              inputs: {
                seed: Math.floor(Math.random() * 1000000),
                steps: 20,
                cfg: 7,
                sampler_name: "euler",
                scheduler: "normal",
                denoise: 0.8,
                model: ["6", 0],
                positive: ["5", 0],
                negative: ["11", 0],
                latent_image: ["12", 0]
              },
              class_type: "KSampler"
            },
            "11": {
              inputs: {
                text: negativePrompt || "blurry, low quality",
                clip: ["6", 0]
              },
              class_type: "CLIPTextEncode"
            },
            "12": {
              inputs: {
                pixels: ["3", 0],
                vae: ["6", 2],
                mask: ["4", 0]
              },
              class_type: "VAEEncodeForInpaint"
            }
          }
        };
        
        addLog('info', 'comfyui', 'Inpainting démarré');
        const result = await proxyRequest(`${AI_CONFIG.comfyui}/prompt`, 'POST', workflow);
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'comfyui', `Erreur inpainting: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ComfyUI inpainting non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/image/outpaint' && req.method === 'POST') {
      const body = await parseBody(req);
      const { image, direction, prompt, expandPixels } = body;
      
      try {
        // Workflow ComfyUI pour outpainting
        const workflow = {
          prompt: {
            "3": {
              inputs: { image: image, upload: "image" },
              class_type: "LoadImage"
            },
            "4": {
              inputs: {
                left: direction === 'left' ? (expandPixels || 256) : 0,
                right: direction === 'right' ? (expandPixels || 256) : 0,
                top: direction === 'top' ? (expandPixels || 256) : 0,
                bottom: direction === 'bottom' ? (expandPixels || 256) : 0,
                feathering: 40,
                image: ["3", 0]
              },
              class_type: "ImagePadForOutpaint"
            },
            "5": {
              inputs: {
                text: prompt || "seamless extension, same style",
                clip: ["6", 0]
              },
              class_type: "CLIPTextEncode"
            },
            "6": {
              inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
              class_type: "CheckpointLoaderSimple"
            }
          }
        };
        
        addLog('info', 'comfyui', `Outpainting direction: ${direction}`);
        const result = await proxyRequest(`${AI_CONFIG.comfyui}/prompt`, 'POST', workflow);
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'comfyui', `Erreur outpainting: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ComfyUI outpainting non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: FACE SWAP - Échange de visages via InsightFace
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/face/swap' && req.method === 'POST') {
      const body = await parseBody(req);
      const { sourceImage, targetImage, faceIndex } = body;
      
      try {
        addLog('info', 'insightface', 'Face swap démarré');
        const result = await proxyRequest(`${AI_CONFIG.insightface}/swap`, 'POST', {
          source: sourceImage,
          target: targetImage,
          face_index: faceIndex || 0
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'insightface', `Erreur face swap: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'InsightFace swap non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: VIDEO GENERATION - Texte vers vidéo via AnimateDiff
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/video/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      const { prompt, negativePrompt, frames, fps, width, height } = body;
      
      try {
        addLog('info', 'animatediff', `Génération vidéo: ${prompt}`);
        const result = await proxyRequest(`${AI_CONFIG.animatediff}/generate`, 'POST', {
          prompt: prompt,
          negative_prompt: negativePrompt || 'blurry, low quality, distorted',
          num_frames: frames || 16,
          fps: fps || 8,
          width: width || 512,
          height: height || 512,
          seed: Math.floor(Math.random() * 1000000)
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'animatediff', `Erreur génération vidéo: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'AnimateDiff non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: VOICE TRAINING - Entraînement de voix XTTS
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/voice/train' && req.method === 'POST') {
      const body = await parseBody(req);
      const { audioSamples, speakerName, language } = body;
      
      try {
        addLog('info', 'xtts', `Entraînement voix: ${speakerName}`);
        const result = await proxyRequest(`${AI_CONFIG.xtts}/train`, 'POST', {
          samples: audioSamples,
          speaker_name: speakerName,
          language: language || 'fr'
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'xtts', `Erreur entraînement voix: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'XTTS training non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/voice/synthesize' && req.method === 'POST') {
      const body = await parseBody(req);
      const { text, speakerId, language, speed } = body;
      
      try {
        addLog('info', 'xtts', `Synthèse vocale: ${text.slice(0, 50)}...`);
        const result = await proxyRequest(`${AI_CONFIG.xtts}/tts_to_audio`, 'POST', {
          text: text,
          speaker_wav: speakerId,
          language: language || 'fr',
          speed: speed || 1.0
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'xtts', `Erreur synthèse vocale: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'XTTS synthèse non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: MUSIC GENERATION - Génération de musique
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/music/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      const { prompt, duration, temperature, topK } = body;
      
      try {
        addLog('info', 'musicgen', `Génération musique: ${prompt}`);
        const result = await proxyRequest(`${AI_CONFIG.musicgen}/generate`, 'POST', {
          prompt: prompt,
          duration: duration || 10,
          temperature: temperature || 1.0,
          top_k: topK || 250
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'musicgen', `Erreur génération musique: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'MusicGen non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: AUDIO SEPARATION - Séparation de pistes Demucs
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/audio/separate' && req.method === 'POST') {
      const body = await parseBody(req);
      const { audioUrl, stems } = body;
      
      try {
        addLog('info', 'demucs', `Séparation audio: ${stems || 4} pistes`);
        const result = await proxyRequest(`${AI_CONFIG.demucs}/separate`, 'POST', {
          audio: audioUrl,
          stems: stems || 4, // vocals, drums, bass, other
          model: 'htdemucs'
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'demucs', `Erreur séparation audio: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Demucs non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: IMAGE UPSCALE - Agrandissement d'images
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/image/upscale' && req.method === 'POST') {
      const body = await parseBody(req);
      const { image, scale, model } = body;
      
      try {
        addLog('info', 'esrgan', `Upscaling x${scale || 4}`);
        const result = await proxyRequest(`${AI_CONFIG.esrgan}/upscale`, 'POST', {
          image: image,
          scale: scale || 4,
          model: model || 'realesrgan-x4plus'
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'esrgan', `Erreur upscaling: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ESRGAN non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: LIPSYNC - Synchronisation labiale
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/lipsync' && req.method === 'POST') {
      const body = await parseBody(req);
      const { videoUrl, audioUrl, faceIndex } = body;
      
      try {
        addLog('info', 'lipsync', 'Synchronisation labiale démarrée');
        const result = await proxyRequest(`${AI_CONFIG.lipsync}/generate`, 'POST', {
          video: videoUrl,
          audio: audioUrl,
          face_index: faceIndex || 0
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'lipsync', `Erreur lipsync: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'LipSync non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: FRAME INTERPOLATION - Interpolation de frames RIFE
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/interpolate' && req.method === 'POST') {
      const body = await parseBody(req);
      const { videoUrl, multiplier, slowMotion } = body;
      
      try {
        addLog('info', 'rife', `Interpolation x${multiplier || 2}`);
        const result = await proxyRequest(`${AI_CONFIG.rife}/interpolate`, 'POST', {
          video: videoUrl,
          multiplier: multiplier || 2,
          slow_motion: slowMotion || false
        });
        
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'rife', `Erreur interpolation: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'RIFE non disponible', details: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: FFMPEG - Vérification et compression vidéo
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/check-ffmpeg' && req.method === 'GET') {
      const respondOk = (payload) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      const parseVersion = (stdout) => {
        const versionMatch = String(stdout || '').match(/ffmpeg version ([^\s]+)/);
        return versionMatch ? versionMatch[1] : 'unknown';
      };

      const tryExec = (cmd, meta = {}) => {
        exec(cmd, (error, stdout) => {
          if (error) return meta.onFail?.(error);
          respondOk({ installed: true, version: parseVersion(stdout), output: String(stdout).split('\n')[0], ...meta.payload });
        });
      };

      // 1) Essai via PATH (cas normal)
      exec('ffmpeg -version', (error, stdout) => {
        if (!error) {
          const version = parseVersion(stdout);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ installed: true, version, output: stdout.split('\n')[0] }));
        }

        // 2) Fallback: chercher FFmpeg dans le dossier d'installation MediaVault-AI
        try {
          const installRoot = path.join(process.env.USERPROFILE || '', 'MediaVault-AI', 'ffmpeg');
          if (fs.existsSync(installRoot)) {
            const dirs = fs.readdirSync(installRoot).filter(d => {
              try {
                return fs.statSync(path.join(installRoot, d)).isDirectory() && d.startsWith('ffmpeg');
              } catch {
                return false;
              }
            });

            if (dirs.length > 0) {
              const binDir = path.join(installRoot, dirs[0], 'bin');
              const ffmpegExe = path.join(binDir, 'ffmpeg.exe');
              if (fs.existsSync(ffmpegExe)) {
                // Mettre à jour le PATH du process courant (pas besoin de redémarrer le serveur)
                const currentPath = process.env.PATH || '';
                if (!currentPath.toLowerCase().includes(binDir.toLowerCase())) {
                  process.env.PATH = `${binDir};${currentPath}`;
                }

                return exec(`"${ffmpegExe}" -version`, (err2, stdout2) => {
                  if (err2) {
                    return respondOk({ installed: false, error: err2.message, hint: 'FFmpeg trouvé mais non exécutable' });
                  }
                  const version = parseVersion(stdout2);
                  return respondOk({ installed: true, version, output: String(stdout2).split('\n')[0], path: binDir, source: 'mediavault-install' });
                });
              }
            }
          }
        } catch (e) {
          // ignore et retour ci-dessous
        }

        return respondOk({ installed: false, error: error.message, hint: 'FFmpeg non trouvé (PATH + dossier MediaVault-AI)' });
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Installation automatique FFmpeg
    // ═══════════════════════════════════════════════════════════════

    // État global de l'installation FFmpeg
    if (!global.ffmpegInstallStatus) {
      global.ffmpegInstallStatus = { step: 'idle', progress: 0, message: '' };
    }

    if (pathname === '/api/install-ffmpeg' && req.method === 'POST') {
      const INSTALL_DIR = path.join(process.env.USERPROFILE || '', 'MediaVault-AI', 'ffmpeg');
      const FFMPEG_URL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
      const TEMP_ZIP = path.join(process.env.TEMP || '/tmp', 'ffmpeg.zip');

      // Réinitialiser le statut
      global.ffmpegInstallStatus = { step: 'downloading', progress: 5, message: 'Préparation du téléchargement...' };

      // Fonction asynchrone d'installation
      const installFFmpeg = async () => {
        try {
          // Créer le dossier d'installation
          global.ffmpegInstallStatus = { step: 'downloading', progress: 10, message: 'Création du dossier d\'installation...' };
          if (!fs.existsSync(INSTALL_DIR)) {
            fs.mkdirSync(INSTALL_DIR, { recursive: true });
          }

          // Télécharger FFmpeg via PowerShell
          global.ffmpegInstallStatus = { step: 'downloading', progress: 20, message: 'Téléchargement de FFmpeg (~50MB)...' };
          
          await new Promise((resolve, reject) => {
            const downloadCmd = `powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${FFMPEG_URL}' -OutFile '${TEMP_ZIP}'"`;
            
            exec(downloadCmd, { timeout: 300000 }, (error, stdout, stderr) => {
              if (error) {
                reject(new Error('Échec du téléchargement: ' + error.message));
              } else {
                resolve(stdout);
              }
            });

            // Mise à jour du progrès pendant le téléchargement
            let dlProgress = 20;
            const progressInterval = setInterval(() => {
              if (dlProgress < 55) {
                dlProgress += 5;
                global.ffmpegInstallStatus = { 
                  step: 'downloading', 
                  progress: dlProgress, 
                  message: `Téléchargement en cours (${dlProgress}%)...` 
                };
              }
            }, 3000);

            setTimeout(() => clearInterval(progressInterval), 120000);
          });

          // Vérifier que le fichier existe
          if (!fs.existsSync(TEMP_ZIP)) {
            throw new Error('Le fichier téléchargé est introuvable');
          }

          // Extraire l'archive
          global.ffmpegInstallStatus = { step: 'extracting', progress: 60, message: 'Extraction des fichiers...' };
          
          await new Promise((resolve, reject) => {
            const extractCmd = `powershell -Command "Expand-Archive -Path '${TEMP_ZIP}' -DestinationPath '${INSTALL_DIR}' -Force"`;
            exec(extractCmd, { timeout: 120000 }, (error) => {
              if (error) reject(new Error('Échec de l\'extraction: ' + error.message));
              else resolve();
            });
          });

          global.ffmpegInstallStatus = { step: 'configuring', progress: 75, message: 'Recherche du dossier FFmpeg...' };

          // Trouver le sous-dossier contenant ffmpeg.exe
          const dirs = fs.readdirSync(INSTALL_DIR).filter(d => 
            fs.statSync(path.join(INSTALL_DIR, d)).isDirectory() && d.startsWith('ffmpeg')
          );

          if (dirs.length === 0) {
            throw new Error('Dossier FFmpeg introuvable après extraction');
          }

          const ffmpegBinDir = path.join(INSTALL_DIR, dirs[0], 'bin');
          
          if (!fs.existsSync(path.join(ffmpegBinDir, 'ffmpeg.exe'))) {
            throw new Error('ffmpeg.exe introuvable dans ' + ffmpegBinDir);
          }

          // Ajouter au PATH utilisateur
          global.ffmpegInstallStatus = { step: 'configuring', progress: 85, message: 'Configuration du PATH système...' };
          
          await new Promise((resolve, reject) => {
            // D'abord essayer le PATH machine (admin), sinon PATH utilisateur
            exec(`setx PATH "%PATH%;${ffmpegBinDir}"`, (error) => {
              // On continue même en cas d'erreur (peut ne pas avoir les droits admin)
              resolve();
            });
          });

          // Nettoyage
          global.ffmpegInstallStatus = { step: 'verifying', progress: 90, message: 'Nettoyage des fichiers temporaires...' };
          try {
            fs.unlinkSync(TEMP_ZIP);
          } catch (e) {
            // Ignorer les erreurs de suppression
          }

          // Vérification finale
          global.ffmpegInstallStatus = { step: 'verifying', progress: 95, message: 'Vérification de l\'installation...' };
          
          // Tester avec le chemin complet
          const ffmpegPath = path.join(ffmpegBinDir, 'ffmpeg.exe');
          await new Promise((resolve, reject) => {
            exec(`"${ffmpegPath}" -version`, (error, stdout) => {
              if (error) {
                reject(new Error('FFmpeg installé mais non exécutable'));
              } else {
                const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
                global.ffmpegInstallStatus = { 
                  step: 'completed', 
                  progress: 100, 
                  message: 'Installation terminée !',
                  version: versionMatch ? versionMatch[1] : 'unknown',
                  path: ffmpegBinDir
                };
                resolve();
              }
            });
          });

          addLog('info', 'ffmpeg', 'Installation automatique réussie: ' + ffmpegBinDir);

        } catch (error) {
          global.ffmpegInstallStatus = { 
            step: 'failed', 
            progress: 0, 
            message: error.message || 'Erreur inconnue'
          };
          addLog('error', 'ffmpeg', 'Échec installation: ' + error.message);
        }
      };

      // Lancer l'installation en arrière-plan
      installFFmpeg();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        success: true, 
        message: 'Installation démarrée',
        status: global.ffmpegInstallStatus
      }));
    }

    if (pathname === '/api/ffmpeg-install-status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(global.ffmpegInstallStatus || { step: 'idle', progress: 0, message: '' }));
    }

    // Stockage des jobs de montage/compression en cours
    const montageJobs = new Map();

    if (pathname === '/api/montage/analyze' && req.method === 'POST') {
      const body = await parseBody(req);
      const { files } = body;
      
      if (!files || !Array.isArray(files)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Liste de fichiers requise' }));
      }

      const analyses = [];
      for (const file of files) {
        try {
          const filePath = file.startsWith('http') ? file : path.join(MEDIA_FOLDER, file);
          const probeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
          
          const result = await new Promise((resolve, reject) => {
            exec(probeCmd, (error, stdout) => {
              if (error) reject(error);
              else resolve(JSON.parse(stdout));
            });
          });
          
          analyses.push({ file, data: result });
        } catch (e) {
          analyses.push({ file, error: e.message });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ analyses }));
    }

    if (pathname === '/api/montage/create' && req.method === 'POST') {
      const body = await parseBody(req);
      const { files, transitions, music, output } = body;
      
      const jobId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      montageJobs.set(jobId, { status: 'starting', progress: 0 });
      
      // Construire la commande FFmpeg
      let filterComplex = '';
      let inputs = files.map((f, i) => `-i "${f}"`).join(' ');
      
      if (music) {
        inputs += ` -i "${music}"`;
      }
      
      // Filtres xfade pour transitions
      if (transitions && transitions.length > 0) {
        for (let i = 0; i < files.length - 1; i++) {
          const transition = transitions[i] || 'fade';
          const duration = 0.5;
          filterComplex += `[${i}:v][${i+1}:v]xfade=transition=${transition}:duration=${duration}:offset=${i * 5}[v${i}];`;
        }
      }
      
      const outputPath = output || path.join(MEDIA_FOLDER, 'ai-creations', `montage-${jobId}.mp4`);
      const cmd = `ffmpeg ${inputs} -filter_complex "${filterComplex}" -c:v libx264 -preset fast "${outputPath}"`;
      
      const child = spawn('cmd', ['/c', cmd], { shell: true });
      
      child.stderr.on('data', (data) => {
        const match = data.toString().match(/time=(\d+:\d+:\d+)/);
        if (match) {
          montageJobs.set(jobId, { status: 'processing', progress: 50, time: match[1] });
        }
      });
      
      child.on('close', (code) => {
        montageJobs.set(jobId, { 
          status: code === 0 ? 'completed' : 'failed', 
          progress: 100,
          output: outputPath 
        });
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ jobId, status: 'started' }));
    }

    if (pathname.startsWith('/api/montage/progress/') && req.method === 'GET') {
      const jobId = pathname.split('/').pop();
      const job = montageJobs.get(jobId);
      
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Job introuvable' }));
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(job));
    }

    if (pathname === '/api/video/compress' && req.method === 'POST') {
      const body = await parseBody(req);
      const { input, codec, quality, output } = body;
      
      const jobId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      montageJobs.set(jobId, { status: 'starting', progress: 0 });
      
      const codecParams = {
        'h265': '-c:v libx265 -crf 28',
        'h264': '-c:v libx264 -crf 23',
        'av1': '-c:v libaom-av1 -crf 30'
      };
      
      const codecParam = codecParams[codec] || codecParams['h264'];
      const outputPath = output || input.replace(/\.[^.]+$/, `_compressed.mp4`);
      const cmd = `ffmpeg -i "${input}" ${codecParam} -preset medium "${outputPath}"`;
      
      const child = spawn('cmd', ['/c', cmd], { shell: true });
      
      child.stderr.on('data', (data) => {
        const match = data.toString().match(/time=(\d+:\d+:\d+)/);
        if (match) {
          montageJobs.set(jobId, { status: 'compressing', progress: 50, time: match[1] });
        }
      });
      
      child.on('close', (code) => {
        montageJobs.set(jobId, { 
          status: code === 0 ? 'completed' : 'failed', 
          progress: 100,
          output: outputPath 
        });
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ jobId, status: 'started' }));
    }

    if (pathname.startsWith('/api/video/compress/progress/') && req.method === 'GET') {
      const jobId = pathname.split('/').pop();
      const job = montageJobs.get(jobId);
      
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Job introuvable' }));
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(job));
    }

    // ═══════════════════════════════════════════════════════════════
    // API: HOME AUTOMATION - Domotique
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/integrations/homeassistant/connect' && req.method === 'POST') {
      const body = await parseBody(req);
      const { url, token } = body;
      
      try {
        const response = await fetch(`${url}/api/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          addLog('info', 'homeassistant', `Connecté à ${data.location_name || 'Home Assistant'}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, data }));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e) {
        addLog('error', 'homeassistant', `Erreur connexion: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    if (pathname === '/api/integrations/homeassistant/entities' && req.method === 'GET') {
      const haUrl = url.searchParams.get('url');
      const haToken = url.searchParams.get('token');
      
      if (!haUrl || !haToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'URL et token requis' }));
      }
      
      try {
        const response = await fetch(`${haUrl}/api/states`, {
          headers: { 'Authorization': `Bearer ${haToken}` }
        });
        
        if (response.ok) {
          const entities = await response.json();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ entities }));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    if (pathname === '/api/integrations/homeassistant/call' && req.method === 'POST') {
      const body = await parseBody(req);
      const { haUrl, haToken, domain, service, entityId, data: serviceData } = body;
      
      try {
        const response = await fetch(`${haUrl}/api/services/${domain}/${service}`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${haToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            entity_id: entityId,
            ...serviceData
          })
        });
        
        if (response.ok) {
          addLog('info', 'homeassistant', `Service ${domain}.${service} appelé sur ${entityId}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true }));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e) {
        addLog('error', 'homeassistant', `Erreur appel service: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // Tuya Local API
    if (pathname === '/api/integrations/tuya/devices' && req.method === 'GET') {
      // Tuya Local nécessite une configuration préalable
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        message: 'Tuya Local: Configurez vos appareils via l\'interface',
        documentation: 'https://github.com/codetheweb/tuyapi'
      }));
    }

    // Reolink API
    if (pathname === '/api/integrations/reolink/cameras' && req.method === 'GET') {
      const ip = url.searchParams.get('ip');
      const user = url.searchParams.get('user');
      const pass = url.searchParams.get('pass');
      
      if (!ip || !user || !pass) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'IP, user et password requis' }));
      }
      
      try {
        const response = await fetch(`http://${ip}/api.cgi?cmd=GetDevInfo&user=${user}&password=${pass}`);
        if (response.ok) {
          const data = await response.json();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(data));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: CREATIONS IA - Sauvegarde des créations
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai-creations/save' && req.method === 'POST') {
      const body = await parseBody(req);
      const { type, data, prompt, model, filename } = body;
      
      try {
        const creationsDir = path.join(MEDIA_FOLDER, 'ai-creations');
        if (!fs.existsSync(creationsDir)) {
          fs.mkdirSync(creationsDir, { recursive: true });
        }
        
        const timestamp = Date.now();
        const finalFilename = filename || `${type}-${timestamp}`;
        const filePath = path.join(creationsDir, finalFilename);
        
        // Décoder base64 si nécessaire
        if (data.startsWith('data:')) {
          const base64Data = data.split(',')[1];
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        } else {
          fs.writeFileSync(filePath, data);
        }
        
        // Sauvegarder les métadonnées
        const metaPath = filePath + '.meta.json';
        fs.writeFileSync(metaPath, JSON.stringify({
          type,
          prompt,
          model,
          createdAt: new Date().toISOString()
        }, null, 2));
        
        addLog('info', 'creations', `Création sauvegardée: ${finalFilename}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
          success: true, 
          path: filePath,
          url: `http://localhost:${PORT}/media/ai-creations/${finalFilename}`
        }));
      } catch (e) {
        addLog('error', 'creations', `Erreur sauvegarde: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // API: Installation automatique des modèles IA
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/ai/install' && req.method === 'POST') {
      const body = await parseBody(req);
      const { component } = body;
      
      const installScripts = {
        ollama: 'winget install Ollama.Ollama',
        comfyui: 'git clone https://github.com/comfyanonymous/ComfyUI.git C:\\AI\\ComfyUI',
        whisper: 'pip install openai-whisper',
        xtts: 'pip install TTS',
        musicgen: 'pip install audiocraft',
        demucs: 'pip install demucs',
        insightface: 'pip install insightface onnxruntime-gpu',
        clip: 'pip install clip-interrogator',
        animatediff: 'git clone https://github.com/guoyww/AnimateDiff.git C:\\AI\\AnimateDiff',
        rife: 'pip install rife-ncnn-vulkan',
        esrgan: 'pip install realesrgan',
      };
      
      const script = installScripts[component];
      if (!script) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: `Composant ${component} inconnu` }));
      }
      
      exec(script, (err, stdout, stderr) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: err.message, stderr }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, stdout }));
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // API: AGENT LOCAL - Contrôle à distance sécurisé
    // ═══════════════════════════════════════════════════════════════

    // Whitelist des commandes autorisées
    const ALLOWED_COMMANDS = {
      // Scripts d'installation
      'step-00': path.join(__dirname, 'public', 'scripts', 'step-00-prepare.bat'),
      'step-01': path.join(__dirname, 'public', 'scripts', 'step-01-prereqs.bat'),
      'step-02': path.join(__dirname, 'public', 'scripts', 'step-02-python311.bat'),
      'step-03': path.join(__dirname, 'public', 'scripts', 'step-03-git.bat'),
      'step-04': path.join(__dirname, 'public', 'scripts', 'step-04-ollama.bat'),
      'step-05': path.join(__dirname, 'public', 'scripts', 'step-05-run-complete-installer.bat'),
      // Installation automatique complète (1 clic)
      'auto-install': 'AUTO_INSTALL_SEQUENCE',
      // Maintenance
      'diagnose': path.join(__dirname, 'public', 'scripts', 'diagnose-ai-suite.bat'),
      'start-services': path.join(__dirname, 'public', 'scripts', 'start-ai-services.bat'),
      'stop-services': path.join(__dirname, 'public', 'scripts', 'stop-ai-services.bat'),
      'uninstall': path.join(__dirname, 'public', 'scripts', 'uninstall-ai-suite.bat'),
      // Commandes système simples
      'ollama-version': 'ollama --version',
      'python-version': 'python --version',
      'nvidia-smi': 'nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader',
      'git-version': 'git --version',
      'pip-version': 'pip --version',
      'tasklist': 'tasklist /FI "IMAGENAME eq python.exe" /FI "IMAGENAME eq ollama.exe" /FO CSV',
    };

    // Séquence d'installation automatique
    const AUTO_INSTALL_STEPS = [
      { id: 'step-00', label: 'Préparation des dossiers' },
      { id: 'step-01', label: 'Vérification des prérequis' },
      { id: 'step-02', label: 'Installation Python 3.11' },
      { id: 'step-03', label: 'Installation Git' },
      { id: 'step-04', label: 'Installation Ollama' },
      { id: 'step-05', label: 'Installation Suite IA complète' },
      { id: 'start-services', label: 'Démarrage des services' },
    ];

    // Exécuter une commande de la whitelist
    if (pathname === '/api/agent/exec' && req.method === 'POST') {
      const body = await parseBody(req);
      const { command } = body;

      if (!command || !ALLOWED_COMMANDS[command]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
          error: 'Commande non autorisée', 
          allowed: Object.keys(ALLOWED_COMMANDS) 
        }));
      }

      const cmd = ALLOWED_COMMANDS[command];
      const isScript = cmd.endsWith('.bat') || cmd.endsWith('.ps1');

      addLog('info', 'agent', `Exécution: ${command}`);

      // Pour les scripts batch, on les exécute dans une nouvelle fenêtre cmd
      const execCmd = isScript ? `cmd /c "${cmd}"` : cmd;

      exec(execCmd, { 
        cwd: __dirname,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 300000 // 5 minutes timeout
      }, (error, stdout, stderr) => {
        const result = {
          command,
          success: !error,
          exitCode: error?.code || 0,
          stdout: stdout?.toString() || '',
          stderr: stderr?.toString() || '',
          timestamp: new Date().toISOString()
        };

        if (error) {
          addLog('error', 'agent', `Échec ${command}: ${error.message}`);
        } else {
          addLog('info', 'agent', `Succès ${command}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }

    // Lecture de fichiers logs (restreint au dossier MediaVault-AI/logs)
    if (pathname === '/api/agent/read-file' && req.method === 'GET') {
      const filePath = url.searchParams.get('path');
      const logsDir = path.join(process.env.USERPROFILE || '', 'MediaVault-AI', 'logs');
      
      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Chemin requis' }));
      }

      const fullPath = path.resolve(logsDir, filePath);
      
      // Sécurité: vérifier que le chemin est bien dans logs
      if (!fullPath.startsWith(logsDir)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Accès refusé - hors du dossier logs' }));
      }

      if (!fs.existsSync(fullPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Fichier introuvable' }));
      }

      try {
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          path: filePath,
          content,
          size: stats.size,
          modified: stats.mtime.toISOString()
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // Liste des fichiers logs disponibles
    if (pathname === '/api/agent/logs-list' && req.method === 'GET') {
      const logsDir = path.join(process.env.USERPROFILE || '', 'MediaVault-AI', 'logs');
      
      try {
        if (!fs.existsSync(logsDir)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ files: [], path: logsDir, exists: false }));
        }

        const files = fs.readdirSync(logsDir)
          .filter(f => f.endsWith('.log') || f.endsWith('.txt'))
          .map(f => {
            const stats = fs.statSync(path.join(logsDir, f));
            return {
              name: f,
              size: stats.size,
              modified: stats.mtime.toISOString()
            };
          })
          .sort((a, b) => new Date(b.modified) - new Date(a.modified));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ files, path: logsDir, exists: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // Processus en cours
    if (pathname === '/api/agent/processes' && req.method === 'GET') {
      exec('tasklist /FO CSV /NH', (error, stdout) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: error.message }));
        }

        const lines = stdout.trim().split('\n');
        const processes = [];
        const relevantNames = ['python', 'ollama', 'node', 'comfyui', 'whisper'];

        for (const line of lines) {
          const match = line.match(/"([^"]+)","(\d+)","([^"]+)","(\d+)","([^"]+)"/);
          if (match) {
            const [, name, pid, , , memory] = match;
            const lowerName = name.toLowerCase();
            if (relevantNames.some(r => lowerName.includes(r))) {
              processes.push({
                name,
                pid: parseInt(pid),
                memory: memory.trim()
              });
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ processes }));
      });
      return;
    }

    // Informations système
    if (pathname === '/api/agent/system-info' && req.method === 'GET') {
      const info = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cwd: __dirname,
        mediaFolder: MEDIA_FOLDER,
        aiDir: path.join(process.env.USERPROFILE || '', 'MediaVault-AI')
      };

      // Récupérer infos GPU si disponible
      exec('nvidia-smi --query-gpu=name,memory.total,memory.free,temperature.gpu --format=csv,noheader', (gpuErr, gpuOut) => {
        if (!gpuErr && gpuOut) {
          const gpuData = gpuOut.trim().split(',').map(s => s.trim());
          info.gpu = {
            name: gpuData[0],
            memoryTotal: gpuData[1],
            memoryFree: gpuData[2],
            temperature: gpuData[3]
          };
        }

        // Récupérer espace disque
        exec('wmic logicaldisk get size,freespace,caption', (diskErr, diskOut) => {
          if (!diskErr && diskOut) {
            const lines = diskOut.trim().split('\n').slice(1);
            info.disks = [];
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 3) {
                info.disks.push({
                  drive: parts[0],
                  freeSpace: parseInt(parts[1]) || 0,
                  totalSize: parseInt(parts[2]) || 0
                });
              }
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(info));
        });
      });
      return;
    }

    // Streaming de commande (Server-Sent Events)
    if (pathname === '/api/agent/stream' && req.method === 'GET') {
      const command = url.searchParams.get('command');

      if (!command || !ALLOWED_COMMANDS[command]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Commande non autorisée' }));
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Gestion spéciale pour auto-install: enchaîner toutes les étapes
      if (command === 'auto-install') {
        const runStep = (stepIndex) => {
          if (stepIndex >= AUTO_INSTALL_STEPS.length) {
            res.write(`data: ${JSON.stringify({ type: 'success', text: '✅ Installation automatique terminée avec succès!' })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'exit', code: 0 })}\n\n`);
            res.end();
            return;
          }

          const step = AUTO_INSTALL_STEPS[stepIndex];
          const stepCmd = ALLOWED_COMMANDS[step.id];
          
          if (!stepCmd || stepCmd === 'AUTO_INSTALL_SEQUENCE') {
            runStep(stepIndex + 1);
            return;
          }

          res.write(`data: ${JSON.stringify({ type: 'info', text: `\n══════════════════════════════════════` })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'info', text: `  Étape ${stepIndex + 1}/${AUTO_INSTALL_STEPS.length}: ${step.label}` })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'info', text: `══════════════════════════════════════\n` })}\n\n`);

          const child = spawn('cmd', ['/c', stepCmd], {
            cwd: __dirname,
            shell: true
          });

          child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
              if (line.trim()) {
                res.write(`data: ${JSON.stringify({ type: 'stdout', text: line })}\n\n`);
              }
            }
          });

          child.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
              if (line.trim()) {
                res.write(`data: ${JSON.stringify({ type: 'stderr', text: line })}\n\n`);
              }
            }
          });

          child.on('close', (code) => {
            if (code !== 0) {
              res.write(`data: ${JSON.stringify({ type: 'error', text: `❌ Échec à l'étape: ${step.label} (code: ${code})` })}\n\n`);
              res.write(`data: ${JSON.stringify({ type: 'exit', code })}\n\n`);
              res.end();
            } else {
              res.write(`data: ${JSON.stringify({ type: 'success', text: `✓ ${step.label} terminé` })}\n\n`);
              // Passer à l'étape suivante
              runStep(stepIndex + 1);
            }
          });

          child.on('error', (err) => {
            res.write(`data: ${JSON.stringify({ type: 'error', text: `Erreur: ${err.message}` })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'exit', code: 1 })}\n\n`);
            res.end();
          });
        };

        runStep(0);
        req.on('close', () => {
          // L'utilisateur a fermé la connexion
        });
        return;
      }

      // Commande simple (non auto-install)
      const cmd = ALLOWED_COMMANDS[command];
      const isScript = cmd.endsWith('.bat') || cmd.endsWith('.ps1');
      const execCmd = isScript ? cmd : cmd;

      const child = spawn('cmd', ['/c', execCmd], {
        cwd: __dirname,
        shell: true
      });

      addLog('info', 'agent', `Stream démarré: ${command}`);

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            res.write(`data: ${JSON.stringify({ type: 'stdout', text: line })}\n\n`);
          }
        }
      });

      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            res.write(`data: ${JSON.stringify({ type: 'stderr', text: line })}\n\n`);
          }
        }
      });

      child.on('close', (code) => {
        res.write(`data: ${JSON.stringify({ type: 'exit', code })}\n\n`);
        res.end();
        addLog('info', 'agent', `Stream terminé: ${command} (code: ${code})`);
      });

      child.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
      });

      req.on('close', () => {
        child.kill();
      });

      return;
    }

    // Liste des commandes disponibles
    if (pathname === '/api/agent/commands' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        commands: Object.keys(ALLOWED_COMMANDS),
        categories: {
          installation: ['step-00', 'step-01', 'step-02', 'step-03', 'step-04', 'step-05', 'auto-install'],
          maintenance: ['diagnose', 'start-services', 'stop-services', 'uninstall'],
          system: ['ollama-version', 'python-version', 'nvidia-smi', 'git-version', 'pip-version', 'tasklist']
        }
      }));
    }

    // ═══════════════════════════════════════════════════════════════
    // Servir les fichiers média
    // ═══════════════════════════════════════════════════════════════

    if (pathname.startsWith('/media/')) {
      const fileName = decodeURIComponent(pathname.slice(7));
      const filePath = path.normalize(path.join(MEDIA_FOLDER, fileName));
      
      if (filePath.startsWith(path.normalize(MEDIA_FOLDER)) && fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
          'Content-Type': getMimeType(path.extname(filePath)),
          'Content-Length': stat.size,
          'Cache-Control': 'public, max-age=31536000'
        });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // Servir les fichiers liés (dossiers externes)
    if (pathname.startsWith('/linked-media/')) {
      try {
        const encodedPath = pathname.slice(14);
        const filePath = Buffer.from(encodedPath, 'base64url').toString('utf8');
        const normalizedPath = path.normalize(filePath);
        
        if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isFile()) {
          const stat = fs.statSync(normalizedPath);
          res.writeHead(200, {
            'Content-Type': getMimeType(path.extname(normalizedPath)),
            'Content-Length': stat.size,
            'Cache-Control': 'public, max-age=31536000'
          });
          return fs.createReadStream(normalizedPath).pipe(res);
        }
        
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Fichier lié introuvable' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Chemin invalide' }));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Servir le site (fichiers statiques)
    // ═══════════════════════════════════════════════════════════════

    let urlPath = pathname;
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(DIST_FOLDER, urlPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': getMimeType(ext) });
      return fs.createReadStream(filePath).pipe(res);
    }

    // SPA fallback
    const indexPath = path.join(DIST_FOLDER, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return fs.createReadStream(indexPath).pipe(res);
    }

    res.writeHead(404);
    res.end('Not Found');

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// ═══════════════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          MediaVault - Serveur Local avec IA                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Site:        http://localhost:${PORT}                       ║`);
  console.log(`║  📁 Médias:      ${MEDIA_FOLDER.padEnd(40)}  ║`);
  console.log(`║  📦 Build:       ${DIST_FOLDER.slice(-40).padEnd(40)}  ║`);
  console.log(`║  💾 Données:     ${DATA_FILE.slice(-40).padEnd(40)}  ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  APIs IA disponibles:                                        ║');
  console.log('║    • /api/ai/ollama/*     - Génération de texte              ║');
  console.log('║    • /api/ai/comfyui/*    - Génération d\'images              ║');
  console.log('║    • /api/ai/whisper/*    - Transcription audio              ║');
  console.log('║    • /api/ai/xtts/*       - Clonage vocal                    ║');
  console.log('║    • /api/ai/musicgen/*   - Génération de musique            ║');
  console.log('║    • /api/ai/demucs/*     - Séparation de pistes             ║');
  console.log('║    • /api/ai/insightface/*- Reconnaissance faciale           ║');
  console.log('║    • /api/ai/clip/*       - Recherche sémantique             ║');
  console.log('║    • /api/ai/animatediff/*- Génération vidéo                 ║');
  console.log('║    • /api/ai/lipsync/*    - Synchronisation labiale          ║');
  console.log('║    • /api/ai/rife/*       - Interpolation de frames          ║');
  console.log('║    • /api/ai/esrgan/*     - Upscaling d\'images               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Ouvrez http://localhost:' + PORT + ' dans votre navigateur');
  console.log('');
});
