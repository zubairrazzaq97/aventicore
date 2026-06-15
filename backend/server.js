// Aventicore — Backend Server (pure Node.js, no external dependencies)
// Serves the static frontend and provides a JSON contact form API.
// Run with: node backend/server.js   (then open http://localhost:3000)

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Data persistence helpers ----------
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

function readSubmissions() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeSubmissions(list) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// ---------- Response helpers ----------
function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function readRequestBody(req, callback) {
  let body = '';
  let size = 0;
  const MAX_SIZE = 1e6; // 1MB limit

  req.on('data', chunk => {
    size += chunk.length;
    if (size > MAX_SIZE) {
      req.destroy();
      return;
    }
    body += chunk;
  });
  req.on('end', () => callback(body));
}

// ---------- API handlers ----------
function handleContactSubmit(req, res) {
  readRequestBody(req, (body) => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return sendJSON(res, 400, { error: 'Invalid JSON payload.' });
    }

    const { name, email, service, message } = payload || {};

    if (!name || !email || !message) {
      return sendJSON(res, 400, { error: 'Name, email, and message are required.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return sendJSON(res, 400, { error: 'Please provide a valid email address.' });
    }
    if (String(name).length > 100 || String(message).length > 3000) {
      return sendJSON(res, 400, { error: 'Submission exceeds allowed length.' });
    }

    const submission = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: String(name).trim(),
      email: String(email).trim(),
      service: service ? String(service).trim() : 'Not specified',
      message: String(message).trim(),
      createdAt: new Date().toISOString()
    };

    const submissions = readSubmissions();
    submissions.push(submission);
    writeSubmissions(submissions);

    console.log(`New inquiry from ${submission.name} <${submission.email}> — ${submission.service}`);

    sendJSON(res, 201, { success: true, message: 'Submission received.' });
  });
}

function handleSubmissionsList(req, res) {
  const submissions = readSubmissions();
  sendJSON(res, 200, { count: submissions.length, submissions });
}

// ---------- Static file serving (with safety against path traversal) ----------
function serveStatic(req, res, pathname) {
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '') safePath = '/index.html';

  const filePath = path.join(ROOT_DIR, safePath);

  // Ensure resolved path stays within ROOT_DIR
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return sendFile(res, filePath);
    }
    // Fallback to index.html for unknown routes (SPA-style)
    sendFile(res, path.join(ROOT_DIR, 'index.html'));
  });
}

// ---------- Server ----------
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  // CORS headers (useful if frontend is served separately during development)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (pathname === '/api/health') {
    return sendJSON(res, 200, { status: 'ok', service: 'Aventicore API' });
  }

  if (pathname === '/api/contact' && req.method === 'POST') {
    return handleContactSubmit(req, res);
  }

  if (pathname === '/api/submissions' && req.method === 'GET') {
    return handleSubmissionsList(req, res);
  }

  if (req.method === 'GET') {
    return serveStatic(req, res, pathname);
  }

  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Aventicore server running at http://localhost:${PORT}`);
});
