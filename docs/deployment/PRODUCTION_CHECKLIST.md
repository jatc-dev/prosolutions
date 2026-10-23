# ProSolutions — Guía de Despliegue en Producción

**Objetivo:** Desplegar el ecosistema ProSolutions (Identity + ProCV + ProJobs) con autenticación centralizada en ProIdentity. ProCV mantiene únicamente datos de negocio y recibe los permisos desde el registro central de módulos.

**Dominio oficial:** `prosolutions.page` con SSO entre subdominios mediante cookies `HttpOnly` con `Domain=.prosolutions.page`.

**Servicios y URLs:**

| Servicio | URL de producción | Carpeta |
|----------|------------------|---------|
| Identity | https://identity.prosolutions.page | `apps/identity/` |
| ProCV Backend | https://procv.prosolutions.page | `apps/procv/backend/` |
| ProCV Frontend | https://procv.prosolutions.page | `apps/procv/frontend/` |
| ProJobs | https://projobs.prosolutions.page | `apps/projobs/` |

---

## Configuración de cookies para SSO (Single Sign-On)

Para que una sesión iniciada en cualquier subdominio sea válida en todos, las cookies de sesión deben configurarse con:

| Variable | Valor | Propósito |
|----------|-------|-----------|
| `COOKIE_DOMAIN` | `.prosolutions.page` | La cookie es válida en `identity.*`, `procv.*`, `projobs.*` y cualquier subdominio de `prosolutions.page` |
| `COOKIE_SECURE` | `true` | Cookie solo sobre HTTPS |
| `COOKIE_SAME_SITE` | `none` | Permite envío de credenciales entre subdominios |
| `CORS_ORIGIN` | Lista de orígenes permitidos | Orígenes que pueden realizar peticiones con credenciales |

Esto permite que un usuario autenticado en `identity.prosolutions.page` acceda a `procv.prosolutions.page` y `projobs.prosolutions.page` sin iniciar sesión de nuevo.

---

## Orden cronológico estricto

Ejecutar los pasos en este orden exacto. No saltar pasos.

### Paso 0 — Pre-requisitos

- [ ] Tener acceso a las dashboards de Render de los 4 servicios.
- [ ] Tener acceso a Supabase (bases de datos de ProCV y de Identity).
- [ ] Generar el `IDENTITY_JWT_SECRET` compartido: `openssl rand -base64 32`.
- [ ] Verificar que todas las ramas estén en `main` y los cambios estén fusionados.
- [ ] Hacer backup de las bases de datos de ProCV y de Identity antes de iniciar.

---

### Paso 1 — Cargar variables de entorno en Render

#### 1.1 Identity (`https://identity.prosolutions.page`)

En la dashboard de Render, añadir/actualizar estas variables:

```
NODE_ENV=production
PORT=4001
DATABASE_URL=<supabase-identity-url>
DIRECT_DATABASE_URL=<supabase-identity-direct-url>
IDENTITY_JWT_SECRET=<openssl-rand-base64-32>
IDENTITY_JWT_EXPIRES_IN=15m
IDENTITY_JWT_REFRESH_EXPIRES_IN=7d
IDENTITY_ISSUER=https://identity.prosolutions.page
IDENTITY_AUDIENCE=prosolutions-api
FRONTEND_URL=https://procv.prosolutions.page
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=.prosolutions.page
CORS_ORIGIN=https://procv.prosolutions.page,https://projobs.prosolutions.page
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass>
SMTP_FROM=noreply@prosolutions.page
DISABLE_RATE_LIMIT=false
SESSION_IDLE_TIMEOUT_MINUTES=30
```

#### 1.2 ProCV Backend (`https://procv.prosolutions.page`)

```
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://procv.prosolutions.page
IDENTITY_URL=https://identity.prosolutions.page
JWT_SECRET=<mismo-que-IDENTITY_JWT_SECRET>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL=<supabase-procv-url>
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=.prosolutions.page
CORS_ORIGIN=https://procv.prosolutions.page,https://projobs.prosolutions.page
SESSION_IDLE_TIMEOUT_MINUTES=30
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass>
SMTP_FROM=no-responder@prosolutions.page
```

#### 1.3 ProCV Frontend (`https://procv.prosolutions.page`)

```
VITE_API_BASE_URL=https://procv.prosolutions.page/api
```

