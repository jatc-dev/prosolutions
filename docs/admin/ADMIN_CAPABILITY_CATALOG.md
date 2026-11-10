# ProSolutions — Catálogo y plan de administración por módulo

Estado: diseño de implementación para QA. Este documento no declara como operativas funciones que aún no tienen backend, permisos o consumidor de runtime.

## Principios obligatorios

1. ProIdentity es la autoridad de identidad, autenticación, sesiones, usuarios, roles, permisos y auditoría transversal.
2. Cada módulo es dueño de sus datos y operaciones: ProCV, ProJobs y futuros módulos no consultan ni modifican tablas privadas de otro módulo.
3. El Portal es la consola de administración; los módulos exponen APIs administrativas explícitas detrás de ProIdentity o de una pasarela autenticada.
4. Toda mutación administrativa exige permiso específico, validación del lado servidor, protección CSRF cuando aplique y evento de auditoría.
5. Separar configuración editable, secretos de entorno y operaciones de infraestructura. Nunca devolver secretos al navegador.
6. No ofrecer un control hasta que el servicio lo consuma y exista una prueba que demuestre el efecto.
7. Operaciones destructivas, exportaciones sensibles, cambios de seguridad y mantenimiento requieren confirmación reforzada y, cuando proceda, doble aprobación.
8. Las funciones se despliegan primero en QA. No se despliega ni migra producción como parte de esta fase.

## Modelo de permisos objetivo

Roles iniciales: `platform_owner`, `platform_admin`, `security_admin`, `support_agent`, `content_manager`, `analytics_viewer`, `module_admin` y `user`.

Permisos granulares con patrón `<module>.<resource>.<action>`, por ejemplo:
- `identity.users.read|invite|update|suspend|delete`
- `identity.roles.read|manage`, `identity.sessions.read|revoke`
- `procv.cvs.read|export|delete`, `procv.templates.manage`, `procv.limits.manage`
- `projobs.catalog.read|moderate`, `projobs.alerts.manage`, `projobs.sources.manage`
- `platform.branding.manage`, `platform.features.manage`, `platform.maintenance.manage`
- `audit.read|export`, `analytics.read|export`, `privacy.requests.manage`

La autorización se aplica en el servidor, con denegación por defecto. Ocultar botones no constituye control de acceso. El rol administrador existente se mantiene como compatibilidad durante la migración; no se retira hasta verificar la asignación y el acceso de emergencia.

## Consola central — ProSolutions

### General y gobierno
- Estado de servicios y dependencias, versión desplegada, health checks y enlaces a logs.
- Nombre, descripción, correo/teléfono de soporte, URLs públicas y términos/privacidad.
- Marca: logotipo, favicon, paleta accesible, tipografía permitida y vista previa.
- Idioma y zona horaria predeterminados; preferencias individuales permanecen en ProIdentity.
- Modo mantenimiento por módulo, mensaje, ventana programada y bypass de personal autorizado.
- Feature flags por módulo, entorno, segmento y porcentaje, con historial y reversión.
- Catálogo de módulos, disponibilidad, enlaces, permisos y estado de integración.
- Centro de notificaciones administrativas y alertas operativas.

### Usuarios, organizaciones y acceso (ProIdentity)
- Búsqueda, filtros, paginación y ficha de usuario; estado, correo verificado y fechas.
- Invitaciones, activación/desactivación, recuperación y verificación de correo.
- Asignación de módulos con expiración, motivo y registro de quién autorizó.
- Roles personalizados y permisos granulares; separación de funciones.
- Sesiones y dispositivos, cierre selectivo/global, política de inactividad y sesiones privilegiadas.
- MFA para administradores, políticas de autenticación, bloqueo y rate limits.
- Historial de acceso, eventos de seguridad, detección de actividad anómala y notificaciones.
- Solicitudes de privacidad: acceso, exportación, rectificación y eliminación conforme a política legal.
- Gestión de organizaciones/equipos y membresías multiusuario como capacidad futura, no habilitada sin modelo de tenant.

### Seguridad y cumplimiento (ProIdentity)
- Políticas de contraseña y autenticación, MFA/WebAuthn, recuperación segura y verificación.
- Política de sesión, expiración absoluta/inactividad, revocación y lista de dispositivos.
- Rate limiting, allow/deny lists, protección contra abuso y gestión de orígenes/CORS.
- Secretos solo en gestor de secretos/variables de entorno; rotación y estado sin mostrar valores.
- Auditoría inmutable de acciones privilegiadas, filtros, exportación y retención configurable.
- Registro de consentimiento, política de privacidad, retención y flujo de solicitudes de titulares.
- Estado de integraciones OAuth, expiraciones y permisos concedidos (sin exponer tokens).

### Analítica transversal
- Usuarios activos, registros, retención, embudos, uso por módulo y cohortes.
- Eventos de CV, búsquedas, alertas y postulaciones; métricas agregadas y anonimizadas.
- Exportación CSV/JSON con autorización, límites, registro y protección de datos.
- Definición/versionado de eventos y controles de privacidad/consentimiento.

