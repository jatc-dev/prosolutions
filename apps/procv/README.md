# ProCV Platform

ProCV Platform es una aplicación web full-stack para **crear, editar y exportar hojas de vida profesionales**: editor visual en tiempo real, plantillas modernas, autoguardado con versiones, verificación de correo, análisis ATS y exportación a PDF de alta fidelidad (A4).

- **Producción**: https://procv.prosolutions.page/
- **API**: https://procvbkn.onrender.com (`/health` para health check)

---

## 🧱 Arquitectura

```
Navegador (SPA React)
   │  HTTPS, cookies httpOnly + JWT (access 15m / refresh 7d con rotación)
   ▼
Render Static/Docker  ──►  Render Web Service (Express + Prisma)
   procv-platform              procvbkn
                                   │  pooler (PgBouncer, runtime)
                                   ▼
                              Supabase PostgreSQL
                                   ▲  conexión directa 5432 (solo migraciones)
```

| Capa | Stack |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS + Zustand |
| Backend | Node.js + Express 4 + TypeScript (strict) + Prisma ORM 5 |
| Base de datos | PostgreSQL en Supabase (PgBouncer para runtime, directo para migraciones) |
| Auth | JWT access tokens + refresh tokens rotativos en cookie httpOnly + verificación de email |
| PDF | html2pdf.js en cliente (export rápido) y Puppeteer en backend (alta fidelidad) |
| i18n | es/en con detección automática de idioma |

### Estructura del repositorio

```
/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Manejadores de rutas (delgados)
│   │   ├── services/       # Lógica de negocio (email, ATS, PDF)
│   │   ├── middleware/     # auth, CSRF, rate limiting, error handler global
│   │   ├── validation/     # Esquemas Joi
│   │   ├── dto/            # Objetos de transferencia
│   │   ├── utils/          # logger, monitorización, schema guard, cookies
│   │   ├── config.ts       # Config validada (fail-fast)
│   │   └── index.ts        # Entrypoint + graceful shutdown
│   ├── prisma/             # schema.prisma + migraciones
│   └── tests/              # Jest (unitarias de middleware y validación)
├── frontend/
│   ├── src/
│   │   ├── components/     # UI reutilizable
│   │   ├── pages/          # Vistas por ruta (carga lazy)
│   │   ├── services/       # Cliente HTTP (axios) con reintentos y refresh
│   │   ├── stores/         # Estado global (Zustand)
│   │   ├── hooks/          # Hooks de dominio
│   │   ├── i18n/locales/   # Traducciones es/en
│   │   └── types/          # Tipos compartidos
│   └── public/             # favicon, OG image, robots.txt, sitemap, manifest
└── docker-compose.yml      # Entorno local completo
```

---

## ⚡ Rendimiento

**Frontend**

- Carga diferida por rutas (`React.lazy` + `Suspense`) y de secciones del editor.
- Partición manual de vendors (`vite.config.ts`): `vendor-react`, `vendor-charts`, `vendor-export`, etc. El chunk principal se mantiene pequeño.
- `html2pdf.js` se importa dinámicamente solo al exportar.
- Reintentos con backoff exponencial + jitter en GET (red, 5xx, 429); deduplicación del fetch de token CSRF.
- Toasters de error amigables y estados de carga/vacío/error en listados.

**Backend**

- `compression` (gzip) en todas las respuestas.
- Rate limiting granular: global, auth, refresh, verificación, CV y admin.
- Prisma con logs estructurados por entorno; pool de conexiones vía PgBouncer.
- Health check con timeout y métricas en memoria (`GET /health`).
- Timeouts HTTP del servidor ajustados para el balanceador de Render.
- Esquema de BD con índices en columnas de búsqueda (`userId`, `expiresAt`, `cvId+createdAt`).

---

## 🔐 Seguridad

- **Helmet** con CSP estricta y HSTS (preload).
- **CSRF** con tokens auto-verificables (`random.issuedAt.hmac`): doble verificación cookie↔header más fallback de firma para navegadores que bloquean cookies cross-origin.
- **JWT** access (15m) + refresh rotativo (7d) en cookie `httpOnly`, `Secure`, `SameSite=None` en producción; sesiones persistidas y revocables en BD.
- **Validación** con Joi en todos los endpoints de escritura; saneamiento de features públicas.
- **Rate limiting** por endpoint sensible (login, refresh, recuperación de contraseña, verificación).
- **Errores**: middleware global que nunca filtra detalles internos en 5xx, responde JSON estandarizado y registra con contexto (método, ruta).
- **Emails**: envío SMTP con reintentos acotados (backoff) y logs libres de credenciales.
- **Variables de entorno validadas al arrancar**: el proceso falla rápido si falta una clave esencial.
- **Sin secretos en el repo**: `.env` está ignorado; todo se configura en el dashboard de Render.

---

## 🚀 Desarrollo local

### Requisitos

- Node.js 20+
- PostgreSQL 15+ (o Docker)

### Backend

```bash
cd backend
cp .env.example .env      # configura JWT_SECRET, DATABASE_URL, FRONTEND_URL
npm install
npx prisma migrate dev    # crea el schema local
npm run dev               # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:4000/api
npm install
npm run dev               # http://localhost:5173
```

### Con Docker

```bash
docker-compose up --build
# Frontend: http://localhost · Backend: http://localhost/api
```

### Comandos útiles

