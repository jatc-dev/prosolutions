# ProJobs

ProJobs combina un catálogo público de oportunidades laborales con una API para funcionalidades personales autenticadas.

## Componentes
- Catálogo web estático en este módulo.
- API Node.js/Express en server/.
- Persistencia PostgreSQL en Neon, base projobs.
- ProIdentity como autoridad de autenticación.

## Desarrollo
Desde la raíz:
```bash
npm install
npm run dev:projobs
```

Para validar la API:
```bash
cd apps/projobs/server
npm run build
npm test
```

## Persistencia y seguridad
El esquema SQL versionado está en server/sql/. No existe un historial Prisma para ProJobs. Ejecuta los scripts únicamente en la base projobs, nunca en procv o proidentity. El rol runtime debe ser restringido, no propietario de tablas y sin BYPASSRLS. Mantén FORCE RLS y prueba aislamiento por usuario.

La API valida tokens de ProIdentity. Las variables activas del código están descritas en ../../docs/deployment/ENVIRONMENT_VARIABLES.md.

## Despliegue
La configuración real debe verificarse en Render antes de cada release. En la observación del 2026-11-06, ProJobs Frontend tenía AutoDeploy activo y ProJobs API no. El manifiesto render.yaml no refleja fielmente la configuración actual; no usar Blueprint Sync para cambiar los servicios. Consulta ../../docs/deployment/PRODUCTION_ARCHITECTURE.md y ../../docs/deployment/PRODUCTION_RELEASE.md.
