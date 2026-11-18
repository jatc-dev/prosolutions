# ProSolutions — Arquitectura objetivo (Etapa 1)

Fecha: 2026-11-18 · Basado en [AUDIT_AND_INVENTORY.md](AUDIT_AND_INVENTORY.md).
Principio rector: **un producto, pocos servicios**. No se crean microservicios nuevos salvo que haya una razón de seguridad o de escala. ProRecruit sigue siendo un *rol* dentro de ProJobs; ProAcademy, ProTools y ProAdmin son **superficies** sobre servicios existentes, no backends nuevos.

---

## 1. Mapa objetivo

```
                         Cloudflare (DNS, TLS, caché, Worker de QA, WAF básico)
                                             │
    ┌────────────────────────────────────────┼─────────────────────────────────────────┐
    │  SUPERFICIES (frontends)               │                                         │
    │                                        │                                         │
    │  prosolutions.page  ── Web pública (SSR/prerender): landing, ProAcademy (/guias), │
    │                        ProTools (/herramientas), login central, cuenta, ProAdmin │
    │  projobs.prosolutions.page ── ProJobs (SSR para /empleos, /empresas y SEO; SPA   │
    │                        para el área de candidato y de empresa = ProRecruit)      │
    │  procv.prosolutions.page   ── ProCV (SPA: editor, plantillas, importación)       │
    └────────────────────────────────────────┼─────────────────────────────────────────┘
                                             │  Bearer JWT (EdDSA, verificación local con JWKS)
    ┌────────────────────────────────────────┼─────────────────────────────────────────┐
    │  SERVICIOS                             │                                         │
    │  ProIdentity  (auth, sesiones, perfil canónico del candidato, roles y módulos,   │
    │               JWKS, eventos de cuenta)                                           │
    │  ProCV API    (CVs, versiones, PDF, importación, ATS; contenido editorial y      │
    │               protools NO)                                                       │
    │  ProJobs API  (vacantes, empresas, postulaciones, ATS ligero, alertas, outbox)   │
    │  Worker jobs  (cron de Render: outbox → email, alertas, purgas, sitemap)         │
    └────────────────────────────────────────┼─────────────────────────────────────────┘
                                             │
           Neon PostgreSQL (1 proyecto, BDs aisladas: proidentity · procv · projobs)
           + rama QA + ramas efímeras por PR para probar migraciones
```

**Decisiones:**
- **ProAcademy** es contenido editorial en Markdown/MDX dentro del repo, generado de forma estática en la web pública. No necesita BD ni CMS en la fase 1: es versionable, rápido y SEO puro.
- **ProTools** son calculadoras 100 % cliente (TypeScript puro) con los parámetros legales versionados en JSON. No necesitan backend.
- **ProAdmin** es una sección de Core (`/admin`) que usa las APIs existentes con permisos RBAC; no es un servicio nuevo.
- **Worker:** un único Render Cron Job (Node) que reutiliza el código de las APIs. Sustituye el polling ad hoc.
- **Producción en Docker igual que QA**, con Node 22 LTS en todos los servicios: un solo artefacto por servicio y paridad entre entornos.

---

## 2. Identidad y sesión (flujo único)

### 2.1 Tokens
| Token | Formato | Vida | Dónde | Validación |
|---|---|---|---|---|
| Access | JWT **EdDSA (Ed25519)**, `typ=access`, `kid`, `iss=https://identity.prosolutions.page`, `aud=prosolutions-api`, `sub`, `sid` (sesión), `modules[]`, `roles[]` | 10 min | Memoria del frontend | **Local en cada API** contra `GET /.well-known/jwks.json` (con caché), más una lista corta de sesiones revocadas |
| Refresh | Opaco aleatorio de 256 bits (no JWT) | 7 días (30 con "recordarme") | Cookie `HttpOnly; Secure; SameSite=Lax; Domain=.prosolutions.page` (`_qa` en QA) | Solo ProIdentity. En la BD se guarda el **SHA-256**; rotación con detección de reutilización (si se reutiliza, se revoca toda la familia) |

