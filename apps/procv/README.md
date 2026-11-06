# ProCV

ProCV permite crear y editar hojas de vida, evaluar compatibilidad ATS y generar documentos PDF.

## Arquitectura
- Frontend: SPA React + Vite en frontend/.
- Backend: API Express + TypeScript + Prisma en backend/.
- Datos: PostgreSQL en Neon, base procv.
- Identidad: ProIdentity es la autoridad de credenciales, sesiones y permisos.

## Desarrollo
Requisitos: Node.js 20.19 o superior, npm y PostgreSQL local.

Desde la raíz:
```bash
npm install
npm run dev:procv
```

Desde backend:
```bash
npm run build
npm test -- --runInBand
npm run pdf:smoke
npm run pdf:audit
```

Para pruebas RLS de integración, configura una base no productiva y ejecuta npm run test:rls:integration.

## Variables y seguridad
El ejemplo local está en backend/.env.example. La lista de variables y sus reglas productivas están en ../../docs/deployment/ENVIRONMENT_VARIABLES.md.

La aplicación usa DATABASE_URL en runtime. El código prioriza DIRECT_DATABASE_URL si existe; por ello, no dejes la conexión DDL directa configurada en el servicio web. PROCV_ADMIN_DATABASE_URL es una conexión independiente para operaciones administrativas de aplicación, no para migraciones.

PROCV_RLS_CONTEXT_KEY debe coincidir con el verificador v1 provisionado en Neon. No generes ni rotes la clave sin un procedimiento coordinado. Mantén RLS y FORCE RLS, roles runtime restringidos y pruebas de aislamiento.

## Migraciones y producción
Consulta ../../docs/deployment/DATABASE_MIGRATIONS.md y ../../docs/deployment/PRODUCTION_RELEASE.md. No ejecutes migraciones desde el arranque normal del servicio ni uses start:migrate como comando de producción sin aprobación y revisión explícita. El Dockerfile contiene ese comando, pero el procedimiento actual separa DDL del runtime.

## Calidad PDF
El protocolo y resultados históricos están en ../../docs/quality/PROCV_PDF_PAGINATION_QA.md. Los resultados históricos no sustituyen pruebas de una versión posterior.
