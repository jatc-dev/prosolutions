# Etapa 3: despliegue de ProAcademy, ProTools, ProAdmin, páginas legales y preparación de AdSense

Rama: `feat/prosolutions-core-v2`. Sigue los pasos en orden. Cada paso que toca Neon, `qa`/`main` o Render necesita autorización explícita del owner (ver `CLAUDE.md`).

## 0. Estado de partida (ya hecho)

- Se borraron 4 funciones SQL residuales de la base `procv` en la rama `production` de Neon: `procv_private.current_user_id()`, `procv_private.current_is_admin()`, `procv_private.current_claims()` y `public.verified_context()`. Antes de borrarlas se comprobó que ninguna política, vista, trigger ni función dependía de ellas. ProCV en producción siguió respondiendo 200 después del cambio.
- No hay que hacer nada más en Neon para ProCV.
- **QA y producción, desplegados el 2026-11-19:**
  - QA: PR #121 y #122 en `qa`.
  - Producción: PR #123 de `qa` a `main`.
  - ProJobs `002`/`003` y las 4 migraciones de ProIdentity aplicadas en ambos entornos (la de sesiones en producción, en dos fases; ver sección 3).
  - Variables de Render configuradas.
  - Verificación de producción correcta: 13 páginas prerenderizadas con canonical con barra final, `ads.txt` 200, sitemap 21/21, login/refresh/JWKS y API de ProJobs con moderación.
  - Al aplicar la migración de sesiones, todas las sesiones existentes se invalidaron: los usuarios deben volver a iniciar sesión.

## 1. Verificación local (antes de hacer push)

```bash
npm ci
node packages/ui/scripts/build-tokens.mjs --check
node packages/ui/scripts/check-palette.mjs
npm test --workspace=apps/core                 # 107 tests
npm run build --workspace=apps/core            # tsc + vite + SSR + prerender
npm test --workspace=apps/projobs
npm test --prefix apps/projobs/server
npm --prefix apps/procv/frontend test
(cd apps/procv/backend && npx prisma generate && npm test)
(cd apps/identity && npx prisma generate && npm run test:regression)   # 3 tests necesitan una Postgres accesible
```

`apps/core/dist` debe contener `index.html` (portada pre-renderizada), `app.html` (shell SPA noindex), `og-image.png`, `academy/**/index.html`, `tools/**/index.html`, `legal/**/index.html`, `nosotros/`, `contacto/`, `sitemap.xml`, `sitemap-pages.xml` y `robots.txt`. **No** debe contener `ads.txt` si `ADS_TXT_CONTENT` está vacío.

## 2. Migraciones de ProJobs: 002 y 003 (primero QA, luego producción)

ProJobs **no** migra solo al arrancar en producción. Las migraciones son idempotentes: se registran con checksum y corren bajo un advisory lock.

- `002_core_v2_integration.sql`: empleadores self-service, consentimientos, outbox de notificaciones, alertas.
- `003_moderation.sql`: estado `suspended` para empresas, `moderation_status` en las vacantes y tabla `job_reports`.

```bash
cd apps/projobs/server
npm ci --include=dev --workspaces=false
npm run build

# QA: rama/base projobs de QA, con un rol owner (NO projobs_runtime), conexión directa (sin pooler)
MIGRATION_DATABASE_URL='<URL directa owner de projobs QA>' npm run migrate
#   -> "ProJobs migrations applied: 002_core_v2_integration, 003_moderation"

# Verificar en QA
psql "$MIGRATION_DATABASE_URL" -c "select version from public.projobs_schema_migrations order by version;"
psql "$MIGRATION_DATABASE_URL" -c "\d public.job_reports"

# Producción (solo después de validar QA de punta a punta)
MIGRATION_DATABASE_URL='<URL directa owner de projobs production>' npm run migrate
```

Opcional, para tener un punto de restauración: antes de migrar producción, crea un snapshot o rama de respaldo de Neon.

## 3. ProIdentity: migraciones (automáticas solo en producción)

Hay que aplicar 4 migraciones de ProIdentity. Las 3 primeras vienen de la Etapa 2 y de esta etapa; la cuarta ya estaba en el repo, pero QA no la tenía registrada:

