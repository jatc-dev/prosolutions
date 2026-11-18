# ProSolutions — Auditoría integral e inventario (Etapa 1)

Fecha: 2026-11-18 · Alcance: repositorio `jatc-dev/prosolutions` (rama `qa` = `main` en contenido), Render (producción + QA), Neon (`Prosolutions.page` producción y proyecto QA).
Método: inspección de código, Git, consultas **solo lectura** a Neon (metadatos y conteos, nunca valores sensibles) y verificación HTTP de los servicios. No se modificó código ni datos en esta etapa.

Severidad: **C** crítica · **A** alta · **M** media · **B** baja.

---

## 0. Resumen de hallazgos críticos

| # | Sev | Hallazgo | Evidencia | Acción |
|---|---|---|---|---|
| S1 | **C** | Tablas de secretos huérfanas legibles por `PUBLIC` en Neon producción. `procv_private.identity_jwt_key(secret)` es legible por **todos** los roles de la BD `procv` (incluidos `procv_runtime`, `procv_app`, `projobs_runtime`, `proidentity_runtime`). Además, `public.context_signing_keys(secret_hex)` en `procv` y `procv_private.context_signing_keys` en la BD `neondb` tienen `SELECT` para `PUBLIC`. Ninguna aparece en el código ni en las migraciones; QA no las tiene. | `information_schema.role_table_grants`, `has_table_privilege()` | Tratar `IDENTITY_JWT_SECRET` y `PROCV_RLS_CONTEXT_KEY` como **comprometidos**: rotarlos y borrar las 3 tablas y la BD `neondb` (sin uso). Hacerlo con autorización del owner. |
| S2 | **A** | Confusión de tokens: el access y el refresh token usan el mismo secreto, `iss`, `aud` y `jti`, y no tienen claim `typ`. `/api/auth/introspect` acepta un refresh token como si fuera un access token; ProCV, que valida por introspección, también. | `identity/src/services/tokenService.ts`, `controllers/introspectController.ts` | Añadir el claim `typ` (`access`/`refresh`), secretos distintos y rechazo explícito en verify e introspect. |
| S3 | **A** | SSRF en la generación de PDF: `personal.profileImage` admite cualquier URL y Puppeteer la carga en el servidor (`--no-sandbox`, sin interceptar peticiones). | `procv/backend/src/utils/templates.ts:183`, `utils/pdfGenerator.ts` | Aceptar solo `data:image/*` (o un host propio); `page.setRequestInterception` con bloqueo de red. |
| S4 | **A** | HS256 con un secreto compartido entre ProIdentity, ProJobs y la Render env de ProCV: comprometer cualquier módulo permite emitir tokens válidos para toda la plataforma. | `projobs/server/src/auth/identity.ts`, configuración de Render | Migrar a firma asimétrica (EdDSA o RS256) con JWKS publicado por ProIdentity. |
| S5 | **M** | Refresh tokens guardados en claro en `Session.refreshToken`. Hay 379 sesiones para 9 usuarios: no se purgan. | `identity/prisma/schema.prisma`, conteo en Neon | Guardar el hash SHA-256 del token y programar una purga de sesiones expiradas o revocadas. |
| S6 | **M** | ProJobs: `companies`, `jobs`, `company_members` y `outbox_events` no tienen RLS (la autorización de empresa está solo en la app, con `assertMember`). Las tablas de candidato sí tienen RLS forzada. | `migrations/001_projobs_v2.sql`, `pg_class.relrowsecurity` | Añadir políticas RLS de escritura por membresía como defensa en profundidad. |
| S7 | **M** | Asistente de IA de ProCV simulado: `cvAIGeneration.ts` devuelve textos fijos, aunque la UI lo presenta como IA. | `procv/frontend/src/services/cvAIGeneration.ts` | Implementarlo de verdad (LLM vía backend) o retirarlo de la UI. |
| S8 | **M** | Cero SEO de empleo: ProJobs es una SPA sin SSR, sin JSON-LD `JobPosting`, sin `sitemap.xml` y sin `robots.txt`. Core tampoco tiene sitemap ni robots. | `apps/projobs/public`, `apps/core/public` | SSR/prerender de fichas de vacante y de empresa, JSON-LD y sitemaps (ver TARGET_ARCHITECTURE §5). |

Otros hallazgos de severidad baja y media están en §4.

---

## 1. Estado de Git

