# ProSolutions — Despliegue de identidad central y módulos

Esta guía corresponde al monorepo actual. **ProIdentity es la única autoridad de cuentas, credenciales, verificación de correo, recuperación de contraseñas, sesiones y permisos de módulos.** ProCV y ProJobs validan los JWT emitidos por ProIdentity; cada uno conserva sus datos de producto.

## Dominios y contrato común

| Componente | Dominio |
|---|---|
| Portal de acceso | https://prosolutions.page |
| ProIdentity API | https://identity.prosolutions.page |
| ProCV | https://procv.prosolutions.page |
| ProJobs | https://projobs.prosolutions.page |

Los API de ProCV y ProJobs usan este contrato:

- `IDENTITY_ISSUER=https://identity.prosolutions.page`
- `IDENTITY_AUDIENCE=prosolutions-api`
- El secreto de firma configurado en el API del módulo debe ser exactamente el mismo que usa ProIdentity (`IDENTITY_JWT_SECRET` en Identity; los servicios heredados pueden leerlo mediante `JWT_SECRET`).
- Los tokens de acceso viven 15 minutos. El refresh token se mantiene en una cookie `HttpOnly; Secure; SameSite=None; Domain=.prosolutions.page`, nunca en una URL ni en `localStorage`.
- ProCV exige el claim firmado `PROCV`; ProJobs exige `PROJOBS`. Una sesión válida no concede acceso automáticamente a todos los módulos.
- Los clientes de navegador usan únicamente los orígenes propios permitidos. Nunca se añaden callbacks externos arbitrarios al listado.

## 1. Preparación previa

1. Confirmar que la rama revisada pasa CI y que los cuatro servicios relevantes están disponibles en Render.
2. Crear backups recuperables de las dos bases de datos de Supabase: ProIdentity (`wjmgzlrppxamymoxfgvm`) y ProCV (`bfazuuwtltergpnybpzk`). Conservar la fecha, ubicación y resultado de verificación.
3. No pegar contraseñas de bases de datos, claves `service_role`, claves JWT ni secretos SMTP en tickets o mensajes.
4. Verificar que la variable de entorno `DATABASE_URL` de la utilidad de corte apunte a ProIdentity, y `PROCV_DATABASE_URL` a ProCV mediante la conexión PostgreSQL directa (puerto 5432) para operaciones DDL.

## 2. Migración de ProCV a una referencia central de identidad

Históricamente, ProCV mantenía `User`, `Session`, `EmailVerificationToken` y `PasswordResetToken`. Esas tablas ya no forman parte del modelo activo, pero **no se eliminan antes de mapear los propietarios de los CV a los IDs reales de ProIdentity**. El script `apps/identity/scripts/migrate-procv-identity-boundary.ts` implementa un corte en dos fases.

### Fase A — comprobar y preparar

Desde la raíz del monorepo, con ambas conexiones disponibles solo en el entorno seguro de operaciones:

```bash
npm run procv:identity:dry-run --workspace=apps/identity
```

El dry-run debe detectar todos los usuarios legacy y asociarlos por correo normalizado con una cuenta de ProIdentity, sin exponer esos correos en los logs. Si hay cuentas sin correspondencia o propietarios desconocidos, se aborta y se resuelve el mapeo antes de continuar.

Primero aplica la migración de esquema de ProCV sobre su conexión directa:

```bash
DATABASE_URL="$PROCV_DATABASE_URL" npm run prisma:migrate:deploy --workspace=apps/procv/backend
```

Luego corre el mapeo conservando las tablas heredadas como rollback temporal:

```bash
npm run procv:identity:prepare --workspace=apps/identity
```

La fase de preparación:
- Crea `IdentityAccount`, que solo contiene el ID del sujeto de ProIdentity y marcas de tiempo.
- Remapea `CV.userId` a los IDs centrales sin cambiar los IDs ni el contenido de CV, versiones o análisis ATS.
- Conserva los registros y ajusta la atribución de auditoría.
- No borra todavía las cuentas, sesiones ni tokens locales antiguos.

