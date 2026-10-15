import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const services = [
  { name: "backend", dir: "backend" },
  { name: "frontend", dir: "frontend" },
];

let shuttingDown = false;

for (const service of services) {
  const child = spawn("npm", ["run", "dev"], {
    cwd: path.join(root, service.dir),
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.log(`[procv] ${service.name} finalizo con codigo ${code ?? 0}`);
      process.exit(code ?? 0);
    }
  });
}

function shutdown() {
  shuttingDown = true;
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[procv] backend (puerto 4000) y frontend (puerto 5173) levantados. Ctrl+C para detener ambos.");
