# Inventario de operaciones Prisma de ProCV

Rama/SHA: projobs-test-2026-10-29 / a7ae8de82037ee2baefba544ccabd671ff223429. Este checkout no es la rama RLS ni PR #103. No se ejecutaron pruebas ni consultas externas.

## Integridad y alcance

Ambos informes previos existen y se mantienen intactos. Se revisaron los 29 .ts/.tsx bajo apps/procv/backend/src, los 8 de tests, prisma/seed.ts, referencias en todo apps/procv/backend, schema y migraciones relacionadas. No se encontró repositorio separado ni worker/cron Prisma. Las operaciones mock en tests no cuentan como operaciones reales.

**Total: 33 callsites de datos/transacción.** Recuento por llamada estática; OP-026 se repite por cada setting válida; OP-021 se invoca por cuatro flujos admin. El $transaction se cuenta como boundary además de sus queries internas.

| Categoría | Significado | IDs | Total |
|---|---|---|---:|
| A | Usuario, withUserContext | OP-001–020 | 20 |
| B | Administrador, withAdminContext | OP-021–031 | 11 |
| C | Público, withPublicContext | OP-032 | 1 |
| D | Infraestructura sin tabla protegida | OP-033 | 1 |
| E | No clasificable | — | 0 |
| Total | | | 33 |

No hay findUniqueOrThrow, findFirstOrThrow, createMany, updateMany, deleteMany, aggregate, groupBy, $executeRaw ni $executeRawUnsafe en operaciones backend. No hay tx.* en esta rama. OP-034 prisma.$disconnect queda fuera del total, pues es ciclo de vida. El único $transaction es el batch OP-001. Hay dos $queryRawUnsafe (OP-018/020), un $queryRaw de negocio (OP-029) y uno health (OP-033).

Campos: la identidad es la del middleware salvo indicación; los services reciben userId por argumento. El rol “A/B/C” es el contexto requerido futuro, no un rol PostgreSQL ya comprobado. En “Cliente” se distingue prisma raíz de tx; en esta rama todo usa singleton global, salvo queries incluidas en el batch.

## Registro individual

