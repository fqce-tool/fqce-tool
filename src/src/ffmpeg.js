const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch {}

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // stay well inside the Render free 512MB memory limit

function available() {
  return !!ffmpegPath;
}

async function downloadToTemp(url, prefix, ext) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_INPUT_BYTES) throw new Error('File too large (15MB max).');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_INPUT_BYTES) throw new Error('File too large (15MB max).');
  const file = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  fs.writeFileSync(file, buf);
  return file;
}

function tempOut(prefix, ext) {
  return path.join(os.tmpdir(), `${prefix}-out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
}

function run(args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr?.slice(-400) || err.message));
      else resolve(stdout);
    });
  });
}

function cleanup(...files) {
  for (const f of files) {
    try { if (f) fs.unlinkSync(f); } catch {}
  }
}

module.exports = { available, downloadToTemp, tempOut, run, cleanup, MAX_INPUT_BYTES };
