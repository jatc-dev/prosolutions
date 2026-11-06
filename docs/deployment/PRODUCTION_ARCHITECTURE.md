# ProSolutions — Arquitectura operativa de producción

**Estado:** inventario documental de referencia  
**Verificado:** 2026-11-06  
**Alcance:** servicios Render y bases Neon observados en la auditoría. No es una orden de despliegue ni sustituye la consola del proveedor.

## Regla de autoridad

La configuración efectiva de cada servicio en Render y la rama de producción de Neon son la fuente de verdad operativa. El archivo render.yaml del repositorio NO está sincronizado con los servicios existentes y no debe aplicarse mediante Blueprint Sync ni usarse para recrearlos hasta completar una reconciliación aprobada.

Los nombres, runtimes, comandos y valores del proveedor pueden cambiar. Antes de cada release, volver a consultar Render; no inferir el estado actual a partir de este documento.

## Componentes

| Módulo | Responsabilidad | Persistencia |
|---|---|---|
| ProIdentity | Identidad, credenciales, sesiones y permisos de módulo | Neon, base proidentity |
| ProCV | CV, versiones, análisis ATS y PDF | Neon, base procv |
| ProJobs | Catálogo y API de datos personales | Neon, base projobs |
| Core | Portal web y navegación entre módulos | Static site |

Neon proyecto operativo observado: Prosolutions.page. Rama operativa observada: production. Bases observadas: proidentity, procv y projobs (además de neondb). No confundir una rama de Neon con una rama Git.

## Servicios Render observados

Todos los servicios consultados estaban conectados a la rama Git main.

| Servicio lógico | Runtime observado | AutoDeploy observado |
|---|---|---|
| Core / portal | Static | Sí |
| ProCV Frontend | Static | Sí |
| ProCV Backend | Node nativo | Sí |
| ProIdentity | Docker | Sí |
| ProJobs Frontend | Static | Sí |
| ProJobs API | Node nativo | No |

Esta tabla registra la observación del 2026-11-06. No copies estos valores a otro servicio sin volver a verificarlos. En particular, el manifiesto render.yaml difiere en runtime y/o autoDeploy para varios servicios.

## Consecuencias para los releases

- Un commit en main puede iniciar despliegues automáticos de Core, ProCV Frontend, ProCV Backend, ProIdentity y ProJobs Frontend.
- ProJobs API no tenía autoDeploy activo en la consulta; su publicación requiere acción explícita en Render.
- Un cambio solo documental también puede iniciar los despliegues automáticos anteriores.
- No ejecutar Blueprint Sync ni cambiar runtime, root directory, build/start command, health check o dominio para “alinear” servicios con render.yaml.
- No usar Dockerfiles como prueba del comando de arranque efectivo cuando Render ejecuta un runtime nativo.

## Endpoints y health checks

Usa los dominios personalizados actualmente configurados en Render. Confirma cada dominio y su health check en el panel del servicio antes del release. No cambies DNS ni dominios como parte de una actualización documental.

## Fuente de verdad de configuración

1. Render: runtime, root directory, build/start command, health check, autoDeploy, domains y environment variables configuradas.
2. Neon: proyecto, rama, base, roles y estado real del esquema.
3. Git: código, Dockerfiles, scripts, Prisma schema/migrations y SQL versionado.
4. Esta documentación: procedimiento para comparar las fuentes anteriores, no reemplazo de ellas.

## Restricciones de seguridad

- Nunca guardar secretos, contraseñas, tokens ni connection strings en Git.
- Nunca compartir valores secretos en informes ni chats.
- Los servicios runtime usan roles de privilegios mínimos; no usar propietario de base, superuser ni BYPASSRLS.
- Las migraciones DDL y tareas administrativas se ejecutan fuera del proceso runtime.
- No tocar ProIdentity, ProCV o ProJobs productivos sin autorización específica y plan de rollback.