| ID | Archivo / función / línea aprox. | Modelo | Operación | Identidad y filtro propietario en query | Rol | Transacción / cliente | Cambios relacionados | AuditLog | Riesgo RLS y corrección |
|---|---|---|---|---|---|---|---|---|---|
| OP-001 | services/cvService.ts / getUserCVs / 77 | Boundary | $transaction batch | User de request; no aplica | A | Batch; crea prisma global, sin GUC | Agrupa OP-002/003 | No | No establece contexto; cambiar a interactiva withUserContext. |
| OP-002 | cvService.ts / getUserCVs / 78 | CV | findMany | userId; where userId | A | Dentro OP-001; Promise de prisma raíz | Lista | No | Mantener filtro y ejecutar tx.cV.findMany. |
| OP-003 | cvService.ts / getUserCVs / 84 | CV | count | userId; where userId | A | Dentro OP-001; Promise de prisma raíz | Total | No | Mismo tx/contexto de OP-002. |
| OP-004 | cvService.ts / getCVByIdAndUserId / 127 | CV | findFirst | userId; where id+userId | A | Ninguna; prisma raíz | Detalle/tailor | No | withUserContext; cache hit también depende de principal verificado. |
| OP-005 | cvService.ts / createCV / 141 | CV | create | User middleware; data.userId | A | Ninguna; prisma raíz | Crea CV | No | Contexto y policy WITH CHECK; owner no viene del body. |
| OP-006 | cvService.ts / updateCV / 167 | CV | findFirst | userId; id+userId | A | Ninguna; prisma raíz | Precheck OP-007/008 | No | Read fuera de tx del write. |
| OP-007 | cvService.ts / updateCV / 172 | CV | update | User solo en precheck; where id | A | Ninguna; prisma raíz | Modifica CV | No | Mismo tx, owner filter y WITH CHECK. |
| OP-008 | cvService.ts / updateCV / 182 | CVVersion | create | Derivado de CV preleído; cvId | A | Ninguna; prisma raíz | Snapshot de OP-007 | No | Policy hija por padre, tx con OP-006/007. |
| OP-009 | cvService.ts / deleteCV / 203 | CV | findFirst | userId; id+userId | A | Ninguna; prisma raíz | Precheck OP-010 | No | Mismo tx que delete y limpieza de versiones. |
| OP-010 | cvService.ts / deleteCV / 208 | CV | delete | User solo en precheck; where id | A | Ninguna; prisma raíz | ATS cascade por FK; CVVersion no tiene FK | No | Contexto y tx. Código no borra CVVersion; puede dejar huérfanos por cvId nullable/sin FK. Añadir deleteMany en misma tx o definir retención. |
| OP-011 | cvService.ts / exportCVToPDF / 235 | CV | findFirst | userId; id+userId | A | Ninguna; prisma raíz | Resultado cache/PDF | No | Contexto; cache key contiene id y userId; render tras lectura fuera de tx. |
| OP-012 | cvService.ts / getCVVersions / 270 | CV | findFirst | userId; id+userId | A | Ninguna; prisma raíz | Precheck OP-013 | No | El check no autoriza query separada; una tx. |
| OP-013 | cvService.ts / getCVVersions / 275 | CVVersion | findMany | User por padre; solo cvId | A | Ninguna; prisma raíz | Lee versions | No | Policy EXISTS en CV; excluir orphan/null a user. |
| OP-014 | cvService.ts / restoreCVVersion / 290 | CV | findFirst | userId; id+userId | A | Ninguna; prisma raíz | Precheck restore | No | Tx con OP-015/016. |
| OP-015 | cvService.ts / restoreCVVersion / 295 | CVVersion | findFirst | Derivado de CV; cvId+versionId | A | Ninguna; prisma raíz | Fuente de snapshot | No | Policy de hijo y misma transacción. |
| OP-016 | cvService.ts / restoreCVVersion / 300 | CV | update | User de precheck; where id | A | Ninguna; prisma raíz | Restaura data | No | Contexto/owner check; decidir si crea snapshot nuevo. |
| OP-017 | services/cvAtsService.ts / analyzeAndPersist / 88 | CV | findFirst | userId pasado por controller; id+userId | A | Ninguna; prisma raíz | Autoriza análisis | No | Mismo contexto de persistencia o revalidar post cálculo. |
| OP-018 | cvAtsService.ts / analyzeAndPersist / 100 | CVAtsAnalysis | $queryRawUnsafe INSERT RETURNING | User previo; escribe cvId, sin predicado | A | Ninguna; prisma raíz | Inserta análisis | No | Params $1-$6 enlazados, no se confirmó SQLi. Preferir tx.cVAtsAnalysis.create/parametrizado; policy padre. |
| OP-019 | cvAtsService.ts / getHistory / 132 | CV | findFirst | userId; id+userId | A | Ninguna; prisma raíz | Precheck OP-020 | No | Mismo contexto de history. |
| OP-020 | cvAtsService.ts / getHistory / 137 | CVAtsAnalysis | $queryRawUnsafe SELECT | User por padre; solo cvId | A | Ninguna; prisma raíz | Lee historial | No | Params para cvId/limit; query tipada/model delegate y policy hija. |
| OP-021 | utils/auditLogger.ts / AuditLogger.log / 18 | AuditLog | create | actorId del caller; inserta userId=actorId | B en callers existentes | Ninguna; prisma raíz | Llamado después de setting/logo | Sí, esta fila | Contexto + mismo tx de mutación; error se suprime. logAdminAction es único caller actual; no hay .log directo según rg. |
| OP-022 | controllers/adminController.ts / getAuditLogs / 15 | AuditLog | findMany | Admin middleware JWT claims; global | B | Ninguna; prisma raíz; Promise.all | Retorna logs | No | Verificar admin vigente; withAdminContext. |
| OP-023 | adminController.ts / getAuditLogs / 20 | AuditLog | count | Admin; global | B | Ninguna; prisma raíz; Promise.all | Count | No | Mismo callback/tx de OP-022. |
| OP-024 | adminController.ts / getPlatformSettings / 43 | PlatformSetting | findMany | Admin; global | B | Ninguna; prisma raíz | Lee settings privadas | No | withAdminContext. |
| OP-025 | adminController.ts / updatePlatformSetting / 66 | PlatformSetting | upsert | req.user.id admin; key único | B | Ninguna; prisma raíz | Crea/update | OP-021 luego | B + audit en tx; user verificado. |
| OP-026 | adminController.ts / bulkUpdatePlatformSettings / 177 | PlatformSetting | upsert por cada setting válida | req.user.id admin; key único | B | Ninguna; awaits seriales prisma raíz | N upserts | OP-021 una vez al final | Misma tx all-or-nothing con audit; hoy puede persistir prefijo si falla. |
| OP-027 | adminController.ts / deletePlatformSetting / 226 | PlatformSetting | findUnique | Admin; key único | B | Ninguna; prisma raíz | Precheck OP-028 | No | Misma tx de delete/audit. |
| OP-028 | adminController.ts / deletePlatformSetting / 234 | PlatformSetting | delete | Admin; key único | B | Ninguna; prisma raíz | Borra setting | OP-021 después | Contexto y auditoría en misma tx; evitar log secreto. |
| OP-029 | adminController.ts / getSystemStats / 261 | CV | $queryRaw tagged SELECT | Admin; global | B | Ninguna; prisma raíz; Promise.all | Agregación | No | SQL constante; contexto admin y tx compartido con OP-030. |
| OP-030 | adminController.ts / getSystemStats / 265 | CV | count | Admin; global | B | Ninguna; prisma raíz; Promise.all | Estadística | No | withAdminContext y tx de OP-029. |
| OP-031 | adminController.ts / getChartData / 291 | CV | findMany | Admin; date range, sin owner | B | Ninguna; prisma raíz | Datos agregados en memoria | No | Admin tx; seleccionar datos mínimos. |
| OP-032 | app.ts / public landing / 137 | PlatformSetting | findUnique | Público no autenticado; key, sin isPublic en query | C | Ninguna; prisma raíz | Ninguna | No | withPublicContext; filtrar isPublic:true antes de leer. |
| OP-033 | utils/monitoring.ts / healthCheck / 154 | Ningún modelo, SELECT 1 | $queryRaw | Anónimo; no tabla | D | Ninguna; prisma raíz dinámico, Promise.race | Conectividad | No | Fuera de RLS tabla si rol mínimo lo permite. Timeout no cancela necesariamente query subyacente. |