| Elemento | Estado |
|---|---|
| Ramas protegidas en GitHub | `main`, `qa` (sin borrado ni force push; los admins también quedan sujetos) |
| Divergencia | `origin/qa` y `origin/main`: **0 archivos de diferencia**. `main` tiene 3 merge commits más (los PR de promoción). |
| Repo | **Público**. `delete_branch_on_merge = false`. |
| Ramas remotas ya mergeadas en `main` (borrables) | `chore/general-employment-copy`, `chore/remove-legacy-files`, `chore/sync-main-into-qa`, `feat/qa-sso-gateway`, `fix/identity-refresh-rate-limit`, `fix/projobs-empty-catalog`, `fix/projobs-neon-migration` |
| Ramas locales obsoletas | `backup/qa-local-20261117`, `release/procv-pdf-import`, `release/procv-pdf-production-base`, `release/procv-pdf-qa-integration` (40 commits detrás), y 3 ramas cuyo upstream ya no existe (`chore/remove-leaked-keys`, `feat/procv-import-review`, `feat/projobs-v2`) |
| Worktrees | 9. Hay 2 en `C:/Projects/prosolutions-{p0-release,release}` (HEAD separado) y 6 en carpetas temporales de otro agente (`kilo`). **Las versiones antiguas de `.mcp.json` en esos worktrees contienen keys ya revocadas.** |
| Stashes | 3 (`phase-b`, `backup-core-eslint`, `backup: cambios locales ProCV`) |
| Refs de agentes | ~65 refs en `refs/agents/*` y `refs/codex/*` |
| Sin rastrear (local) | `AGENTS.md`, `CLAUDE.md`, `MASTER_CONTEXT.md`, `docs/architecture/SERVICES.md`, `docs/development/`, `scripts/start-local.ps1` y estos 3 documentos |

**Recomendación (requiere autorización):** borrar las 7 ramas remotas mergeadas y las ramas locales obsoletas; eliminar worktrees y stashes tras confirmar que no tienen trabajo único; podar `refs/agents`; versionar `scripts/start-local.ps1` y los documentos de contexto que se quieran conservar.

---

## 2. Infraestructura real

| Capa | Producción | QA |
|---|---|---|
| Core (portal, login, admin) | Render static → `prosolutions.page` | static → `qa.prosolutions.page` (Worker de Cloudflare) |
| ProIdentity | Render web (Node nativo) → `identity.prosolutions.page` | Docker → `identity-qa.prosolutions.page` |
| ProCV frontend | Render static → `procv.prosolutions.page` | Docker → `procv-qa.prosolutions.page` |
| ProCV backend | Render web nativo | Docker (`procv-backend-qa-v2.onrender.com`) |
| ProJobs web | Render static → `projobs.prosolutions.page` | static → `projobs-qa.prosolutions.page` |
| ProJobs API | Render web nativo (`projobs-api-0clw`), **AutoDeploy apagado** | `projobs-api-qa.onrender.com` |
| BD | Neon `patient-voice-48621571`, rama `production`; BDs `proidentity`, `procv`, `projobs` y además `neondb` (huérfana, ver S1) | Neon `restless-grass-90229454` |

- **Plan gratuito de Render:** las APIs se duermen tras un periodo sin uso y el primer request tarda decenas de segundos. Penaliza la UX y el SEO.
- **Producción nativa frente a QA en Docker:** los entornos no son idénticos. Node 22 en el Docker de ProCV backend y Node 20 en el resto.
- `render.yaml` **no está reconciliado** con el dashboard: no usar Blueprint Sync.
- **CI** (`core-build.yml`): builds y tests de los 6 paquetes; `postgres-migration-readiness.yml` para migraciones. **Faltan** Dependabot/Renovate, `npm audit`, CodeQL y escaneo de secretos (el repo es público), además de E2E en CI.
- **Observabilidad:** no hay Sentry, OpenTelemetry ni logs estructurados centralizados; solo `morgan('tiny')` y un logger propio.
- **Email:** nodemailer por SMTP. El remitente por defecto es `noreply@prosolutions.dev`, **un dominio distinto al de la marca**. Verificar `SMTP_FROM` en Render, además de SPF, DKIM y DMARC de `prosolutions.page`.

---

## 3. Esquema de base de datos (estado real en Neon producción)

### 3.1 `proidentity` (Prisma, 6 migraciones)
| Tabla | Filas aprox. | RLS | Nota |
|---|---|---|---|
| User | 9 | sí | |
| Session | 379 | sí | refresh token en claro; sin purga (S5) |
| ModuleAccess | 30 | sí | enum `Module`: `PROCV, PROJOBS, PROSKILLS, PROCAREER, PROINTERVIEW, PRORECRUIT`; tres valores sin uso |
| ProfessionalProfile | 6 | sí | se solapa con los datos del CV (ver §5) |
| PasswordResetToken / EmailVerificationToken | 1 / 2 | sí | |
| AuditLog | 0 | sí | **no se está escribiendo** |
| AdminRole / AdminPermission / AdminRolePermission / UserAdminRole | 8 / 40 / 116 / 3 | no | RBAC administrativo |

