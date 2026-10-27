# ProJobs — Empleo internacional

Módulo del ecosistema ProSolutions (@prosolutions/projobs): portal público de ofertas con
catálogo estático regenerable. `generator.py` agrega y normaliza ofertas desde las APIs
públicas de Arbeitnow, Remotive, Jobicy, Himalayas y RemoteOK, y elimina duplicados antes
de generar `jobs.json`/HTML.

## Cobertura y calidad del catálogo

- Arbeitnow aporta ofertas de su bolsa general (se consultan varias páginas).
- Remotive, Jobicy, Himalayas y RemoteOK amplían especialmente la cobertura de puestos remotos internacionales.
- El filtro de país ofrece códigos ISO para todos los países y territorios habituales, además de las ubicaciones reales del catálogo. Que un país aparezca en el filtro no implica que haya ofertas activas allí.
- Las fuentes públicas tienen límites, políticas y disponibilidad independientes. Un error de una API no debe impedir que se publiquen las ofertas obtenidas de las demás fuentes.
- La normalización prioriza el país/código explícito de la fuente y traduce algunas ubicaciones urbanas comunes a su país. Las ubicaciones no reconocidas se conservan para evitar atribuciones geográficas inventadas.
- Antes de ampliar la cobertura a bolsas locales por país, conviene integrar proveedores con API oficial y credenciales documentadas (por ejemplo, Adzuna/Jooble) mediante secretos de despliegue; no se deben guardar claves en el repositorio.

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