| Migración | Cambio | Impacto |
|---|---|---|
| `session_refresh_token_hash_20261118` | Guarda solo el SHA-256 del refresh token | **Obligatoria antes del código nuevo**: sin la columna `refreshTokenHash` falla el login. Elimina las sesiones anteriores a la rotación del 18-nov, así que todos los usuarios vuelven a iniciar sesión |
| `user_google_consents_20261118` | `User.googleSub` y la tabla `UserConsent` | Inicio de sesión con Google y registro de consentimientos |
| `platform_settings_contact_20261118` | Tablas `PlatformSetting` y `ContactRequest` | Sin ellas, `/api/public/platform/ads` responde `degraded` y el formulario de contacto falla |
| `20261110000000_user_preferences` | `User.preferences` (idempotente) | En QA la columna ya existía, pero la migración no estaba registrada |

- **Producción** (servicio `ProIdentity`): **tampoco migra al arrancar**. Usa `apps/identity/Dockerfile` (`CMD ["node", "dist/index.js"]`) con el comando Docker vacío. El antiguo `Dockerfile` de la raíz, que ejecutaba `migrate-production.mjs`, no lo usaba ningún servicio y se eliminó el 2026-11-19; `render.yaml` ahora apunta a `apps/identity/Dockerfile`. Las migraciones de producción se aplican a mano.
- **Migraciones que rompen el código anterior** (como la de sesiones, que elimina `refreshToken`) se aplican en dos fases para no cortar el servicio. Así se hizo en producción el 2026-11-19:
  1. **Fase A, antes del merge a `main`.** Las migraciones aditivas completas, más la parte compatible con ambos códigos:
     - `ADD COLUMN "refreshTokenHash"` con backfill;
     - índice único `Session_refreshTokenHash_key`;
     - `ALTER COLUMN "refreshToken" DROP NOT NULL`.
  2. **Deploy del código nuevo** y comprobación de que el deploy anterior quedó `deactivated`.
  3. **Fase B:**
     - backfill de las sesiones creadas en la ventana (`WHERE "refreshTokenHash" IS NULL`);
     - el `DELETE` de la migración;
     - `SET NOT NULL`;
     - `DROP INDEX "Session_refreshToken_key"` y `DROP COLUMN "refreshToken"`;
     - el registro en `_prisma_migrations` con el checksum SHA-256 del `migration.sql`.

  Antes de migrar, crea una rama de respaldo en Neon (en esta ocasión: `backup-before-etapa3-20261119`).

- **QA** (servicio `ProIdentity-QA`): **no migra al arrancar**. Su comando Docker es `npm run start:migrate`, que pese al nombre solo siembra el admin de QA y arranca `node dist/index.js`. Las migraciones se aplican a mano **antes** del merge a `qa`, con el owner de la base `proidentity` de QA:

  ```bash
  cd apps/identity
  DATABASE_URL='<URL directa owner de proidentity QA>' npx prisma migrate deploy
  ```

  El 2026-11-19 se aplicaron en QA (proyecto `prosolutions-qa`, rama `qa`) con SQL equivalente en una sola transacción. Se registraron en `_prisma_migrations` con el checksum SHA-256 del `migration.sql`, así que `migrate deploy` ya no las repite. En QA no existe el rol `proidentity_app`: los bloques `DO $$` lo detectan y se saltan; no agregues verificaciones que asuman ese rol.

## 4. Push y PR hacia `qa`

```bash
git push -u origin feat/prosolutions-core-v2
gh pr create --base qa --head feat/prosolutions-core-v2 \
  --title "feat: Etapa 3 - ProAcademy, ProTools, ProAdmin, legal y preparación AdSense"
```

Espera a que el CI (`core-build.yml`) quede en verde. El job de Core ahora corre tests, build con prerender y verificaciones de sitemap, robots y ads.txt. Después haz merge a `qa`. Nunca uses force push sobre `qa`.

## 5. Variables de entorno en Render (dashboard; no uses Blueprint Sync)

### Core (static site: ProSolutions-QA y producción)

