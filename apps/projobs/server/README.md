# ProJobs API

API de persistencia y funcionalidades de usuario de ProJobs. El catálogo público se mantiene desacoplado de esta API.

## Responsabilidades
- Proteger rutas de usuario mediante tokens emitidos por ProIdentity.
- Validar emisor, audiencia, expiración y autorización de módulo.
- Persistir datos de usuario en PostgreSQL, base Neon projobs.
- Aplicar aislamiento por usuario mediante RLS y contexto transaccional.

## Desarrollo y validación
```bash
npm run dev
npm run build
npm test
npm start
```

La API usa DATABASE_URL, IDENTITY_JWT_SECRET (JWT_SECRET es fallback de compatibilidad), IDENTITY_URL, IDENTITY_ISSUER, IDENTITY_AUDIENCE y CORS_ORIGIN. Consulta ../../../docs/deployment/ENVIRONMENT_VARIABLES.md. Usa credenciales locales de desarrollo, nunca producción.

## Esquema y migraciones
Los scripts SQL versionados están en sql/. No se usa Prisma ni _prisma_migrations para ProJobs. Revisa el SQL, confirma proyecto/rama/base Neon y prueba en entorno aislado antes de aplicar con administrador temporal. Nunca ejecutes estos scripts en ProCV o ProIdentity.

Después de migrar, verifica FORCE RLS, políticas, grants y que el login runtime no sea propietario ni tenga BYPASSRLS. La existencia de un archivo SQL en Git no demuestra que esté aplicado en producción.

## Seguridad
- No confíes en IDs de usuario enviados por el cliente.
- El contexto de usuario debe proceder del token verificado y establecerse dentro de la transacción.
- No expongas SQL, credenciales ni detalles internos.
- Las búsquedas guardadas no implican notificaciones por correo mientras no exista un worker de entrega validado.

## Producción
Consulta ../../../docs/deployment/DATABASE_MIGRATIONS.md, PRODUCTION_ARCHITECTURE.md y PRODUCTION_RELEASE.md. Verifica el servicio y su AutoDeploy directamente en Render; no asumas que render.yaml representa la infraestructura desplegada.
