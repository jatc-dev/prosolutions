# Auditoría preliminar de seguridad de ProCV

**Fecha:** 2026-10-30  
**Rama analizada:** `projobs-test-2026-10-29`  
**HEAD:** `a7ae8de82037ee2baefba544ccabd671ff223429`  
**Estado del árbol al iniciar:** limpio  
**Estado:** auditoría estática preparatoria; **no valida el PR #103 ni la implementación RLS pendiente**.

## Resumen ejecutivo

Se encontraron **2 hallazgos altos, 4 medios y 1 bajo** en el código y migraciones disponibles de este checkout. No se encontraron hallazgos críticos confirmados. Algunos altos describen una brecha de defensa de base de datos condicional al rol real de conexión; no se verificó la configuración de una instancia activa.

Los filtros de propietario en las operaciones ordinarias de CV están presentes en las lecturas previas. Sin embargo, no hay contexto de propietario transaccional en este checkout y las operaciones de escritura posteriores a esas lecturas filtran solo por identificador. Esto no demuestra por sí solo una fuga explotable en los endpoints actuales, pero no constituye preparación suficiente para políticas RLS por usuario.

El PR #103 no estuvo disponible localmente durante esta auditoría. No se consultaron servicios remotos, bases de datos ni secretos; no se ejecutaron pruebas.

## Alcance y limitaciones

- Revisión de lectura de `apps/procv/backend/src`, `tests`, `prisma/schema.prisma` y migraciones disponibles en la rama local indicada.
- Inspección estática de rutas, middleware, controladores, servicios, consultas Prisma/SQL, auditoría, configuración CORS, manejo de tokens, scripts y tareas en proceso.
- No se modificó código de aplicación ni migraciones. El único archivo nuevo es este informe.
- No se ejecutó código, tests, build, migraciones o SQL.
- No se accedió a Neon, Render, GitHub remoto o GitHub Actions. No se inspeccionó `.env` ni se imprimieron secretos.
- La rama es `projobs-test-2026-10-29`, no `security/procv-rls-user-context-2026-10` (la rama RLS pendiente se indicó también como `security/procv-rls-user-context-2026-10` en esta tarea). El contenido no debe atribuirse al PR #103.
- La existencia de roles y permisos efectivos, el estado de migraciones aplicadas, las políticas vigentes y el `DATABASE_URL` realmente desplegado no se pueden determinar desde estos archivos.

## Arquitectura observada

- Express expone rutas de CV bajo `/api/cvs`; las rutas de datos registran `authMiddleware` antes de los handlers (`src/routes/cv.ts:32`).
- La autenticación verifica JWT y, para rutas de usuario, consulta introspección en ProIdentity (`src/middleware/auth.ts:108-145`). El asunto de CV se toma del resultado de introspección.
- Las rutas administrativas están montadas bajo `/api/admin` y registran `requireAdmin` antes de los handlers (`src/routes/admin.ts:33`).
- Un singleton Prisma (`src/prismaClient.ts:16`) es usado directamente por controladores y servicios; no existe `src/dbContext.ts`.
- El esquema declara `CV`, `CVVersion`, `CVAtsAnalysis`, `AuditLog` y `PlatformSetting`; no declara `User` en el schema actual (`prisma/schema.prisma:8-59`). `CVVersion` no contiene `userId`; su propietario se deriva de su CV asociado.
- Existe un endpoint público de ajustes de landing y una ruta de parseo de archivo CV anterior a `router.use(authMiddleware)` (`src/app.ts:128-150`, `src/routes/cv.ts:23-25`). La importación procesa en memoria; no escribe a Prisma.
- No se hallaron colas ni workers de fondo que consulten Prisma. Hay un intervalo de limpieza de caché local (`src/utils/cache.ts:61-67`) y scripts de paginación PDF que no consultan Prisma.
- CORS es exacto por origen configurado en producción; en desarrollo permite cualquier origen (`src/app.ts:92-110`). Los métodos no seguros pasan por middleware CSRF global (`src/app.ts:115-117`).

## Inventario de operaciones Prisma

“Filtro de propietario” describe la condición visible en el argumento Prisma, no una política RLS efectiva. En esta rama ninguna llamada de datos queda envuelta en un contexto `SET LOCAL` o transacción que establezca identidad de base de datos.

