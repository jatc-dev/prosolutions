# Aviso: procedimiento histórico sustituido

> **NO EJECUTAR ESTE DOCUMENTO COMO PROCEDIMIENTO DE PRODUCCIÓN.**

Este checklist describía una transición anterior basada en Supabase, una migración de usuarios y despliegues manuales que ya no representan el procedimiento operativo actual.

Desde la adopción de Neon y la separación de los servicios, las instrucciones activas están en:

1. [Arquitectura operativa](PRODUCTION_ARCHITECTURE.md)
2. [Migraciones de bases de datos](DATABASE_MIGRATIONS.md)
3. [Variables de entorno](ENVIRONMENT_VARIABLES.md)
4. [Release de producción](PRODUCTION_RELEASE.md)

La plataforma ya no usa Supabase; el material heredado se eliminó del repositorio (sigue disponible en el historial de git).

**Prohibido inferir de este documento** que se debe crear otro servicio, cambiar dominios/cookies, migrar usuarios o ejecutar comandos Prisma en producción.
