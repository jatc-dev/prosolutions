#!/usr/bin/env node
/**
 * Regenerates the template preview images of the public gallery
 * (apps/core/public/plantillas/<key>.webp) from the real templates.
 *
 *   1. npx vite --port 5199          (in apps/procv/frontend)
 *   2. node scripts/template-previews.mjs [key ...]
 *
 * Every image shows the same fictitious person (Laura Gómez Pérez), the top
 * of the first page, 700 × 910 px, WebP. Run it after changing a template.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "..", "core", "public", "plantillas");
const baseUrl = process.env.PREVIEW_URL || "http://localhost:5199";
const catalogSource = readFileSync(join(here, "..", "src", "utils", "templateCatalog.ts"), "utf8");
const allKeys = [...catalogSource.matchAll(/\{ key: "([a-z0-9-]+)"/g)].map((match) => match[1]);
const keys = process.argv.slice(2).length ? process.argv.slice(2) : allKeys;

const WIDTH = 700;
const HEIGHT = 910;

const sample = (template) => ({
  title: "Hoja de vida",
  template,
  settings: {},
  personal: {
    firstName: "Laura",
    lastName: "Gómez Pérez",
    fullName: "Laura Gómez Pérez",
    professionalTitle: "Auxiliar administrativa",
    nationality: "CO",
    city: "Bogotá",
    country: "Colombia",
    summary: "Auxiliar administrativa con 5 años de experiencia en gestión documental, atención al ciudadano y manejo de Excel. Organizada, puntual y orientada al servicio.",
    emails: [{ id: "e1", value: "laura.gomez@correo.com", type: "personal", isPrimary: true, isVisible: true }],
    phones: [{ id: "p1", number: "300 123 4567", type: "personal", isPrimary: true, isVisible: true }],
    references: [{ id: "r1", type: "laboral", name: "Carlos Ruiz", position: "Coordinador administrativo", company: "Alcaldía Local de Suba", phone: "310 555 1234", isVisible: true }],
  },
  experience: [
    {
      id: "x1", company: "Alcaldía Local de Suba", position: "Auxiliar administrativa", location: "Bogotá", startDate: "2022-02", endDate: "", isCurrentPosition: true,
      description: "Gestión documental y atención al ciudadano en ventanilla.\n• Digitalicé 3.000 expedientes en seis meses.\n• Reduje en 30 % el tiempo de respuesta a solicitudes.", order: 0, isVisible: true,
    },
    {
      id: "x2", company: "Hotel Andino", position: "Recepcionista", location: "Bogotá", startDate: "2019-03", endDate: "2022-01", isCurrentPosition: false,
      description: "Atención de huéspedes, reservas y caja.\n• Mantuve una calificación de servicio de 4,8/5.", order: 1, isVisible: true,
    },
  ],
  education: [{ id: "d1", institution: "SENA", degree: "Técnico en gestión documental", fieldOfStudy: "", startDate: "2017-01", endDate: "2018-12", isCurrentlyStudying: false, order: 0, isVisible: true }],
  skills: ["Excel", "Atención al cliente", "Gestión documental", "Redacción"].map((name, index) => ({ id: `s${index}`, name, level: "advanced", category: "technical", isVisible: true })),
  languages: [{ id: "l1", language: "Inglés", listeningLevel: "B1", isVisible: true }],
  certificates: [],
  links: [],
});

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const key of keys) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 2 });
  await page.addInitScript((data) => {
    localStorage.setItem("procv_guest_resume", JSON.stringify({ savedAt: Date.now(), data }));
    localStorage.setItem("procv.editor.design-panel", "");
  }, sample(key));
  await page.goto(`${baseUrl}/editor`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const sheet = page.locator(".cv-custom-wrapper").first();
  const box = await sheet.boundingBox();
  if (!box) throw new Error(`${key}: preview not found`);
  const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, (box.width * HEIGHT) / WIDTH) } });
  // Resize and encode to WebP in the browser (no image library needed).
  const webp = await page.evaluate(async ({ data, width, height }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    const scale = width / image.width;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, image.height * scale);
    return canvas.toDataURL("image/webp", 0.86).split(",")[1];
  }, { data: png.toString("base64"), width: WIDTH, height: HEIGHT });
  writeFileSync(join(outDir, `${key}.webp`), Buffer.from(webp, "base64"));
  console.log(`${key}.webp`);
  await page.close();
}
await browser.close();