| Tabla / recurso | Operaciones y ubicaciones | Protección visible | Contexto transaccional / nota |
|---|---|---|---|
| `CV` | `findMany`, `count` — `src/services/cvService.ts:77-86` | Filtro `userId` | Batch `$transaction`, pero sin establecer contexto de usuario. |
| `CV` | `findFirst` por id y userId — `cvService.ts:127-129` | Filtro de propietario | Sin contexto. |
| `CV` | `create` — `cvService.ts:141-148` | `userId` procede del argumento de servicio, llamado con `req.userId` | Sin contexto. La validación Joi no permite `userId` como campo del objeto de entrada. |
| `CV` | `findFirst` y `update` — `cvService.ts:167-180` | Prelectura con `id,userId`; escritura solo con `id` | No es atómico ni comparte transacción/contexto. No se encontró endpoint que permita cambiar `userId`; no se afirma explotación directa por usuario. |
| `CVVersion` | `create` — `cvService.ts:182-187` | Deriva `cvId` del CV que se leyó y actualizó | Fuera de transacción con la actualización; sin contexto. |
| `CV` | `findFirst` y `delete` — `cvService.ts:203-208` | Prelectura con `id,userId`; borrado por `id` | No atómico ni contexto; FK/cascada elimina análisis relacionados según migración. |
| `CV` | lectura para exportar — `cvService.ts:235` | `id,userId` | Sin contexto; resultado cacheado en clave que incluye usuario (`cvService.ts:221-252`). |
| `CV` y `CVVersion` | lectura padre y `findMany` de versiones — `cvService.ts:270-279` | Padre verificado con `id,userId`; versiones filtradas por `cvId` | Consultas separadas; sin contexto. Cache clavea por `cvId` y usuario. |
| `CV`, `CVVersion` | lecturas y actualización de restore — `cvService.ts:290-304` | CV con `id,userId`; versión con `id,cvId`; update con `id` | Consultas separadas; sin contexto. |
| `CV`, `CVAtsAnalysis` | prelectura de CV y `$queryRawUnsafe` INSERT — `src/services/cvAtsService.ts:88-119` | CV prevalidado con `id,userId`; INSERT por `cvId` | No comparte transacción. Usa placeholders `$1`…`$6` y argumentos separados; no se observó concatenación de input al SQL. Cast `as any` reduce garantías de tipos. |
| `CV`, `CVAtsAnalysis` | prelectura de CV y `$queryRawUnsafe` SELECT — `cvAtsService.ts:132-158` | CV prevalidado; historial filtrado por `cvId` | Consultas separadas; placeholders para `cvId` y límite; sin contexto. |
| `AuditLog` | `create` — `src/utils/auditLogger.ts:18-28` | `userId` se asigna desde `actorId` | Sin contexto; captura error y lo suprime, dejando que el llamador continúe. `logAdminAction` delega en el mismo `log`. |
| `AuditLog` | `findMany`, `count` — `src/controllers/adminController.ts:15-24` | Protección de ruta por `requireAdmin` | Sin contexto de DB; datos globales según privilegios DB efectivos. |
| `PlatformSetting` | `findUnique` — `src/app.ts:137-139` | Luego el handler comprueba `isPublic` antes de responder | Consulta DB puede leer una fila privada antes de esa comprobación; no usa contexto público ni predicado `isPublic` en DB. |
| `PlatformSetting` | `findMany`, `upsert`, `findUnique`, `delete` — `adminController.ts:43-46,66-80,177-199,226-236` | Handlers bajo router admin | Sin contexto administrativo en Prisma. Lectura y borrado son operaciones separadas. |
| `CV` | `$queryRaw` de conteo y `count` — `adminController.ts:261-266` | Ruta admin | `$queryRaw` usa tagged template sin input interpolado. Sin contexto administrativo DB. |
| `CV` | `findMany` por fecha — `adminController.ts:291-295` | Ruta admin | Sin contexto administrativo DB; selecciona `userId` para agregación de propietarios. |
| Conectividad | `$queryRaw\`SELECT 1\`` — `src/utils/monitoring.ts:154` | Health check público | Solo conectividad, no lee tablas de negocio; sin contexto requerido para los modelos protegidos. |
| Cierre cliente | `$disconnect` — `src/index.ts:58` | No aplica | Gestión de ciclo de vida Prisma, no consulta de datos. |

No aparecieron `createMany`, `updateMany`, `deleteMany` ni `upsert` en los servicios CV/ATS de esta rama. Las operaciones `upsert` encontradas corresponden a `PlatformSetting` administrativa.

## Hallazgos por severidad

### Altos

#### H-1 — La migración local de RLS no define aislamiento por propietario y no fuerza RLS