La migración `add_jti_column` no tiene prefijo de fecha, así que su orden depende del nombre.

### 3.2 `procv` (Prisma, 12 migraciones)
| Tabla | Filas | RLS (forzada) |
|---|---|---|
| CV | 15 | sí |
| CVVersion | 13 | sí |
| CVAtsAnalysis | 2 | sí |
| AuditLog | 48 | sí |
| PlatformSetting | 5 | sí |
| `procv_private.context_signing_keys` | 1 | acceso restringido (correcto) |
| `procv_private.identity_jwt_key` | 1 | **PUBLIC SELECT (S1)** |
| `public.context_signing_keys` | 1 | **PUBLIC SELECT (S1)** |

Roles (verificado en `pg_auth_members`): `procv_runtime` y `procv_login` son miembros de `procv_app`, y `procv_admin_login` de `procv_admin_app`. En el clúster conviven roles duplicados o heredados: `procv_login`, `proidentity_login`, `projobs_login` (miembro de `projobs_api` y `projobs_app`), `projobs_app` y `token_roles`. Hay que inventariar cuál usa cada servicio en Render y retirar el resto. Las migraciones `zzzz_*` usan el nombre para forzar el orden: deuda técnica.

### 3.3 `projobs` (SQL propio, `001_projobs_v2.sql`, checksum `1ec6ccc`)
`companies`, `company_members`, `jobs` (tsvector generado + GIN), `applications`, `application_events`, `saved_jobs`, `outbox_events`, `projobs_schema_migrations`. **Producción está vacía** (lanzamiento con catálogo vacío). RLS forzada en `applications`, `application_events` y `saved_jobs`; no en el resto (S6). El rol `projobs_runtime` es miembro de `projobs_api`, que es `NOLOGIN NOINHERIT`.

### 3.4 BD `neondb`
Solo contiene `procv_private.context_signing_keys`, legible por `PUBLIC`. Es un resto del corte a Neon: **eliminarla**.

---

## 4. Seguridad (OWASP Top 10 2021)

| OWASP | Estado | Detalle |
|---|---|---|
| A01 Broken Access Control | 🟡 | **ProCV:** el CV se consulta por `id` + `userId` del token, con RLS por contexto firmado (`withUserContext`); no se detecta IDOR. **ProJobs:** las rutas de empresa validan la membresía (`assertMember`) y las de candidato usan RLS; 29 tests cubren el aislamiento entre reclutadores. **ProIdentity:** la parte de admin usa `requirePermission` (RBAC en BD, no por claims). Pendiente: S6 (RLS de empresa) y la introspección de refresh tokens (S2). |
| A02 Cryptographic Failures | 🔴 | S1 (secretos legibles), S4 (HS256 compartido) y S5 (tokens en claro). bcrypt con **cost 10** (recomendado ≥ 12). |
| A03 Injection | 🟢 | Prisma y `pg` parametrizados; `tsquery` construido de forma segura (`toPrefixTsQuery`); HTML de las plantillas con `escapeHtml`. |
| A04 Insecure Design | 🟡 | El access token dura 15 min y el refresh rota con ventana de recuperación de 10 s (bien). Pero ProCV llama a introspect en **cada** request, lo que acopla su disponibilidad a la de ProIdentity, y el asistente de IA es falso (S7). |
| A05 Security Misconfiguration | 🟡 | `DEFAULT_ALLOWED_ORIGINS` de ProIdentity incluye `localhost:*` aunque esté en producción (si `ALLOWED_ORIGINS` no está definida). En desarrollo, CORS acepta cualquier origen con credenciales. `express.json({limit:'10mb'})` en ProIdentity es innecesario. La CSP de helmet solo protege las respuestas de la API. Las SPA estáticas de Render no envían cabeceras de seguridad (CSP, HSTS, `frame-ancestors`). |
| A06 Vulnerable Components | 🟡 | No hay auditoría automática de dependencias ni Dependabot. Prisma 5.22 (ya hay versiones mayores nuevas). |
| A07 Identification & Auth | 🟡 | Rate limits en login, refresh, reset e introspect (corregido el bloqueo del `/refresh` anónimo). Cookies `HttpOnly` y `Secure`. Por defecto, producción usa `SameSite=None` aunque todo es *same-site* (`*.prosolutions.page`): `Lax` bastaría y bloquea CSRF de login y logout. `/api/auth/*` queda fuera del middleware CSRF. No hay MFA ni login social. |
| A08 Software & Data Integrity | 🟡 | Outbox transaccional en ProJobs (bien). `/internal/events` está protegido con token. ProIdentity migra en cada arranque, incluido `migrate resolve --rolled-back`: es un riesgo operativo. |
| A09 Logging & Monitoring | 🔴 | `AuditLog` de ProIdentity vacío en producción. Sin alertas, sin APM y sin tracking de errores de frontend. |
| A10 SSRF | 🔴 | S3 (Puppeteer). ProJobs llama a ProCV con una URL de configuración fija, así que ahí no hay SSRF. |

