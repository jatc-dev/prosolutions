# Core — Portal ProSolutions

Aplicación web principal del ecosistema. Presenta el portal, navegación, acceso a módulos y flujos de cuenta que consumen ProIdentity.

## Stack
- React 18 y TypeScript
- Vite 5
- React Router
- Tailwind CSS
- Paquetes compartidos `@prosolutions/ui` y utilidades de autenticación donde corresponda

## Desarrollo

Desde la raíz del monorepo:

```bash
npm install
npm run dev:core
```

Build de producción:

```bash
npm run build:core
```

También puedes ejecutar los scripts desde esta carpeta:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Configuración

Las variables públicas de Vite se inyectan durante el build. Revisa `render.yaml` y las referencias `import.meta.env` del código para conocer los nombres y propósitos vigentes. Nunca incluyas secretos en variables `VITE_*`: quedan expuestas en el bundle del navegador.

## Límites de responsabilidad

- Core gestiona la experiencia del portal, no la autoridad de identidad.
- La autenticación y las sesiones pertenecen a ProIdentity.
- Las capacidades de CV y empleo se implementan en ProCV y ProJobs.
- Los elementos visuales reutilizables deben residir en `packages/ui` cuando sean compartidos.

## Validación

Antes de integrar cambios, ejecuta `npm run build:core`. Si modificas navegación, autenticación o componentes compartidos, valida también los módulos consumidores.