- **Ubicación:** `prisma/migrations/20261013150000_enable_rls_public_tables/migration.sql:1-23`.
- **Evidencia:** el bloque dinámico ejecuta solo `ENABLE ROW LEVEL SECURITY` sobre las tablas `public`; esta migración no crea políticas ni ejecuta `FORCE ROW LEVEL SECURITY`. Su comentario dice que la aplicación se conecta como rol `postgres` propietario de tablas y por eso evita RLS.
- **Riesgo / escenario:** si se aplica esta migración y la conexión de aplicación tiene los privilegios descritos, una consulta directa del backend o una credencial comprometida podría leer o modificar filas sin restricciones de propietario. Aun con un rol no propietario, RLS habilitado sin políticas da denegación predeterminada, pero esto no es aislamiento por usuario útil para la aplicación. La configuración real desplegada no se comprobó.
- **Clasificación:** alta, como brecha de defensa de datos en la migración/cadena de conexión descrita; no prueba estado de producción.
- **Corrección recomendada:** en la rama objetivo, políticas `USING` y `WITH CHECK` por tabla y usuario, `FORCE RLS`, rol app no propietario/no `BYPASSRLS`, grants mínimos, y evidencia reproducible de roles/permisos en una base aislada. Mantener producción sin cambios durante esa preparación.

#### H-2 — Las rutas administrativas no introspectan la sesión ni comprueban revocación en vivo

- **Ubicación:** `src/middleware/admin.ts:18-40`; comparación con `src/middleware/auth.ts:108-145`.
- **Evidencia:** `requireAdmin` verifica firma, issuer, audience, `modules` y `decoded.role === 'admin'` desde los claims JWT. No exige `jti`, no llama `introspectSession` ni contrasta identidad/rol actual. Las rutas ordinarias sí exigen `jti` y validan sesión e identidad con ProIdentity.
- **Riesgo / escenario:** si ProIdentity revoca una sesión o retira privilegios admin antes de expirar el access token, ese token puede seguir autorizando endpoints administrativos hasta que caduque. La duración efectiva depende de emisión/configuración externa no comprobada.
- **Clasificación:** alta por el alcance de estadísticas globales, ajustes, auditoría y carga; explotación depende de que se revoque/retire un token todavía vigente.
- **Corrección recomendada:** compartir el flujo verificado de autenticación e introspección con la ruta admin y evaluar el rol desde una fuente vigente/autorizada; cubrir revocación y cambio de rol con pruebas.

### Medios

#### M-1 — El backend no establece contexto de propietario para RLS y hay secuencias de chequeo/uso fuera de transacción

- **Ubicación:** `src/services/cvService.ts:77-86,167-187,203-208,270-304`; `src/services/cvAtsService.ts:88-119,132-158`; `src/utils/auditLogger.ts:18-28`; controladores admin arriba.
- **Evidencia:** no hay `dbContext.ts`; llamadas Prisma usan cliente global. Las lecturas de autorización y posteriores escrituras/lecturas relacionadas se hacen en consultas separadas, excepto lista+conteo que usa una transacción batch sin establecer settings de usuario.
- **Riesgo / escenario:** al activar políticas que dependen de `procv.user_id`/`procv.is_admin`, operaciones pueden devolver cero filas o fallar; los accesos de admin y de auditoría carecen de identidad DB explícita. La protección visible actual son filtros del backend y middleware; no se debe inferir una fuga explotable entre usuarios solo por esta carencia.
- **Clasificación:** media como incompatibilidad de seguridad/operación que bloquea el objetivo RLS; requiere revisar de nuevo en la rama RLS.
- **Corrección recomendada:** cada operación de datos y sus escrituras asociadas deben ejecutarse en transacción interactiva con `SET LOCAL`/equivalente parametrizado, rol restringido y contexto derivado de autenticación. Cubrir concurrencia y fallo de contexto.

#### M-2 — El middleware admin valida un issuer diferente al middleware común

- **Ubicación:** `src/middleware/admin.ts:21-23`; `src/middleware/auth.ts:108-110`; `src/config.ts:91-92`.
- **Evidencia:** admin usa `config.identityUrl` como `issuer`; usuario usa `config.issuer`. Los valores predeterminados son `http://localhost:4001` y `https://identity.prosolutions.page`, respectivamente.
- **Riesgo / escenario:** tokens firmados con el issuer del flujo común pueden rechazarse en admin, o solo una configuración coincidente garantiza consistencia. El efecto más directo es fallo de disponibilidad de la administración. No se pudo comprobar el valor desplegado.
- **Clasificación:** media, configuración incoherente demostrada en defaults, impacto real condicionado a entorno.
- **Corrección recomendada:** centralizar issuer/audience y probar ambos middlewares con el mismo token y configuración de producción saneada.