- La lista de revocación sale del evento `session.revoked`: ProIdentity lo publica en el endpoint `/internal/revocations?since=`, que las APIs consultan cada 30 s. Las APIs **no** llaman a introspect en cada request.
- `/introspect` se conserva solo para depuración y para servicios internos.
- **Login social con Google** (OIDC) en ProIdentity, enlazado por email verificado.
- **MFA TOTP** opcional, obligatorio para roles admin.

### 2.2 Roles y capacidades (claims)
| Capacidad | Origen | Uso |
|---|---|---|
| `candidate` | Cualquier cuenta verificada (los antiguos `PROCV` y `PROJOBS` se fusionan) | ProCV y el área de candidato de ProJobs |
| `recruiter` | Concesión (`PRORECRUIT`) o **autoservicio con verificación de empresa** (dominio de email corporativo o NIT validado por un admin) | Área de empresa de ProJobs |
| `admin:*` | RBAC en BD (`AdminRole`) | ProAdmin; permisos finos que se evalúan **en el servidor**, nunca por claim |

Migración del enum `Module`: retirar `PROSKILLS`, `PROCAREER` y `PROINTERVIEW`. Se mantienen `PROCV`, `PROJOBS` y `PRORECRUIT` por compatibilidad hasta que los consumidores lean `roles[]`.

### 2.3 Navegación entre módulos
Se mantiene el SSO actual por cookie de dominio padre. El frontend al que llega el usuario llama a `POST /api/auth/refresh` y obtiene un access token sin redirecciones. El login central sigue en `prosolutions.page/login?returnUrl=` con una lista de orígenes permitidos.

---

## 3. Contratos de integración

### 3.1 Principios
1. **Cada servicio es dueño de sus datos.** No hay consultas entre BDs.
2. **Lectura síncrona** por API con el token del usuario (el usuario autoriza lo que comparte).
3. **Efectos asíncronos** por *outbox* con entrega al menos una vez (*at-least-once*) e idempotencia por `eventId`.
4. Contratos tipados en un paquete `packages/contracts`: schemas de zod compartidos, de los que se genera OpenAPI. Sustituye los tipos duplicados de `apps/projobs/server/src/contracts.ts`.

### 3.2 Perfil canónico del candidato (ProIdentity)
`ProfessionalProfile` se convierte en la **fuente del perfil** (titular, ciudad, país, modalidad deseada, salario esperado, habilidades normalizadas, idiomas, visibilidad). El CV de ProCV es un **documento** que se deriva de él y lo enriquece.

| Endpoint | Dueño | Consumidores |
|---|---|---|
| `GET /api/profile/me` · `PUT /api/profile/me` | ProIdentity | ProCV (prellenar el CV), ProJobs (postulación, afinidad) |
| `POST /api/profile/me/sync-from-cv/:cvId` | ProIdentity (lee el CV con el token del usuario) | Botón "usar este CV como mi perfil" |

### 3.3 Postulación en un clic (ProJobs ↔ ProCV)
```
Candidato → ProJobs web: "Postularme"
  ProJobs web → ProCV API  GET /api/cvs?limit=50            (token del usuario; elige el CV)
  ProJobs web → ProJobs API POST /api/jobs/:id/apply { cvId, coverNote }
      ProJobs API → ProCV API GET /api/cvs/:cvId             (token del usuario; valida la propiedad)
      ProJobs API: guarda una INSTANTÁNEA inmutable (CandidateSnapshot v1) + el PDF del CV
                   (ProCV: GET /api/cvs/:id/pdf → almacenamiento de objetos)
      ProJobs API: outbox `projobs.application.submitted`
  Worker: email al candidato (confirmación) y a los reclutadores de la empresa
```
- **Snapshot:** el reclutador ve el CV tal y como estaba al postularse, aunque el candidato lo edite después. El PDF se guarda en almacenamiento de objetos S3-compatible (Cloudflare R2), con acceso por URL firmada de corta duración.
- **Consentimiento:** se registra un checkbox explícito ("comparto mi CV con {empresa}") en `applications.consent_at` (Ley 1581).

