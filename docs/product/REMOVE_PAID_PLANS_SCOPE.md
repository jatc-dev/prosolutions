# Retiro del modelo Premium y planes comerciales

**Estado:** especificación de implementación para QA.  
**Modelo comercial aprobado:** servicio gratuito para usuarios, monetizado mediante publicidad.  
**Rama de trabajo:** `qa`. No modificar `main` ni producción en esta tarea.

## Objetivo

Eliminar de toda la experiencia de ProSolutions cualquier promoción, bloqueo, etiqueta, precio o llamada a la acción que sugiera planes Premium, suscripciones o upgrades pagos. Todas las funciones actualmente implementadas deben estar disponibles sin una barrera comercial, salvo restricciones técnicas, de seguridad, permisos administrativos, límites de abuso o capacidades que aún no existan.

La publicidad seguirá siendo el modelo de monetización. No eliminar componentes AdSense ni controles de consentimiento/cookies.

## Hallazgos iniciales

La búsqueda de código encontró, como mínimo, estos puntos en la línea base inspeccionada:

- Core: `apps/core/src/components/Premium.tsx` muestra planes Gratis, Pro y Equipos con precios y CTAs; `apps/core/src/pages/LandingPage.tsx` renderiza ese componente.
- Core i18n: `apps/core/src/i18n.tsx` contiene mensajes de planes, precios y Premium en español e inglés.
- Navegación compartida: `packages/ui/src/ProHeader.tsx` y `packages/ui/src/ProFooter.tsx` incluyen enlaces a `#planes`.
- ProCV: `apps/procv/frontend/src/shared/feature-flags.ts` restringe `platform_no_ads`, `projobs_job_alerts` y `procv_premium_templates` por entitlement.
- ProCV: `apps/procv/frontend/src/shared/utils/templateCatalog.ts` clasifica plantillas como free/premium.
- ProCV: `apps/procv/frontend/src/modules/procv/pages/TemplatesPage.tsx` muestra filtros, etiquetas y CTA de upgrade para plantillas Premium.
- ProCV: `apps/procv/frontend/src/modules/procv/components/editor/components/TemplateSelector.tsx` bloquea plantillas y muestra etiquetas de pago.
- ProCV: `apps/procv/frontend/src/modules/monetization/components/FeatureGate.tsx` y `UpgradeBanner.tsx` contienen paywalls y promociones.
- ProCV: `apps/procv/frontend/src/modules/monetization/components/AdSlot.tsx` asocia el entitlement `platform_no_ads` a la carga de anuncios; revisar cuidadosamente para que el retiro de Premium no desactive AdSense.
- ProJobs: `apps/projobs/generator.py` incluye enlaces de navegación y footer a `#planes`.
- Documentación histórica: `docs/PROJOBS-ROADMAP.md` y `docs/PROSOLUTIONS-COMPETITIVE-ROADMAP.md` describen Premium/planes como monetización futura. Marcar esos apartados como obsoletos o actualizarlos, sin reescribir decisiones históricas fechadas que deban conservarse.

La búsqueda inicial de código se realizó sobre el índice de GitHub de la rama por defecto; los paths listados deben confirmarse contra el HEAD de `qa` antes de editarlos. Realizar búsqueda exhaustiva sobre el checkout real de `qa`.

## Cambios requeridos

### Core y navegación
- Retirar la sección de planes de la landing page.
- Retirar enlaces a planes de header, footer, menús desktop y mobile.
- Eliminar imports, componentes y traducciones comerciales que queden sin uso.
- Sustituir mensajes de “empieza gratis y escala”, “hazte Pro” o equivalentes por comunicación veraz: herramientas gratuitas para todos.
- Eliminar anchors `#planes` y enlaces internos/externos que apunten a ellos.

