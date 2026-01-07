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

const MEDIA_FOLDER = 'C:/Users/VotreNom/Pictures';
const PORT = 3001;
const DIST_FOLDER = path.join(__dirname, 'dist');
const DATA_FILE = path.join(__dirname, 'data.json');
const LOG_FILE = path.join(__dirname, 'ai-logs.json');

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
  console.error('❌ MEDIA_FOLDER introuvable:', MEDIA_FOLDER);
  console.log('➡️ Modifiez MEDIA_FOLDER dans server.cjs puis relancez');
  process.exit(1);
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

  try {
    // ═══════════════════════════════════════════════════════════════
    // API: Santé et Status
    // ═══════════════════════════════════════════════════════════════
    
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', folder: MEDIA_FOLDER }));
    }

    if (pathname === '/api/ai/status') {
      const statuses = {};
      for (const [name, url] of Object.entries(AI_CONFIG)) {
        try {
          const response = await fetch(`${url}/health`).catch(() => null);
          statuses[name] = response?.ok || false;
        } catch {
          statuses[name] = false;
        }
      }
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
              out.push({
                name: rel,
                url: `http://localhost:${PORT}/media/${urlPath}`,
                thumbnailUrl: `http://localhost:${PORT}/media/${urlPath}`,
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
    // API: Mise à jour et Restauration
    // ═══════════════════════════════════════════════════════════════

    if (pathname === '/api/update' && req.method === 'POST') {
      const updateScript = path.join(__dirname, 'Mettre a jour MediaVault.bat');
      if (fs.existsSync(updateScript)) {
        exec(`start cmd /c "${updateScript}"`, (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Mise à jour lancée' }));
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Script de mise à jour introuvable' }));
      }
      return;
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