| Variable | Valor | Nota |
|---|---|---|
| `VITE_ADSENSE_CLIENT_ID` | `ca-pub-3956322934366702` | Se lee en el build. Sin ella, los anuncios dependen del Publisher ID configurado en ProAdmin |
| `ADS_TXT_CONTENT` | `google.com, pub-3956322934366702, DIRECT, f08c47fec0942fa0` | Se lee en el build. Sin ella, `/ads.txt` responde 404 |
| `EXTRA_SITEMAPS` (opcional) | Por defecto: `https://procv.prosolutions.page/sitemap.xml,https://projobs.prosolutions.page/sitemap.xml` | Lista separada por comas. Solo acepta URLs `*.prosolutions.page` |
| `VITE_IDENTITY_API_URL` | sin cambios | El formulario de contacto envía a `${origin}/api/public/contact` |

- Comando de build: el mismo de siempre, `npm run build --workspace=apps/core`. Ahora incluye el SSR y el prerender.
- Directorio publicado: `apps/core/dist` (sin cambios).
- **URLs con barra final.** El hosting estático de Render solo sirve `/<ruta>/index.html` si la URL termina en `/`. Sin la barra, la regla SPA `/* -> /index.html` responde con el shell genérico. Lo detectó la verificación de QA del 2026-11-19 y lo corrigió el PR #122:
  - canonical, `og:url`, JSON-LD, sitemap y todos los enlaces internos y compartidos (`LEGAL_URLS`, `RESOURCE_URLS`) usan la forma con barra;
  - el cliente redirige `/ruta` a `/ruta/` en las páginas públicas;
  - el shell SPA ya no lleva un canonical fijo.

