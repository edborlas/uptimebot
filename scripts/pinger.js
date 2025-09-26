//#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';

// Configuration
const INTERVAL_MIN = 5; // minutes
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.resolve(path.dirname(__dirname), 'logs');

const UP_LOG = path.join(LOG_DIR, 'up.log');
const DOWN_LOG = path.join(LOG_DIR, 'down.log');
const MAX_BYTES = 1024 * 1024; // 1MB
const PORT = process.env.PINGER_PORT || 4100;

const monitors = [
  { name: 'Google', url: 'https://www.google.com', protocol: 'HTTP' },
  { name: 'GitHub', url: 'https://github.com', protocol: 'HTTP' },
  { name: 'Observa', url: 'https://observanow.com', protocol: 'HTTP' },
  { name: 'API Server', url: 'http://20.29.187.121', protocol: 'HTTP' },
  { name: 'Observa API', url: 'https://www.observanow.com/api2/', protocol: 'HTTP' },
  { name: 'Observa Internal Company', url: 'https://www.observanow.com/internal/company/', protocol: 'HTTP' },
];

// latest state in-memory
const latest = monitors.map(m => ({ ...m, status: 'unknown', latency: null, downSince: null, lastChecked: null, errorType: null }));

function ensureLogDir() { if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true }); }
function statSafe(p) { try { return fs.statSync(p); } catch (e) { return null; } }

function rotateDownLogIfNeeded() {
  const st = statSafe(DOWN_LOG);
  if (st && st.size > MAX_BYTES) {
    const now = new Date();
    const stamp = now.toLocaleString('sv-SE').replace(' ', 'T').replace(/:/g, '-');
    const dest = path.join(LOG_DIR, `down-${stamp}.log`);
    fs.renameSync(DOWN_LOG, dest);
  }
}

function truncateUpLogIfNeeded() {
  const st = statSafe(UP_LOG);
  if (st && st.size > MAX_BYTES) fs.truncateSync(UP_LOG, 0);
}

function writeLine(filePath, obj) { try { fs.appendFileSync(filePath, JSON.stringify(obj) + '\n'); } catch (e) { console.error('log write failed', e); } }

function pingMonitor(m) {
  return new Promise((resolve) => {
    try {
      const url = new URL(m.url);
      const lib = url.protocol === 'https:' ? https : http;
      const opts = { 
        method: 'GET', 
        timeout: 10000,
        rejectUnauthorized: true // Ensure SSL certificate validation
      };
      const start = Date.now();
      const req = lib.request(url, opts, (res) => {
        const latency = Date.now() - start;
        const status = res.statusCode >= 200 && res.statusCode < 405 ? 'up' : 'down'; // 400 - 404 are considered up
        res.resume();
        resolve({ status, latency, errorType: null });
      });
      
      // Handle general errors (including SSL errors)
      req.on('error', (err) => {
        let errorType = 'network';
        
        // Check for SSL-specific errors
        if (err.code === 'CERT_UNTRUSTED' || 
            err.code === 'CERT_HAS_EXPIRED' ||
            err.code === 'CERT_NOT_YET_VALID' ||
            err.code === 'CERT_CHAIN_TOO_LONG' ||
            err.code === 'CERT_REVOKED' ||
            err.code === 'CERT_SIGNATURE_FAILURE' ||
            err.code === 'UNABLE_TO_GET_ISSUER_CERT' ||
            err.code === 'UNABLE_TO_GET_CRL' ||
            err.code === 'UNABLE_TO_DECRYPT_CERT_SIGNATURE' ||
            err.code === 'UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY' ||
            err.code === 'CERT_SIGNATURE_FAILURE' ||
            err.code === 'CRL_SIGNATURE_FAILURE' ||
            err.code === 'CRL_NOT_YET_VALID' ||
            err.code === 'CRL_HAS_EXPIRED' ||
            err.code === 'ERROR_IN_CERT_NOT_BEFORE_FIELD' ||
            err.code === 'ERROR_IN_CERT_NOT_AFTER_FIELD' ||
            err.code === 'ERROR_IN_CRL_LAST_UPDATE_FIELD' ||
            err.code === 'ERROR_IN_CRL_NEXT_UPDATE_FIELD' ||
            err.code === 'OUT_OF_MEM' ||
            err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
            err.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
            err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
            err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
            err.code === 'CERT_REJECTED' ||
            err.code === 'HOSTNAME_MISMATCH' ||
            err.message.includes('certificate') ||
            err.message.includes('SSL') ||
            err.message.includes('TLS')) {
          errorType = 'ssl';
          console.log(`SSL/Certificate error for ${m.name}: ${err.code || err.message}`);
        }
        resolve({ status: 'down', latency: null, errorType });
      });
      
      req.on('timeout', () => { 
        req.destroy(); 
        resolve({ status: 'down', latency: null, errorType: 'timeout' }); 
      });
      
      req.end();
    } catch (e) { 
      resolve({ status: 'down', latency: null, errorType: 'network' }); 
    }
  });
}

