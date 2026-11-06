# ProSolutions

**Plataforma modular para empleabilidad y desarrollo profesional.**

ProSolutions reúne un portal central y módulos especializados para identidad, creación de hojas de vida y descubrimiento de oportunidades laborales. El repositorio está organizado como un monorepo npm: cada aplicación conserva su ciclo de desarrollo y despliegue, mientras que los paquetes compartidos reducen duplicación de interfaz y autenticación.

- **Portal:** https://prosolutions.page
- **ProCV:** https://procv.prosolutions.page
- **ProJobs:** https://projobs.prosolutions.page
- **Identidad:** https://identity.prosolutions.page

> Los enlaces identifican los servicios públicos. Su disponibilidad y estado operativo deben comprobarse en los proveedores de despliegue; este README no constituye un monitor de producción.

## Arquitectura

| Componente | Responsabilidad | Implementación |
|---|---|---|
| Core | Portal, navegación y acceso a módulos | React, TypeScript, Vite |
| ProIdentity | Registro, inicio de sesión, sesiones y autoridad de identidad | Node.js, Express, Prisma, PostgreSQL |
| ProCV | Editor de hojas de vida, análisis ATS y generación PDF | React/Vite + Express/Prisma |
| ProJobs | Catálogo de empleo y funcionalidades de seguimiento | Sitio estático + API Node.js |
| `packages/auth` | Integración de autenticación compartida para frontends | React/TypeScript |
| `packages/ui` | Componentes y estilos compartidos | React/TypeScript |

ProIdentity es la autoridad de autenticación. Los módulos protegidos validan los tokens y permisos que les corresponden; no deben implementar mecanismos paralelos de identidad.

## Estructura

```text
.
├── apps/
│   ├── core/                 # Portal principal
│   ├── identity/             # Servicio de identidad y autenticación
│   ├── procv/
│   │   ├── frontend/         # Aplicación web
│   │   └── backend/          # API, Prisma y pruebas
│   └── projobs/
│       └── server/           # API de ProJobs
├── packages/
│   ├── auth/                 # Integración de autenticación
│   └── ui/                   # Sistema de interfaz compartido
├── docs/
│   ├── architecture/         # Decisiones y diseño técnico
│   ├── deployment/           # Procedimientos de despliegue
│   ├── quality/              # Evidencias y protocolos de calidad
│   └── security/             # Modelo, auditorías y controles
├── scripts/                 # Herramientas de desarrollo y validación
├── render.yaml              # Definición declarativa de servicios Render
└── package.json             # Workspaces y comandos raíz
```

## Requisitos

- Node.js **20.19 o superior** para los servicios backend que declaran ese requisito.
- npm compatible con workspaces.
- Acceso a PostgreSQL/Neon para ejecutar localmente los servicios que persisten datos.
- Variables de entorno propias de cada servicio. Usa los archivos `.env.example` cuando existan.

## Inicio rápido

Desde la raíz:

```bash
npm install
```

Levantar aplicaciones individualmente:

```bash
npm run dev:core
npm run dev:identity
npm run dev:procv
npm run dev:projobs
```

Los servicios con base de datos requieren configuración local antes de arrancar. Consulta la guía de cada módulo; no copies variables de producción a archivos locales ni compartas secretos.

## Build

Comandos definidos en el `package.json` raíz:

```bash
npm run build:ui
npm run build:core
npm run build:procv
npm run build:projobs
```

ProIdentity se compila desde su workspace:

```bash
npm run build --workspace=apps/identity
```

Para pruebas y validaciones específicas, usa los scripts descritos en cada módulo. No asumas que un build sustituye las pruebas de integración, migraciones o verificaciones de aislamiento de datos.

## Flujo de trabajo recomendado

1. **Entender el límite del cambio.** Identifica el módulo y sus dependencias compartidas antes de editar.
2. **Cambios pequeños y cohesivos.** Evita mezclar refactors, actualizaciones de dependencias y cambios funcionales no relacionados.
3. **Reproducibilidad.** Mantén los lockfiles sincronizados con los manifiestos; instala con `npm ci` en validaciones limpias.
4. **Validación por capas.** Ejecuta lint, pruebas del módulo, build y pruebas de integración pertinentes.
5. **Seguridad por defecto.** Valida entradas en servidor, aplica mínimo privilegio, conserva RLS y no confíes en identificadores de usuario enviados por el cliente.
6. **Migraciones controladas.** Revisa el estado y los efectos de cada migración antes de aplicarla. Nunca uses `db push` como sustituto de un proceso de migración versionado en producción.
7. **Cambios revisables.** Usa commits convencionales, describe impacto y riesgo, y documenta decisiones arquitectónicas duraderas como ADR.
8. **Despliegue consciente.** Revisa `render.yaml` y el servicio afectado antes de integrar cambios en `main`; los servicios con `autoDeploy: true` pueden reconstruirse automáticamente.

### Convención de commits

Se recomienda Conventional Commits:

- `feat(scope):` funcionalidad
- `fix(scope):` corrección
- `docs(scope):` documentación
- `refactor(scope):` refactor sin cambio funcional
- `test(scope):` pruebas
- `chore(scope):` mantenimiento

## Seguridad y configuración

- No guardes secretos, tokens, contraseñas ni cadenas de conexión en Git.
- Mantén las variables privadas en el gestor de secretos del entorno de despliegue.
- Usa roles de base de datos dedicados y privilegios mínimos para cada servicio.
- Conserva las políticas RLS y verifica aislamiento entre usuarios en pruebas.
- Ejecuta migraciones con el rol y la conexión documentados para cada base de datos.
- Ante una duda sobre una variable, consulta primero el manifiesto del servicio y su código de configuración.

## Documentación técnica

- [Índice de documentación](docs/README.md)
- [Portal Core](apps/core/README.md)
- [ProIdentity](apps/identity/README.md)
- [ProCV](apps/procv/README.md)
- [ProJobs](apps/projobs/README.md)
- [Autenticación compartida](packages/auth/README.md)
- [Componentes compartidos](packages/ui/README.md)

## Alcance de este repositorio

El código, los manifiestos y la documentación versionada son la fuente de verdad. Los estados de producción, las variables configuradas en proveedores y los resultados de pruebas ejecutadas fuera del repositorio pueden cambiar; deben verificarse en su sistema de origen antes de tomar decisiones operativas.
