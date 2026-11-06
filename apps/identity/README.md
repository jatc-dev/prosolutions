# ProIdentity — Servicio de identidad

ProIdentity es el servicio central de autenticación y gestión de identidad de ProSolutions. Emite y valida credenciales de sesión utilizadas por los módulos autorizados del ecosistema.

## Stack
- Node.js y Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT y cookies seguras para sesiones web
- Jest y pruebas de regresión con Node.js

## Desarrollo local

Desde la raíz:

```bash
npm install
npm run dev:identity
```

O desde esta carpeta:

```bash
npm run dev
```

El servicio necesita las variables de entorno definidas en [`.env.example`](.env.example). Configura valores locales y una base de datos de desarrollo; nunca reutilices credenciales productivas.

## Comandos

```bash
npm run build
npm test
npm run test:regression
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
```

- `prisma:migrate` crea migraciones en desarrollo.
- `prisma:migrate:deploy` aplica migraciones existentes al entorno configurado. Confirma la URL y el entorno antes de ejecutarlo.
- `test:regression` ejecuta pruebas de regresión con Node.js.

## Seguridad y operación

- ProIdentity es la autoridad de identidad; los módulos consumidores deben validar firma, emisor, audiencia, expiración y permisos de módulo.
- Mantén las claves JWT y las conexiones de base de datos fuera del frontend y del control de versiones.
- Aplica cambios de esquema mediante migraciones revisadas y versionadas.
- No eleves el rol de runtime a propietario de tablas ni habilites bypass de RLS para resolver errores de autorización.
- No registres tokens, contraseñas ni datos personales en logs.

## Validación

Para cambios de autenticación, sesiones, cookies o autorización, el build por sí solo no es suficiente: ejecuta las pruebas unitarias, de regresión y los escenarios de integración afectados.
