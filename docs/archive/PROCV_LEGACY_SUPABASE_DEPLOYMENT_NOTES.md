# Archivo histórico: checklist de despliegue ProCV en Supabase

> **Obsoleto — no ejecutar como procedimiento operativo.** Este documento se conserva únicamente como registro de incidentes y decisiones del periodo en que ProCV utilizaba Supabase. La infraestructura actual y los procedimientos vigentes deben consultarse en `render.yaml`, `docs/deployment/` y la documentación actual del módulo.

El documento original mezclaba instrucciones antiguas de variables JWT, endpoints y conexiones Supabase con observaciones útiles sobre el riesgo de migraciones y el baseline de bases de datos. Se retiraron los comandos y valores de configuración que podían inducir a operar contra el proveedor equivocado.

## Lecciones que siguen vigentes

- Si una cadena de conexión o secreto se expone, debe rotarse en el proveedor correspondiente y revisarse la validez de sesiones afectadas.
- No se debe ejecutar una migración contra un pooler transaccional si el motor de migraciones requiere una conexión directa.
- Antes de marcar una migración como aplicada, hay que verificar que todos sus efectos existan en la base de datos.
- No se debe borrar el historial de migraciones para ocultar deriva de esquema.
- Una corrección automática de esquema al arrancar es una salvaguarda, no un sustituto de migraciones versionadas.
- No deben exponerse endpoints HTTP de diagnóstico o ejecución de DDL en producción.
- Los secretos deben residir en el gestor de variables del entorno, nunca en el repositorio.

Consulta los procedimientos vigentes de la plataforma antes de cualquier operación.