### 3.4 Afinidad transparente (un único motor)
`packages/matching` (TypeScript puro, sin dependencias) es **el mismo motor** para ProJobs (ranking y match) y para ProCV ("¿qué tan bien encaja mi CV con esta vacante?", que sustituye el `tailor` heurístico).

```
score = 0.55·cobertura_habilidades_requeridas
      + 0.15·habilidades_deseables
      + 0.10·seniority (distancia en niveles)
      + 0.10·modalidad y ubicación compatibles
      + 0.10·idioma requerido
```
Salida: `{score, matched[], missing[], reasons[]}`. Siempre se muestran los motivos; **nunca** se descarta a nadie automáticamente. Las habilidades se normalizan con el diccionario actual (`normalizeSkill`), que se amplía a todos los sectores (Excel, caja, enfermería, licencias de conducción, etc.).

### 3.5 ATS ligero (ProRecruit dentro de ProJobs)
- **Etapas por defecto:** Postulado → Preselección → Entrevista → Oferta → Contratado / Descartado. Cada empresa puede **renombrarlas o añadir** etapas (tabla `pipeline_stages`).
- **Colaboración:** varios miembros por empresa con roles `owner`, `recruiter` y `viewer`; notas internas y valoración de 1 a 5 por candidato.
- **Comunicación:** plantillas de email por etapa (por ejemplo, "Descartado" con un mensaje respetuoso), enviadas por el Worker. El candidato ve el estado en `/postulaciones`.
- **Métricas:** postulaciones por vacante, conversión por etapa y tiempo hasta la contratación.

### 3.6 Catálogo de eventos (outbox)
| Evento | Productor | Consumidores |
|---|---|---|
| `identity.user.registered` · `identity.user.deleted` | ProIdentity | ProCV y ProJobs (borrado en cascada; Ley 1581) |
| `identity.session.revoked` | ProIdentity | APIs (lista de revocación) |
| `projobs.job.published` · `projobs.job.closed` | ProJobs | Worker (alertas, sitemap, IndexNow) |
| `projobs.application.submitted` · `projobs.application.stage_changed` | ProJobs | Worker (emails) |
| `procv.cv.updated` | ProCV | ProIdentity (sincronizar el perfil si el usuario lo eligió) |

Formato: `{eventId (uuid), type, version, occurredAt, actorId, subjectId, payload}`. Los consumidores guardan `processed_events(eventId)` para garantizar idempotencia.

---

## 4. Superficies públicas y monetización

### 4.1 ProAcademy (`prosolutions.page/guias/...`)
- Contenido MDX en `apps/core/content/guias/{slug}.mdx` con frontmatter (`title`, `description`, `category`, `updatedAt`, `author`, `relatedTools`, `relatedSearches`).
- **Categorías iniciales:** hoja de vida (cómo hacer un CV, CV sin experiencia, CV por sector), entrevista, derechos laborales en Colombia (liquidación, prima, cesantías, vacaciones, horas extra), búsqueda de empleo por ciudad.
- Cada guía enlaza con una herramienta de ProTools, una plantilla de ProCV y búsquedas de ProJobs (enlazado interno).
- **Monetización:** AdSense en espacios fijos (`AdSlot` de `packages/ui`) solo en ProAcademy y ProTools, nunca en los flujos de postulación ni del editor.

### 4.2 ProTools (`prosolutions.page/herramientas/...`)
Calculadoras 100 % cliente, compartibles por URL (`?salario=...`) y con una explicación paso a paso.

| Herramienta | Entradas | Fórmula (Colombia) |
|---|---|---|
| Salario neto mensual | salario, auxilio de transporte (sí/no), otros ingresos | Neto = salario + auxilio − salud empleado (4 %) − pensión empleado (4 %) − Fondo de Solidaridad Pensional (1 %–2 % según rangos de SMMLV) − retención en la fuente (tabla del Art. 383 ET en UVT) |
| Liquidación laboral | fechas de inicio y fin, salario, motivo, días de vacaciones pendientes | Cesantías = salario base × días / 360 · Intereses = cesantías × días × 12 % / 360 · Prima = salario base × días del semestre / 360 · Vacaciones compensadas = salario (sin auxilio de transporte) × días trabajados sin disfrutar vacaciones / 720 · Salario base de cesantías y prima con auxilio de transporte cuando aplique · Indemnización (despido sin justa causa) según tipo de contrato y antigüedad (Art. 64 CST) |
| Horas extra y recargos | horas por tipo, salario | Recargos legales vigentes (diurna, nocturna, dominical y festivo), con el valor de la hora según la jornada máxima legal vigente |
| Costo total de un empleado (empresas) | salario | Aportes del empleador (salud, pensión, ARL por nivel de riesgo, cajas de compensación, ICBF y SENA según exoneración) + prestaciones |

