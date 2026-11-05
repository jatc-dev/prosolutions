# Blueprint de remediación de seguridad y preparación RLS para ProCV

**Fecha:** 2026-10-30  
**Checkout:** C:\Projects\prosolutions  
**Rama / SHA:** projobs-test-2026-10-29 / a7ae8de82037ee2baefba544ccabd671ff223429  
**PR pendiente:** #103; su rama no está disponible en este checkout.  
**Alcance:** diseño ejecutable; no se cambió código de aplicación ni migraciones y no se validó producción.

## Resumen ejecutivo

Se cotejaron los siete hallazgos del informe preliminar con el código y las migraciones disponibles. H-1, H-2, M-1, M-2, M-3, M-4 y L-1 están confirmados, con los matices documentados abajo. No se confirmó fuga de CV entre usuarios por los endpoints ordinarios ni SQL injection en ATS.

El plan propone autenticación común con introspección viva, contexto DB local a cada transacción interactiva Prisma, adopción explícita del tx en servicios/controladores, auditoría atómica, políticas por propietario y pruebas PostgreSQL real con roles restringidos. La implementación debe ocurrir en la rama correcta del PR una vez recuperada; no reconstruir el PR a partir de este documento.

## Estado y alcance

Rama y SHA coinciden con el informe preliminar. El working tree ya tenía el informe nuevo en docs/security; esta tarea agrega solo el blueprint, sin alterar dicho informe. No se hizo fetch/push/commit, cambio de rama, prueba, migración, acceso a Neon/Render ni ejecución de Actions.

No están en esta rama src/dbContext.ts, la migración esperada zzzz_procv_rls_user_context ni pruebas RLS del PR. No se atribuye al PR ninguna implementación propuesta aquí.

## Hallazgos cotejados con código

| ID | Estado y evidencia | Matiz |
|---|---|---|
| H-1 | Confirmado en apps/procv/backend/prisma/migrations/20261013150000_enable_rls_public_tables/migration.sql:1-23. Hace ENABLE RLS dinámico, no crea políticas ni ejecuta FORCE. El comentario dice que la app conecta como propietario postgres. | Prueba brecha de la migración y diseño descrito, no rol efectivo ni estado productivo. FORCE no restringe superuser/BYPASSRLS. |
| H-2 | Confirmado en src/middleware/admin.ts:18-40: verifica JWT, role, modules, issuer y audience, pero no jti ni introspección. src/middleware/auth.ts:108-145 sí exige jti, compara sub con introspection.userId y usa módulos/rol de introspección. | TTL y contrato de revocación de Identity no comprobados. |
| M-1 | Confirmado: no existe dbContext.ts y los servicios/controladores usan Prisma global. La transacción batch de lista no inicializa identidad; lecturas/escrituras relacionadas quedan separadas. | No demuestra fuga actual en endpoints normales, que filtran userId; impide atribuir garantías a RLS contextual. |
| M-2 | Confirmado en admin.ts:21-23, auth.ts:108-110 y config.ts:91-92: admin usa identityUrl como issuer, usuario usa issuer; defaults difieren. | Config real no inspeccionada; efecto directo potencial es rechazo/disponibilidad fail-closed. |
| M-3 | Confirmado en utils/auditLogger.ts:15-36: auditLog.create falla, se loguea y el error se suprime; logAdminAction delega al mismo flujo. | Se puede perder completitud, no se comprobó actor erróneo; adminController pasa adminUser.id. |
| M-4 | Confirmado en app.ts:137-145: consulta PlatformSetting por key y comprueba isPublic después, antes de responder. | El valor privado entra en memoria, pero el handler observado no lo serializa: no se confirmó fuga HTTP. |
| L-1 | Confirmado en cvAtsService.ts:100-119,137-157: queryRawUnsafe y any. SQL literal con placeholders y valores pasados aparte. | No se vio concatenación ni SQL injection; es deuda de API/tipos que facilita errores futuros. |

Schema comprobado: CV.userId String; CVVersion.cvId String nullable; CVAtsAnalysis.cvId String no nulo con relación a CV; AuditLog.userId nullable; PlatformSetting.isPublic Boolean. 20261015190000_align_cv_version_schema elimina FK y NOT NULL de CVVersion.cvId; 20261013030000_cascade_user_deletes documenta que no hay FK de versión. Pueden existir huérfanos; verificar estado final y su tratamiento antes de migrar.