## Prisma no contado como datos

| Referencia | Clasificación | Motivo |
|---|---|---|
| src/index.ts:58 prisma.$disconnect (OP-034) | D | Lifecycle, awaited, no query; fuera de los 33. |
| src/prismaClient.ts:1-32 | D | Crea singleton/listeners de eventos, no llamada de negocio. |
| tests/publicLandingFeatures.test.ts:4-123 | Test mock | findUnique simulado; no PostgreSQL. Aserta filtro actual solo por key, no isPublic. |
| services/atsService.ts, templates.ts, cvImportService.ts | Sin Prisma | Cálculo, parsing y presentación. |
| prisma/seed.ts | Sin Prisma | Solo comunica que cuentas se crean en ProIdentity. |

## Resumen operativo

Afectados: CV, CVVersion, CVAtsAnalysis, AuditLog, PlatformSetting. No hay modelo User runtime. OP-001..033 requieren revisión; OP-001..032 necesitan A/B/C contextual, OP-033 puede quedar D. La única transacción actual es batch list+count sin identidad. Promise.all admin es con singleton, no transacción común.

Flujos no atómicos: OP-006/007/008 update+version; OP-009/010 delete y huérfanos; OP-014/015/016 restore; OP-017/018/019/020 ATS; OP-025/021 setting; OP-026/021 bulk; OP-027/028/021 delete. No hay AuditLog en CRUD CV/ATS. Upload guarda archivo y luego audit; filesystem no transaccional.

Cache CV keys incluyen userId y cvId (list/detail/export/version); no se detectó key común entre usuarios. RLS no cubre cache hit, así que principal de middleware debe ser fuente única. No hay promesas Prisma sin await ni worker persistente encontrados. Health query puede persistir tras respuesta timeout pero solo SELECT 1.

CVVersion discrepancy: migration 20261015190000 hace cvId nullable y elimina FK; migration cascade_user_deletes dice que la app borra versiones primero; deleteCV actual no hace ese delete. Una operación futura deleteMany debe agregarse al inventario de implementación, no se cuenta como callsite existente.

Eliminación de usuario: no hay endpoint/Prisma runtime; Identity gestiona cuentas. Migraciones legacy eliminan User/tokens. Eventos/worker futuros son E hasta que exista código y modelo.

**Estado: COMPLETO para código disponible de este checkout; no es inventario del PR #103 ni de DB efectiva.**

## Archivos no leídos línea por línea y motivo

No quedaron directorios de src/ o tests/ sin enumerar ni sin búsqueda de referencias Prisma. Sí se excluyó de la lectura semántica línea por línea el contenido no relacionado con persistencia, una vez confirmado por búsqueda recursiva que no crea/usa cliente Prisma ni oculta llamadas de datos: src/scripts/pdfPaginationAudit.ts, src/scripts/pdfPaginationSmoke.ts, servicios atsService.ts y cvImportService.ts, dto/cvDto.ts, validación cvValidation.ts, middleware csrf.ts/errorHandler.ts/rateLimiter.ts, utils auditLog.ts/cache.ts/cookies.ts/logger.ts/pdfGenerator.ts/templates.ts, y tests/setup.ts, pruebas middleware de csrf/auth/errorHandler, utils/logger y validation/cvValidation. Las funciones de esas piezas relevantes a flujos (auth, CV controller/rutas, cache y render) fueron revisadas en los informes/flujo; su lógica ajena a Prisma no cambia el inventario de queries. prisma/seed.ts se leyó y no crea cliente ni ejecuta query. Los tests solo contienen un mock Prisma de PlatformSetting; el resto no hace DB.
