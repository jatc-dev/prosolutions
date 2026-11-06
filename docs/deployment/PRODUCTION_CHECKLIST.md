# Aviso: procedimiento histórico sustituido

> **NO EJECUTAR ESTE DOCUMENTO COMO PROCEDIMIENTO DE PRODUCCIÓN.**

Este checklist describía una transición anterior basada en Supabase, una migración de usuarios y despliegues manuales que ya no representan el procedimiento operativo actual.

Desde la adopción de Neon y la separación de los servicios, las instrucciones activas están en:

1. [Arquitectura operativa](PRODUCTION_ARCHITECTURE.md)
2. [Migraciones de bases de datos](DATABASE_MIGRATIONS.md)
3. [Variables de entorno](ENVIRONMENT_VARIABLES.md)
4. [Release de producción](PRODUCTION_RELEASE.md)

El material heredado sobre Supabase se conserva como referencia histórica en [docs/archive/PROCV_LEGACY_SUPABASE_DEPLOYMENT_NOTES.md](../archive/PROCV_LEGACY_SUPABASE_DEPLOYMENT_NOTES.md). No contiene comandos válidos para desplegar ni migrar la infraestructura actual.

**Prohibido inferir de este documento** que se debe crear otro servicio, cambiar dominios/cookies, migrar usuarios o ejecutar comandos Prisma en producción.
