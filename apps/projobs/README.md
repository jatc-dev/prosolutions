# ProJobs — Empleos Tech Remotos

Módulo del ecosistema ProSolutions (@prosolutions/projobs): portal estático de ofertas
de empleo tech remotas. El contenido se genera con `generator.py` (Python) a partir de
las APIs de Arbeitnow y Remotive.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor estático local en http://localhost:5175 (sirve `dist/` si existe) |
| `npm run build` | Regenera el contenido (si hay Python) y publica el sitio en `dist/` |
| `npm start` | Igual que `npm run dev` |

Desde la raíz del monorepo: `npm run build:projobs` / `npm run dev:projobs`.

## Automatización

La actualización diaria de ofertas se ejecutaba con GitHub Actions en el repositorio
independiente (`empleos-tech-remoto`). Para el monorepo, el workflow debe vivir en el
`.github/workflows/` de la raíz del repositorio.
