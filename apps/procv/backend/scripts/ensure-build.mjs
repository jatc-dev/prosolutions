/**
 * Garantiza que el backend este compilado antes de arrancar.
 * Render ejecuta `npm start`; si el build command del servicio no compilo
 * el backend (o el filesystem viene limpio), dist/index.js no existiria y
 * el proceso moriria con MODULE_NOT_FOUND. Este script lo compila bajo demanda.
 *
 * No depende del PATH: resuelve los binarios de prisma y typescript por ruta
 * (node_modules local del backend y del workspace) y cae en npx como ultimo
 * recurso, porque en Render `prisma`/`tsc` no siempre estan en el PATH.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(backendRoot, "..", "..", "..");
const distEntry = path.join(backendRoot, "dist", "index.js");

if (existsSync(distEntry)) {
  process.exit(0);
}

console.log("[procv-backend] dist/index.js no encontrado: compilando antes de arrancar...");

function run(command) {
  const result = spawnSync(command, { cwd: backendRoot, stdio: "inherit", shell: true });
  return result.status === 0;
}

function fail(message) {
  console.error(`[procv-backend] ${message}`);
  process.exit(1);
}

// 1. Cliente de Prisma
const prismaEntry = [
  path.join(backendRoot, "node_modules", "prisma", "build", "index.js"),
  path.join(workspaceRoot, "node_modules", "prisma", "build", "index.js"),
].find((candidate) => existsSync(candidate));

const prismaOk = run("npm run prisma:generate")
  || (prismaEntry ? run(`node "${prismaEntry}" generate`) : false)
  || run("npx --yes prisma generate");

if (!prismaOk) {
  fail("No se pudo generar el cliente de Prisma.");
}

// 2. Compilacion TypeScript
const tscEntry = [
  path.join(backendRoot, "node_modules", "typescript", "bin", "tsc"),
  path.join(workspaceRoot, "node_modules", "typescript", "bin", "tsc"),
].find((candidate) => existsSync(candidate));

const buildOk = run("npm run build")
  || (tscEntry ? run(`node "${tscEntry}" -p tsconfig.build.json`) : false)
  || run("npx --yes tsc -p tsconfig.build.json");

if (!buildOk || !existsSync(distEntry)) {
  fail("La compilacion bajo demanda ha fallado.");
}

console.log("[procv-backend] Compilacion bajo demanda completada.");