#### M-3 — El logger de auditoría puede fallar silenciosamente respecto al resultado de la acción

- **Ubicación:** `src/utils/auditLogger.ts:15-36`; llamadas en `src/controllers/adminController.ts:82-90,202-212,239-248`.
- **Evidencia:** los errores de `auditLog.create` se capturan y solo se registran; `logAdminAction` no señala fallo al controlador. La acción administrativa ya puede haber terminado correctamente y responder éxito aunque no exista su evento de auditoría. La función admin escribe con el mismo método y forma que la actividad de usuario.
- **Riesgo / escenario:** una caída o permiso insuficiente de AuditLog deja cambios de configuración sin registro duradero; la revisión posterior pierde atribución/evidencia. No se identificó confusión de actor en el flujo normal: el ID usado es `adminUser.id`.
- **Clasificación:** media (integridad y completitud de auditoría), no fuga confirmada.
- **Corrección recomendada:** definir semántica fail-closed para operaciones administrativas críticas y, cuando sea posible, persistir cambio y evento en una transacción común; probar fallo de auditoría y distinguir actor/acción admin.

#### M-4 — La ruta pública consulta ajustes por clave sin restringir la lectura en SQL a filas públicas

- **Ubicación:** `src/app.ts:128-148`.
- **Evidencia:** `findUnique({ where: { key } })` lee la fila si la encuentra; `isPublic` se comprueba después en Express antes de serializar.
- **Riesgo / escenario:** la aplicación obtiene contenido privado en memoria para cada solicitud pública que adivine una clave, aunque el handler responde `[]`. No es una fuga HTTP demostrada, pero amplía el acceso DB de una ruta pública y no encaja con una política pública de mínimo privilegio.
- **Clasificación:** media-baja (se contabiliza como media por tratarse de configuración potencialmente sensible; la respuesta no expone el valor privado).
- **Corrección recomendada:** consultar por `key` y `isPublic: true`, o usar un helper/rol/contexto de solo lectura pública que no pueda leer settings privados.

### Bajas

#### L-1 — Uso de `$queryRawUnsafe` con escape del sistema de tipos en ATS

- **Ubicación:** `src/services/cvAtsService.ts:100-119,137-157`.
- **Evidencia:** llamadas mediante cast `as any` con SQL constante y placeholders posicionales; parámetros se pasan por separado (`$1`, `$2`). No se observó concatenación de `cvId`, job description ni límite dentro del texto SQL.
- **Riesgo / escenario:** el patrón `Unsafe` facilita futuras concatenaciones inseguras y el cast evita comprobaciones estáticas, pero las dos consultas inspeccionadas están parametrizadas; **no se declara SQL injection confirmada**.
- **Clasificación:** baja, deuda de mantenibilidad/superficie de error.
- **Corrección recomendada:** reemplazar por `$queryRaw`/`$executeRaw` parametrizado de Prisma y retirar `any`; mantener los tests que demuestren parámetros y límites.

## Autorización e aislamiento: observaciones sin vulnerabilidad confirmada

- Las rutas de CV se montan después de `router.use(authMiddleware)`. La ruta de importación está antes y es pública, pero solo parsea el archivo recibido en memoria; su limitación visible es 5 MB y tiene `publicImportLimiter`.
- Las operaciones CV ordinarias pasan `req.userId` obtenido por middleware y ponen `userId` en filtros o creación. Joi solo acepta `title`, `template`, `data`, por lo que no se encontró ruta para que el cliente reescriba el propietario mediante el body.
- `update`, `delete` y restore consultan primero un CV con `id + userId` y luego mutan por `id`. No se confirmó que el usuario pueda cambiar `userId` mediante endpoints disponibles. La secuencia queda expuesta a carreras solo si otro actor/proceso privilegiado cambia el propietario entre consultas; no se trata como explotación confirmada.
- ATS analiza contenido recibido por body y lo persiste asociado al CV cuyo `id + userId` se validó. No encontré una lectura directa de ATS por `id` sin comprobar el CV padre; de todas formas, las consultas no disponen de contexto de DB.
- El SQL ATS usa placeholders y valores enlazados; el `$queryRaw` de admin es constante.
- CSRF exige token para métodos no seguros; firma HMAC y comparación constante. En producción CORS usa una lista de orígenes exactos configurados y `credentials: true`.
- CORS permite orígenes amplios fuera de producción (`origin: true`), lo cual conviene mantener limitado a desarrollo local; no se interpreta como exposición de producción.
- `uploadLogo` confía en `file.mimetype.startsWith('image/')` y deriva la extensión de `originalname` (`src/routes/admin.ts:19-26`, `src/controllers/adminController.ts:101-122`). El endpoint requiere admin; conviene validar bytes/extensiones y contenido activo como hardening de carga, pero no se confirmó una explotación en este checkout.
- No se encontraron colas o procesos asíncronos Prisma persistentes; la caché usa un intervalo no referenciado y es local al proceso.

