import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const baseDir = existsSync(distDir) ? distDir : root;
const port = Number(process.env.PORT ?? 5175);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);

    // Rutas de API se delegan al servidor Express de autenticación (puerto 5176)
    if (urlPath.startsWith("/api/")) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message:
            "ProJobs auth server not running. Start with: npm run dev:server",
        }),
      );
      return;
    }

    let filePath = path.join(baseDir, urlPath === "/" ? "index.html" : urlPath);

    if (!filePath.startsWith(baseDir)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    if (!existsSync(filePath) || !filePath.includes(".")) {
      filePath = path.join(baseDir, "index.html");
    }

    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(port, () => {
  console.log(`[projobs] Sirviendo ${path.relative(root, baseDir)} en http://localhost:${port}`);
  console.log(`[projobs] API de autenticación en http://localhost:${Number(process.env.PORT ?? 5175) + 1}`);
});