async function runOnce() {
  ensureLogDir();
  for (let i = 0; i < monitors.length; i++) {
    const m = monitors[i];
    const res = await pingMonitor(m);
    const nowIso = new Date().toISOString();
    const nowLocal = new Date().toLocaleString();
    const rec = { name: m.name, url: m.url, status: res.status, datetime: nowLocal };

    const prev = latest[i];
    prev.lastChecked = nowIso; // ISO for UI calcs
    prev.latency = res.latency;
    prev.errorType = res.errorType;
    if (res.status === 'down') {
      if (!prev.downSince) prev.downSince = nowIso;
      prev.status = 'down';
      rotateDownLogIfNeeded();
      writeLine(DOWN_LOG, rec);
    } else {
      prev.status = 'up';
      prev.downSince = null;
      prev.errorType = null;
      writeLine(UP_LOG, rec);
      truncateUpLogIfNeeded();
    }
  }
}

async function loop() { try { await runOnce(); } catch (e) { console.error('run failed', e); } }

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/status') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ monitors: latest }));
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/logs')) {
    const sub = decodeURIComponent(req.url.replace('/logs', '')) || '/';
    const target = path.join(LOG_DIR, sub);
    if (!fs.existsSync(target)) { res.statusCode = 404; res.end('Not found'); return; }
    const st = fs.statSync(target);
    if (st.isDirectory()) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(fs.readdirSync(target))); return; }
    res.setHeader('Content-Type', 'text/plain'); fs.createReadStream(target).pipe(res); return;
  }

  if (req.method === 'GET' && req.url === '/pinger') {
    debugger;
    console.log('DEBUG: Received request for /pinger');
    const pingerLogPath = path.join(LOG_DIR, 'pinger.log');
    console.log('DEBUG: Resolved path for pinger.log:', pingerLogPath);
    if (!fs.existsSync(pingerLogPath)) {
      console.error('DEBUG: pinger.log not found at:', pingerLogPath);
      res.statusCode = 404;
      res.end('Pinger log not found');
      return;
    }
    console.log('DEBUG: pinger.log exists, serving the file.');
    res.setHeader('Content-Type', 'text/plain');
    fs.createReadStream(pingerLogPath).pipe(res);
    console.log('DEBUG: Successfully served pinger.log');
    return;
  }

  if (req.method === 'GET' && req.url === '/app') {
    const appLogPath = path.join(LOG_DIR, 'app.log');
    if (!fs.existsSync(appLogPath)) {
      res.statusCode = 404;
      res.end('App log not found');
      return;
    }
    res.setHeader('Content-Type', 'text/plain');
    fs.createReadStream(appLogPath).pipe(res);
    return;
  }

  if (req.method === 'GET' && req.url === '/up') {
    const upLogPath = path.join(LOG_DIR, 'up.log');
    if (!fs.existsSync(upLogPath)) {
      res.statusCode = 404;
      res.end('up log not found');
      return;
    }
    res.setHeader('Content-Type', 'text/plain');
    fs.createReadStream(upLogPath).pipe(res);
    return;
  }

   if (req.method === 'GET' && req.url === '/down') {
    const downLogPath = path.join(LOG_DIR, 'down.log');
    if (!fs.existsSync(downLogPath)) {
      res.statusCode = 404;
      res.end('down log not found');
      return;
    }
    res.setHeader('Content-Type', 'text/plain');
    fs.createReadStream(downLogPath).pipe(res);
    return;
  }

  res.statusCode = 404; res.end('Not found');
});

server.listen(PORT, () => console.log(`Pinger server listening on http://localhost:${PORT}`));

loop();
setInterval(loop, INTERVAL_MS);

// Export the functions for use in other modules
export { loop, latest };

// Check if the script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running pinger.js directly');
  // Loop only if the script is run directly
  loop();
  setInterval(loop, INTERVAL_MS);
}

console.log('DEBUG: LOG_DIR is set to:', LOG_DIR);