## Prioridad 1 — Autenticación y autorización

### Cambio técnico

- Centralizar en middleware/auth.ts el contrato de JWT e introspección: firma, issuer canónico config.issuer, audience prosolutions-api, exp, sub no vacío y jti presente. jti por sí solo no prueba revocación.
- Introspectar en ProIdentity cada solicitud protegida; exigir valid true, userId igual a JWT sub, modules incluye PROCV y rol actual tipado.
- Mantener activo el timeout hasta terminar de leer el body JSON. Fallar cerrado con timeout, HTTP no exitoso, JSON malformado o discrepancia.
- Hacer que admin middleware componga autenticación común y luego exija role admin derivado de introspección vigente. No usar rol del JWT como autoridad actual ni permitir elevarlo vía body/header.
- Usar el mismo issuer y audience en user/admin. identityUrl será solo destino HTTP de introspección.
- Asociar identidad verificada tipada al request; no usar any para identidad admin. Enviar error genérico al cliente y conservar diagnóstico saneado en logs.

### Archivos, dependencias, regresiones y aceptación

| Archivos | Cambio | Dependencia/riesgo | Pruebas y aceptación |
|---|---|---|---|
| middleware/auth.ts y AuthRequest | JWT + contrato de introspección vivo, jti, sujeto, módulo y rol | Contrato Identity; latencia y disponibilidad de introspección. No cachear revocación sin garantía explícita. | JWT inválido, issuer/aud, sub/jti ausente, revoked, mismatch, timeout/body colgado. Ninguno llega al handler. |
| middleware/admin.ts y config.ts | Reusar auth común, autorizar con rol actual; issuer/audience únicos | Alinear emisión y configuración real; posible 401/403 al corregir configuración divergente. | Mismo token/config para ambos middleware; user no accede; cambio de rol/revocación corta acceso. |
| routes/admin.ts | Mantener requireAdmin antes de todos los handlers | Revisar handlers alternativos no montados en router | Inventario de endpoints; ningún usuario ejecuta callback/consulta admin. |

Bloquea esta etapa verificar que el contrato de introspección de Identity aporta revocación de sesión y rol actual.

## Prioridad 2 — Arquitectura transaccional RLS

### API TypeScript propuesta

El lockfile fija Prisma y @prisma/client 5.22.0; el tipo generado local incluye Prisma.TransactionClient. Compilar y generar el cliente en la rama destino sigue siendo obligatorio.

    import { Prisma } from '@prisma/client';

    export type ProCVTransaction = Prisma.TransactionClient;
    export type ProCVOperation<T> = (tx: ProCVTransaction) => Promise<T>;

    export interface TransactionOptions {
      maxWait?: number;
      timeout?: number;
    }

    export interface VerifiedUser {
      readonly userId: string; // sub de Identity, nunca req.body
    }

    export interface VerifiedAdmin extends VerifiedUser {
      readonly role: 'admin'; // rol de introspección vigente
      readonly modules: readonly string[];
    }

    export function withUserContext<T>(
      principal: VerifiedUser,
      operation: ProCVOperation<T>,
      options?: TransactionOptions,
    ): Promise<T>;

    export function withAdminContext<T>(
      principal: VerifiedAdmin,
      operation: ProCVOperation<T>,
      options?: TransactionOptions,
    ): Promise<T>;

    export function withPublicContext<T>(
      operation: ProCVOperation<T>,
      options?: TransactionOptions,
    ): Promise<T>;

Los tipos estructurales no prueban autenticidad runtime. VerifiedAdmin debe salir del middleware común. Una marca nominal puede impedir errores de compilación, pero no es un límite frente a código comprometido ni casts.

### Secuencia por llamada