## Políticas RLS y migraciones disponibles

- `20261013150000_enable_rls_public_tables/migration.sql:1-23` habilita RLS dinámicamente en tablas existentes del schema `public` sin crear políticas por usuario ni aplicar `FORCE`.
- El comentario afirma que la aplicación usa rol `postgres` propietario, que evita RLS. Esta es evidencia del diseño de esa migración, no verificación de conexión desplegada.
- No existe en esta rama la migración `zzzz_procv_rls_user_context` ni `dbContext.ts`.
- Las migraciones iniciales crean CV/Version/Audit/Settings y llaves; `20260317170000_add_cv_ats_analysis` agrega ATS con FK a CV. La migración `20261013030000_cascade_user_deletes` cambia cascadas; `zzzz_identity_only_data_model` retira tablas locales de identidad y convierte `CV.userId` en sujeto externo. Ninguna de las políticas por propietario descritas para el PR #103 está presente.
- `CVVersion.cvId` está nullable en el schema actual (`schema.prisma:9-14`), mientras la migración inicial lo creó no-null (`20260316154647_init/migration.sql:25-33`). Debe verificarse el estado final en el PR/migraciones, especialmente las políticas de filas huérfanas. No se ejecutó `prisma validate` ni se conectó una base para comparar schema.

## Plan de correcciones para la rama RLS

1. Recuperar el SHA exacto del PR y revisar el diff completo contra su base; no aplicar las recomendaciones de este informe sobre la rama ProJobs.
2. Confirmar para cada tabla qué rol es propietario y qué roles tienen `BYPASSRLS`, `SET ROLE`, DML y grants. El rol de aplicación debe ser distinto del propietario y no tener `BYPASSRLS`.
3. Verificar que cada entrada a Prisma para usuario/admin/público establece el rol y GUCs localmente dentro de la misma transacción y misma conexión física que ejecuta la consulta; sin variables persistentes de sesión.
4. Envolver en una transacción todos los pasos relacionados (validación del CV padre, versión/ATS, mutación y auditoría según semántica) para evitar check/use separado.
5. Revisar todas las llamadas Prisma y SQL crudo, incluyendo controladores admin, landing settings, auditoría, health checks, scripts y procesos asíncronos. Mantener parametrización de SQL.
6. Definir políticas `USING` y `WITH CHECK` diferenciadas por operación y tabla hija; probar RLS con permisos de los roles reales en PostgreSQL aislado.
7. Alinear `requireAdmin` con introspección/sesiones revocadas y una sola fuente de issuer/config.
8. Endurecer manejo de auditoría, consulta de settings públicos y validación del contenido de logos.

## Plan de pruebas reproducibles (diseñado; no ejecutado)

Usar PostgreSQL local/efímero aislado, nunca producción ni datos reales. Cargar migraciones y crear sujetos sintéticos `user-a`, `user-b`, `admin-a`, CV de A/B, versiones, ATS, logs y settings públicos/privados.

