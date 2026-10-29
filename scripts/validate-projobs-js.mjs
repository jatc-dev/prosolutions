import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  throw new Error("Uso: node scripts/validate-projobs-js.mjs <ruta-html>");
}

const html = readFileSync(file, "utf8");
const scriptRegex = /<script\s*>([\s\S]*?)<\/script>/g;
let match;
let blockCount = 0;
let escapeHtmlDefined = false;
let escapeHtmlUsed = false;

while ((match = scriptRegex.exec(html)) !== null) {
  const block = match[1].trim();
  blockCount++;
  new Function(block);
  if (/function\s+escapeHtml\b\s*\(/.test(block)) escapeHtmlDefined = true;
  if (/escapeHtml\s*\(/.test(block)) escapeHtmlUsed = true;
}

if (!blockCount) {
  throw new Error(`No se encontr\u00f3 ning\u00fan bloque <script> ejecutable en ${file}`);
}
if (!escapeHtmlDefined) {
  throw new Error(`escapeHtml no est\u00e1 definida como funci\u00f3n en ${file}`);
}
if (!escapeHtmlUsed) {
  throw new Error(`escapeHtml est\u00e1 definida pero no se invoca en ${file}`);
}

console.log(`${file}: JavaScript sintaxis y escapeHtml OK (${blockCount} bloque(s))`);