#### 1.4 ProJobs Server (`https://projobs.prosolutions.page`)

```
NODE_ENV=production
PORT=5176
IDENTITY_URL=https://identity.prosolutions.page
IDENTITY_JWT_SECRET=<mismo-que-IDENTITY_JWT_SECRET>
IDENTITY_ISSUER=https://identity.prosolutions.page
IDENTITY_AUDIENCE=projobs-api
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=.prosolutions.page
CORS_ORIGIN=https://projobs.prosolutions.page,https://procv.prosolutions.page
DISABLE_RATE_LIMIT=false
```

---

### Paso 2 — Ejecutar migraciones de base de datos en Supabase

#### 2.1 Base de datos de Identity

```
DATABASE_URL=$DIRECT_DATABASE_URL npx prisma migrate deploy
```
Desde `apps/identity/` con `DATABASE_URL` apuntando a Supabase Identity. Esto crea las tablas `User`, `Session`, `ProfessionalProfile`, `Module`, `ModuleAccess` y `AuditLog`. `Module` es el catálogo dinámico; no se deben añadir nuevos módulos a un enum.

Las migraciones de producción deben usar la conexión directa de Supabase, no el pooler de runtime. Si Prisma informa `P3009` porque `add_jti_column` quedó registrada como fallida, resolverla una sola vez después de verificar que la operación no dejó cambios incompletos:

```
DATABASE_URL=$DIRECT_DATABASE_URL npx prisma migrate resolve --rolled-back add_jti_column
DATABASE_URL=$DIRECT_DATABASE_URL npx prisma migrate deploy
```

La aplicación no debe iniciar si las migraciones fallan; así se evita servir login con un esquema incompleto.

#### 2.2 Base de datos de ProCV

ProCV ya no debe mantener cuentas, contraseñas, sesiones ni tokens de recuperación/verificación. Antes de eliminar las tablas antiguas, se debe reconciliar la propiedad de los CV con los IDs de sujeto que ya existen en ProIdentity. Este paso **preserva** `CV`, `CVVersion`, `CVAtsAnalysis`, `AuditLog` y `PlatformSetting`.

**Orden obligatorio:** primero desplegar el backend ProCV que ya no consulta modelos locales de usuarios; luego ejecutar el dry-run, aplicar la reconciliación y finalmente aplicar la migración que elimina las tablas de autenticación local. No ejecutar la migración de retirada de tablas antes de la reconciliación.

---

### Paso 3 — Reconciliar propietarios y retirar la autenticación local de ProCV

Desde `apps/identity/`, con acceso directo de PostgreSQL (puerto 5432) a ambos proyectos:

```bash
export DATABASE_URL=<supabase-identity-direct-url>
export PROCV_DATABASE_URL=<supabase-procv-direct-url>

# 1. Solo diagnóstico; no escribe datos.
npm run reconcile:procv-cv-owners:dry-run

# 2. Ejecutar únicamente cuando el resumen indique 0 propietarios sin correspondencia.
npm run reconcile:procv-cv-owners
```

La reconciliación empareja usuarios por correo normalizado y utiliza el ID central cuando ya coincide. Primero comprueba todos los propietarios; si alguno no existe en ProIdentity, aborta sin cambios. La opción `--apply` quita la antigua FK `CV_userId_fkey` y cambia `CV.userId` dentro de una transacción, validando que todos los propietarios finales existan en ProIdentity. No imprime correos ni hashes.

Después de una reconciliación verificada, desde `apps/procv/backend/`:

```bash
DATABASE_URL=$DIRECT_DATABASE_URL npx prisma migrate deploy
```

La migración `20261023051000_remove_legacy_auth_tables` elimina `User`, `Session`, `EmailVerificationToken` y `PasswordResetToken` de ProCV. También elimina la tabla vacía de prueba `_conn_test`. No elimina CV, versiones, análisis ATS, configuración ni auditoría. La migración es idempotente para que Prisma pueda registrar el cambio aunque se hubiera aplicado previamente desde el panel SQL.

**Verificación posterior:**
- El número de filas de `CV`, `CVVersion` y `CVAtsAnalysis` permanece sin cambios.
- Ningún `CV.userId` queda sin un usuario correspondiente en ProIdentity.
- Las cuatro tablas locales de autenticación ya no existen en ProCV.
- El backend ProCV arranca correctamente y las rutas protegidas aceptan tokens emitidos para `procv-api`.

