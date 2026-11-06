# @prosolutions/ui

Sistema compartido de componentes visuales y utilidades de interfaz para las aplicaciones ProSolutions.

## Responsabilidad
- Componentes de navegación y estructura compartidos.
- Componentes de interfaz reutilizables.
- Tokens, tema y utilidades de presentación.

## Desarrollo
Desde la raíz:

```bash
npm install
npm run build:ui
```

El paquete compila TypeScript hacia `dist/`. Los cambios compartidos deben validarse también en las aplicaciones consumidoras, especialmente Core y ProCV.

## Criterios
- Mantén los componentes genéricos y configurables.
- Evita dependencias de lógica de negocio de un módulo concreto.
- Conserva accesibilidad por teclado, semántica y estados de foco.
- No introduzcas secretos ni configuración específica de producción en el paquete.