1. Rechazar user/admin subject vacío antes de abrir tx; solo helper público permite subject vacío.
2. Usar transacción interactiva prisma.$transaction(async tx => ...), no batch $transaction([...]) cuando haya que configurar contexto antes de las consultas.
3. En tx, fijar rol con valor literal constante procv_app usando set_config('role', 'procv_app', true). No interpolar rol desde request/config arbitraria.
4. Consultar current_user dentro del tx y abortar si no es procv_app.
5. Fijar con parámetros GUC locales procv.user_id, procv.is_admin y procv.is_public. Usuario: ID verificado, admin=false, public=false. Admin: ID verificado, admin=true, public=false. Público: ID vacío, admin=false, public=true.
6. Todas las operaciones de negocio relacionadas usan tx, incluyendo lecturas de autorización, mutaciones, hijos, SQL raw y auditoría.
7. Esperar todas las promesas. Propagar errores para rollback. Traducir errores esperados en el controller después de rollback.

Ejemplo de servicio:

    const saved = await withUserContext({ userId: req.userId }, async tx => {
      const cv = await tx.cV.findFirst({
        where: { id: cvId, userId: req.userId },
      });
      if (!cv) throw new CVNotFoundError();

      const updated = await tx.cV.update({
        where: { id: cv.id },
        data: { title, data: serializedData },
      });
      await tx.cVVersion.create({
        data: { cvId: updated.id, snapshot: updated.data },
      });
      await writeUserAudit(tx, { actorId: req.userId, resourceId: updated.id });
      return updated;
    });

Ejemplo admin y público:

    const settings = await withAdminContext(verifiedAdmin, tx =>
      tx.platformSetting.findMany({ orderBy: { createdAt: 'desc' } }),
    );

    const landing = await withPublicContext(tx =>
      tx.platformSetting.findFirst({
        where: { key: featuresKey, isPublic: true },
      }),
    );

No capturar un error de query/audit dentro del callback para devolver éxito. No anidar helpers; pasar tx a repositorios inferiores. No iniciar tareas fire-and-forget. Invalidar cache solo después de commit. No incluir red, Identity o generación PDF dentro de tx. Filesystem no participa en rollback PostgreSQL: upload necesita compensación/outbox.

### Pool, concurrencia y limitaciones

Una transacción interactiva mantiene su conexión del pool mientras corre el callback. Llamadas concurrentes A/B deben usar tx independientes; no depender de estado global ni AsyncLocalStorage como autoridad. Promise.all en el mismo tx no garantiza paralelismo real sobre una conexión. Ajustar maxWait/timeout a límites del servicio. Tras commit/rollback el role/GUC local debe dejar de autorizar; verificar reutilización de conexión. Para GUC ausente, policies usan current_setting(..., true); tolerar valor restaurado NULL o vacío y probar resultado de policy.

**Límite importante:** GUC custom es seteable por la propia sesión. Si procv_app ejecuta SQL arbitrario, podría intentar fijar procv.is_admin=true. Este diseño da defensa ante filtros olvidados, pero no resiste por sí solo SQL injection arbitraria ni credenciales/backend comprometidos. Si ese escenario está dentro del threat model, bloquear aprobación hasta diseñar una autoridad de contexto que el rol no pueda falsificar (frontera de roles/capacidades o aserción criptográfica validada por DB). FORCE RLS por sí solo no resuelve este límite.

### Archivos y criterios por componente

| Archivos/funciones | Cambio | Dependencias/riesgos | Aceptación |
|---|---|---|---|
| Nuevo src/dbContext.ts; prismaClient.ts | Helpers user/admin/public; role literal, current_user check, GUC locales, error fail-closed | Prisma generado, grants/membership; pool exhaustion por transacciones largas | Test real de current_user, rechazo de role erróneo, rollback y no herencia al siguiente borrower. |
| services/cvService.ts | Mover read+update+version; read+delete; padre+versiones/restore al mismo tx; helpers reciben tx | Cache, llamadas de controller | A/B no cruzan; error al crear snapshot revierte CV; cache invalida post-commit. |
| services/cvAtsService.ts | Contexto de propietario, transacción padre/persistencia/historial; preferir cVAtsAnalysis.create/findMany | Prisma generado, formato JSON/Date | Insert/read cruzado denegado; fallo revierte; mismas salidas y límites. |
| controllers/adminController.ts, routes/admin.ts | Todas las consultas admin conAdminContext y audit en mismo tx | Principal VerifiedAdmin | User no obtiene query; admin vigente opera; revocado no abre tx. |
| app.ts landing | withPublicContext y query key + isPublic true | Policy de acceso público | Ajuste privado ni se lee ni se responde por ruta pública. |
| utils/auditLogger.ts y callers | Writers reciben tx y propagan errores; integrar con cambio audit-required | Todas las mutaciones contextualizadas | Error de audit revierte cambio DB; actor proviene de principal; valores sensibles redactados. |
| utils/monitoring.ts | SELECT 1 puede seguir sin helper solo si no consulta tablas protegidas y rol mínimo lo permite | Privilegios runtime | Health funciona sin ampliar acceso a tablas. |
| schema/migraciones target | Policies, grants, ENABLE/FORCE y revisión de policy residual/huérfanos | PR real, PG target, datos sintéticos | Migración vacía y upgrade aislado; catálogo demuestra policy set previsto. |

