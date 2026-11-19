# ProSolutions — Inventario de variables de entorno

**Estado:** catálogo funcional sin valores secretos  
**Verificado contra código y manifiesto:** 2026-11-06

## Principios

- La configuración efectiva está en Render > servicio > Environment.
- Este archivo describe variables que el código consume o que el manifiesto declara; no certifica que cada variable esté configurada en producción.
- Nunca copiar valores secretos al repositorio, issues, logs o chats.
- Las variables VITE_* se incorporan al bundle del frontend y no pueden contener secretos.
- No añadir DIRECT_DATABASE_URL al servicio runtime de ProCV: el código la prioriza frente a DATABASE_URL.

## ProIdentity — API

| Variable | Uso | Clasificación |
|---|---|---|
| NODE_ENV | Modo producción | No secreta |
| PORT | Puerto asignado por Render | Proveedor |
| DATABASE_URL | PostgreSQL runtime de proidentity | Secreta |
| IDENTITY_JWT_SECRET | Firma de JWT; mínimo 32 caracteres en producción | Secreta |
| IDENTITY_JWT_EXPIRES_IN | Vigencia del access token; default 15m | No secreta |
| IDENTITY_JWT_REFRESH_EXPIRES_IN | Vigencia refresh; default 7d | No secreta |
| IDENTITY_ISSUER | Emisor JWT | No secreta |
| IDENTITY_AUDIENCE | Audiencia JWT | No secreta |
| FRONTEND_URL | URL frontend usada por flujos de identidad | No secreta |
| COOKIE_SECURE | Cookies seguras; producción las fuerza | No secreta |
| COOKIE_SAME_SITE | lax/strict/none; producción default none | No secreta |
| COOKIE_DOMAIN | Dominio compartido de cookies | No secreta |
| ALLOWED_ORIGINS | Lista separada por coma para CORS/orígenes | No secreta |
| SMTP_HOST, SMTP_PORT, SMTP_SECURE | Transporte de correo | No secreta |
| SMTP_USER, SMTP_PASS | Credenciales SMTP | Secreta |
| SMTP_FROM | Remitente | No secreta |

DIRECT_DATABASE_URL se reserva para la tarea DDL puntual; el código runtime de Identity usa DATABASE_URL.

## ProCV — Backend

| Variable | Uso | Clasificación |
|---|---|---|
| NODE_ENV, PORT | Entorno y puerto | No secreta / proveedor |
| DATABASE_URL | Conexión principal del backend; usar login runtime restringido | Secreta |
| DIRECT_DATABASE_URL | El config.ts la prioriza frente a DATABASE_URL; reservar para proceso administrativo puntual y no persistirla en el servicio runtime | Secreta |
| IDENTITY_JWT_SECRET | Validar tokens emitidos por ProIdentity; mínimo 32 caracteres | Secreta |
| JWT_SECRET | Compatibilidad heredada como fallback; preferir IDENTITY_JWT_SECRET | Secreta |
| IDENTITY_URL | URL de ProIdentity | No secreta |
| IDENTITY_ISSUER, IDENTITY_AUDIENCE | Validación de tokens | No secreta |
| FRONTEND_URL | Origen del frontend | No secreta |
| PROCV_RLS_CONTEXT_KEY | Clave HMAC de 32 bytes codificada como 64 hex; debe coincidir con el verificador v1 de Neon | Secreta |
| PROCV_ADMIN_DATABASE_URL | Conexión separada para contexto administrativo de aplicación; usuario esperado procv_admin_login | Secreta |
| COOKIE_SECURE, COOKIE_SAME_SITE, COOKIE_DOMAIN | Política de cookies | No secreta |
| CORS_ORIGIN | Orígenes permitidos separados por coma | No secreta |
| SESSION_IDLE_TIMEOUT_MINUTES | Límite de inactividad si el código del módulo lo consume | No secreta |
| HEALTH_DB_TIMEOUT_MS | Timeout de comprobación de base de datos | No secreta |

Importante: el archivo config.ts usa DIRECT_DATABASE_URL || DATABASE_URL para construir el cliente de Prisma. El script start:migrate también mapea DIRECT_DATABASE_URL a DATABASE_URL antes de ejecutar Prisma. La conexión administrativa PROCV_ADMIN_DATABASE_URL es otra conexión distinta y no reemplaza la conexión DDL.

## ProJobs — API

| Variable | Uso | Clasificación |
|---|---|---|
| NODE_ENV, PORT | Entorno y puerto (default local 5176) | No secreta / proveedor |
| DATABASE_URL | Base PostgreSQL projobs | Secreta |
| IDENTITY_JWT_SECRET | Verificar JWT de ProIdentity | Secreta |
| JWT_SECRET | Fallback heredado de código | Secreta |
| IDENTITY_URL | Servicio ProIdentity | No secreta |
| IDENTITY_ISSUER | Emisor JWT esperado | No secreta |
| IDENTITY_AUDIENCE | Audiencia JWT esperada | No secreta |
| CORS_ORIGIN | Lista de orígenes separada por coma | No secreta |
| COOKIE_SECURE | Política de cookie | No secreta |

## Frontends

- Core consume VITE_IDENTITY_API_URL, VITE_PROCV_URL, VITE_PROCV_API_BASE_URL y VITE_ADSENSE_CLIENT_ID; en build lee además ADS_TXT_CONTENT (publica /ads.txt solo si existe) y EXTRA_SITEMAPS (ver ETAPA3_DEPLOY.md).
- ProIdentity: CONTACT_INBOX, PROJOBS_API_URL y PROJOBS_INTERNAL_TOKEN (formulario de contacto y proxy de moderación de ProAdmin).
- ProCV frontend consume VITE_IDENTITY_API_URL, VITE_PROSOLUTIONS_URL y VITE_PROCV_URL.
- ProJobs frontend consume VITE_IDENTITY_API_URL, VITE_PROSOLUTIONS_URL y VITE_PROCV_URL.
- Toda variable VITE_* es pública en el bundle; nunca poner tokens, passwords o connection strings.

## Configuración en Render: lista de verificación

Para cada servicio, revisar en el panel:
1. Nombre e ID del servicio correcto.
2. Variables obligatorias del código actual presentes.
3. URLs y orígenes coinciden con dominios activos.
4. Secretos presentes sin mostrarlos ni copiarlos a logs.
5. Variables legacy identificadas y sin conflicto.
6. No hay credenciales DDL en procesos runtime.
7. Guardar cambios solo con autorización; confirmar si Render inicia un deploy automático.

El manifiesto render.yaml contiene sync:false y valores declarativos, pero está desalineado con varios servicios reales. No usarlo para sincronizar variables en producción.
