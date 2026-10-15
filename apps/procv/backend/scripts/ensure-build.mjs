/**
 * Garantiza que el backend este compilado antes de arrancar.
 * Render ejecuta `npm start`; si el build command del servicio no compilo
 * el backend (o el filesystem viene limpio), dist/index.js no existiria y
 * el proceso moriria con MODULE_NOT_FOUND. Este script lo compila bajo demanda.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distEntry = path.join(backendRoot, "dist", "index.js");

if (existsSync(distEntry)) {
  process.exit(0);
}

console.log("[procv-backend] dist/index.js no encontrado: compilando antes de arrancar...");

const build = spawnSync("npm run prisma:generate && npm run build", {
  cwd: backendRoot,
  stdio: "inherit",
  shell: true,
});

if (build.status !== 0 || !existsSync(distEntry)) {
  console.error("[procv-backend] La compilacion bajo demanda ha fallado.");
  process.exit(build.status ?? 1);
}
