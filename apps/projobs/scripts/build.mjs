import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const FILES = ["index.html", "mi-cuenta.html", "privacidad.html", "sitemap.xml", "ads.txt", "auth.js"];

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

const { readFile } = await import("node:fs/promises");
const html = await readFile(generatedIndex, "utf8");
for (const required of [
  'class="pro-nav"',
  'https://prosolutions.page',
  'https://procv.prosolutions.page',
  'data-i18n-aria="ecosystemNav"',
  'data-action="apply"',
  'data-action="save-job"',
  'window.__PROJOBS_API_URL__',
  'class="jobs-hero"',
  'class="results-heading"',
  'class="pro-footer-bottom"',
  'pro-active-pill',
  'Encuentra tu próxima oportunidad',
]) {
  if (!html.includes(required)) {
    throw new Error(`[projobs] HTML generado sin elemento requerido: ${required}. Build cancelado.`);
  }
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const src = path.join(root, file);
  if (existsSync(src)) {
    await cp(src, path.join(dist, file));
    copied += 1;
  }
}

if (copied !== FILES.length) {
  throw new Error(`[projobs] Se esperaban ${FILES.length} archivos publicables y se copiaron ${copied}; build cancelado.`);
}

console.log(`[projobs] Build verificado -> dist/ (${copied} archivos)`);
