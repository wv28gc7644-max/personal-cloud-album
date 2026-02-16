// Template du fichier server.cjs pour téléchargement local
// Ce fichier est généré pour être téléchargé par l'utilisateur

export const serverTemplate = `/**
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

// ===================================================================
// CONFIGURATION - MODIFIEZ CES VALEURS
// ===================================================================

// Dossier medias (par defaut: Images/Pictures de l'utilisateur Windows)
let MEDIA_FOLDER = process.env.MEDIA_FOLDER || '';
if (!MEDIA_FOLDER) {
  const home = process.env.USERPROFILE || '';
  const candidates = [
    path.join(home, 'Pictures'),
    path.join(home, 'Images'),
    path.join(home, 'Videos'),
    home
  ].filter(Boolean);
  MEDIA_FOLDER = candidates.find((p) => fs.existsSync(p)) || home || 'C:/';
}

const PORT = 3001;
const DIST_FOLDER = path.join(__dirname, 'dist');
const DATA_FILE = path.join(__dirname, 'data.json');
const LOG_FILE = path.join(__dirname, 'ai-logs.json');
const UPDATE_PROGRESS_FILE = path.join(__dirname, 'update-progress.json');

// Maintenance mode state
let isUpdating = false;
let updateStartedAt = null;
const UPDATE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes safety timeout

// Cleanup update-progress.json at startup
try {
  if (fs.existsSync(UPDATE_PROGRESS_FILE)) {
    const progressData = JSON.parse(fs.readFileSync(UPDATE_PROGRESS_FILE, 'utf8'));
    if (progressData.complete === true) {
      // Update finished successfully, clean up
      fs.unlinkSync(UPDATE_PROGRESS_FILE);
      console.log('[UPDATE] Mise a jour precedente terminee avec succes, nettoyage effectue.');
    } else {
      // Update was in progress when server restarted - mark as complete
      fs.writeFileSync(UPDATE_PROGRESS_FILE, JSON.stringify({ step: 5, percent: 100, status: 'Termine', complete: true }));
      console.log('[UPDATE] Mise a jour precedente incomplete, marquee comme terminee.');
    }
    isUpdating = false;
  }
} catch (e) {
  console.warn('[UPDATE] Erreur lecture update-progress.json:', e.message);
  try { fs.unlinkSync(UPDATE_PROGRESS_FILE); } catch {}
  isUpdating = false;
}

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
  musicgen: 'http://localhost:8030',
  demucs: 'http://localhost:8040',
  insightface: 'http://localhost:8050',
  clip: 'http://localhost:8060',
  animatediff: 'http://localhost:8070',
  lipsync: 'http://localhost:8080',
  rife: 'http://localhost:8090',
  esrgan: 'http://localhost:8100',
};

// ===================================================================
// VERIFICATIONS AU DEMARRAGE
// ===================================================================

if (!fs.existsSync(MEDIA_FOLDER)) {
  console.warn('ATTENTION: MEDIA_FOLDER introuvable:', MEDIA_FOLDER);
  console.warn('-> Le serveur demarre quand meme, mais /api/files sera vide.');
}

// Créer le fichier de données s'il n'existe pas
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tags: [], playlists: [], media: [] }, null, 2));
}

// ===================================================================
// UTILITAIRES
// ===================================================================

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

// ===================================================================
// SERVEUR HTTP
// ===================================================================

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, \`http://localhost:\${PORT}\`);
  const pathname = url.pathname;

  try {
    // Safety timeout: auto-exit maintenance mode after 10 minutes
    if (isUpdating && updateStartedAt && (Date.now() - updateStartedAt > UPDATE_TIMEOUT_MS)) {
      console.warn('[UPDATE] Timeout de securite atteint (10min), sortie du mode maintenance.');
      isUpdating = false;
      updateStartedAt = null;
      try { fs.unlinkSync(UPDATE_PROGRESS_FILE); } catch {}
    }

    // Serve maintenance page if updating (except for API endpoints)
    if (isUpdating && !pathname.startsWith('/api/')) {
      const maintenancePath = path.join(DIST_FOLDER, 'maintenance.html');
      if (fs.existsSync(maintenancePath)) {
        res.writeHead(503, { 'Content-Type': 'text/html', 'Retry-After': '30' });
        return fs.createReadStream(maintenancePath).pipe(res);
      }
    }

    // ===================================================================
    // API: Update status (for maintenance page polling)
    // ===================================================================

    if (pathname === '/api/update/status' && req.method === 'GET') {
      let progress = { step: 0, percent: 0, status: 'En attente...', complete: false };
      try {
        if (fs.existsSync(UPDATE_PROGRESS_FILE)) {
          progress = JSON.parse(fs.readFileSync(UPDATE_PROGRESS_FILE, 'utf8'));
        }
      } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ isUpdating, ...progress }));
    }

    // ===================================================================
    // API: Sante et Status
    // ===================================================================
    
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Security: Don't expose full file system paths - only return status
      return res.end(JSON.stringify({ status: 'ok', configured: !!MEDIA_FOLDER }));
    }

    if (pathname === '/api/ai/status') {
      const statuses = {};
      for (const [name, url] of Object.entries(AI_CONFIG)) {
        try {
          const response = await fetch(\`\${url}/health\`).catch(() => null);
          statuses[name] = response?.ok || false;
        } catch {
          statuses[name] = false;
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(statuses));
    }

    // ===================================================================
    // API: Verification des installations IA
    // ===================================================================

    if (pathname === '/api/ai/check-installed' && req.method === 'GET') {
      // Secure command execution with spawn + allowlist
      const ALLOWED_VERSION_CHECKS = {
        ollama: { cmd: 'ollama', args: ['--version'] },
        python: { cmd: 'python', args: ['--version'] },
        pip: { cmd: 'pip', args: ['--version'] },
        git: { cmd: 'git', args: ['--version'] }
      };

      const checkCommand = (key) => {
        return new Promise((resolve) => {
          const entry = ALLOWED_VERSION_CHECKS[key];
          if (!entry) {
            resolve({ installed: false, version: null });
            return;
          }
          const child = spawn(entry.cmd, entry.args, { shell: false, windowsHide: true });
          let stdout = '';
          child.stdout.on('data', (data) => { stdout += data.toString(); });
          child.on('close', (code) => {
            resolve({ installed: code === 0, version: stdout?.trim() || null });
          });
          child.on('error', () => {
            resolve({ installed: false, version: null });
          });
        });
      };

      const checkPath = (p) => {
        return { installed: fs.existsSync(p), path: p };
      };

      const results = {
        ollama: await checkCommand('ollama'),
        python: await checkCommand('python'),
        pip: await checkCommand('pip'),
        git: await checkCommand('git'),
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

    // ===================================================================
    // API: Logs des services IA
    // ===================================================================

    if (pathname === '/api/ai/logs' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ logs: logsBuffer }));
    }

    if (pathname === '/api/ai/logs' && req.method === 'DELETE') {
      logsBuffer = [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }

    // ===================================================================
    // API: Dernier log d'installation (pour diagnostic)
    // ===================================================================

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
          return res.end(JSON.stringify({ error: 'Aucun fichier log trouve', path: logsDir }));
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


    // ===================================================================
    // API: Webhooks de notification
    // ===================================================================

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
          await fetch(\`https://api.telegram.org/bot\${botToken}/sendMessage\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
          });
        }
        addLog('info', 'server', \`Webhook \${type} envoye avec succes\`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        addLog('error', 'server', \`Erreur webhook \${type}: \${e.message}\`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ===================================================================
    // API: Gestion des donnees (tags, playlists, medias)
    // ===================================================================

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

    // ===================================================================
    // API: Fichiers medias
    // ===================================================================

    if (pathname === '/api/files') {
      const isSupported = (name) => /\\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|mp3|wav)$/i.test(name);
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
                url: \`http://localhost:\${PORT}/media/\${urlPath}\`,
                thumbnailUrl: \`http://localhost:\${PORT}/api/thumbnail/\${encodedAbsPath}\`,
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

    // ===================================================================
    // API: Miniatures en resolution reduite
    // ===================================================================

    if (pathname.startsWith('/api/thumbnail/')) {
      if (typeof global.__thumbActive === 'undefined') global.__thumbActive = 0;
      if (global.__thumbActive >= 10) {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '2' });
        return res.end(JSON.stringify({ error: 'Trop de requetes simultanees' }));
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

        const cacheDir = path.join(__dirname, '.thumbnail-cache');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

        const hash = Buffer.from(normalizedFilePath).toString('base64url').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
        const cachePath = path.join(cacheDir, hash + '.jpg');

        if (fs.existsSync(cachePath)) {
          const stat = fs.statSync(cachePath);
          res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': stat.size, 'Cache-Control': 'public, max-age=31536000, immutable' });
          return fs.createReadStream(cachePath).pipe(res);
        }

        if (isImage) {
          try {
            const sharp = require('sharp');
            const buffer = await sharp(normalizedFilePath).resize(400, 400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
            fs.writeFileSync(cachePath, buffer);
            res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': buffer.length, 'Cache-Control': 'public, max-age=31536000, immutable' });
            return res.end(buffer);
          } catch {
            const stat = fs.statSync(normalizedFilePath);
            res.writeHead(200, { 'Content-Type': getMimeType(ext), 'Content-Length': stat.size, 'Cache-Control': 'public, max-age=31536000' });
            return fs.createReadStream(normalizedFilePath).pipe(res);
          }
        }

        if (isVideo) {
          const ffmpegPath = (() => {
            try {
              const userProfile = process.env.USERPROFILE || '';
              const installRoot = path.join(userProfile, 'MediaVault-AI', 'ffmpeg');
              if (fs.existsSync(installRoot)) {
                const dirs = fs.readdirSync(installRoot).filter(d => { try { return fs.statSync(path.join(installRoot, d)).isDirectory() && d.startsWith('ffmpeg'); } catch { return false; } });
                if (dirs.length > 0) {
                  const exe = path.join(installRoot, dirs[0], 'bin', 'ffmpeg.exe');
                  if (fs.existsSync(exe)) return exe;
                }
              }
            } catch {}
            return 'ffmpeg';
          })();
          try {
            await new Promise((resolve, reject) => {
              exec(\`"\${ffmpegPath}" -i "\${normalizedFilePath}" -ss 00:00:01 -vframes 1 -vf "scale=400:-2" -q:v 5 "\${cachePath}" -y\`, { timeout: 15000 }, (error) => error ? reject(error) : resolve());
            });
            if (fs.existsSync(cachePath)) {
              const stat = fs.statSync(cachePath);
              res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': stat.size, 'Cache-Control': 'public, max-age=31536000, immutable' });
              return fs.createReadStream(cachePath).pipe(res);
            }
          } catch {}
          res.writeHead(204);
          return res.end();
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Type non supporte' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      } finally {
        global.__thumbActive--;
      }
    }

    // ===================================================================
    // API: Reveler dans l'explorateur
    // ===================================================================

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
          const winPath = normalizedFilePath.replace(/\\//g, '\\\\');
          exec('C:\\\\Windows\\\\explorer.exe /select,"' + winPath + '"', (err) => {
            if (err) console.error('reveal-in-explorer error:', err.message);
          });
        } else if (platform === 'darwin') {
          exec(\`open -R "\${normalizedFilePath}"\`);
        } else {
          exec(\`xdg-open "\${path.dirname(normalizedFilePath)}"\`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ===================================================================
    // API: Dependances serveur (sharp)
    // ===================================================================

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
        // Creer package.json s'il n'existe pas (requis pour npm install)
        const pkgPath = path.join(__dirname, 'package.json');
        if (!fs.existsSync(pkgPath)) {
          fs.writeFileSync(pkgPath, JSON.stringify({ name: 'mediavault-server', private: true, dependencies: {} }, null, 2));
          addLog('info', 'server', 'package.json cree automatiquement');
        }
        const child = spawn('npm', ['install', 'sharp', '--save'], { cwd: __dirname, shell: true });
        let output = '';
        child.stdout.on('data', (d) => { output += d.toString(); });
        child.stderr.on('data', (d) => { output += d.toString(); });
        child.on('close', (code) => {
          if (code === 0) {
            addLog('info', 'server', 'sharp installe avec succes');
            let verified = false;
            try { delete require.cache[require.resolve('sharp')]; require('sharp'); verified = true; } catch {}
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, verified, message: verified ? 'Sharp installe et verifie !' : 'Sharp installe mais necessite un redemarrage du serveur.', output: output.trim() }));
          } else {
            addLog('error', 'server', 'Echec installation sharp: ' + output);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Echec installation', output: output.trim() }));
          }
        });
        child.on('error', (err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ===================================================================
    // API: Cache des miniatures
    // ===================================================================

    if (pathname === '/api/cache-stats' && req.method === 'GET') {
      const cacheDir = path.join(__dirname, '.thumbnail-cache');
      try {
        if (!fs.existsSync(cacheDir)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ files: 0, sizeBytes: 0, sizeFormatted: '0 B' }));
        }
        const entries = fs.readdirSync(cacheDir);
        let totalSize = 0;
        for (const f of entries) {
          try { totalSize += fs.statSync(path.join(cacheDir, f)).size; } catch {}
        }
        const formatSize = (b) => {
          if (b < 1024) return b + ' B';
          if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
          if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
          return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ files: entries.length, sizeBytes: totalSize, sizeFormatted: formatSize(totalSize) }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    if (pathname === '/api/cache' && req.method === 'DELETE') {
      const cacheDir = path.join(__dirname, '.thumbnail-cache');
      try {
        if (fs.existsSync(cacheDir)) {
          const entries = fs.readdirSync(cacheDir);
          for (const f of entries) {
            try { fs.unlinkSync(path.join(cacheDir, f)); } catch {}
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // ===================================================================
    // API: Diagnostic du cache
    // ===================================================================

    if (pathname === '/api/cache-diagnostic' && req.method === 'GET') {
      const cacheDir = path.join(__dirname, '.thumbnail-cache');
      const results = { cacheDir, cacheDirExists: false, cacheDirWritable: false, sharpAvailable: false, ffmpegAvailable: false, totalMedia: 0, cachedCount: 0, missingCount: 0, errors: [] };
      try {
        if (fs.existsSync(cacheDir)) {
          results.cacheDirExists = true;
          const testFile = path.join(cacheDir, '__test_write__');
          try { fs.writeFileSync(testFile, 'test'); fs.unlinkSync(testFile); results.cacheDirWritable = true; } catch (e) { results.errors.push('Cache non inscriptible: ' + e.message); }
        } else {
          try { fs.mkdirSync(cacheDir, { recursive: true }); results.cacheDirExists = true; results.cacheDirWritable = true; } catch (e) { results.errors.push('Impossible de creer le cache: ' + e.message); }
        }
      } catch (e) { results.errors.push('Erreur acces cache: ' + e.message); }
      try { require('sharp'); results.sharpAvailable = true; } catch { results.errors.push('Sharp non disponible'); }
      try {
        await new Promise((resolve) => { exec('ffmpeg -version', { timeout: 5000 }, (err) => { results.ffmpegAvailable = !err; resolve(); }); });
      } catch {}
      const isSupported = (name) => /\\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|mp3|wav)$/i.test(name);
      const countFiles = (dir) => { let c = 0; try { const e = fs.readdirSync(dir, { withFileTypes: true }); for (const i of e) { if (i.isDirectory()) c += countFiles(path.join(dir, i.name)); else if (i.isFile() && isSupported(i.name)) c++; } } catch {} return c; };
      results.totalMedia = countFiles(MEDIA_FOLDER);
      try { results.cachedCount = results.cacheDirExists ? fs.readdirSync(cacheDir).length : 0; } catch {}
      results.missingCount = Math.max(0, results.totalMedia - results.cachedCount);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(results));
    }

    // ===================================================================
    // API: Pre-generer toutes les miniatures
    // ===================================================================

    if (pathname === '/api/generate-thumbnails' && req.method === 'POST') {
      const cacheDir = path.join(__dirname, '.thumbnail-cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      let sharpModule = null;
      try { sharpModule = require('sharp'); } catch {}
      const isSupported = (name) => /\\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(name);
      const isImage = (ext) => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      const isVideo = (ext) => ['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext);
      const allFiles = [];
      const collectFiles = (dir) => { try { const e = fs.readdirSync(dir, { withFileTypes: true }); for (const i of e) { const a = path.join(dir, i.name); if (i.isDirectory()) collectFiles(a); else if (i.isFile() && isSupported(i.name)) allFiles.push(a); } } catch {} };
      collectFiles(MEDIA_FOLDER);
      let generated = 0, skipped = 0, errors = 0;
      for (const filePath of allFiles) {
        const hash = Buffer.from(filePath).toString('base64url').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
        const cachePath = path.join(cacheDir, hash + '.jpg');
        if (fs.existsSync(cachePath)) { skipped++; continue; }
        const ext = path.extname(filePath).toLowerCase();
        if (isImage(ext) && sharpModule) {
          try { const buf = await sharpModule(filePath).resize(400, 400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer(); fs.writeFileSync(cachePath, buf); generated++; } catch { errors++; }
        } else if (isVideo(ext)) {
          try { await new Promise((resolve, reject) => { exec(\`ffmpeg -i "\${filePath}" -ss 00:00:01 -vframes 1 -vf "scale=400:-2" -q:v 5 "\${cachePath}" -y\`, { timeout: 15000 }, (error) => error ? reject(error) : resolve()); }); if (fs.existsSync(cachePath)) generated++; else errors++; } catch { errors++; }
        } else { skipped++; }
      }
      addLog('info', 'server', \`Pre-generation terminee: \${generated} generees, \${skipped} deja en cache, \${errors} erreurs sur \${allFiles.length} fichiers\`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ total: allFiles.length, generated, skipped, errors }));
    }

    // ===================================================================
    // API: Mise a jour et Restauration
    // ===================================================================

    if (pathname === '/api/update' && req.method === 'POST') {
      const body = await parseBody(req);
      const showMaintenance = body.showMaintenance !== false; // default true
      
      const updateScript = path.join(__dirname, 'Mettre a jour MediaVault.bat');
      // Security: validate the script path is within project directory
      const normalizedScript = path.normalize(updateScript);
      const normalizedDir = path.normalize(__dirname);
      if (!normalizedScript.startsWith(normalizedDir) || !fs.existsSync(updateScript)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Script de mise a jour introuvable' }));
      }
      
      // Initialize update progress file
      fs.writeFileSync(UPDATE_PROGRESS_FILE, JSON.stringify({ step: 0, percent: 0, status: 'Demarrage...', complete: false }));
      
      // Enable maintenance mode only if requested
      if (showMaintenance) {
        isUpdating = true;
        updateStartedAt = Date.now();
      }
      
      // Use spawn with shell:false for security
      const child = spawn('cmd', ['/c', 'start', 'cmd', '/c', normalizedScript], {
        shell: false,
        cwd: __dirname,
        windowsHide: false
      });
      child.on('error', (err) => {
        isUpdating = false;
        updateStartedAt = null;
        try { fs.unlinkSync(UPDATE_PROGRESS_FILE); } catch {}
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      child.on('spawn', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Mise a jour lancee', maintenance: showMaintenance }));
      });
      return;
    }

    if (pathname === '/api/restore' && req.method === 'POST') {
      const body = await parseBody(req);
      const version = body.version;
      if (!version) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Version requise' }));
      }
      // Security: strict validation - only allow git refs (alphanumeric, hyphens, dots, slashes)
      const safeVersionRegex = /^[a-zA-Z0-9._\\-\\/]+$/;
      if (!safeVersionRegex.test(version) || version.length > 100) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Version invalide' }));
      }
      // Use spawn with argument array for security
      const child = spawn('git', ['checkout', version], { 
        cwd: __dirname, 
        shell: false,
        windowsHide: true
      });
      let stderr = '';
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      child.on('close', (code) => {
        if (code !== 0) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: stderr || 'Git checkout failed' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: \`Restauration vers \${version}\` }));
      });
      child.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    // ===================================================================
    // API: OLLAMA - Generation de texte
    // ===================================================================

    if (pathname === '/api/ai/ollama/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      addLog('info', 'ollama', \`Generation de texte: \${body.prompt?.substring(0, 50)}...\`);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.ollama}/api/generate\`, 'POST', body);
        addLog('info', 'ollama', 'Generation terminee');
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        addLog('error', 'ollama', \`Erreur: \${e.message}\`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Ollama non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/ollama/chat' && req.method === 'POST') {
      const body = await parseBody(req);
      addLog('info', 'ollama', 'Chat demarre');
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.ollama}/api/chat\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Ollama non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/ollama/models') {
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.ollama}/api/tags\`, 'GET');
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Ollama non disponible' }));
      }
    }

    // ===================================================================
    // API: COMFYUI - Generation d'images
    // ===================================================================

    if (pathname === '/api/ai/comfyui/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.comfyui}/prompt\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ComfyUI non disponible', details: e.message }));
      }
    }

    if (pathname === '/api/ai/comfyui/history') {
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.comfyui}/history\`, 'GET');
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ComfyUI non disponible' }));
      }
    }

    // ===================================================================
    // API: WHISPER - Transcription audio
    // ===================================================================

    if (pathname === '/api/ai/whisper/transcribe' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.whisper}/transcribe\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Whisper non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: XTTS - Clonage vocal
    // ===================================================================

    if (pathname === '/api/ai/xtts/synthesize' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.xtts}/tts_to_audio\`, 'POST', body);
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
        const result = await proxyRequest(\`\${AI_CONFIG.xtts}/clone_speaker\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'XTTS non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: MUSICGEN - Generation de musique
    // ===================================================================

    if (pathname === '/api/ai/musicgen/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.musicgen}/generate\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'MusicGen non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: DEMUCS - Separation de pistes audio
    // ===================================================================

    if (pathname === '/api/ai/demucs/separate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.demucs}/separate\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Demucs non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: INSIGHTFACE - Reconnaissance faciale
    // ===================================================================

    if (pathname === '/api/ai/insightface/detect' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.insightface}/detect\`, 'POST', body);
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
        const result = await proxyRequest(\`\${AI_CONFIG.insightface}/recognize\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'InsightFace non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: CLIP - Recherche semantique et tagging
    // ===================================================================

    if (pathname === '/api/ai/clip/embed' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.clip}/embed\`, 'POST', body);
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
        const result = await proxyRequest(\`\${AI_CONFIG.clip}/search\`, 'POST', body);
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
        const result = await proxyRequest(\`\${AI_CONFIG.clip}/classify\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'CLIP non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: ANIMATEDIFF - Generation video
    // ===================================================================

    if (pathname === '/api/ai/animatediff/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.animatediff}/generate\`, 'POST', body);
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
        const result = await proxyRequest(\`\${AI_CONFIG.animatediff}/img2vid\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'AnimateDiff non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: LIPSYNC - Synchronisation labiale
    // ===================================================================

    if (pathname === '/api/ai/lipsync/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.lipsync}/generate\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'LipSync non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: RIFE - Interpolation de frames
    // ===================================================================

    if (pathname === '/api/ai/rife/interpolate' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.rife}/interpolate\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'RIFE non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: ESRGAN - Upscaling d'images
    // ===================================================================

    if (pathname === '/api/ai/esrgan/upscale' && req.method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = await proxyRequest(\`\${AI_CONFIG.esrgan}/upscale\`, 'POST', body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result.data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ESRGAN non disponible', details: e.message }));
      }
    }

    // ===================================================================
    // API: Workflows et Batch Processing
    // ===================================================================

    if (pathname === '/api/ai/workflow/execute' && req.method === 'POST') {
      const body = await parseBody(req);
      const { steps } = body;
      const results = [];
      
      for (const step of steps) {
        try {
          const serviceUrl = AI_CONFIG[step.service];
          if (!serviceUrl) {
            results.push({ step: step.id, error: \`Service \${step.service} inconnu\` });
            continue;
          }
          const result = await proxyRequest(\`\${serviceUrl}\${step.endpoint}\`, 'POST', step.params);
          results.push({ step: step.id, success: true, data: result.data });
        } catch (e) {
          results.push({ step: step.id, error: e.message });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ results }));
    }

    // ===================================================================
    // API: Installation automatique des modeles IA
    // ===================================================================

    if (pathname === '/api/ai/install' && req.method === 'POST') {
      const body = await parseBody(req);
      const { component } = body;
      
      // Security: strict allowlist with pre-defined commands (no user input in command)
      const installCommands = {
        ollama: { cmd: 'winget', args: ['install', 'Ollama.Ollama', '--accept-source-agreements', '--accept-package-agreements'] },
        comfyui: { cmd: 'git', args: ['clone', 'https://github.com/comfyanonymous/ComfyUI.git', 'C:\\\\AI\\\\ComfyUI'] },
        whisper: { cmd: 'pip', args: ['install', 'openai-whisper'] },
        xtts: { cmd: 'pip', args: ['install', 'TTS'] },
        musicgen: { cmd: 'pip', args: ['install', 'audiocraft'] },
        demucs: { cmd: 'pip', args: ['install', 'demucs'] },
        insightface: { cmd: 'pip', args: ['install', 'insightface', 'onnxruntime-gpu'] },
        clip: { cmd: 'pip', args: ['install', 'clip-interrogator'] },
        animatediff: { cmd: 'git', args: ['clone', 'https://github.com/guoyww/AnimateDiff.git', 'C:\\\\AI\\\\AnimateDiff'] },
        rife: { cmd: 'pip', args: ['install', 'rife-ncnn-vulkan'] },
        esrgan: { cmd: 'pip', args: ['install', 'realesrgan'] },
      };
      
      const entry = installCommands[component];
      if (!entry) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: \`Composant \${component} inconnu\` }));
      }
      
      // Use spawn with argument array for security (no shell injection)
      const child = spawn(entry.cmd, entry.args, { shell: false, windowsHide: true });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      child.on('close', (code) => {
        if (code !== 0) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: \`Exit code \${code}\`, stderr }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, stdout }));
      });
      child.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    // ===================================================================
    // API: AGENT LOCAL - Controle a distance securise
    // ===================================================================

    // Whitelist des commandes autorisees - separated into scripts and simple commands
    const ALLOWED_SCRIPTS = {
      // Scripts d'installation (validated paths)
      'step-00': path.join(__dirname, 'public', 'scripts', 'step-00-prepare.bat'),
      'step-01': path.join(__dirname, 'public', 'scripts', 'step-01-prereqs.bat'),
      'step-02': path.join(__dirname, 'public', 'scripts', 'step-02-python311.bat'),
      'step-03': path.join(__dirname, 'public', 'scripts', 'step-03-git.bat'),
      'step-04': path.join(__dirname, 'public', 'scripts', 'step-04-ollama.bat'),
      'step-05': path.join(__dirname, 'public', 'scripts', 'step-05-run-complete-installer.bat'),
      // Maintenance
      'diagnose': path.join(__dirname, 'public', 'scripts', 'diagnose-ai-suite.bat'),
      'start-services': path.join(__dirname, 'public', 'scripts', 'start-ai-services.bat'),
      'stop-services': path.join(__dirname, 'public', 'scripts', 'stop-ai-services.bat'),
      'uninstall': path.join(__dirname, 'public', 'scripts', 'uninstall-ai-suite.bat'),
    };

    // Simple commands with spawn arguments (no shell injection possible)
    const ALLOWED_SIMPLE_COMMANDS = {
      'ollama-version': { cmd: 'ollama', args: ['--version'] },
      'python-version': { cmd: 'python', args: ['--version'] },
      'nvidia-smi': { cmd: 'nvidia-smi', args: ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader'] },
      'git-version': { cmd: 'git', args: ['--version'] },
      'pip-version': { cmd: 'pip', args: ['--version'] },
      'tasklist': { cmd: 'tasklist', args: ['/FI', 'IMAGENAME eq python.exe', '/FI', 'IMAGENAME eq ollama.exe', '/FO', 'CSV'] },
    };

    const ALLOWED_COMMANDS = {
      ...ALLOWED_SCRIPTS,
      ...Object.fromEntries(Object.keys(ALLOWED_SIMPLE_COMMANDS).map(k => [k, k])),
      'auto-install': 'AUTO_INSTALL_SEQUENCE',
    };

    // Sequence d'installation automatique
    const AUTO_INSTALL_STEPS = [
      { id: 'step-00', label: 'Preparation des dossiers' },
      { id: 'step-01', label: 'Verification des prerequis' },
      { id: 'step-02', label: 'Installation Python 3.11' },
      { id: 'step-03', label: 'Installation Git' },
      { id: 'step-04', label: 'Installation Ollama' },
      { id: 'step-05', label: 'Installation Suite IA complete' },
      { id: 'start-services', label: 'Demarrage des services' },
    ];

    // Security helper: validate script path is within allowed directory
    const validateScriptPath = (scriptPath) => {
      if (!scriptPath || scriptPath === 'AUTO_INSTALL_SEQUENCE') return false;
      const normalizedScript = path.normalize(scriptPath);
      const normalizedDir = path.normalize(__dirname);
      return normalizedScript.startsWith(normalizedDir) && fs.existsSync(scriptPath);
    };

    // Executer une commande de la whitelist (secure)
    if (pathname === '/api/agent/exec' && req.method === 'POST') {
      const body = await parseBody(req);
      const { command } = body;

      if (!command || !ALLOWED_COMMANDS[command]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
          error: 'Commande non autorisee', 
          allowed: Object.keys(ALLOWED_COMMANDS) 
        }));
      }

      addLog('info', 'agent', \`Execution: \${command}\`);

      // Handle simple commands with spawn (no shell)
      if (ALLOWED_SIMPLE_COMMANDS[command]) {
        const { cmd, args } = ALLOWED_SIMPLE_COMMANDS[command];
        const child = spawn(cmd, args, { shell: false, windowsHide: true, cwd: __dirname });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        child.on('close', (code) => {
          const result = {
            command,
            success: code === 0,
            exitCode: code || 0,
            stdout,
            stderr,
            timestamp: new Date().toISOString()
          };
          if (code !== 0) {
            addLog('error', 'agent', \`Echec \${command}: code \${code}\`);
          } else {
            addLog('info', 'agent', \`Succes \${command}\`);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        });
        child.on('error', (err) => {
          addLog('error', 'agent', \`Erreur \${command}: \${err.message}\`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            command,
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: err.message,
            timestamp: new Date().toISOString()
          }));
        });
        return;
      }

      // Handle scripts with validated paths
      const scriptPath = ALLOWED_SCRIPTS[command];
      if (scriptPath && validateScriptPath(scriptPath)) {
        const child = spawn('cmd', ['/c', scriptPath], { 
          shell: false, 
          cwd: __dirname,
          windowsHide: true,
          timeout: 300000
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        child.on('close', (code) => {
          const result = {
            command,
            success: code === 0,
            exitCode: code || 0,
            stdout,
            stderr,
            timestamp: new Date().toISOString()
          };
          if (code !== 0) {
            addLog('error', 'agent', \`Echec \${command}: code \${code}\`);
          } else {
            addLog('info', 'agent', \`Succes \${command}\`);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        });
        child.on('error', (err) => {
          addLog('error', 'agent', \`Erreur \${command}: \${err.message}\`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            command,
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: err.message,
            timestamp: new Date().toISOString()
          }));
        });
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Commande invalide ou script introuvable' }));
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
      
      // Securite: verifier que le chemin est bien dans logs
      if (!fullPath.startsWith(logsDir)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Acces refuse - hors du dossier logs' }));
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

    // Processus en cours (secure: no user input in command)
    if (pathname === '/api/agent/processes' && req.method === 'GET') {
      const child = spawn('tasklist', ['/FO', 'CSV', '/NH'], { shell: false, windowsHide: true });
      let stdout = '';
      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.on('close', (code) => {
        if (code !== 0) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'tasklist failed' }));
        }

        const lines = stdout.trim().split('\\n');
        const processes = [];
        const relevantNames = ['python', 'ollama', 'node', 'comfyui', 'whisper'];

        for (const line of lines) {
          const match = line.match(/"([^"]+)","(\\d+)","([^"]+)","(\\d+)","([^"]+)"/);
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
      child.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    // Informations systeme (secure: all commands are hardcoded with spawn)
    if (pathname === '/api/agent/system-info' && req.method === 'GET') {
      // Security: Don't expose full file system paths in API responses
      const info = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        mediaFolderConfigured: !!MEDIA_FOLDER,
        aiDirConfigured: fs.existsSync(path.join(process.env.USERPROFILE || '', 'MediaVault-AI'))
      };

      // Recuperer infos GPU si disponible (secure spawn)
      const gpuChild = spawn('nvidia-smi', ['--query-gpu=name,memory.total,memory.free,temperature.gpu', '--format=csv,noheader'], { shell: false, windowsHide: true });
      let gpuOut = '';
      gpuChild.stdout.on('data', (data) => { gpuOut += data.toString(); });
      gpuChild.on('close', (gpuCode) => {
        if (gpuCode === 0 && gpuOut) {
          const gpuData = gpuOut.trim().split(',').map(s => s.trim());
          info.gpu = {
            name: gpuData[0],
            memoryTotal: gpuData[1],
            memoryFree: gpuData[2],
            temperature: gpuData[3]
          };
        }

        // Recuperer espace disque (secure spawn)
        const diskChild = spawn('wmic', ['logicaldisk', 'get', 'size,freespace,caption'], { shell: false, windowsHide: true });
        let diskOut = '';
        diskChild.stdout.on('data', (data) => { diskOut += data.toString(); });
        diskChild.on('close', () => {
          if (diskOut) {
            const lines = diskOut.trim().split('\\n').slice(1);
            info.disks = [];
            for (const line of lines) {
              const parts = line.trim().split(/\\s+/);
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
        diskChild.on('error', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(info));
        });
      });
      gpuChild.on('error', () => {
        // GPU not available, continue without
        const diskChild = spawn('wmic', ['logicaldisk', 'get', 'size,freespace,caption'], { shell: false, windowsHide: true });
        let diskOut = '';
        diskChild.stdout.on('data', (data) => { diskOut += data.toString(); });
        diskChild.on('close', () => {
          if (diskOut) {
            const lines = diskOut.trim().split('\\n').slice(1);
            info.disks = [];
            for (const line of lines) {
              const parts = line.trim().split(/\\s+/);
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
        diskChild.on('error', () => {
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
        return res.end(JSON.stringify({ error: 'Commande non autorisee' }));
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Gestion speciale pour auto-install: enchainer toutes les etapes
      if (command === 'auto-install') {
        const runStep = (stepIndex) => {
          if (stepIndex >= AUTO_INSTALL_STEPS.length) {
            res.write(\`data: \${JSON.stringify({ type: 'success', text: 'Installation automatique terminee avec succes!' })}\\n\\n\`);
            res.write(\`data: \${JSON.stringify({ type: 'exit', code: 0 })}\\n\\n\`);
            res.end();
            return;
          }

          const step = AUTO_INSTALL_STEPS[stepIndex];
          const stepCmd = ALLOWED_COMMANDS[step.id];
          
          if (!stepCmd || stepCmd === 'AUTO_INSTALL_SEQUENCE') {
            runStep(stepIndex + 1);
            return;
          }

          res.write(\`data: \${JSON.stringify({ type: 'info', text: '\\n======================================' })}\\n\\n\`);
          res.write(\`data: \${JSON.stringify({ type: 'info', text: \`  Etape \${stepIndex + 1}/\${AUTO_INSTALL_STEPS.length}: \${step.label}\` })}\\n\\n\`);
          res.write(\`data: \${JSON.stringify({ type: 'info', text: '======================================\\n' })}\\n\\n\`);

          // Security: validate script path before execution
          const scriptPath = ALLOWED_SCRIPTS[step.id];
          if (!scriptPath || !validateScriptPath(scriptPath)) {
            runStep(stepIndex + 1);
            return;
          }

          const child = spawn('cmd', ['/c', scriptPath], {
            cwd: __dirname,
            shell: false,
            windowsHide: true
          });

          child.stdout.on('data', (data) => {
            const lines = data.toString().split('\\n');
            for (const line of lines) {
              if (line.trim()) {
                res.write(\`data: \${JSON.stringify({ type: 'stdout', text: line })}\\n\\n\`);
              }
            }
          });

          child.stderr.on('data', (data) => {
            const lines = data.toString().split('\\n');
            for (const line of lines) {
              if (line.trim()) {
                res.write(\`data: \${JSON.stringify({ type: 'stderr', text: line })}\\n\\n\`);
              }
            }
          });

          child.on('close', (code) => {
            if (code !== 0) {
              res.write(\`data: \${JSON.stringify({ type: 'error', text: \`Echec a l'etape: \${step.label} (code: \${code})\` })}\\n\\n\`);
              res.write(\`data: \${JSON.stringify({ type: 'exit', code })}\\n\\n\`);
              res.end();
            } else {
              res.write(\`data: \${JSON.stringify({ type: 'success', text: \`\${step.label} termine\` })}\\n\\n\`);
              // Passer a l'etape suivante
              runStep(stepIndex + 1);
            }
          });

          child.on('error', (err) => {
            res.write(\`data: \${JSON.stringify({ type: 'error', text: \`Erreur: \${err.message}\` })}\\n\\n\`);
            res.write(\`data: \${JSON.stringify({ type: 'exit', code: 1 })}\\n\\n\`);
            res.end();
          });
        };

        runStep(0);
        req.on('close', () => {
          // L'utilisateur a ferme la connexion
        });
        return;
      }

      // Commande simple (non auto-install) - use secure spawn
      // Handle simple commands with spawn (no shell)
      if (ALLOWED_SIMPLE_COMMANDS[command]) {
        const { cmd: execCmd, args } = ALLOWED_SIMPLE_COMMANDS[command];
        const child = spawn(execCmd, args, {
          cwd: __dirname,
          shell: false,
          windowsHide: true
        });

        addLog('info', 'agent', \`Stream demarre: \${command}\`);

        child.stdout.on('data', (data) => {
          const lines = data.toString().split('\\n');
          for (const line of lines) {
            if (line.trim()) {
              res.write(\`data: \${JSON.stringify({ type: 'stdout', text: line })}\\n\\n\`);
            }
          }
        });

        child.stderr.on('data', (data) => {
          const lines = data.toString().split('\\n');
          for (const line of lines) {
            if (line.trim()) {
              res.write(\`data: \${JSON.stringify({ type: 'stderr', text: line })}\\n\\n\`);
            }
          }
        });

        child.on('close', (code) => {
          res.write(\`data: \${JSON.stringify({ type: 'exit', code })}\\n\\n\`);
          res.end();
          addLog('info', 'agent', \`Stream termine: \${command} (code: \${code})\`);
        });

        child.on('error', (err) => {
          res.write(\`data: \${JSON.stringify({ type: 'error', message: err.message })}\\n\\n\`);
          res.end();
        });

        req.on('close', () => {
          child.kill();
        });

        return;
      }

      // Handle scripts with validated paths
      const scriptPath = ALLOWED_SCRIPTS[command];
      if (scriptPath && validateScriptPath(scriptPath)) {
        const child = spawn('cmd', ['/c', scriptPath], {
          cwd: __dirname,
          shell: false,
          windowsHide: true
        });

      addLog('info', 'agent', \`Stream demarre: \${command}\`);

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\\n');
        for (const line of lines) {
          if (line.trim()) {
            res.write(\`data: \${JSON.stringify({ type: 'stdout', text: line })}\\n\\n\`);
          }
        }
      });

      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\\n');
        for (const line of lines) {
          if (line.trim()) {
            res.write(\`data: \${JSON.stringify({ type: 'stderr', text: line })}\\n\\n\`);
          }
        }
      });

      child.on('close', (code) => {
        res.write(\`data: \${JSON.stringify({ type: 'exit', code })}\\n\\n\`);
        res.end();
        addLog('info', 'agent', \`Stream termine: \${command} (code: \${code})\`);
      });

      child.on('error', (err) => {
        res.write(\`data: \${JSON.stringify({ type: 'error', message: err.message })}\\n\\n\`);
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

    // ===================================================================
    // API: Vérification FFmpeg
    // ===================================================================

    if (pathname === '/api/check-ffmpeg' && req.method === 'GET') {
      const respondOk = (payload) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      const parseVersion = (stdout) => {
        const versionMatch = String(stdout || '').match(/ffmpeg version ([^\\s]+)/);
        return versionMatch ? versionMatch[1] : 'unknown';
      };

      // Security: use spawn with argument array (no shell injection)
      const child = spawn('ffmpeg', ['-version'], { shell: false, windowsHide: true });
      let stdout = '';
      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.on('close', (code) => {
        if (code === 0) {
          return respondOk({ installed: true, version: parseVersion(stdout), output: String(stdout).split('\\n')[0] });
        }

        // Try MediaVault install location
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
                const currentPath = process.env.PATH || '';
                if (!currentPath.toLowerCase().includes(binDir.toLowerCase())) {
                  process.env.PATH = binDir + ';' + currentPath;
                }

                // Security: use spawn with full path (no shell injection)
                const child2 = spawn(ffmpegExe, ['-version'], { shell: false, windowsHide: true });
                let stdout2 = '';
                child2.stdout.on('data', (data) => { stdout2 += data.toString(); });
                child2.on('close', (code2) => {
                  if (code2 !== 0) {
                    return respondOk({ installed: false, error: 'FFmpeg exit code ' + code2, hint: 'FFmpeg trouvé mais non exécutable' });
                  }
                  return respondOk({ installed: true, version: parseVersion(stdout2), output: String(stdout2).split('\\n')[0], path: binDir, source: 'mediavault-install' });
                });
                child2.on('error', (err2) => {
                  return respondOk({ installed: false, error: err2.message, hint: 'FFmpeg trouvé mais erreur execution' });
                });
                return;
              }
            }
          }
        } catch {
          // ignore
        }

        return respondOk({ installed: false, error: 'ffmpeg not found', hint: 'FFmpeg non trouvé (PATH + dossier MediaVault-AI)' });
      });
      child.on('error', () => {
        // FFmpeg not in PATH, try MediaVault location
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
                const currentPath = process.env.PATH || '';
                if (!currentPath.toLowerCase().includes(binDir.toLowerCase())) {
                  process.env.PATH = binDir + ';' + currentPath;
                }

                const child2 = spawn(ffmpegExe, ['-version'], { shell: false, windowsHide: true });
                let stdout2 = '';
                child2.stdout.on('data', (data) => { stdout2 += data.toString(); });
                child2.on('close', (code2) => {
                  if (code2 !== 0) {
                    return respondOk({ installed: false, error: 'FFmpeg exit code ' + code2, hint: 'FFmpeg trouvé mais non exécutable' });
                  }
                  return respondOk({ installed: true, version: parseVersion(stdout2), output: String(stdout2).split('\\n')[0], path: binDir, source: 'mediavault-install' });
                });
                child2.on('error', (err2) => {
                  return respondOk({ installed: false, error: err2.message, hint: 'FFmpeg trouvé mais erreur execution' });
                });
                return;
              }
            }
          }
        } catch {
          // ignore
        }
        return respondOk({ installed: false, error: 'ffmpeg not in PATH', hint: 'FFmpeg non trouvé (PATH + dossier MediaVault-AI)' });
      });
      return;
    }

    // ===================================================================
    // API: Installation automatique FFmpeg
    // ===================================================================

    // État global de l'installation FFmpeg
    if (!global.ffmpegInstallStatus) {
      global.ffmpegInstallStatus = { step: 'idle', progress: 0, message: '' };
    }

    if (pathname === '/api/install-ffmpeg' && req.method === 'POST') {
      const INSTALL_DIR = path.join(process.env.USERPROFILE || '', 'MediaVault-AI', 'ffmpeg');
      const FFMPEG_URL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
      const TEMP_ZIP = path.join(process.env.TEMP || '/tmp', 'ffmpeg.zip');

      global.ffmpegInstallStatus = { step: 'downloading', progress: 5, message: 'Préparation du téléchargement...' };

      const installFFmpeg = async () => {
        try {
          global.ffmpegInstallStatus = { step: 'downloading', progress: 10, message: 'Création du dossier...' };
          if (!fs.existsSync(INSTALL_DIR)) {
            fs.mkdirSync(INSTALL_DIR, { recursive: true });
          }

          global.ffmpegInstallStatus = { step: 'downloading', progress: 20, message: 'Téléchargement FFmpeg (~50MB)...' };
          
          // Security: use spawn with argument array for PowerShell (hardcoded URL, no user input)
          await new Promise((resolve, reject) => {
            const psScript = '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri \\'' + FFMPEG_URL + '\\' -OutFile \\'' + TEMP_ZIP + '\\'';
            const child = spawn('powershell', ['-NoProfile', '-Command', psScript], { shell: false, windowsHide: true });
            child.on('close', (code) => {
              if (code !== 0) reject(new Error('Échec téléchargement: code ' + code));
              else resolve();
            });
            child.on('error', (err) => reject(new Error('Échec téléchargement: ' + err.message)));
          });

          if (!fs.existsSync(TEMP_ZIP)) {
            throw new Error('Fichier téléchargé introuvable');
          }

          global.ffmpegInstallStatus = { step: 'extracting', progress: 60, message: 'Extraction...' };
          
          // Security: use spawn with argument array for extraction (hardcoded paths)
          await new Promise((resolve, reject) => {
            const psExtract = 'Expand-Archive -Path \\'' + TEMP_ZIP + '\\' -DestinationPath \\'' + INSTALL_DIR + '\\' -Force';
            const child = spawn('powershell', ['-NoProfile', '-Command', psExtract], { shell: false, windowsHide: true });
            child.on('close', (code) => {
              if (code !== 0) reject(new Error('Échec extraction: code ' + code));
              else resolve();
            });
            child.on('error', (err) => reject(new Error('Échec extraction: ' + err.message)));
          });

          global.ffmpegInstallStatus = { step: 'configuring', progress: 75, message: 'Configuration...' };

          const dirs = fs.readdirSync(INSTALL_DIR).filter(d => 
            fs.statSync(path.join(INSTALL_DIR, d)).isDirectory() && d.startsWith('ffmpeg')
          );

          if (dirs.length === 0) throw new Error('Dossier FFmpeg introuvable');

          const ffmpegBinDir = path.join(INSTALL_DIR, dirs[0], 'bin');
          
          if (!fs.existsSync(path.join(ffmpegBinDir, 'ffmpeg.exe'))) {
            throw new Error('ffmpeg.exe introuvable');
          }

          global.ffmpegInstallStatus = { step: 'configuring', progress: 85, message: 'Configuration PATH...' };
          
          // Security: use spawn for setx with argument array
          await new Promise((resolve) => {
            const currentPath = process.env.PATH || '';
            const newPath = currentPath + ';' + ffmpegBinDir;
            const child = spawn('setx', ['PATH', newPath], { shell: false, windowsHide: true });
            child.on('close', () => resolve());
            child.on('error', () => resolve()); // Continue even if setx fails
          });

          try { fs.unlinkSync(TEMP_ZIP); } catch (e) {}

          global.ffmpegInstallStatus = { step: 'verifying', progress: 95, message: 'Vérification...' };
          
          const ffmpegExePath = path.join(ffmpegBinDir, 'ffmpeg.exe');
          await new Promise((resolve, reject) => {
            // Security: use spawn with full path
            const child = spawn(ffmpegExePath, ['-version'], { shell: false, windowsHide: true });
            let stdout = '';
            child.stdout.on('data', (data) => { stdout += data.toString(); });
            child.on('close', (code) => {
              if (code !== 0) reject(new Error('FFmpeg non exécutable'));
              else {
                const versionMatch = stdout.match(/ffmpeg version ([^\\s]+)/);
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
            child.on('error', (err) => reject(new Error('FFmpeg non exécutable: ' + err.message)));
          });

          addLog('info', 'ffmpeg', 'Installation réussie: ' + ffmpegBinDir);

        } catch (error) {
          global.ffmpegInstallStatus = { step: 'failed', progress: 0, message: error.message || 'Erreur' };
          addLog('error', 'ffmpeg', 'Échec: ' + error.message);
        }
      };

      installFFmpeg();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Installation démarrée' }));
    }

    if (pathname === '/api/ffmpeg-install-status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(global.ffmpegInstallStatus || { step: 'idle', progress: 0, message: '' }));
    }

    // ===================================================================
    // Servir les fichiers media
    // ===================================================================

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

    // ===================================================================
    // Servir le site (fichiers statiques)
    // ===================================================================

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

// ===================================================================
// DEMARRAGE
// ===================================================================

server.listen(PORT, () => {
  console.log('');
  console.log('================================================================');
  console.log('          MediaVault - Serveur Local avec IA                   ');
  console.log('================================================================');
  console.log(\`  Site:        http://localhost:\${PORT}\`);
  console.log(\`  Medias:      \${MEDIA_FOLDER}\`);
  console.log(\`  Build:       \${DIST_FOLDER}\`);
  console.log(\`  Donnees:     \${DATA_FILE}\`);
  console.log('================================================================');
  console.log('  APIs IA disponibles:');
  console.log('    - /api/ai/ollama/*     - Generation de texte');
  console.log('    - /api/ai/comfyui/*    - Generation d\\'images');
  console.log('    - /api/ai/whisper/*    - Transcription audio');
  console.log('    - /api/ai/xtts/*       - Clonage vocal');
  console.log('    - /api/ai/musicgen/*   - Generation de musique');
  console.log('    - /api/ai/demucs/*     - Separation de pistes');
  console.log('    - /api/ai/insightface/*- Reconnaissance faciale');
  console.log('    - /api/ai/clip/*       - Recherche semantique');
  console.log('    - /api/ai/animatediff/*- Generation video');
  console.log('    - /api/ai/lipsync/*    - Synchronisation labiale');
  console.log('    - /api/ai/rife/*       - Interpolation de frames');
  console.log('    - /api/ai/esrgan/*     - Upscaling d\\'images');
  console.log('================================================================');
  console.log('');
  console.log('Ouvrez http://localhost:' + PORT + ' dans votre navigateur');
  console.log('');
});
`;
