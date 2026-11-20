# ProSolutions — CLAUDE.md

Contexto para Claude Code. Complementa a [AGENTS.md](AGENTS.md) (contexto compartido entre agentes); si hay conflicto, aplica la regla más restrictiva.
Auditoría base: 2026-11-17 (solo lectura).

Posicionamiento: plataforma de empleo para todos los sectores (no solo tech) desde 2026-11-18.

## Reglas de trabajo

- Avanzar de forma continua sin pedir confirmación en pasos intermedios triviales.
- **Pedir confirmación antes de:** borrar o modificar datos en Neon, `force push`, migraciones contra QA/producción, `commit`/`push`/`merge`/`reset`/`clean` (AGENTS.md exige autorización), tocar stashes o worktrees.
- No trabajar en `main`. Rama de trabajo: `qa` (trabajar directamente en ella, sin ramas nuevas; producción = PR `qa` → `main`).
- No leer, editar ni exponer `.env` ni secretos. Las API keys de MCP van solo en variables de entorno, nunca en archivos versionados.
- No usar Blueprint Sync de Render: la fuente de verdad es el dashboard. `render.yaml` documenta la configuración real (12 servicios, reconciliado 2026-11-20) y debe actualizarse cuando cambie un servicio.
- No modificar RLS, auth ni autorización como efecto colateral de cambios de frontend.
- No descartar cambios locales sin commitear (rebrand de UI, importación de CV).
- Conventional Commits (`feat(scope):`, `fix(scope):`, ...). Ejecutar lint + tests del workspace afectado antes de dar algo por terminado y reportar resultados reales.

## Arquitectura

Monorepo npm workspaces → Render (Docker / estático) → Neon PostgreSQL (proyecto `Prosolutions.page`, rama `production`).

| Módulo | Ruta | Stack | Puerto local |
|---|---|---|---|
| Core (portal/landing) | `apps/core` | React 18, TS, Vite, Tailwind, Vitest | 5174 |
| ProIdentity (auth) | `apps/identity` | Express, Prisma 5.22, bcrypt, JWT, nodemailer, Jest | 4001 |
| ProCV frontend | `apps/procv/frontend` | React 18, Vite, Zustand, i18next, axios, Vitest, Playwright | 5173 |
| ProCV backend | `apps/procv/backend` | Express, Prisma 5.22, Puppeteer, mammoth, pdf-parse v2, Jest | 4000 |
| ProJobs web (v2) | `apps/projobs` | React 18, Vite, Tailwind, `@prosolutions/ui`, Vitest | 5175 |
| ProJobs API (v2) | `apps/projobs/server` | Express + `pg` (sin ORM), zod, SQL migrations, RLS, Vitest + PGlite; lockfile propio | 5176 |
| UI compartida | `packages/ui` | tokens en `src/tokens.ts`, tema en `useTheme.ts` | — |

**Bases de datos (Neon):** `proidentity`, `procv`, `projobs` — separadas por módulo.

**Auth:** ProIdentity es la única autoridad de sesión. Emite JWT (issuer `https://identity.prosolutions.page`, audience `prosolutions-api`) con claims `modules[]`; cookies SSO en `.prosolutions.page`. Los módulos validan firma/issuer/audience/exp localmente.
ProCV aplica RLS mediante contexto firmado (`PROCV_RLS_CONTEXT_KEY`, 32 bytes hex) y roles restringidos `procv_app` / `procv_admin_app`; pool admin separado vía `PROCV_ADMIN_DATABASE_URL`.

## Mapa de archivos clave

- Config/env: `apps/identity/src/config.ts`, `apps/procv/backend/src/config.ts`, `apps/projobs/server/src/config.ts`; plantillas `.env.example` en identity, procv/backend, procv/frontend, projobs/server.
- Conexión BD: `apps/*/src/prismaClient.ts`, `apps/procv/backend/src/dbContext.ts`, `apps/projobs/server/src/db/` (pg + contexto RLS).
- Modelos: `apps/identity/prisma/schema.prisma`, `apps/procv/backend/prisma/schema.prisma`; SQL ProJobs en `apps/projobs/server/migrations/`.
- Migraciones: ningún servicio de Render migra al arrancar (ni ProIdentity QA/prod ni ProJobs API). Se aplican a mano en Neon antes del merge; procedimiento y fases en `docs/deployment/ETAPA3_DEPLOY.md` §3. `apps/identity/scripts/migrate-production.mjs` existe pero no lo ejecuta ninguna imagen.
- Rutas: `apps/identity/src/routes/`, `apps/procv/backend/src/routes/`, `apps/projobs/server/src/routes/`.
- Despliegue: Dockerfiles por app (ProIdentity = `apps/identity/Dockerfile`; el `Dockerfile` raíz se eliminó el 2026-11-19), `render.yaml`, `docs/deployment/`.
- CI: `.github/workflows/core-build.yml` (incluye jobs `projobs-api` y `projobs-web`), `postgres-migration-readiness.yml`.
- ProJobs: contratos `apps/projobs/server/src/contracts.ts`; migraciones `apps/projobs/server/migrations/`; rol reclutador = módulo `PRORECRUIT` de ProIdentity (solo por concesión explícita).

## Comandos

```
npm install
npm run dev:core | dev:identity | dev:procv | dev:projobs
npm run build:ui | build:core | build:procv | build:projobs
npm run test --workspace=apps/core            # vitest
npm run test:regression --prefix apps/identity # tsx --test (jest no ejecuta estos tests); correr `npx prisma generate` en apps/identity antes (cliente Prisma compartido con ProCV)
npm --prefix apps/procv/backend test          # jest
npm --prefix apps/procv/frontend test         # vitest
npm test --prefix apps/projobs/server         # vitest + PGlite
npm test --workspace=apps/projobs             # vitest (web)
```