### Fase B — desplegar y validar

Desplegar la rama revisada a Render. El backend nuevo de ProCV exige que exista `IdentityAccount`; por eso la preparación de la base de datos debe completarse primero.

Verificar:
- `GET /health` de ProIdentity y del backend de ProCV.
- Registro/verificación, login, renovación y logout mediante ProIdentity.
- Acceso a ProCV con un token que tenga `PROCV`, y respuesta `403` para un token válido sin dicho permiso.
- Acceso a ProJobs con `PROJOBS`; la navegación pública de empleos sigue siendo anónima.
- Crear, editar, guardar y volver a abrir un CV; conservar versiones e informes ATS.
- Panel de ProCV con métricas de producto y control de módulos mediante la API central.
- Correo real de verificación y recuperación, con una cuenta de prueba controlada.

### Fase C — retirar el esquema de autenticación antiguo

Solo después de que el backend y frontend nuevos estén saludables y se hayan validado los datos:

```bash
npm run procv:identity:finalize:dry-run --workspace=apps/identity
```

Si la simulación confirma que no hay CV huérfanos ni dependencias foráneas al usuario legacy, ejecutar:

```bash
npm run procv:identity:finalize --workspace=apps/identity
```

La finalización elimina exclusivamente las tablas locales de autenticación (`User`, `Session`, `EmailVerificationToken`, `PasswordResetToken`). **Conserva** `_conn_test` y cualquier tabla de diagnóstico, además de `CV`, `CVVersion`, `CVAtsAnalysis`, `PlatformSetting` y el historial de auditoría. Si cualquier precondición falla, no se debe forzar el borrado.

## 3. Comprobación de permisos de módulos

ProIdentity mantiene el catálogo central `ModuleAccess` con estado y vencimiento. Alta de una nueva cuenta crea los permisos iniciales configurados; login y refresh solo leen permisos activos y **no deben reactivar permisos revocados**.

La administración se realiza desde la API central `/api/modules`:
- `GET /api/modules/me`: permisos de la cuenta actual.
- `GET /api/modules/users`: listado paginado para administradores.
- `POST /api/modules/grant` y `POST /api/modules/revoke`: operaciones de administración auditadas, con validación de módulo y protección CSRF.

Después de revocar un permiso, un access token ya emitido puede seguir siendo aceptado hasta que expire (máximo 15 minutos) porque el token es autocontenido. Las operaciones que necesiten revocación inmediata deben consultar el estado de sesión/permisos en vivo.

## 4. Protección de bases de datos

ProCV y ProIdentity se conectan a PostgreSQL desde el backend. Los navegadores no consultan estas tablas directamente mediante Supabase Data API. Por tanto:
- RLS se mantiene habilitado como defensa en profundidad.
- `anon` y `authenticated` no reciben permisos directos sobre tablas/sequence de estos esquemas.
- Los secretos permanecen en Render o en el entorno operativo privado.
- No se crean políticas amplias de RLS ni grants de cliente para resolver errores del backend.

## 5. Criterios de cierre

- [ ] CI aprobado para ProCV, ProIdentity, Core y ProJobs.
- [ ] Preparación de datos hecha con mapeo completo y copias de seguridad verificadas.
- [ ] Render está saludable y los logs no muestran errores de esquema/Prisma.
- [ ] Flujos de login, verificación, renovación, cierre y recuperación validados en navegador.
- [ ] Revisión de los permisos `PROCV` y `PROJOBS` y comportamiento 401/403.
- [ ] Conteos de CV, versiones ATS y settings comparados antes/después.
- [ ] Simulación de finalización limpia; luego retirada de tablas legacy.
- [ ] Confirmación final de que ProCV ya no depende de usuarios o sesiones locales.
