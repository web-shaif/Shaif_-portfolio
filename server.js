"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const PORT = 3000;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const SKIP_DIRS = new Set(["node_modules", ".git"]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Extract a 4-digit year from common filename patterns
function extractYear(filename) {
  // DDMMYY at start: e.g. "300422..." → 2022
  let m = filename.match(/^(\d{2})(\d{2})(\d{2})[\d\-_]/);
  if (m) return "20" + m[3];
  // _DD_MM_YY: e.g. "Henry_dop_24_02_24"
  m = filename.match(/_(\d{2})_(\d{2})_(\d{2})[\d\-_.]/);
  if (m) return "20" + m[3];
  // [-_]DDMMYY[-_.]: e.g. "-150624-" or "_260725-"
  m = filename.match(/[\-_](\d{2})(\d{2})(\d{2})[\-_.]/);
  if (m) return "20" + m[3];
  return null;
}

function scanAlbums() {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() && !SKIP_DIRS.has(d.name) && !d.name.startsWith("."),
    )
    .map((d) => {
      const folderPath = path.join(ROOT, d.name);
      const images = fs
        .readdirSync(folderPath)
        .filter(
          (f) =>
            !f.startsWith(".") && IMAGE_EXTS.has(path.extname(f).toLowerCase()),
        )
        .sort()
        .map((f) => d.name + "/" + f);

      const isWedding = d.name.includes(" & ");
      const year =
        images.length > 0 ? extractYear(path.basename(images[0])) : null;
      const meta = isWedding ? "Wedding" + (year ? " \u00b7 " + year : "") : "";

      return { name: d.name, meta, images };
    })
    .filter((a) => a.images.length > 0);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  // ── API: return albums JSON ──────────────────────────────
  if (urlPath === "/api/albums") {
    try {
      const albums = scanAlbums();
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      });
      res.end(JSON.stringify(albums));
    } catch (err) {
      console.error("Scan error:", err.message);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
    return;
  }

  // ── Static files ─────────────────────────────────────────
  const fileReq = urlPath === "/" ? "/index.html" : urlPath;
  const abs = path.join(ROOT, fileReq);

  // Security: block path traversal
  if (!abs.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(abs, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const mime =
      MIME[path.extname(abs).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Shaif Portfolio  \u2192  ${url}\n`);
  exec(`open "${url}"`);
});