No volver a ejecutar `migrate:users` en el despliegue normal: las cuentas centrales ya se administran exclusivamente en ProIdentity.

---

### Paso 4 — Desplegar en orden: Identity → ProCV → ProJobs

#### 4.1 Desplegar Identity primero

1. Conectar el repo de `apps/identity/` a Render como nuevo servicio web.
2. Build command: `npm run build` (o dejar que Render detecte).
3. Start command: `npm start` (el Dockerfile ya ejecuta `prisma migrate deploy && node dist/index.js`).
4. Verificar que el servicio esté `live` en `https://identity.prosolutions.page`.
5. Health check: `GET https://identity.prosolutions.page/health` → `{ "status": "healthy" }`.

#### 4.2 Desplegar ProCV Backend

1. En Render, redeploy del servicio `procv.prosolutions.page` con las nuevas variables de entorno (`IDENTITY_URL`, `JWT_SECRET` compartido).
2. El backend de ProCV ahora actúa como proxy temporal de `/api/auth/*` hacia Identity.
3. Verificar: `GET https://procv.prosolutions.page/health`.

#### 4.3 Desplegar ProCV Frontend

1. Redeploy del servicio `procv.prosolutions.page` con `VITE_API_BASE_URL=https://procv.prosolutions.page/api`.
2. El frontend ahora envía las peticiones de auth al proxy de ProCV, que a su vez delega en Identity.
3. Verificar que el login, registro, verificación de email y refresh funcionen.
4. Verificar que la cookie de sesión se establece con `Domain=.prosolutions.page`.

#### 4.4 Desplegar ProJobs

1. Conectar `apps/projobs/` a Render como servicio web.
2. El servidor estático sirve `dist/`. Las rutas `/api/*` van al servidor Express en el puerto 5176.
3. Verificar: `GET https://projobs.prosolutions.page/health`.
4. Verificar que las rutas personales (`/api/applications`, `/api/saved-jobs`) requieran token válido con claim `PROJOBS`.

---

### Paso 5 — Verificaciones post-despliegue

- [ ] Login en ProCV redirige a Identity y devuelve token válido.
- [ ] Registro de nuevo usuario crea cuenta en Identity + módulo PROCV.
- [ ] Verificación de email funciona y crea sesión.
- [ ] Refresh de token funciona (cookie HttpOnly con `Domain=.prosolutions.page`).
- [ ] SSO: iniciar sesión en ProCV y acceder a ProJobs sin volver a loguearse.
- [ ] ProCV rutas protegidas (`/api/cvs/*`) validan JWT de Identity (issuer/audience).
- [ ] ProJobs permite navegación pública anónima.
- [ ] ProJobs rutas personales rechazan sin token (401) y con token sin claim PROJOBS (403).
- [ ] Logout revoca la sesión en Identity y limpia la cookie en todos los subdominios.

---

### Paso 6 — Rollback (en caso de fallo)

1. Revertir variables de entorno a valores anteriores.
2. Redploy de la versión anterior de cada servicio en orden inverso (ProJobs → ProCV → Identity).
3. No ejecutar `migrate:users` en reversa (los usuarios ya creados en Identity no se eliminan; solo se deja de usarlos).

---

## Notas importantes

- **`IDENTITY_JWT_SECRET`** debe ser idéntico en Identity, ProCV Backend y ProJobs Server. Es el secreto compartido para validar firmas de JWT del ecosistema.
- **`COOKIE_DOMAIN=.prosolutions.page`** es obligatorio en los 3 servicios para habilitar SSO entre subdominios.
- **`CORS_ORIGIN`** debe incluir todos los orígenes del ecosistema que realicen peticiones con credenciales.
- El proxy temporal en ProCV (`/api/auth/*` → Identity) permite una transición progresiva sin romper el frontend de ProCV. Una vez validado, se puede desacoplar el frontend para apuntar directamente a Identity.
- No crear tiendas de contraseñas locales en nuevos módulos. Todos deben delegar auth a Identity.
- ProJobs no tiene base de datos propia; solo valida JWT y protege rutas personales. Las aplicaciones y empleos guardados requieren un backend de persistencia adicional antes de usarse en producción.