| Comando | Descripción |
|---|---|
| `npm test` / `npm run test:coverage` | Tests (backend: Jest; frontend: build + lint) |
| `npm run lint` / `npm run lint:fix` | ESLint (backend también formatea con Prettier) |
| `npm run build` | Compilación TypeScript + bundle de producción |
| `npx prisma migrate dev` | Nueva migración en desarrollo |
| `npx prisma migrate deploy` | Aplicar migraciones (usar conexión directa, ver abajo) |

### Scripts del monorepo (desde `apps/procv`)

ProCV es un workspace del monorepo ProSolutions. Su `package.json` orquesta frontend y backend:

| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta backend (4000) y frontend (5173) a la vez (`scripts/dev-all.mjs`) |
| `npm run dev:backend` / `npm run dev:frontend` | Levanta solo una parte |
| `npm run build` | Compila frontend (`tsc && vite build`) y backend (`prisma generate` + `tsc`) |
| `npm run build:frontend` / `npm run build:backend` | Compila solo una parte |
| `npm start` | Arranca el backend compilado (`node dist/index.js`) |
| `npm run prisma:generate` | Genera el cliente de Prisma del backend |

Desde la raíz del monorepo: `npm run build:procv`, `npm run dev:procv`.

> Nota: Render despliega cada parte por separado usando los `Dockerfile` de `backend/` y
> `frontend/` (rootDir por servicio). Los scripts de `apps/procv` son para builds y
> desarrollo locales del monorepo.

---

## 🔧 Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto del servidor | `4000` |
| `NODE_ENV` | Entorno | `development` |
| `JWT_SECRET` | Secreto de acceso (≥32 chars en prod; **requerido en producción**) | — |
| `JWT_EXPIRES_IN` | Expiración del access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración del refresh token | `7d` |
| `DATABASE_URL` | PostgreSQL vía pooler PgBouncer | requerido |
| `DIRECT_DATABASE_URL` | Conexión directa (5432) usada solo como override en `prisma migrate deploy` | opcional |
| `FRONTEND_URL` | Origen permitido por CORS en producción | `http://localhost:5173` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Servidor SMTP (SendGrid: `smtp.sendgrid.net`, usuario `apikey`, **puerto 2525 en Render** porque bloquea 25/465/587; Gmail: 587 + `false`) | 587 / false |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Credenciales y remitente (SendGrid: usuario literal `apikey`, pass = API key con permiso Mail Send, FROM = remitente verificado) | `noreply@procv.com` |

> Sin `SMTP_HOST/USER/PASS` en desarrollo los correos se envían vía Ethereal (preview en los logs) y la URL de verificación siempre se logea; en producción no se envían y el registro sigue funcionando. Verificar conectividad: `node backend/scripts/check-smtp.js`.

### Frontend (`frontend/.env`)

| Variable | Descripción |
|---|---|
| `VITE_API_BASE_URL` | URL base de la API (se incrusta en el build: ej. `https://procvbkn.onrender.com/api`) |

---

## 🗄️ Base de datos y migraciones

El schema vive en `backend/prisma/schema.prisma` y las migraciones en `backend/prisma/migrations/`.

**Regla de oro en Supabase**: `prisma migrate deploy` **debe** ejecutarse contra la conexión directa (puerto 5432); el pooler PgBouncer (6543) lo cuelga. Procedimiento completo y baseline en [`DEPLOYMENT_SECURITY_CHECKLIST.md`](./DEPLOYMENT_SECURITY_CHECKLIST.md) sección 6.

Como red de seguridad, el backend ejecuta al arrancar un **schema guard idempotente** (`src/utils/schemaGuard.ts`) que repara drift aditivo conocido y lo registra en logs — no sustituye a las migraciones.

---

## 🚢 Despliegue (Render + Supabase)

1. Push a `main` → Render reconstruye y despliega automáticamente ambos servicios.
2. El backend aplica migraciones con el **pre-deploy command** (ver checklist §6).
3. Health check: `GET /health` → `200` con `database.status: CONNECTED`.
4. Verificación funcional: un login fallido debe devolver `401 Invalid credentials`, nunca `500`.

### Verificación post-deploy

```powershell
.\render-health-check.ps1 -BackendUrl https://procvbkn.onrender.com -FrontendOrigin https://procv.prosolutions.page
```

---

## 🔍 SEO y metadatos

- `index.html` con description, canonical, Open Graph, Twitter Cards y JSON-LD (`WebApplication`).
- `public/og-image.png` (1200×630) para previsualizaciones al compartir.
- `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, favicon SVG + PNG y apple-touch-icon.
- `lang="es"`, `theme-color` para light/dark y `color-scheme`.

---

## ♿ Accesibilidad

- Navegación completa por teclado y foco visible en todos los controles.
- Etiquetas `aria` y roles en formularios, estados de error y regiones de carga.
- Contraste verificado en modo claro/oscuro; diseño mobile-first.
- `prefers-color-scheme` respetado vía `ThemeProvider` + detección automática.

---

## 🧪 Testing

```bash
cd backend && npm test     # Jest: middleware (CSRF, errores), validación, controladores
cd frontend && npm run build && npm run lint
```

Cobertura actual: 49 tests backend (CSRF firma/fallback/expiración, error handler, verificación de email, validación de CV, logger).

---

## 🤝 Contribuyendo

1. Fork → rama `feature/xxx` → commit con prefijo convencional (`feat:`, `fix:`, `chore:`…).
2. Asegura `lint`, `build` y `test` en verde antes del PR.
3. Nunca commitees `.env`, credenciales ni claves.

## 📝 Licencia

MIT — ver [LICENSE](LICENSE).