### ProCV
- Todas las plantillas disponibles deben poder seleccionarse sin pago.
- Eliminar filtros Free/Premium si ya no aportan valor; conservar filtros funcionales como ATS/categoría si existen.
- Eliminar badges Premium/Pro que indiquen una categoría comercial.
- Retirar banners, modales y mensajes de upgrade/paywall.
- Revisar FeatureGate y entitlement para liberar únicamente funciones que ya están implementadas.
- Preservar controles de autenticación, autorización, roles, cuotas antiabuso y límites técnicos reales.
- No cambiar `platform_no_ads` de forma que desactive anuncios para todos. En el nuevo modelo los anuncios no dependen de un plan pago; se rigen por consentimiento, elegibilidad del espacio y configuración publicitaria.

### ProJobs y otros módulos
- Retirar enlaces, textos, páginas o CTA de planes/upgrade.
- Buscar en frontend, backend, generadores, plantillas HTML, JSON de traducciones, emails y contenido estático.
- No confundir “plan de carrera”, “plan de trabajo”, “plan de aprendizaje” o planes técnicos con planes comerciales.
- No eliminar controles internos de suscripción técnica a alertas si representan una preferencia funcional gratuita del usuario; cambiar su semántica solo si actualmente implica cobro.

### Backend y datos
- Buscar endpoints de checkout, billing, invoices, subscriptions, Stripe/PayPal, webhooks, price IDs y tablas de entitlement.
- No borrar tablas, columnas, endpoints ni registros en esta fase sin comprobar dependencias y datos existentes.
- Desactivar únicamente flujos comerciales que realmente existan y tengan pruebas de no uso.
- No ejecutar migraciones ni operaciones destructivas en Neon.

### SEO y documentación
- Actualizar title, description, JSON-LD, metadatos y textos públicos que anuncien planes pagos.
- Redirigir o retirar rutas de pricing si existen; evitar 404 de enlaces internos y anchors huérfanos.
- Mantener documentación histórica fechada, pero marcar como obsoletas las propuestas de Premium que ya no reflejen el modelo aprobado.
- No introducir claims absolutos como “todo ilimitado” o “sin restricciones” si existen límites técnicos o de uso.

## Búsqueda exhaustiva requerida

Buscar case-insensitive y variantes lingüísticas:
- `premium`, `upgrade`, `upsell`, `paywall`, `pricing`, `checkout`, `billing`, `subscription`, `suscripción`, `suscripciones`, `planes`, `plan Pro`, `hazte Pro`, `ver planes`, `desbloquea`, `pago`, `mensual`, `$/mes`.
- Revisar referencias dinámicas, feature keys, rutas, IDs DOM, anchors, tests y snapshots.

Clasificar cada coincidencia como:
1. Promoción comercial que debe eliminarse.
2. Lógica de cobro que debe retirarse o desactivarse con seguridad.
3. Concepto técnico/funcional que debe conservarse.
4. Referencia histórica que debe etiquetarse como obsoleta.

## Pruebas de aceptación

- No hay promoción visible de Premium, Pro pago, planes, suscripciones comerciales o upgrades en español ni inglés.
- No quedan enlaces a `#planes`, `#premium` ni rutas de checkout comerciales en la navegación.
- Las plantillas antes etiquetadas como Premium se pueden seleccionar y exportar conforme a sus capacidades implementadas.
- Alertas y otras funciones gratuitas no muestran paywalls.
- Los anuncios siguen respetando consentimiento y configuración; no se habilitan antes del consentimiento requerido.
- No se rompe autenticación, RBAC, aislamiento de cuentas ni permisos de administración.
- No se borran datos ni se ejecutan migraciones.
- Tests unitarios, typecheck y builds de Core, ProCV y ProJobs pasan.
- Pruebas browser de landing, navegación responsive, galería/editor ProCV y flujo ProJobs verifican ausencia de promociones.
- Auditoría final busca términos comerciales residuales y clasifica las excepciones técnicas/históricas.

## Límites de seguridad y despliegue

- Trabajar exclusivamente en `qa`.
- No tocar `main`, producción, Render, dominios, DNS, secretos ni bases de datos.
- No crear infraestructura ni ramas nuevas.
- Evitar ejecuciones innecesarias de GitHub Actions por la cuota mensual.
- No declarar finalizado hasta presentar diff, resultados de pruebas y búsqueda residual.