- **Regla de rewrite: `/* -> /app.html`** (cambiada el 2026-11-19 en QA y producción, PR #128/#129). Desde ese PR, `dist/index.html` es la portada pre-renderizada y `dist/app.html` es el shell SPA con `noindex, follow` y sin canonical. Así las pantallas de la app (`/login`, `/dashboard`…), las URLs inexistentes y las rutas públicas sin barra final no se indexan como copias de la portada. Si la regla vuelve a apuntar a `/index.html`, la app sigue funcionando, pero esas URLs vuelven a servir la portada (soft 404). La regla se gestiona en el dashboard de Render o con `PUT /v1/services/{id}/routes` (el `PATCH` solo cambia prioridades). Ponla solo después de que el deploy que genera `app.html` esté activo.

  Verifica después de cada deploy:

  ```bash
  B=https://qa.prosolutions.page   # en producción: https://prosolutions.page
  curl -s $B/academy/hoja-de-vida-ats-2026/ | grep -c '"@type":"Article"'         # 1
  curl -s $B/academy/hoja-de-vida-ats-2026/ | grep -o 'rel="canonical" href="[^"]*"'   # .../hoja-de-vida-ats-2026/
  curl -s $B/legal/privacidad/ | grep -c '<h1'                                     # >= 1
  curl -s $B/ | grep -o 'rel="canonical" href="[^"]*"'                             # https://prosolutions.page/
  curl -s $B/login | grep -o 'name="robots" content="[^"]*"'                       # noindex, follow
  curl -s $B/sitemap-pages.xml | grep -c '/</loc>'                                 # 21 (todas con barra final)
  curl -s -o /dev/null -w '%{http_code}
' $B/ads.txt                              # 200 solo si ADS_TXT_CONTENT está definida
  ```

  En Search Console, envía e inspecciona siempre las URLs **con** barra final.

### ProIdentity (QA y producción)

| Variable | Valor |
|---|---|
| `CONTACT_INBOX` | Buzón que recibe el formulario de contacto (por ejemplo `contacto@prosolutions.page`). El buzón tiene que existir |
| `PROJOBS_API_URL` | URL base de la API de ProJobs del mismo entorno (QA: `https://projobs-api-qa.onrender.com`; producción: la URL real del servicio) |
| `PROJOBS_INTERNAL_TOKEN` | Mismo valor (≥ 32 caracteres) que `PROJOBS_INTERNAL_TOKEN` en la API de ProJobs de ese entorno; sin él, ProJobs desactiva `/internal/*` |

Sin `PROJOBS_API_URL` y `PROJOBS_INTERNAL_TOKEN`, ProAdmin responde 503 en empresas y vacantes; el resto sigue funcionando.

### ProJobs web y ProCV frontend

| Variable | Valor |
|---|---|
| `VITE_ADSENSE_CLIENT_ID` | `ca-pub-3956322934366702` (opcional, como respaldo del valor de ProAdmin) |

Ya no publican `ads.txt` (Google lo lee del dominio raíz, `prosolutions.page`) y tampoco cargan `adsbygoogle.js` en `index.html`.

## 6. Permisos de ProAdmin

| Sección | Ruta | Permiso |
|---|---|---|
| Verificación de empresas | `/admin/empresas` | `projobs.catalog.read` (ver) y `projobs.catalog.moderate` (aprobar, rechazar, suspender), en el módulo `PROJOBS` |
| Moderación de vacantes | `/admin/vacantes` | Los mismos dos permisos |
| Publicidad | `/admin/publicidad` | `platform.settings.manage` |

Asigna los roles desde `/admin` (Roles y permisos). La publicidad arranca **apagada** (`enabled: false`).

## 7. QA de punta a punta

1. Visita `/academy`, `/tools/*`, `/legal/*`, `/nosotros` y `/contacto`. El banner de cookies aparece una sola vez para todo `*.prosolutions.page`.
2. «Rechazar no esenciales»: no se hace ninguna petición a `pagead2.googlesyndication.com` (pestaña Red del navegador).
3. «Configurar cookies» en el pie de página vuelve a abrir el panel.
4. Envía el formulario de contacto. La solicitud queda en `ContactRequest` y llega un correo a `CONTACT_INBOX`.
5. ProAdmin:
   - Aprueba una empresa de prueba.
   - Repórtala desde una vacante y luego paúsala. Comprueba que desaparece de la búsqueda.
   - Restáurala.
6. En ProAdmin activa la publicidad con el Publisher ID. Acepta las cookies y verifica que solo se muestran espacios rotulados «Publicidad» en artículos, resultados de herramientas y listados de ProJobs.

## 8. Producción

Repite los pasos 2 (migración de producción) y 5 (variables de producción). Luego haz el PR `qa -> main` y vuelve a ejecutar las verificaciones del paso 5 contra `https://prosolutions.page`.

## 9. Google Search Console y AdSense

1. **Search Console.** Crea una propiedad de **dominio** `prosolutions.page`, verificada por DNS TXT en Cloudflare, para cubrir todos los subdominios.
2. Envía `https://prosolutions.page/sitemap.xml` (índice: páginas de Core + sitemap de ProCV).
3. El sitemap de vacantes de ProJobs lo genera la API y se sirve en `https://projobs.prosolutions.page/sitemap.xml` mediante una regla de Render en el sitio estático, con prioridad sobre la regla SPA: `rewrite /sitemap.xml -> https://projobs-api-0clw.onrender.com/api/sitemap.xml`. En QA apunta a `projobs-api-qa`. El `robots.txt` de ProJobs y el índice de Core (`EXTRA_SITEMAPS` por defecto) lo referencian. Si se recrea el sitio estático en Render, hay que volver a crear la regla.
4. Con «Inspección de URLs», solicita la indexación de `/academy`, `/tools` y dos artículos.
5. **AdSense.**
   - En Sitios, agrega `prosolutions.page`.
   - Confirma que `https://prosolutions.page/ads.txt` devuelve la línea del publisher.
   - En «Privacidad y mensajes», configura la CMP certificada de Google para EEE/Reino Unido/Suiza. El banner propio no tiene certificación TCF.
   - Solicita la revisión del sitio.
6. Mientras AdSense revisa, deja `enabled: false` en ProAdmin. Actívalo cuando el sitio esté aprobado.

## 10. Pendientes que debe completar el owner

- **Parámetros de nómina 2026** (`apps/core/src/lib/payroll/params.ts`): SMMLV, auxilio de transporte y UVT. Contrástalos con el decreto y la resolución DIAN oficiales antes de publicar, y actualiza `reviewedAt` y `sources`.
- **Datos del responsable** (`apps/core/src/content/site.ts`): NIT y dirección. Las páginas solo los muestran cuando tienen valor. Conviene que un abogado revise las políticas legales.
- **Buzón** `contacto@prosolutions.page`: créalo o redirígelo antes de publicar, porque aparece en las páginas legales.
