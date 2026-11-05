# Mapa de flujos de datos ProCV para integración RLS

Rama/SHA: projobs-test-2026-10-29 / a7ae8de82037ee2baefba544ccabd671ff223429. Este documento refleja solo el checkout; no la rama del PR #103.

## Puntos de entrada y contexto compartido

- app.ts monta /api/admin con adminLimiter + router admin; routes/admin.ts aplica router.use(requireAdmin) antes de endpoints. En esta rama middleware admin verifica JWT claims sin introspección viva.
- app.ts monta /api/cvs con cvLimiter + router CV. routes/cv.ts declara POST /import/parse antes de router.use(authMiddleware); es público y parser opera en memoria. Resto de rutas CV requieren auth.
- Controllers pasan req.userId a servicios. Servicio no extrae identidad, toma un string argumental.
- Servicios/controladores usan singleton Prisma. No existe dbContext.ts ni tx client. Única transacción batch es list CV + count; sin SET ROLE/GUC.
- Promesas de operaciones de negocio se esperan antes de respuesta. No se halló Prisma post-response/worker; health Promise.race puede dejar SELECT 1 no cancelado tras timeout, sin tocar tabla protegida.
- Los formularios ATS draft/tailor están autenticados, pero cálculo en memoria sin Prisma.

    Request user -> auth middleware -> CV controller -> CVService/CVAtsService -> Prisma singleton -> response
    Request admin -> requireAdmin (JWT claims) -> admin controller -> Prisma singleton/AuditLogger -> response
    Landing público -> app route -> PlatformSetting.findUnique -> if isPublic en Express -> response
    Futura operación -> principal verificado -> withUser/Admin/PublicContext -> tx interactivo
                     -> role procv_app + GUC local + role check -> todas queries relacionadas usando tx
                     -> commit/rollback -> invalidar cache -> response

## Flujos completos

### F-01 Crear CV
- Entrada POST /api/cvs (routes/cv.ts:35); auth se aplica en línea 32.
- Controller createCV: requiere req.userId, valida createCvSchema y normaliza data; llama CVService.createCV.
- Servicio: OP-005 CV.create con userId, luego invalida cache de lista.
- Transacción/audit: ninguna; no se escribe AuditLog.
- Futuro: categoría A. Crear bajo withUserContext; policy WITH CHECK enlaza userId a GUC. Invalida cache tras commit.
- Parcialidad: solo una query; fallo no deja CV parcial. No asumir evento de audit inexistente.

### F-02 Consultar CV, lista, detalle y export
- GET /api/cvs -> listCVs -> getUserCVs. Busca cache list key userId/page/limit; miss OP-001 batch + OP-002 findMany + OP-003 count, filtrados por userId; cache 30s.
- GET /api/cvs/:id -> getCVByIdAndUserId, cache key cvId+userId; miss OP-004 id+userId; cache 60s.
- GET /api/cvs/:id/pdf -> exportCVToPDF, OP-011 id+userId; cache 300s; controller construye HTML/PDF y responde.
- Transacción: solo OP-001 batch, sin contexto; detalle/export ninguna.
- Futuro: A para consultas miss. Cache key solo con principal verificado; cache hit no ejecuta RLS. PDF render después de lectura, fuera de tx.

### F-03 Actualizar CV
- PUT /api/cvs/:id -> updateCV controller -> servicio.
- Orden: OP-006 read id+userId; OP-007 update where id; OP-008 create CVVersion snapshot; invalidar list/detail/export/version cache.
- Transacción/audit: no tx; no AuditLog.
- Futuro: una tx A para prelectura, update y snapshot. Policy CHECK conserva owner. Invalidación después de commit.
- Parcialidad: CV puede actualizarse y version.create fallar, sin snapshot.

### F-04 Eliminar CV
- DELETE /api/cvs/:id -> deleteCV controller -> servicio.
- Orden actual: OP-009 read id+userId, OP-010 delete where id, invalidar list/detail.
- Transacción/audit: no tx; no audit.
- Datos relacionados: FK de CVAtsAnalysis cascada según schema/migration; CVVersion no tiene FK y cvId es nullable.
- Futuro: A, mismo tx; limpiar versiones por cvId con deleteMany antes del CV o definir retención explícita; preservar cascade ATS.
- Discrepancia confirmada: código actual no borra CVVersion, aunque migration cascade_user_deletes comenta que la app las borra antes de borrar CV. Puede dejar huérfanos. No afirmar fuga por sí solo; políticas user deben negar orphans.

### F-05 Crear y listar versiones
- No hay endpoint dedicado de create; updateCV escribe OP-008.
- GET /api/cvs/:id/versions -> parent OP-012 id+userId, luego OP-013 findMany por cvId; cache TTL 60s con key cvId+userId.
- No tx. Futuro A para ambas operaciones; policy de hijo EXISTS en CV. null/orphan no visible al user; admin puede cleanup según diseño aprobado.
- Check del parent no es contexto de la lectura hija; cache hit no pasa RLS.

### F-06 Restaurar versión
- POST /api/cvs/:id/versions/:versionId/restore -> OP-014 CV owner read, OP-015 version por cvId/id, OP-016 CV update, invalidar caches.
- No tx/audit; no crea nueva versión de restauración.
- Futuro A, parent/version/update atómicos; comprobar version y CV con mismo cvId; decidir snapshot nuevo.