**Datos personales (Ley 1581 de 2012 de Colombia y GDPR para usuarios de la UE):**
- La política de privacidad v2 de ProJobs ya publica qué datos se comparten al postularse.
- Falta un flujo de **exportación y borrado de cuenta** que se propague a ProCV y ProJobs (derecho de supresión).
- Falta un registro de consentimiento para compartir el CV con empresas.
- Falta definir una retención de datos (sesiones, postulaciones cerradas).

---

## 5. Inventario funcional por módulo

Leyenda: **Conservar** · **Optimizar** · **Rehacer** · **Eliminar**.

### 5.1 ProIdentity (`apps/identity`)
| Capacidad | Verificado | Decisión |
|---|---|---|
| Registro, login, logout, verificación de email, reset de contraseña | Rutas activas y probadas en el flujo de QA | **Conservar** |
| Refresh con rotación y ventana de recuperación | Activo; anónimos sin consumir rate limit (#112) | **Optimizar** (S2, S5, `SameSite=Lax`) |
| Gestión de sesiones (listar, revocar, revocar otras) | `/api/auth/sessions*` + página en Core | **Conservar** |
| Concesión de módulos (`/api/modules/grant|revoke`) y PRORECRUIT solo por concesión | Activo | **Conservar** |
| RBAC de admin (8 roles, 40 permisos) | Activo | **Conservar** |
| Proxy de admin de ProCV (`/api/admin/procv/*`) | Proxy hacia ProCV backend | **Conservar** (pasará a ProAdmin) |
| `ProfessionalProfile` | 6 filas; se solapa con el CV | **Rehacer** como perfil canónico del candidato (ver TARGET §3.2) |
| Introspect | Lo usa ProCV en cada request | **Optimizar**: verificación local con JWKS más lista de revocación |
| Enum `Module` con `PROSKILLS`, `PROCAREER`, `PROINTERVIEW` | Sin uso | **Eliminar** (migración) |
| `AuditLog` | 0 filas | **Rehacer**: escribir eventos de seguridad |

### 5.2 Core (`apps/core`) — portal, login central y admin
| Capacidad | Decisión |
|---|---|
| Landing, login, registro, recuperación y verificación de cuenta, callback SSO | **Conservar** (ya con textos para todos los sectores) |
| Portal (`/dashboard`, `/modules`) | **Optimizar**: se convierte en el inicio del candidato o empresa |
| Seguridad de sesiones y preferencias | **Conservar** |
| Consola de admin (`/admin`, `/admin/access`) | **Rehacer** como ProAdmin (moderación de vacantes y empresas, métricas, usuarios) |
| SEO | **Optimizar**: falta `sitemap.xml`, `robots.txt` y `theme-color` coherente |

### 5.3 ProCV (`apps/procv`)
| Capacidad | Verificado | Decisión |
|---|---|---|
| Editor de CV y 12 plantillas | Activo (`/editor`, `/editor/:cvId`) | **Conservar** |
| Export a PDF (Puppeteer), JSON y XML | Activo | **Optimizar** (S3, endurecer Puppeteer) |
| Importación de PDF o DOCX (`/import/parse`, público, 5 MB, con rate limit) | Activo y con tests | **Conservar** |
| Análisis ATS y *tailor* | Heurístico por palabras clave (`atsService.ts`) | **Optimizar**: explicar el score y reutilizar el motor de afinidad de ProJobs |
| Versiones de CV | Activo | **Conservar** |
| Asistente de IA | Respuestas fijas (S7) | **Rehacer** o retirar |
| Admin propio de ProCV | Las páginas ya se eliminaron (#119); las rutas redirigen a Core | **Conservar** las APIs; la UI vive en ProAdmin |
| Sistema visual | 149 `blue-*` + 305 `gray-*` escritos a mano, sin `ProFooter` | **Rehacer** con el design system |
| `RLS context` + roles restringidos | Activo | **Conservar** (rotar la clave, S1) |
| `DIRECT_DATABASE_URL` priorizada en runtime | Sigue así en `config.ts:36` | **Optimizar** |

### 5.4 ProJobs (`apps/projobs` + `apps/projobs/server`) — v2 en producción desde 2026-11-18
| Capacidad | Decisión |
|---|---|
| Búsqueda instantánea con filtros, facetas, vista dividida y paginación | **Conservar** |
| Ficha de vacante y de empresa, vacantes similares | **Conservar** + SEO (SSR/prerender, JSON-LD) |
| Postulación en un clic con el CV de ProCV y afinidad transparente | **Conservar** |
| Guardados y seguimiento de etapas del candidato | **Conservar** |
| Panel de empresa (empresas, vacantes, pipeline del ATS ligero) | **Conservar**: es "ProRecruit" |
| Outbox + `/internal/events` | **Conservar**. Aún no hay consumidor (falta notificar por email) |
| Alertas de empleo, notificaciones, mensajería | No existen → **Construir** |
| Moderación y verificación de empresas | No existe → **Construir** (ProAdmin) |

### 5.5 ProRecruit
No es una app aparte: es el módulo `PRORECRUIT` de ProIdentity, que habilita la pestaña **Empresa** de ProJobs. **Conservar** este modelo, porque evita fragmentar. Falta el **alta de empresas por autoservicio** con verificación: hoy solo un admin puede conceder el módulo, y eso es un cuello de botella para el crecimiento.

### 5.6 Paquetes compartidos
| Paquete | Decisión |
|---|---|
| `packages/ui` (tokens, `ProHeader`, `ProFooter`, `AdSlot`, primitivas) | **Optimizar**: será la fuente única del design system; los tokens deben generar la configuración de Tailwind |
| `packages/auth` | Ya eliminado (#119) |

### 5.7 Deuda eliminada en esta jornada (referencia)
Reposicionamiento a empleo general (#117/#118); 84 archivos legacy, Supabase y `packages/ui/dist` (#119/#120); limpieza de los datos de demostración de QA.

---

## 6. Benchmark competitivo (brechas)

| Referente | Estándar de mercado | ProSolutions hoy | Brecha |
|---|---|---|---|
| LinkedIn / Torre | Perfil profesional único y reutilizable; señales de afinidad; red | El CV vive en ProCV y `ProfessionalProfile` está aparte | Perfil canónico único, con visibilidad pública opcional |
| Otta / Welcome to the Jungle | Fichas de empresa ricas (cultura, beneficios, fotos); salario visible; recomendaciones | Ficha de empresa básica; salario opcional | Página de empresa enriquecida; incentivar el salario visible |
| Wellfound | Postulación directa al reclutador; transparencia de salario y equity | Postulación en un clic y estado visible | Mensajería entre candidato y empresa |
| Resume.io | Plantillas pulidas, sugerencias reales de redacción, carta de presentación | 12 plantillas; IA simulada | IA real con límites; carta de presentación |
| Greenhouse / Lever | Pipeline configurable, scorecards, colaboración, plantillas de email, informes | Pipeline fijo de 6 etapas con notas | Varios reclutadores por empresa, emails al candidato, métricas del embudo |
| Computrabajo / Magneto (LatAm) | Volumen y SEO masivo: páginas por cargo y ciudad, Google for Jobs, alertas por email, app móvil, empleo operativo y no solo profesional | SPA sin SEO; sin alertas | **SSR + JSON-LD + páginas por ciudad y cargo + alertas**: es la mayor palanca de tráfico |
| Todos | Login social (Google), verificación de email, onboarding guiado | Email y contraseña | Login con Google y onboarding por rol |

**UX transversal:** sin modo móvil nativo ni PWA instalable (los manifests existen); los cold starts del plan gratuito degradan la primera visita.

---

## 7. Riesgos priorizados para la Etapa 2

1. **S1**: rotar los secretos y borrar las tablas huérfanas. Es lo primero, antes de cualquier funcionalidad.
2. **S2, S3, S4 y S5**: endurecer tokens y PDF. Migrar a JWKS asimétrico desacopla ProCV de la introspección.
3. **SEO de ProJobs (S8)**: sin SSR, el catálogo no captará tráfico orgánico.
4. **Plan gratuito de Render**: los cold starts son incompatibles con un producto de mercado; valorar plan pago o *keep-warm* para las APIs.
5. **Observabilidad y auditoría** (A09) antes de abrir el autoservicio a empresas.
6. **Cumplimiento de la Ley 1581**: exportación y borrado de cuenta propagados a los tres módulos.