## Matriz de cobertura RLS propuesta

Convenciones: uid = NULLIF(current_setting('procv.user_id', true), ''); admin = current_setting('procv.is_admin', true) = 'true'; public_ctx = current_setting('procv.is_public', true) = 'true'. Todas las policies se limitan a TO procv_app. SQL es pseudocódigo, pendiente de ejecutar en PostgreSQL target.

| Tabla | Lectura owner | Insert | Update | Delete | Admin | Público | Sin contexto/huérfanos | USING | WITH CHECK |
|---|---|---|---|---|---|---|---|---|---|
| CV | userId=uid | userId=uid | Owner y check conserva owner | Owner | Todo si admin verificado | No | Sin contexto deny | admin OR "userId"=uid | admin OR "userId"=uid |
| CVVersion | EXISTS CV con id=cvId y userId=uid | cvId no nulo y padre propio | Padre propio y check preserva parent | Owner del padre | Puede leer/borrar huérfanos para cleanup; incluso admin escribe solo con padre existente | No | NULL/orphan no pasa user | admin OR EXISTS (SELECT 1 FROM "CV" c WHERE c."id"="CVVersion"."cvId" AND c."userId"=uid) | "cvId" IS NOT NULL AND (admin OR EXISTS (... parent c.id=cvId AND c.userId=uid)) |
| CVAtsAnalysis | EXISTS parent CV propio | Parent CV propio | Owner padre y check | Owner padre | Todo admin; FK debe exigir padre | No | Sin contexto deny | admin OR EXISTS (SELECT 1 FROM "CV" c WHERE c."id"="CVAtsAnalysis"."cvId" AND c."userId"=uid) | admin OR EXISTS (... CV.id=cvId AND CV.userId=uid) |
| AuditLog | userId=uid | userId=uid | No user | No user | ALL admin | No | Sin contexto deny; userId NULL solo admin | Admin ALL; SELECT user policy userId=uid | Admin CHECK admin; user INSERT CHECK userId=uid; sin policy user UPDATE/DELETE |
| PlatformSetting | No privado para user | No | No | No | ALL admin | isPublic solo public_ctx | Sin contexto deny, también para filas públicas | SELECT: admin OR (public_ctx AND "isPublic"=true); admin policy ALL | Solo admin CHECK admin; no writes públicas |

Todas las columnas/relaciones citadas están en schema disponible. CVVersion.cvId nullable y sin FK; política user debe ocultar null/orphan. Admin puede leer/borrar huérfano para limpiar, pero no insertar/actualizar sin padre bajo este diseño. CVAtsAnalysis.cvId es requerido con relación declarada; confirmar FK final. EXISTS en policy hija se evalúa con RLS de CV; probar grants SELECT y evitar funciones SECURITY DEFINER que eludan policy.

Policies permissive se combinan con OR: una policy amplia heredada puede anular una policy nueva. Inspeccionar pg_policies y reemplazar explícitamente las existentes.

### Roles y privilegios

- procv_app es rol restringido, no login, no owner de tablas, sin superuser/BYPASSRLS.
- procv_login y procv_runtime pueden asumirlo por membership/grant validado en la versión PostgreSQL target; ambos sin superuser, BYPASSRLS, ownership ni DML que les permita evitar la policy.
- Privilegios de tabla mínimos para procv_app; revisar sequences si el schema futuro las introduce. Migrator/owner separado del runtime.
- Aplicar ENABLE + FORCE a las cinco tablas después de policies/grants. FORCE no restringe superuser/BYPASSRLS.
- Verificar current_user/session_user, pg_roles, pg_auth_members, relrowsecurity, relforcerowsecurity, pg_policies y has_table_privilege con roles reales en fixture aislado. No acceder a Neon en esta fase.