Arranque local: `scripts/start-local.ps1` (Core + ProCV; no instala dependencias).

## Riesgos y deuda técnica conocidos

1. RESUELTO 2026-11-17: `test-neon.js` y `.mcp.json` expusieron API keys de Neon y Render en el repo público; el owner las revocó, `test-neon.js` se eliminó y `.mcp.json` lee `${NEON_API_KEY}`, `${RENDER_API_KEY_PSL_PCV}` y `${RENDER_API_KEY_PID_PJB}` del entorno. Nunca escribir keys literales en `.mcp.json`.
2. RESUELTO 2026-11-20: `render.yaml` reconciliado con Render (solo nombres de variables, `sync: false`). Servicios web en plan free: se duermen a los 15 min y comparten 750 h/mes por workspace; mantener despierto con pings más de un servicio por workspace agota las horas y Render suspende los gratuitos.
3. ProCV backend prioriza `DIRECT_DATABASE_URL` sobre `DATABASE_URL` en runtime; solo `start:migrate` la elimina. Si se arranca con `npm start` con esa variable presente, se salta el pooler y los roles restringidos.
4. Prisma sin `directUrl`; el cambio pooler/direct depende de sustitución de variables. Verificar `pgbouncer=true` / `connection_limit` en las URL pooled de Neon.
5. CORREGIDO 2026-11-19: ProIdentity NO migra al arrancar (QA usa `start:migrate`, que solo siembra el admin; prod usa `apps/identity/Dockerfile` con `node dist/index.js`). Aplicar migraciones a mano en Neon antes de cada merge; las que rompen el código anterior, en dos fases.
6. CORREGIDO 2026-11-20: ProIdentity descarta en producción todo origen que no sea `https` (`productionSafeOrigins`); `ALLOWED_ORIGINS` de producción sin localhost ni `procv-platform.onrender.com`. `CORS_ORIGIN` y `PROCV_DATABASE_JWT_SECRET` en ProIdentity no se leen (sobrantes).
7. ProJobs v2: sin `DATABASE_URL` fuera de producción usa PGlite en memoria (solo dev); en producción exige `DATABASE_URL`, `IDENTITY_JWT_SECRET` y `PROCV_API_URL`. La migración v2 está aplicada en Neon (QA y producción, 2026-11-18).
8. RESUELTO 2026-11-18: restos de Supabase eliminados. Pendiente: `.env.example` de identity con `DATABASE_URL` mal formada.
9. RESUELTO 2026-11-18: `packages/ui/dist` ya no se versiona (las apps usan `src` por alias), `packages/auth` sin uso eliminado, artefactos de la raíz y código muerto de ProCV borrados (PR #119/#120).
10. CORREGIDO 2026-11-20: Node 22 en todo (`.node-version`, `engines: 22.x`, Docker `node:22`, CI). Pendiente: la imagen de ProCV backend incluye devDependencies.
11. RESUELTO 2026-11-17: el cron de ProJobs (push diario a `main`) se eliminó con la v1.
12. RESUELTO 2026-11-17: el CI de ProCV backend ya ejecuta los tests de importación de PDF.

## Entorno QA (SSO vía Cloudflare Worker)

Render gratuito no deja dominios propios para QA, así que QA se sirve por el Worker `prosolutions-qa-gateway` (`infra/cloudflare/qa-gateway/`), que hace de proxy a los servicios `*.onrender.com`:

| URL QA | Servicio Render |
|---|---|
| https://qa.prosolutions.page | ProSolutions-QA (Core, login) |
| https://identity-qa.prosolutions.page | ProIdentity-QA |
| https://procv-qa.prosolutions.page | ProCVFrontEnd-QA |
| https://projobs-qa.prosolutions.page | ProJobs-QA |

- APIs con bearer token siguen en onrender: `procv-backend-qa-v2`, `projobs-api-qa`.
- ProIdentity-QA: `COOKIE_DOMAIN=.prosolutions.page` + `COOKIE_NAME_SUFFIX=_qa` (cookies `refreshToken_qa`/`csrfToken_qa`). **Nunca** quitar el sufijo con ese dominio: pisaría las cookies de producción.
- Todos los servicios QA despliegan desde la rama `qa` (protegida: no borrar, no force push).
- Cloudflare: token en `CLOUDFLARE_API_TOKEN` (zona `prosolutions.page`).

## MCP

Servidores MCP alojados (HTTP, `Authorization: Bearer ${VAR}`) en `.mcp.json`:

| Servidor | URL | Variable de entorno | Alcance |
|---|---|---|---|
| `neon` | `https://mcp.neon.tech/mcp?readonly=true` | `NEON_API_KEY` | Solo lectura |
| `render-psl-pcv` | `https://mcp.render.com/mcp` | `RENDER_API_KEY_PSL_PCV` | Workspace ProSolutions + ProCV |
| `render-pid-pjb` | `https://mcp.render.com/mcp` | `RENDER_API_KEY_PID_PJB` | Workspace ProIdentity + ProJobs |

- Los paquetes npm `@neondatabase/mcp-server` y `@render/mcp-server` NO existen; no volver a usarlos. El paquete local de Neon está deprecado.
- Quitar `?readonly=true` de Neon solo con autorización explícita del owner.
- Si un MCP falla al conectar, avisar al usuario en lugar de asumir datos del entorno remoto.
