# @prosolutions/auth

Paquete compartido de integración de autenticación para aplicaciones React del ecosistema.

## Responsabilidad
- Proveer el contexto y hooks de autenticación compartidos.
- Centralizar la integración del cliente HTTP con credenciales.
- Exponer componentes de protección de rutas según el contrato de identidad definido por ProIdentity.

## Desarrollo
Desde la raíz del monorepo:

```bash
npm install
npm run build --workspace=packages/auth
```

El paquete compila TypeScript hacia `dist/`. Sus dependencias de React son peer dependencies; las aplicaciones consumidoras deben proporcionar versiones compatibles.

## Seguridad
Este paquete es una capa cliente, no una frontera de seguridad. Toda autorización debe volver a verificarse en el backend. Nunca almacenes secretos ni confíes en el estado visual de autenticación para proteger datos.