1. **Lectura CV:** con contexto `user-a`, `findUnique/findFirst/findMany` por CV B devuelve cero/no encontrado; A sí ve solo su fila. Repetir simétricamente con B.
2. **Actualización CV:** A intenta update de CV B por ID; verificar cero filas/error según API y que el contenido de B no cambie.
3. **Eliminación CV:** A intenta borrar CV B; verificar que CV, versiones y ATS de B permanecen.
4. **Versiones:** A intenta leer/restaurar una versión de CV B; SELECT/UPDATE debe denegarse y datos B no variar.
5. **ATS:** A intenta insertar análisis con `cvId` de B y leer historial de B; inserción y lectura deben denegarse.
6. **Administración:** usuario normal con token válido no accede a rutas admin; admin vigente puede ejecutar solo las operaciones permitidas. Revocar sesión o rol y confirmar que ya no conserva acceso.
7. **Sin contexto:** bajo rol restringido y sin GUCs, no se leen ni escriben tablas protegidas.
8. **Aislamiento de transacción:** setear contexto en una transacción, terminarla y reutilizar conexiones del pool; transacción siguiente sin contexto no hereda identidad ni admin flag.
9. **Concurrencia:** ejecutar A y B simultáneamente con pool reutilizado y consultas sincronizadas; comprobar que user_id/admin flag de una solicitud nunca aparece en la otra.
10. **Auditoría/settings:** user A solo accede a sus eventos conforme a política; admin consulta eventos globales; user normal lee settings públicos y no recibe privados; CRUD de settings y auditoría admin requiere contexto admin.
11. **Roles:** en base aislada, `procv_login` y `procv_runtime` pueden asumir `procv_app`; consultar `pg_roles`/`pg_auth_members` para demostrar que ninguno es superuser ni `BYPASSRLS`, y probar que `procv_app` no es owner.

Para cada caso registrar rol SQL efectivo, GUCs observados dentro y fuera de transacción, resultado HTTP/Prisma y estado final de filas. Estas son especificaciones de prueba, no resultados.

## Verificaciones específicas pendientes para PR #103

- Obtener la rama y SHA reales; confirmar que corresponden al head actual del PR.
- Revisar el diff completo (no usar el diff parcial consultado previamente como sustituto del checkout).
- Comprobar compatibilidad real de `ProCVTransaction` con todas las funciones que lo importan y `Prisma.TransactionClient` generado.
- Confirmar cobertura transaccional de cada operación Prisma encontrada en este inventario, incluidas consultas crudas, admins, auditoría, landing y monitoring.
- Validar `SET ROLE`/grants para `procv_login`, `procv_runtime` y `procv_app`, pertenencia y atributos de roles; no conceder superuser ni `BYPASSRLS`.
- Revisar sintaxis/semántica de políticas para `CV`, `CVVersion`, `CVAtsAnalysis`, `AuditLog`, `PlatformSetting`, incluido caso de versiones con `cvId` nulo.
- Ejecutar las pruebas de aislamiento con PostgreSQL aislado, transacción concurrente y pruebas de pool/contexto; distinguir tests mock de prueba real de RLS.
- Revisar el impacto del orden/nombre de migraciones y el fixture de CI sin depender exclusivamente de GitHub Actions.
- Confirmar que no se aplica `FORCE RLS` en producción durante la preparación; producción queda fuera de alcance de esta auditoría.

## Archivos revisados

- `src/app.ts`, `src/config.ts`, `src/index.ts`, `src/prismaClient.ts`
- `src/middleware/auth.ts`, `admin.ts`, `csrf.ts`, `rateLimiter.ts`, `errorHandler.ts`
- `src/routes/cv.ts`, `src/routes/admin.ts`
- `src/controllers/cvController.ts`, `adminController.ts`
- `src/services/cvService.ts`, `cvAtsService.ts`, `atsService.ts`, `cvImportService.ts`
- `src/utils/auditLogger.ts`, `auditLog.ts`, `cache.ts`, `cookies.ts`, `logger.ts`, `monitoring.ts`, `pdfGenerator.ts`, `templates.ts`
- `src/dto/cvDto.ts`, `src/validation/cvValidation.ts`
- `prisma/schema.prisma`, `prisma/seed.ts`, todas las migraciones disponibles de ProCV
- Archivos de pruebas presentes en `tests/` (inventario; no se ejecutaron)
- Configuración de paquete, TypeScript, Jest, ESLint y Dockerfile (inventario; no se ejecutaron)

## Archivos ausentes o pendientes

- La rama RLS `security/procv-rls-user-context-2026-10` y su SHA local.
- `src/dbContext.ts`.
- Migración `zzzz_procv_rls_user_context` esperada por el PR.
- Pruebas específicas del PR para contexto y aislamiento RLS/PostgreSQL.
- Verificación de roles/políticas efectivos en una base PostgreSQL aislada.
- Estado real de configuración y políticas en Neon/Render (deliberadamente no consultado).

## Estado de protección del entorno al cerrar

No se cambió de rama, no se hizo fetch/push/commit, no se accedió a Neon ni Render, no se ejecutó Actions, no se modificaron secretos ni variables de entorno. El único archivo creado en el repositorio es este informe solicitado; el working tree queda con ese archivo nuevo y sin cambios de aplicación.

