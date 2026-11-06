# ProSolutions — Procedimiento de release de producción

**Estado:** procedimiento controlado  
**Verificado:** 2026-11-06

## Objetivo

Publicar cambios compatibles sin mezclar cambios de esquema con el arranque de servicios. Cada release debe tener un commit identificable, pruebas reproducibles, autorización y una vía de recuperación.

## Fase 1 — Preparación

- Confirmar que main contiene exactamente los cambios aprobados.
- Revisar diff y detectar cambios en apps/identity, apps/procv, apps/projobs, render.yaml, migraciones, Dockerfiles y variables.
- Revisar dependencias, build, pruebas unitarias y pruebas de integración pertinentes.
- Confirmar en Render runtime, root directory, build/start commands, health check, branch y autoDeploy para cada servicio afectado.
- Consultar docs/deployment/PRODUCTION_ARCHITECTURE.md y no usar render.yaml como configuración real.
- Preparar plan de rollback y comprobar backup/PITR si se altera base de datos.

## Fase 2 — Cambios de esquema (solo si aplica)

1. Seguir DATABASE_MIGRATIONS.md para el módulo correspondiente.
2. Probar la migración fuera de producción.
3. Obtener aprobación explícita para aplicar en Neon production.
4. Ejecutar la migración en tarea administrativa independiente, con conexión directa y rol DDL temporal.
5. Verificar historial, esquema, grants, RLS y datos.
6. No desplegar la aplicación si la migración no queda validada.
7. No incluir credenciales administrativas en el servicio web.

Si no hay migración, documentar expresamente “sin cambios de esquema”.

## Fase 3 — Despliegue

- Los servicios Core, ProCV Frontend, ProCV Backend, ProIdentity y ProJobs Frontend tenían AutoDeploy activo en la observación del 2026-11-06.
- ProJobs API tenía AutoDeploy desactivado en esa misma observación.
- Antes de hacer push a main, identificar qué servicios pueden reconstruirse por AutoDeploy, incluso en cambios solo documentales.
- No ejecutar Blueprint Sync ni modificar la forma de ejecución para coincidir con render.yaml.
- Para ProJobs API, realizar deploy manual solo cuando el release aprobado incluya ese servicio.
- No activar despliegues manuales en módulos no incluidos en el alcance.

## Fase 4 — Verificación posterior

Por cada servicio desplegado:
- Confirmar deploy ID, commit, estado live y logs sin errores de arranque.
- Comprobar health endpoint configurado.
- Verificar login, refresh, logout y autorización de módulos cuando el cambio afecte Identity.
- Verificar operaciones CV, generación PDF y aislamiento RLS cuando afecte ProCV.
- Verificar catálogo, persistencia de datos personales y aislamiento RLS cuando afecte ProJobs.
- Confirmar que no hay errores 5xx, migraciones inesperadas ni credenciales expuestas.
- Registrar evidencia, hora, versión y resultado.

Una respuesta HTTP 200 en health no demuestra por sí sola autenticación, persistencia o aislamiento correctos.

## Fase 5 — Rollback

- Si falla el build antes del deploy, detener la publicación.
- Si falla el servicio después del deploy, revertir al deploy anterior desde Render o revertir el commit con un nuevo commit, según el caso.
- No usar force-push como rollback rutinario.
- No asumir que revertir código revierte el esquema de base de datos.
- Para cambios de esquema, usar corrección hacia delante o restauración aprobada conforme al plan de datos.
- Volver a ejecutar smoke tests y verificar RLS tras la recuperación.

## Registro obligatorio del release

Commit SHA; servicios incluidos; deploy IDs; cambios de esquema; base y rama Neon; responsable; aprobación; smoke tests; incidencias; resultado y decisión final.