**Regla técnica obligatoria:** los valores anuales (SMMLV, auxilio de transporte, UVT, jornada máxima, porcentajes de recargo y tablas de retención) viven en `packages/payroll-co/params/{año}.json`, con **fuente oficial citada** (decreto o resolución) y pruebas unitarias con casos verificados por un contador. Ningún número se escribe a mano en los componentes. Cada calculadora muestra el aviso "cálculo orientativo".

### 4.3 ProAdmin (`prosolutions.page/admin`)
| Sección | Permiso RBAC | API |
|---|---|---|
| Usuarios (buscar, ver módulos y roles, suspender) | `identity.users.*` | ProIdentity `/api/admin/users` |
| Empresas (verificar, suspender) y solicitudes de reclutador | `projobs.companies.moderate` (nuevo) | ProJobs `/api/admin/companies` (nuevo) |
| Vacantes (reportes, ocultar, motivo) | `projobs.jobs.moderate` (nuevo) | ProJobs `/api/admin/jobs` (nuevo) |
| ProCV (estadísticas, ajustes, auditoría) | `procv.*` (existente) | Proxy actual de ProIdentity |
| Auditoría unificada | `identity.audit.read` | `AuditLog` de cada servicio |
| Métricas (registros, CV creados, vacantes, postulaciones, conversión) | `platform.analytics.read` | Vistas agregadas por servicio |

Cada acción de moderación escribe en el `AuditLog` (quién, qué, cuándo y motivo).

---

## 5. SEO y rendimiento

- **ProJobs SSR:** migrar la web a **Vite SSR con prerender incremental** (o Astro con islas React), reutilizando los componentes actuales. Las rutas públicas (`/empleos`, `/empleos/:slug`, `/empresas/:slug` y páginas programáticas `/empleos/{cargo}-en-{ciudad}`) se renderizan en el servidor. El área privada sigue como SPA.
- **JSON-LD `JobPosting`** en cada vacante (`title`, `description`, `datePosted`, `validThrough`, `employmentType`, `hiringOrganization`, `jobLocation` o `applicantLocationRequirements` + `jobLocationType=TELECOMMUTE`, `baseSalary`). La vacante cerrada responde 410 o lleva `validThrough` vencido.
- **Sitemaps** por servicio (`/sitemap.xml` índice → vacantes, empresas, guías y herramientas), regenerados por el Worker al publicar o cerrar, más ping de IndexNow.
- **Cabeceras de seguridad** en los sitios estáticos mediante las reglas de headers de Render (o el Worker de Cloudflare): CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
- **Rendimiento objetivo (Core Web Vitals, p75 móvil):** LCP < 2,5 s, INP < 200 ms, CLS < 0,1. Las APIs deben salir del plan gratuito, o como mínimo mantener caliente la de ProJobs.

---

## 6. Plan de migración segura de base de datos

### 6.1 Reglas
1. **Toda migración se prueba en una rama efímera de Neon** creada desde producción (con datos reales enmascarados si contienen PII). Después se aplica en QA y por último en producción, con autorización explícita del owner.
2. Patrón **expandir → migrar → contraer**: primero se añade (columnas o tablas nuevas, compatibles hacia atrás), luego se despliega el código que escribe en los dos formatos, se rellenan los datos y, en un release posterior, se borra lo antiguo.
3. **Rama de respaldo** en Neon antes de cada migración de producción (se conserva 7 días).
4. Las migraciones **no** se ejecutan al arrancar el contenedor. Se usa un paso explícito de *pre-deploy* (Render `preDeployCommand`) que falla rápido. Esto retira el `migrate resolve --rolled-back` automático de ProIdentity.
5. Renombrar las migraciones `zzzz_*` y `add_jti_column` requiere una **baseline**: marcarlas como aplicadas con su nuevo nombre (`prisma migrate resolve --applied`) en una ventana controlada.

