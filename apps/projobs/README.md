# ProJobs

ProJobs es el módulo de oportunidades laborales de ProSolutions. Combina un catálogo público de empleos con una API para funcionalidades de usuario autenticado.

## Componentes
- **Catálogo web:** aplicación estática generada y servida desde `apps/projobs/`.
- **API:** servicio Node.js/Express en `apps/projobs/server/`.
- **Persistencia:** PostgreSQL para funciones de usuario; el catálogo público no depende de la API para renderizarse.
- **Identidad:** ProIdentity es la autoridad de autenticación. La API valida tokens y permisos de módulo antes de permitir operaciones protegidas.

## Desarrollo

Desde la raíz:

```bash
npm install
npm run dev:projobs
```

Comandos del módulo:

```bash
npm run dev
npm run build
npm run dev:server
npm run build:server
npm run start:server
```

La disponibilidad de fuentes externas depende de sus políticas, límites y conectividad. La generación debe tolerar fallos parciales y no inventar ubicaciones ni datos de ofertas.

## API

Consulta [`server/README.md`](server/README.md) para arquitectura de persistencia, autorización, configuración y validación.

## Seguridad y calidad
- No confíes en identificadores de usuario enviados por el cliente para definir el alcance de consultas.
- Aplica RLS y contexto de usuario verificado en operaciones de datos personales.
- El rol runtime debe tener privilegios mínimos y no ser propietario de tablas.
- Las búsquedas guardadas no implican envío de correo mientras no exista un worker de entrega configurado y validado.
- Ejecuta `npm run build` y `npm run build:server` tras modificar catálogo o API.

## Despliegue

Los servicios y su configuración declarativa están en `render.yaml`. Los servicios ProJobs tienen `autoDeploy: false` en el manifiesto versionado; confirma siempre el estado del proveedor antes de una publicación manual.