## Prioridad 3 — Integridad, auditoría, settings y ATS

- updateCV: parent read + update + snapshot en una tx; WITH CHECK impide cambiar userId.
- deleteCV: owner read + delete en tx; revisar cascade ATS y versión sin FK.
- restore: owner CV + version vinculada al mismo cvId + update en una tx. Decidir si debe guardar snapshot de restauración manteniendo comportamiento.
- ATS: no retener conexión durante análisis CPU pesado; validar CV bajo contexto y persistir con contexto, revalidando consistencia. Reemplazar unsafe raw por tx.cVAtsAnalysis.create/findMany. Si raw necesario, usar query parametrizado tipado. El genérico TypeScript de raw es aserción, no validación runtime.
- Auditoría: funciones writeUserAudit/writeAdminAudit reciben tx; error propaga para acciones que requieren audit. Admin setting update/delete y evento quedan atómicos. Redactar newValue/deletedValue si puede contener secreto. AuditLog.userId nullable: user solo ve/inserta propio; admin maneja global/NULL.
- PlatformSetting público: filtrar isPublic en DB y usar helper explícito public; isPublic nunca autoriza writes.
- Logo: admin-only no equivale a validar contenido; validar bytes/extensión y compensar archivo si falla commit/audit.

## Plan de pruebas y resultados esperados

### Unitarias (mocks; no validan policies)

1. Auth: firma/issuer/audience inválidos y sub/jti ausentes => 401; no handler.
2. Introspección revocada, mismatch, módulo ausente, JSON roto, timeout headers/body => fail-closed.
3. JWT con role admin pero introspección user; role cambiado o sesión revocada => 401/403 y ninguna query admin.
4. Config usa un issuer/audience en ambos middleware; identityUrl separado no cambia issuer.
5. dbContext mock: rol literal, contexto como parámetros, current_user se valida antes callback; identidad ausente no abre tx.
6. Error dentro callback/audit => Promise rechaza; operación se revierte, no se oculta.
7. Servicios pasan tx a todas las queries y no usan Prisma global dentro del callback.
8. Landing consulta key + isPublic=true y nunca serializa valor privado.

Los mocks verifican flujo TS, no RLS ni conexión física.

### Integración PostgreSQL aislado

Crear fixture desechable con sujetos sintéticos A/B/admin, CVs, versiones válidas + cvId NULL/orphan, ATS, AuditLog con owner y NULL, PlatformSetting público/privado. Nunca datos reales.

| Caso | Esperado | Falla si |
|---|---|---|
| A/B lectura CV simétrica | Cada uno ve solo sus CV | Aparece fila ajena |
| A update/delete CV B | Denegado/0 filas y B no cambia | B se altera/desaparece |
| Versiones/restauración cruzadas | A no lee snapshot ni muta CV B | Acceso/modificación cruzada |
| ATS insert/history | CV B no se asocia ni se lee por A | Hijo cross-owner |
| Usuario/admin | User no llama admin; admin vigente ve datos requeridos | User global o admin sin privilegio |
| Sin contexto | Ningún dato protegido ni escritura | CV/hijo/audit/setting privado accesible |
| AuditLog | User solo lee/inserta propio, no update/delete; admin global | Actor spoof/fila ajena |
| Settings | public helper solo isPublic; privado admin; sin contexto deniega todo | Ruta pública recibe privado |
| Commit/rollback/pool | Siguiente tx sin helper no hereda role ni flags | Persiste user/admin |
| Concurrencia | Pool pequeño, A/B sincronizados y Promise.all repetido sin cruces | Una respuesta contiene dato ajeno |
| SQL parámetros ATS | SQL-looking input queda como dato y query shape estable | Input cambia query |
| Roles | login/runtime pueden SET ROLE; ninguno superuser/BYPASS/owner; app tampoco owner/BYPASS | Privilegio excesivo o SET ROLE falla |
| Policies | Cinco tablas ENABLE+FORCE; catálogo coincide; sin policy amplia residual | Falta FORCE o policy abierta |

### Pruebas reales RLS PostgreSQL