### 6.2 Secuencia propuesta
| Paso | BD | Cambio | Riesgo | Reversión |
|---|---|---|---|---|
| M0 (urgente) | procv, neondb | Rotar `IDENTITY_JWT_SECRET` y `PROCV_RLS_CONTEXT_KEY`; `DROP TABLE procv_private.identity_jwt_key, public.context_signing_keys`; `DROP DATABASE neondb` (antes, verificar que nada se conecta a ella) | Bajo (no se usan). La rotación cierra todas las sesiones. | Rama de respaldo |
| M1 | proidentity | `Session.refresh_token_hash` (nuevo) + escritura dual; purga de sesiones expiradas o revocadas > 30 días | Bajo | La columna antigua se mantiene hasta M1b |
| M1b | proidentity | Borrar `Session.refreshToken` en claro | Medio (invalida refresh tokens anteriores) | Restaurar desde la rama de respaldo |
| M2 | proidentity | Tabla `jwks_keys` (claves públicas por `kid`; la privada vive en una variable de entorno o en un gestor de secretos) | Bajo | Volver a HS256 por *feature flag* |
| M3 | proidentity | Ampliar `ProfessionalProfile` (habilidades normalizadas, preferencias, visibilidad) + `consents` | Bajo | Aditivo |
| M4 | projobs | RLS de escritura en `companies`, `jobs` y `company_members` por membresía; `pipeline_stages`; `applications.consent_at`, `snapshot jsonb`, `cv_pdf_key`; `processed_events` | Medio (las políticas RLS pueden bloquear escrituras legítimas) | Probar con los 29 tests más tests nuevos en PGlite; política `DROP` en el script de reversión |
| M5 | projobs | `job_alerts` (búsqueda guardada + frecuencia) y `company_verifications` | Bajo | Aditivo |
| M6 | proidentity | Retirar los valores sin uso del enum `Module` | Medio (los enum de Postgres no permiten `DROP VALUE`): crear un tipo nuevo, migrar la columna y borrar el antiguo | Rama de respaldo |
| M7 | clúster | Retirar los roles duplicados (`*_login`, `projobs_app`, `token_roles`) tras confirmar en Render qué rol usa cada servicio | Medio | `CREATE ROLE` desde la definición guardada |

### 6.3 Variables y secretos
- Todos los secretos viven en Render (o en un gestor de secretos), **nunca en la BD** salvo la clave de contexto RLS, que debe estar en un schema `REVOKE ALL FROM PUBLIC`.
- Inventario de variables por servicio en `docs/deployment/ENVIRONMENT_VARIABLES.md`, regenerado desde los schemas zod de `config.ts`.
- Unificar la lista CORS: un `ALLOWED_ORIGINS` por entorno con la misma fuente para los tres servicios, **sin `localhost` en producción**.

---

## 7. Hoja de ruta por etapas (propuesta)

| Etapa | Objetivo | Entregables |
|---|---|---|
| 2 — Seguridad base | Cerrar S1–S6 | M0–M2, JWKS, refresh opaco, Puppeteer endurecido, RLS de empresa, cabeceras de seguridad, Dependabot, CodeQL, Sentry |
| 3 — Design system | Un solo producto visual | `packages/ui` v2 según BRAND_AND_DESIGN_SYSTEM.md; migración de Core, ProJobs y ProCV |
| 4 — Integración | Candidato unificado | Perfil canónico (M3), `packages/matching`, snapshot y consentimiento (M4), Worker de emails |
| 5 — Crecimiento | Tráfico orgánico | SSR y JSON-LD de ProJobs, sitemaps, ProTools (4 calculadoras), ProAcademy (10 guías iniciales) |
| 6 — Empresas | Autoservicio de ProRecruit | Verificación de empresa, pipeline configurable, colaboración, alertas de empleo (M5), ProAdmin de moderación |