### F-07 ATS con persistencia
- POST /api/cvs/:id/analyze -> controller analyzeCVATS.
- Orden: OP-017 CV read id+userId; ATSService analiza y tailorea en CPU; OP-018 INSERT analysis; controller llama getHistory: OP-019 parent read, OP-020 history SELECT.
- No tx/audit. Raw usa placeholders y argumentos separados; no se observó concatenación.
- Futuro A. No retener conexión durante cálculo costoso: verificar parent, calcular, persistir en tx breve con revalidación/version si aplica. History en helper A explícito; insertar analysis y fallo posterior al history puede causar respuesta error pese a insert. Considerar idempotencia.
- POST /:id/tailor obtiene CV por helper existente OP-004, calcula en memoria y no persiste. POST /analyze-draft y /tailor-draft no leen/escriben Prisma.

### F-08 Historial ATS
- GET /api/cvs/:id/ats-history -> OP-019 CV owner check, OP-020 análisis por cvId con límite clamp 1..30, mapeo/deltas.
- No tx. Futuro A y policy hija por parent. No lectura directa por ID de análisis sin owner comprobado encontrada.

### F-09 Cambiar setting individual
- PUT /api/admin/settings/:key -> requireAdmin -> upsert OP-025 con updatedBy admin -> AuditLogger.logAdminAction -> OP-021 -> respuesta.
- No tx común. AuditLogger absorbe fallo. Futuro B: upsert+AuditLog en una tx; audit-required failure revierte; redactar datos sensibles.

### F-10 Bulk settings
- PUT /api/admin/settings -> loop secuencial de OP-026 para cada elemento válido, después OP-021 con updatedCount.
- No tx; falla a mitad deja prefijo de settings persistido sin audit final.
- Futuro B: misma tx all-or-nothing, límites de tamaño, un evento audit en tx.

### F-11 Eliminar setting
- DELETE /api/admin/settings/:key -> OP-027 findUnique; 404 si falta; OP-028 delete; OP-021 audit con deletedValue; 204.
- No tx. Futuro B: read/delete/audit en misma tx; no guardar valores secretos. Fallo audit requerido revierte delete.

### F-12 Configuración pública
- GET /api/public/landing-features (app.ts), sin auth: OP-032 findUnique key; comprueba setting.isPublic luego; parse/sanitize y responde o [].
- No tx; errores se capturan y responden [].
- Futuro C: withPublicContext; filtrar key + isPublic:true en query; helper no permite tabla protegida. No se confirmó fuga HTTP actual, pero el proceso carga fila privada antes del if.

### F-13 Operaciones de lectura admin
- GET /api/admin/audit-logs: OP-022 findMany + OP-023 count en Promise.all sobre singleton, no tx.
- GET /api/admin/settings: OP-024 findMany.
- GET /api/admin/stats: OP-029 raw count distinct owner + OP-030 CV.count en Promise.all singleton.
- GET /api/admin/charts: OP-031 CV.findMany por fecha, selecciona userId/createdAt, agrupa en memoria.
- Futuro B en cada handler con rol/identidad vigente. Promise.all debe usar el tx recibido en un único callback. Stats/charts son globales solo admin; minimizar campos.

### F-14 Logo admin
- POST /api/admin/upload/logo: requireAdmin; multer temp file; controller renombra a uploads/logos; AuditLogger -> OP-021; devuelve URL.
- No query salvo AuditLog. Archivo no es atómico con DB. Futuro B para audit; compensar borrando archivo si falla persistencia o usar outbox/estado; validar contenido por separado.

### F-15 Eliminación de usuario
- No existe User model en schema actual, endpoint runtime ni Prisma delete de usuario. ProIdentity posee cuentas.
- Migraciones antiguas incluyen cascadas de User/CV/ATS, y zzzz_identity_only_data_model elimina User/session/tokens y reconcilia subject. No equivale a flujo runtime.
- No inventar tarea local. Si llega evento de baja/worker, definir principal de servicio/autorización y transacción de borrado; revisar CVVersion huérfanas.
- CVVersion no se borra por FK y deleteCV actual no la borra.

## Riesgos especiales observados

- Actualización OP-006/007/008, borrado OP-009/010, restore OP-014/015/016 y ATS OP-017/018/019/020 son secuencias no atómicas.
- Admin audit/settings OP-025/021, OP-026/021 y OP-027/028/021 separadas; escritura de auditoría falla silenciosamente.
- Promise.all en auditoría y stats no crea transacción contextual.
- Bulk upserts seriales, pero no transaccionales.
- No se hallaron Prisma promises sin await en servicios/controllers. No hay Prisma global dentro de callback transaccional porque no hay callback contextual en esta rama.
- No hay queries después de response observadas. Health timeout via Promise.race puede dejar SELECT 1 subyacente, únicamente infraestructura.
- CV cache keys incluyen userId en list/detail/export/version; no se vio key cross-user. RLS no aplica a cache hit: key exclusivamente desde principal autenticado.
- No hay worker/cron Prisma. Cleanup cache usa setInterval pero no DB.
- Auditoría de CV create/update/delete/ATS no existe en código actual.
- deleteCV no borra versiones pese a comentario migratorio: añade tarea deleteMany en checklist, no cuenta como operación existente.
- Prisma tests directos son mocks de PlatformSetting; no son RLS real.

## Cobertura de fuentes

Se enumeraron 29 archivos TS/TSX de src, 8 pruebas y prisma/seed.ts; se buscó llamadas/imports en todo backend. Migraciones y schema se revisaron para constraints/deletes. No quedan directorios src/tests locales sin enumerar. La rama target y config DB efectiva no están disponibles.

Ver PROCV_PRISMA_OPERATION_INVENTORY.md para los IDs individuales y PROCV_RLS_IMPLEMENTATION_CHECKLIST.md para tareas y estados por ID.