## ProCV — administración del módulo

### Marca y producto
- Nombre/descripcion del módulo, logotipo, colores, idioma y catálogo de plantillas.
- Landing y contenido por idioma con vista previa, publicación y reversión.

### CV y editor
- Plantillas activas, orden, categorías, disponibilidad y versiones.
- Límites efectivos por plan/usuario: CV activos, versiones, tamaño y exportaciones.
- Autosave: intervalo, estado de cola, fallos y recuperación de borradores.
- Exportaciones PDF/DOCX/JSON: disponibilidad, calidad, límites, colas y errores.
- Analítica ATS: uso, latencia, errores, consumo IA y cuotas; no exponer contenido privado en métricas.
- Moderación/soporte de CV: acceso excepcional temporal, justificado y auditado; nunca acceso silencioso.

### Archivos y datos
- Límites de carga por tipo, MIME real, tamaño, antivirus y políticas de retención.
- Almacenamiento por usuario/global, uso, cuotas, limpieza y archivos huérfanos.
- Política de compresión y generación segura de documentos.
- Versiones, recuperación, exportación y eliminación conforme a retención.
- Herramientas de soporte con acceso mínimo y RLS intacto.

## ProJobs — administración del módulo

### Catálogo y fuentes
- Fuentes/conectores de vacantes, estado, última sincronización, errores y salud.
- Reglas de normalización, deduplicación, vigencia, atribución y procedencia.
- Moderación de ofertas, empresas, enlaces, duplicados, fraude y reportes.
- Taxonomías: país, sector, modalidad, contrato, seniority y habilidades.
- Ranking y relevancia, filtros, calidad del catálogo y búsqueda.

### Experiencia de candidato
- Búsquedas guardadas, alertas, frecuencia, entregabilidad y bajas.
- Postulaciones/seguimiento, estados, eventos y métricas de conversión.
- Recomendaciones, preferencias y progreso de carrera.
- Plantillas de correo y notificaciones, pruebas de entrega y límites.
- Reportes de enlaces rotos, ofertas vencidas y experiencia del usuario.

### Operación
- Panel de ingesta y trabajos programados, reintentos, dead-letter y trazabilidad.
- Métricas de catálogo, fuentes, búsquedas, alertas y postulaciones.
- Políticas antispam, cuotas, abuso y límites de API.

## Módulos futuros
ProSkills, ProCareer, ProInterview y ProRecruit deben aparecer en el catálogo de módulos, pero sus controles se habilitan únicamente cuando existan servicios, esquema de datos, permisos y despliegues QA propios.

## Capacidades comunes de plataformas líderes que incorporaremos cuando sean viables

- RBAC granular y separación de funciones.
- MFA/WebAuthn y sesiones privilegiadas.
- Auditoría consultable y exportable.
- Feature flags y despliegue gradual.
- Health checks, alertas y observabilidad.
- Gestión de integraciones y webhooks con reintentos, firmas y rotación de secretos.
- Plantillas y notificaciones con previsualización y prueba.
- Exportación/importación controlada, solicitudes de privacidad y retención.
- Cuotas por plan, límites y medición de consumo.
- Catálogo de módulos y permisos temporales.
- Copias verificables, restauración probada y recuperación ante desastres.
- Soporte con acceso temporal, motivo obligatorio y trazabilidad.

## Estados de implementación

- **Operativo verificado:** API y consumidor de runtime existen y se han probado.
- **Parcial:** existe una parte, pero falta integración, autorización o pruebas.
- **Por implementar:** requiere cambios de aplicación y migración en QA.
- **Infraestructura pendiente:** requiere servicio externo, credenciales administradas, almacenamiento, correo o pipeline.
- **No habilitar:** inseguro, no soportado o sin propietario de datos claro.

## Orden de ejecución

1. Inventario y catálogo de permisos; cerrar brechas de autorización antes de ampliar operaciones.
2. ProIdentity: RBAC granular, auditoría transversal, usuarios, sesiones, MFA y solicitudes de privacidad.
3. ProCV: configuración de marca/producto, plantillas, límites y cuotas realmente aplicados, archivos, exportaciones y métricas.
4. ProJobs: acceso administrativo aislado compatible con RLS, catálogo/fuentes, moderación, alertas y métricas.
5. Operaciones comunes: feature flags, salud, notificaciones, webhooks, exportaciones y recuperación.
6. Pruebas de permisos positivos/negativos, RLS, CSRF, auditoría, integración y E2E autenticado por módulo.

## Restricciones de esta entrega

- Rama de trabajo: `fix/qa-session-block-1`, PR #105 hacia `qa`.
- No crear ramas adicionales.
- No modificar producción, TransCamacho ni desplegar producción.
- ProJobs no tiene actualmente servicios QA equivalentes; sus funciones administrativas requieren primero entorno QA y rol de base de datos aislado. No se conectará una consola de QA a datos de producción.
- Backups, correo, MFA, almacenamiento externo y webhooks solo se declararán operativos tras configurar y probar sus servicios reales.
