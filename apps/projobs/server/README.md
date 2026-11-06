# ProJobs API

API de persistencia y funcionalidades de usuario de ProJobs. El catálogo público de ofertas se mantiene desacoplado de esta API.

## Responsabilidades
- Proteger rutas de usuario mediante tokens emitidos por ProIdentity.
- Validar emisor, audiencia, expiración y autorización de módulo.
- Persistir datos propios de ProJobs en PostgreSQL.
- Aplicar aislamiento por usuario mediante RLS y contexto transaccional verificado.

## Desarrollo

Desde la raíz: `npm install` y `npm run dev:projobs`.

Desde esta carpeta:

```bash
npm run dev
npm run build
npm test
npm start
```

La API requiere `DATABASE_URL` y la configuración de validación de identidad definida en el código. Usa una base de datos de desarrollo y secretos locales.

## Modelo de seguridad
- Usa un rol de conexión dedicado, sin propiedad de tablas ni `BYPASSRLS`.
- El contexto de usuario se obtiene del token verificado, no de parámetros libres de la petición.
- Establece el contexto dentro de la transacción para evitar contaminación entre conexiones del pool.
- Mantén las políticas RLS y las pruebas de aislamiento como controles obligatorios.
- Devuelve errores genéricos al cliente; no expongas SQL, credenciales ni detalles internos.

## Esquema y migraciones

Los scripts SQL versionados están en `sql/`. Antes de aplicar una migración, confirma la base de datos destino, revisa el SQL y valida su impacto. Nunca apliques scripts de ProJobs en las bases de ProCV o ProIdentity.

## Funcionalidades y límites

Las operaciones disponibles se definen en `src/`. Los estados de postulación son datos declarados por el usuario, no confirmaciones de empleadores. Las búsquedas guardadas no deben describirse como notificaciones por correo mientras no exista un worker de entrega independiente.

## Validación

```bash
npm run build
npm test
```

Las pruebas locales no sustituyen un smoke test autenticado y una verificación de aislamiento contra una base de integración.