Mocks no cuentan. Ejecutar SQL y cliente real bajo procv_login y procv_runtime. Verificar catálogos/privilegios, direct access sin SET ROLE, current_user=procv_app dentro helper y retorno a login role después de commit/rollback. Reutilizar conexión y probar ausencia de herencia; aceptar setting NULL/vacío solo si la policy deniega. Ejecutar A/B concurrente con pool real local.

Intentar en fixture fijar procv.is_admin=true desde procv_app para evidenciar el límite GUC. Si amenaza incluye SQL arbitrario, bloquear la policy hasta definir alternativa no falsificable. Sin Neon/Render.

## Orden de implementación

1. **Auth/admin:** recuperar rama/SHA real; unificar issuer/audience, introspección y rol; tests revocación/cambio rol. Bloquea fases posteriores si contrato Identity es ambiguo.
2. **dbContext:** implementar API/tipo, role check y GUC locales; test real de SET ROLE, ausencia, rollback y cleanup. Requiere membership probado.
3. **Servicios/controllers:** adaptar CV/version/restore/ATS/admin; toda operación acepta tx; conservar filtros explícitos además de RLS.
4. **Auditoría/settings:** misma tx para audit-required; error propaga; settings públicas acotadas; caches post-commit; upload compensado.
5. **Migración/policies:** comparar PR, resolver huérfanos, retirar policy permisiva, roles/grants, ENABLE/FORCE solo fixture.
6. **Aislamiento real:** A/B, admin, absent context, hijos, logs/settings, revocación, cleanup pool y concurrencia.
7. **Validación:** Prisma validate/generate, TS build, lint, unit, integración, migrate desde vacío y fixture upgrade. No depender solo de Actions. Producción/rollout es fase posterior, no autorizada por este blueprint.

## Criterios de aceptación

- Rol admin y sesión se determinan con JWT + introspección común; revocado/cambio de rol no alcanza handler.
- Cada operación de las cinco tablas usa tx contextual adecuada; única excepción explícita es health SELECT 1 sin tabla protegida.
- Subject proviene del middleware, nunca de input; no hay camino alterno para admin.
- Contexto ausente deniega protected rows y writes; público requiere helper; private settings solo admin.
- A/B aislados en CV/hijos/auditoría; admin puede leer solo lo necesario.
- Pool/concurrencia reales no mezclan ni persisten contexto.
- procv_login/runtime pueden SET ROLE procv_app y no son owner/superuser/BYPASSRLS; procv_app tampoco owner/BYPASSRLS.
- Error de audit-required revierte cambio DB; no guardar valores secretos.
- No queda queryRawUnsafe as any en ATS; resultados se prueban idénticos.
- Prisma validate/generate, build, lint, unit, integración y PostgreSQL real pasan o quedan limitaciones concretas documentadas. No afirmar que producción está validada/activada.

## Archivos analizados y pendientes

Cotejo directo: informe preliminar; apps/procv/backend/src/middleware/auth.ts, middleware/admin.ts, config.ts, app.ts, routes/admin.ts, routes/cv.ts, services/cvService.ts, cvAtsService.ts, utils/auditLogger.ts, controllers/adminController.ts; prisma/schema.prisma; migraciones 20261013150000_enable_rls_public_tables, 20261015190000_align_cv_version_schema, 20261013030000_cascade_user_deletes; package.json y package-lock.json. Prisma y @prisma/client fijados en 5.22.0; el tipo TransactionClient aparece en d.ts local. No se ejecutó build.

La fase de implementación debe revisar también prismaClient.ts, cvController.ts, monitoring.ts, tests de auth/admin, todas las migraciones del PR y todas las llamadas Prisma en src/tests. Pendientes ausentes: rama y SHA PR, dbContext.ts, migración RLS y pruebas de integración del PR.

## Bloqueos y estado

Bloqueos: rama/SHA real de PR no disponible; contrato Identity no comprobado; roles/policies PostgreSQL no probados; configuración efectiva Neon/Render no consultada; futuro dbContext debe compilarse y ejecutarse en Prisma 5.22.0.

**Estado: LISTO PARA IMPLEMENTACIÓN en la rama RLS correcta.** Al recuperar el PR, comparar el diff con estas decisiones antes de editar, especialmente: admin/introspección, contexto público explícito, versiones huérfanas, auditoría atómica y falsificabilidad de GUC. No aplicar a la rama ProJobs ni declarar producción validada.
