# ProSolutions — Procedimiento de migraciones de bases de datos

**Estado:** procedimiento operativo controlado  
**Verificado contra repositorio y Neon:** 2026-11-06  
**Regla:** una migración es una operación administrativa separada del despliegue de la aplicación.

## Inventario

| Módulo | Base Neon | Sistema de migración en repositorio |
|---|---|---|
| ProIdentity | proidentity | Prisma, apps/identity/prisma/migrations |
| ProCV | procv | Prisma, apps/procv/backend/prisma/migrations |
| ProJobs | projobs | SQL versionado, apps/projobs/server/sql |

No ejecutar Prisma en ProJobs. No ejecutar SQL de ProJobs en las bases ProCV o ProIdentity.

## Reglas obligatorias antes de cualquier migración

1. Obtener autorización explícita para la base productiva y el cambio concreto.
2. Confirmar proyecto Neon, rama production y nombre de base. No asumir que el nombre de una rama Git equivale a una rama Neon.
3. Confirmar backup/PITR disponible y acordar ventana de cambio.
4. Revisar el diff del SQL o de la migración Prisma; identificar locks, cambios destructivos, backfills y compatibilidad con la versión desplegada.
5. Verificar el estado actual de esquema e historial en la base destino.
6. Preparar y probar en una rama Neon aislada o entorno no productivo equivalente.
7. Usar una conexión directa (no pooler) y un rol DDL autorizado, temporal y auditado.
8. No usar credenciales runtime, login de aplicación, ni roles RLS para DDL.
9. Aplicar una migración a la vez; comprobar resultado antes de continuar.
10. Desplegar el código compatible después de que el esquema requerido esté validado.
11. Ejecutar smoke tests y comprobaciones de aislamiento.
12. Registrar commit, migración, base, rama, hora, ejecutor, resultado y plan de recuperación sin incluir secretos.

Nunca ejecutar migrate dev contra producción. Nunca ejecutar migrate resolve o modificar _prisma_migrations para silenciar un error sin verificar primero qué SQL llegó a ejecutarse y cuál es el estado físico del esquema.

## ProCV — Prisma y RLS

Rutas: apps/procv/backend/prisma/schema.prisma y apps/procv/backend/prisma/migrations/.

### Conexiones y roles

- DATABASE_URL es la conexión que el backend usa en runtime. Debe corresponder al login runtime autorizado (por ejemplo, procv_runtime) y no al propietario de tablas.
- El código de configuración de ProCV prioriza DIRECT_DATABASE_URL sobre DATABASE_URL cuando ambas variables están presentes. Por tanto, NO dejar DIRECT_DATABASE_URL configurada en el servicio runtime como si fuera una variable inocua: podría hacer que la aplicación utilice esa conexión.
- Para una operación de migración, inyectar DIRECT_DATABASE_URL solo en el proceso/tarea administrativa puntual y mapearla a DATABASE_URL para Prisma. No persistirla en el servicio runtime.
- PROCV_ADMIN_DATABASE_URL es una conexión separada para operaciones de aplicación privilegiadas mediante procv_admin_login/procv_admin_app. No es la conexión DDL de migraciones.
- PROCV_RLS_CONTEXT_KEY debe ser exactamente una clave hexadecimal de 64 caracteres (32 bytes), y debe corresponder al verificador de key id v1 provisionado en procv_private.context_signing_keys. No generar otra clave ni reemplazar el verificador como parte de una migración ordinaria.
- procv_login/procv_runtime y procv_admin_login no son roles DDL. No usar roles runtime para cambios de esquema.

### Secuencia Prisma

Desde apps/procv/backend, en un entorno controlado con DATABASE_URL apuntando temporalmente a la conexión DDL directa autorizada:

1. npx prisma migrate status
2. Comparar cada migración pendiente con el esquema real.
3. Ejecutar npx prisma migrate deploy solo después de la aprobación de la migración.
4. Ejecutar npx prisma migrate status nuevamente.
5. Comprobar RLS y FORCE ROW LEVEL SECURITY en las tablas sensibles, roles, memberships y funciones de contexto.
6. Ejecutar pruebas RLS de integración con identidades de prueba distintas.

La tabla _prisma_migrations observada en producción contenía migraciones aplicadas y registros de intentos revertidos. Ese hecho exige inspección; no autoriza a ejecutar migrate resolve automáticamente. La revisión del 2026-11-06 observó además las migraciones RLS y de integridad registradas como completadas. Repetir la comprobación antes de cualquier cambio.

El script start:migrate del backend ejecuta prisma migrate deploy durante el arranque Docker. No usarlo como mecanismo normal de despliegue ni cambiar el servicio Render a Docker para activarlo. El arranque productivo debe usar el comando verificado en Render y no ejecutar DDL.

## ProIdentity — Prisma

Ruta: apps/identity/prisma/migrations/.

- Runtime utiliza DATABASE_URL; el código de configuración no selecciona DIRECT_DATABASE_URL.
- La conexión DDL directa debe suministrarse solo al proceso administrativo puntual, asignándola a DATABASE_URL para la ejecución Prisma.
- Ejecutar npx prisma migrate status, revisar SQL y aplicar npx prisma migrate deploy con el rol DDL autorizado.
- Verificar estado y smoke tests de login, refresh, logout, verificación de correo y permisos de módulo.
- No ejecutar migrate resolve --rolled-back por una referencia histórica o por P3009 sin inspeccionar la migración fallida y verificar sus efectos.
- El Dockerfile actual termina ejecutando node dist/index.js; no ejecuta migraciones al iniciar. Mantener ese comportamiento.

La lectura de Neon del 2026-11-06 encontró dos registros Prisma completados en proidentity. Esto es una fotografía histórica, no garantía de que la rama o historial sigan iguales.

## ProJobs — SQL

Scripts versionados en apps/projobs/server/sql/. No existe tabla _prisma_migrations en la base projobs observada; esto es esperado para el mecanismo SQL actual.

- Leer el script completo y revisar si es idempotente, transaccional y compatible con datos existentes.
- Aplicar exclusivamente en la base projobs y en la rama production, con un administrador temporal.
- Confirmar el rol runtime y membresías esperadas (por ejemplo, projobs_api y login restringido); runtime no debe ser propietario ni tener BYPASSRLS.
- Verificar ENABLE ROW LEVEL SECURITY y FORCE ROW LEVEL SECURITY, políticas, grants y aislamiento por usuario.
- Registrar cada script aplicado en el registro de cambios operativo. No inferir que un archivo SQL fue aplicado porque existe en Git.

## Recuperación

- Preferir migraciones correctivas hacia delante cuando la operación sea reversible solo parcialmente.
- Restaurar snapshot/PITR requiere aprobación, evaluación de pérdida de datos y coordinación de corte.
- No borrar tablas, roles, ramas ni historial para “limpiar” una migración.
- No revertir manualmente filas de _prisma_migrations sin procedimiento específico y evidencia.
- Tras recuperar, validar integridad referencial, conteos, permisos, RLS y operaciones funcionales.

## Estado no certificado

Este documento no afirma que todas las migraciones de Git estén reconciliadas con producción. La auditoría consultó tablas de historial y roles, pero no ejecutó prisma migrate status desde los tres proyectos ni comparó exhaustivamente cada definición SQL con producción. Esos pasos son precondición de la siguiente migración, no tareas que deban hacerse automáticamente ahora.
