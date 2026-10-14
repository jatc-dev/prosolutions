import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const FILES = ["index.html", "privacidad.html", "sitemap.xml"];

function resolvePython() {
  for (const cmd of ["python", "py", "python3"]) {
    try {
      execFileSync(cmd, ["--version"], { stdio: "ignore", timeout: 15000 });
      return cmd;
    } catch {
      /* probar siguiente */
    }
  }
  return null;
}

const python = resolvePython();

if (python) {
  try {
    console.log(`[projobs] Regenerando contenido con generator.py (${python})...`);
    execFileSync(python, ["generator.py"], { cwd: root, stdio: "inherit", timeout: 120000 });
  } catch {
    console.warn("[projobs] Aviso: generator.py fallo o tardo demasiado. Se usaran los ficheros existentes.");
  }
} else {
  console.log("[projobs] Aviso: python no disponible. Se usaran los ficheros HTML existentes.");
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

if (copied === 0) {
  console.error("[projobs] Error: no se encontro ningun fichero para publicar en dist/.");
  process.exit(1);
}

console.log(`[projobs] Build OK -> dist/ (${copied} ficheros)`);
