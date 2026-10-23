import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const FILES = ["index.html", "privacidad.html", "sitemap.xml", "ads.txt", "auth.js"];

function resolvePython() {
  for (const cmd of ["python", "py", "python3"]) {
    try {
      execFileSync(cmd, ["--version"], { stdio: "ignore", timeout: 15000 });
      return cmd;
    } catch {
      // Probar el siguiente ejecutable disponible.
    }
  }
  return null;
}

function getApiBaseUrl() {
  const configured = process.env.PROJOBS_API_URL;
  if (!configured) return null;

  try {
    const parsed = new URL(configured);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Unsupported URL protocol");
    }
    if (parsed.username || parsed.password) {
      throw new Error("Credentials are not permitted in the API base URL");
    }
    return parsed.origin;
  } catch {
    throw new Error("[projobs] PROJOBS_API_URL must be a valid HTTP(S) origin.");
  }
}

const apiBaseUrl = getApiBaseUrl();
const python = resolvePython();
if (!python) {
  throw new Error(
    "[projobs] Python 3 es obligatorio para generar el sitio. Se cancela el build para evitar publicar HTML desactualizado."
  );
}

console.log(`[projobs] Generando el sitio desde generator.py (${python})...`);
execFileSync(python, ["generator.py"], {
  cwd: root,
  stdio: "inherit",
  timeout: 120000,
});

const generatedIndex = path.join(root, "index.html");
if (!existsSync(generatedIndex)) {
  throw new Error("[projobs] generator.py no produjo index.html; build cancelado.");
}

let html = await readFile(generatedIndex, "utf8");
for (const required of [
  'class="pro-nav"',
  "https://prosolutions.page",
  "https://procv.prosolutions.page",
  'data-i18n-aria="ecosystemNav"',
]) {
  if (!html.includes(required)) {
    throw new Error(`[projobs] HTML generado sin elemento requerido: ${required}. Build cancelado.`);
  }
}

if (apiBaseUrl) {
  if (!html.includes("</head>")) {
    throw new Error("[projobs] El HTML generado no contiene </head>; API base URL no se puede inyectar.");
  }
  html = html.replace(
    "</head>",
    `<script>window.__PROJOBS_API_URL__ = ${JSON.stringify(apiBaseUrl)};</script>\\n</head>`,
  );
  console.log(`[projobs] API personal configurada en ${apiBaseUrl}`);
} else {
  console.warn("[projobs] PROJOBS_API_URL no está configurada; el sitio usará el origen actual para llamadas a la API.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const src = path.join(root, file);
  if (!existsSync(src)) continue;

  if (file === "index.html") {
    await writeFile(path.join(dist, file), html, "utf8");
  } else {
    await cp(src, path.join(dist, file));
  }
  copied += 1;
}

if (copied !== FILES.length) {
  throw new Error(`[projobs] Se esperaban ${FILES.length} archivos publicables y se copiaron ${copied}; build cancelado.`);
}

console.log(`[projobs] Build verificado -> dist/ (${copied} archivos)`);
