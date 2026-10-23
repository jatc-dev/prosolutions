# Evaluación de plataformas de datos para ProSolutions

**Fecha de revisión:** 2026-10-23  
**Estado:** evaluación preliminar; no se han creado recursos externos ni cambiado producción.

## 1. Objetivo y restricciones

Seleccionar una opción de persistencia para ProJobs y futuros módulos que:
- mantenga el coste recurrente en USD 0 mientras el uso quepa en el nivel gratuito;
- conserve ProIdentity como autoridad central de identidad y autorización;
- reduzca el acoplamiento entre ProCV y ProJobs;
- permita exportar los datos y migrar a PostgreSQL estándar;
- tenga límites gratuitos explícitos y un comportamiento seguro al agotarlos;
- no requiera borrar, pausar ni pagar por los proyectos Supabase actuales.

## 2. Hallazgos del monorepo

Revisado en GitHub el estado de `main` y la rama `feat/projobs-persistence-foundation` (PR #53):
- `apps/procv/backend/prisma/schema.prisma` ya usa PostgreSQL con Prisma.
- `apps/identity` también usa Prisma y PostgreSQL, pero su base de datos debe seguir separada y ser la autoridad de identidad.
- ProJobs mantiene un catálogo estático; el PR #53 propone una API Express separada para favoritos e historial de redirecciones.
- El adaptador del PR #53 usa Supabase REST con `PROJOBS_SUPABASE_SERVICE_ROLE_KEY`. Esa clave tiene privilegios amplios y no se debe reutilizar contra la base de ProCV.
- El esquema SQL propuesto en el PR #53 está pensado para un proyecto dedicado de Supabase, no para aplicarse tal cual a la base de ProCV.
- `apps/projobs/server/package.json` todavía no declara `pg` ni `@types/pg`; el lockfile debe actualizarse de forma coherente si se escoge el cliente PostgreSQL.
- La rama del PR #53 continúa sin integrar y no debe desplegarse ni habilitarse persistencia en producción antes de completar la revisión de seguridad y las pruebas.

## 3. Matriz de decisión preliminar

Escala cualitativa: **Alta / Media / Baja**. No es una puntuación de rendimiento medido; representa ajuste arquitectónico según el código inspeccionado.

| Criterio | Neon PostgreSQL | Prisma Postgres | Supabase, esquema `projobs` separado en ProCV | Cloudflare D1 |
|---|---|---|---|---|
| Mantener SQL PostgreSQL estándar | Alta | Alta | Alta | Baja (SQLite) |
| Base de datos separada para ProJobs | Alta | Alta | Baja: comparte la DB de ProCV | Alta |
| Reutilizar Node.js/Express y consultas SQL | Alta | Alta | Alta | Media: requiere adaptar driver/modelo |
| Separar el riesgo de datos entre módulos | Alta a nivel de DB/proyecto | Alta a nivel de DB/proyecto | Media; misma DB y recursos | Alta a nivel de DB |
| Cambios necesarios para la prueba | Bajos | Bajos | Bajos a medios; permisos y schema | Medios a altos |
| Cuota gratuita publicada (verificar antes de crear) | 1 GB por proyecto, 100 CU-horas/proyecto/mes y 5 GB de transferencia/proyecto/mes | 200.000 operaciones/mes, 500 MB y 50 bases de datos | Supabase Free publica 500 MB de DB y máximo 2 proyectos activos | 5 GB total, 5 millones de filas leídas/día y 100.000 escritas/día |
| Riesgo principal | Escala a cero y suspensión al agotar cuota | El contador de operaciones y el límite detienen lecturas/escrituras al agotarse | ProCV y ProJobs comparten infraestructura y recursos | Diferencias SQLite/PostgreSQL y límites diarios |
| Ajuste preliminar a ProSolutions | Candidato principal para PoC | Candidato principal para PoC | Alternativa de menor cambio, con aislamiento menor | Alternativa si se acepta cambiar arquitectura |

### Referencias oficiales de planes

- Neon: https://neon.com/pricing y https://neon.com/blog/neon-free-plan-1-gb-per-project
- Prisma: https://www.prisma.io/pricing y https://www.prisma.io/docs/postgres/faq
- Supabase: https://supabase.com/pricing
- Cloudflare D1: https://developers.cloudflare.com/d1/ y https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/

Las cuotas pueden cambiar. Confirmar las páginas oficiales inmediatamente antes de crear cualquier recurso. No se debe introducir una tarjeta ni habilitar facturación para esta prueba.

## 4. Decisión de prueba propuesta

Comparar Neon y Prisma Postgres con el mismo esquema SQL y el mismo backend Express. No migrar ProCV ni ProIdentity durante esta evaluación.

- **Neon:** crear un proyecto gratuito independiente de prueba para ProJobs, solo después de confirmar que la creación no solicita pago ni activa facturación.
- **Prisma Postgres:** crear una base gratuita de prueba, solo después de verificar los límites y que el flujo no puede incurrir en cargos.
- **Supabase con esquema separado:** mantener como opción de reserva; no aplicar migraciones en la base de ProCV durante la PoC.
- **Cloudflare D1:** no probar inicialmente, porque implicaría cambiar de PostgreSQL a SQLite y añadir cambios que no hacen falta para evaluar la separación de datos.

Si no es posible crear un recurso gratuito sin activar facturación, detener esa rama de la prueba y documentar el bloqueo; no usar otra cuenta, pausar proyectos existentes ni sustituir el límite por una suscripción.

## 5. Diseño de la PoC

Usar un conjunto sintético de datos, nunca datos reales de usuarios:
- tablas de favoritos y actividad de redirección a la página del empleador;
- índices y restricciones de unicidad para evitar duplicados;
- identificador de usuario derivado exclusivamente del JWT validado por ProIdentity;
- consultas parametrizadas;
- rol/credenciales limitados a la base de ProJobs, sin permisos sobre ProCV o ProIdentity;
- secretos solo en variables del servidor, nunca en frontend ni en repositorio.

Para la PoC con PostgreSQL, usar el driver `pg` (o Prisma si se decide medir específicamente Prisma ORM) y un `DATABASE_URL` de la base ProJobs. La opción elegida debe permitir migraciones versionadas y exportación SQL estándar.

### Pruebas obligatorias

1. Guardar, listar y eliminar un favorito.
2. Registrar una redirección externa y describirla como actividad registrada, nunca como una postulación confirmada por el empleador.
3. Comprobar que el usuario A no puede leer, actualizar ni eliminar datos del usuario B.
4. Comprobar que la API rechaza tokens inválidos, expirados o sin el módulo `PROJOBS`.
5. Verificar que las consultas usan parámetros y que URLs de empleo solo aceptan HTTP/HTTPS.
6. Verificar que no existe ninguna credencial de DB en el bundle del frontend o en logs.
7. Confirmar que la cuenta de ProJobs no puede leer ni modificar la base de ProCV ni la de ProIdentity.
8. Medir latencia fría y caliente, operaciones por acción, almacenamiento y transferencia con datos sintéticos.
9. Simular el proveedor no disponible/cuota agotada: responder con error controlado, sin fingir que se guardaron los datos y sin perder el acceso al enlace externo.
10. Ejecutar build, lint y pruebas automáticas del servidor; documentar el resultado real de cada comando.

## 6. Criterios para elegir

La plataforma debe pasar todas las pruebas de seguridad. Entre las que las pasen, elegir según:
1. coste confirmado de USD 0 con los límites necesarios;
2. compatibilidad PostgreSQL y esfuerzo mínimo de migración;
3. separación de ProJobs respecto de ProCV/ProIdentity;
4. comportamiento al agotar cuota y al reactivar cómputo;
5. latencia observada desde Render;
6. facilidad para exportar datos y salir del proveedor.

No elegir solo por la cantidad de almacenamiento o el número de proyectos anunciados.

## 7. Límites y siguientes pasos

Esta revisión de código y documentación no sustituye una prueba ejecutada. En el momento de escribir este documento:
- no se ha creado ningún proyecto de Neon o Prisma Postgres;
- no se ha aplicado SQL a ninguna base de datos;
- no se han cambiado variables de entorno ni servicios de Render;
- no se ha migrado ni desplegado el PR #53;
- la PoC y las pruebas de aislamiento siguen pendientes.

Siguiente paso técnico: crear en una rama de evaluación un adaptador PostgreSQL desacoplado del proveedor y una migración de prueba común, con pruebas automatizadas de propiedad por usuario. Luego conectar esa rama a los recursos gratuitos de prueba solo después de confirmar sus límites y coste. El despliegue a producción queda fuera del alcance de la PoC.
