//#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Configuration
const INTERVAL_MIN = 5; // minutes
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000;
const LOG_DIR = path.resolve(__dirname, '..', 'logs');
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
const latest = monitors.map(m => ({ ...m, status: 'unknown', latency: null, downSince: null, lastChecked: null }));

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
      const opts = { method: 'GET', timeout: 10000 };
      const start = Date.now();
      const req = lib.request(url, opts, (res) => {
        const latency = Date.now() - start;
        const status = res.statusCode >= 200 && res.statusCode < 405 ? 'up' : 'down'; // 400 - 404 are considered up
        res.resume();
        resolve({ status, latency });
      });
      req.on('error', () => resolve({ status: 'down', latency: null }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 'down', latency: null }); });
      req.end();
    } catch (e) { resolve({ status: 'down', latency: null }); }
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
    if (res.status === 'down') {
      if (!prev.downSince) prev.downSince = nowIso;
      prev.status = 'down';
      rotateDownLogIfNeeded();
      writeLine(DOWN_LOG, rec);
    } else {
      prev.status = 'up';
      prev.downSince = null;
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

  res.statusCode = 404; res.end('Not found');
});

server.listen(PORT, () => console.log(`Pinger server listening on http://localhost:${PORT}`));

loop();
setInterval(loop, INTERVAL_MS);

if (require.main !== module) module.exports = { loop, latest };
