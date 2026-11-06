# ProCV

ProCV permite crear y editar hojas de vida, evaluar su compatibilidad con sistemas ATS y generar documentos PDF a partir de plantillas.

## Arquitectura

```text
apps/procv/
├── frontend/   # SPA React + Vite
├── backend/    # API Express + Prisma
└── scripts/    # Orquestación local
```

Frontend y backend son aplicaciones separadas. El backend gestiona datos de CV, análisis y generación PDF; la identidad y las sesiones son responsabilidad de ProIdentity. PostgreSQL es la persistencia; el esquema y las migraciones están en `backend/prisma/`.

## Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS y Zustand.
- Backend: Node.js, Express, TypeScript y Prisma.
- Documentos: Puppeteer y utilidades de parsing.
- Pruebas backend: Jest; existen pruebas de integración específicas para RLS.

## Requisitos y configuración
- Node.js 20.19 o superior para backend.
- npm y PostgreSQL/Neon para persistencia local.
- Configuración basada en los archivos `.env.example` disponibles. Mantén secretos fuera del repositorio.

Consulta `backend/src/config.ts` y el código del frontend para identificar las variables vigentes. No reutilices configuraciones heredadas de Supabase ni nombres de variables de despliegues anteriores.

## Desarrollo

Desde la raíz:

```bash
npm install
npm run dev:procv
```

Desde esta carpeta:

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
```

## Build y pruebas

Desde la raíz: `npm run build:procv`.

Desde `apps/procv/backend`:

```bash
npm run build
npm test -- --runInBand
npm run pdf:smoke
npm run pdf:audit
```

Para pruebas de aislamiento RLS en una base de datos de integración configurada: `npm run test:rls:integration`. No ejecutes pruebas ni migraciones contra producción salvo que el procedimiento de release lo requiera y exista autorización explícita.

## Datos y seguridad
- La identidad y las sesiones son responsabilidad de ProIdentity.
- Verifica credenciales y autorización en el servidor antes de acceder a datos personales.
- Mantén RLS habilitado y prueba el aislamiento entre usuarios.
- Usa roles runtime con privilegios mínimos; no conectes la aplicación como propietario de esquema.
- Aplica migraciones con el rol DDL y la conexión directa documentados para el entorno.
- No expongas secretos, datos de CV ni tokens en logs.

## Calidad PDF

El protocolo y los resultados históricos de paginación se conservan en [`docs/quality/PROCV_PDF_PAGINATION_QA.md`](../../docs/quality/PROCV_PDF_PAGINATION_QA.md). Los resultados anteriores no sustituyen la validación de cambios posteriores.

## Despliegue

La definición declarativa de servicios está en `render.yaml`. Revisa los servicios y sus opciones `autoDeploy` antes de integrar cambios en `main`. Consulta [el índice de documentación](../../docs/README.md) para la documentación transversal. Las notas heredadas de Supabase están archivadas y no son procedimientos operativos actuales.
