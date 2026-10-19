# ESTADO DEL PROYECTO — ProSolutions
**Corte de revisión:** 2026-10-18 (revisión de GitHub ejecutada durante esta sesión)  
**Repositorio:** [jatc-dev/prosolutions](https://github.com/jatc-dev/prosolutions)  
**Rama principal detectada:** `main`

> Este documento separa cambios fusionados, CI aprobado, despliegues reportados y validaciones todavía pendientes. Una PR abierta o un CI verde no significa que el cambio esté en producción.

## [x] Completado y desplegado (con evidencia disponible)

- **ProCV / editor y selector de país:** PR [#31](https://github.com/jatc-dev/prosolutions/pull/31) fusionada. Su reporte indica lint/build del frontend, pruebas/build del backend, Trivy, Docker y builds de Core/ProJobs correctos; Render reportó ProCV frontend, ProJobs y Core como `live` para el commit de integración. La inspección visual manual de producción no quedó confirmada.
- **Calidad del catálogo de ProJobs:** PR [#30](https://github.com/jatc-dev/prosolutions/pull/30) fusionada. La descripción reporta normalización de URLs, deduplicación más conservadora y pruebas de regresión.
- **Fundación de ProJobs:** PR [#29](https://github.com/jatc-dev/prosolutions/pull/29) fusionada. Incluye validación del generador, verificación del HTML generado y hoja de ruta.
- **Header global:** PR [#28](https://github.com/jatc-dev/prosolutions/pull/28) figura fusionada; cambios en el header compartido y los flujos de autenticación de ProCV.
- **Pro Identity — auditoría documental:** commit `5d5e8e0952ca5241676a3ea1846ab752944f2a9a` añadido a la PR [#33](https://github.com/jatc-dev/prosolutions/pull/33). Es documentación de auditoría, **no** una implementación de SSO.

## [ ] Pendiente / en cola

### PR abiertas con avance alto

- [ ] **[#34 ProJobs — búsquedas compartibles](https://github.com/jatc-dev/prosolutions/pull/34):** CI de ProCV aprobado para `ed5b88a0ceda085a54d4f994425f6587f3ad9e5e`; falta prueba manual en navegador antes de decidir merge.
- [ ] **[#35 Modo oscuro](https://github.com/jatc-dev/prosolutions/pull/35):** CI de ProCV y Core/ProJobs aprobado para `40c7fdfbe6fd7d64f5c79b44a9f9f1a7a10d08ba`; falta revisión visual en ambos temas y auditoría WCAG AA de la interfaz renderizada. Los cálculos puntuales de contraste no sustituyen la revisión completa.
- [ ] **[#32 Márgenes PDF](https://github.com/jatc-dev/prosolutions/pull/32):** CI de ProCV aprobado para `ce45549085b7a7d3e1f7a94f5828153f229a4a51`; falta inspección de PDF generados, márgenes, saltos de página y pies en las nueve plantillas.
- [ ] **[#33 Pro Identity / SSO](https://github.com/jatc-dev/prosolutions/pull/33):** PR en borrador y solo documental. Falta completar las pruebas de sesión, revisar CORS/CSRF/cookies/claims/redirects y realizar un proof of concept OIDC no productivo antes de implementar SSO.
- [ ] **Migración de login:** Core dirige al login propio de ProCV; esto es navegación, no sesión compartida. No fusionar las ramas antiguas `fix/procv-navigation` o `fix/procv-navigation-clean` directamente: sus comparaciones con `main` muestran divergencia importante y cambios de CI/Docker/lockfile además de los enlaces.
- [ ] **Registro y correo de verificación:** persiste como bloqueo operativo conocido la alineación del dominio remitente SPF/DKIM en SendGrid; no se debe saltar la verificación de correo.
- [ ] **Verificación visual en producción:** comprobar manualmente los módulos ya desplegados y registrar evidencia antes de declarar cierre visual.

### Estado de integración y publicación

- No se fusionó ninguna de las PR abiertas durante esta sesión ni se ejecutó un despliegue.
- No se hicieron cambios a Render, secretos, variables de entorno ni bases de datos.
- La rama principal sigue siendo `main`; el estado del repositorio no justifica una consolidación masiva automática.

## 🌿 Estructura de ramas actualizada

### Ramas con PR abierta — conservar activas

- `feat/prosolutions-central-identity-foundation` → PR #33 (borrador, documentación y auditoría).
- `feat/projobs-shareable-search` → PR #34 (CI aprobado, prueba manual pendiente).
- `feat/dark-mode-design-tokens` → PR #35 (CI aprobado, revisión visual pendiente).
- `fix/procv-compact-pdf-margins` → PR #32 (CI aprobado, inspección PDF pendiente).

### Ramas remotas detectadas en la revisión

La búsqueda de ramas devolvió los siguientes nombres. Su mera existencia no demuestra que sean obsoletos ni que su trabajo esté contenido en `main`; las ramas sin PR abierta deben compararse con `main` y con PR fusionadas antes de eliminarlas.

- `main`
- `backlog-tecnico`
- `ci/procv-workflow-raiz`
- `codex/core-localization`
- `codex/procv-locale-cleanup`
- `codex/procv-mobile`
- `codex/procv-pdf-pagination-fixes`
- `codex/procv-product-polish`
- `codex/procv-template-contrast`
- `codex/projobs-localization`
- `feat/dark-mode-design-tokens`
- `feat/procv-nationality-dropdown`
- `feat/projobs-catalog-quality`
- `feat/projobs-platform-foundation`
- `feat/projobs-shareable-search`
- `feat/prosolutions-central-identity-foundation`
- `feat/unified-ecosystem-header`
- `fix/admin-password-reset-revoke-sessions`
- `fix/country-selector-editor-consistency`
- `fix/csrf-timing-safe-compare`
- `fix/database-migration-consistency-and-deploy-docs`
- `fix/footer-procv-login`
- `fix/global-header-all-modules`
- `fix/header-procv-login`
- `fix/monetization-respect-premium-ad-free`
- `fix/procv-adsense-rendering`
- `fix/procv-compact-pdf-margins`
- `fix/procv-legacy-login-compat`
- `fix/procv-login-button-submit`
- `fix/procv-marketing-routes-and-premium-cta`
- `fix/procv-navigation`
- `fix/procv-navigation-clean`
- `fix/procv-root-redirect-login`
- `fix(procv-seo-canonical-domain` (nombre devuelto por la API; verificar si es una rama accidental)
- `fix/procv-seo-canonical-domain`
- `fix/projobs-ci-validation`
- `fix/projobs-css-rendering`
- `fix/projobs-generated-css-style-tag`
- `fix/projobs-header-styles`

### Limpieza de ramas: resultado de esta sesión

- [x] Inventario remoto obtenido y PR abiertas identificadas.
- [x] Separadas las ramas con PR abierta de las candidatas a revisión.
- [ ] No se borraron ramas. La integración disponible permite consultar y crear ramas, pero no expone una operación de borrado de referencias en esta sesión. Además, no es seguro eliminar una rama solo por su nombre: primero hay que comprobar su contenido exclusivo y si alguna tarea depende de ella.
- [ ] No se hizo merge directo a `main`: la autorización de trabajo anterior permite commits y PR, pero mantiene la prohibición de fusionar y desplegar hasta verificar las pruebas.

## Próxima secuencia recomendada

1. Ejecutar el smoke test de ProJobs y cerrar la revisión visual de modo oscuro y PDF.
2. Corregir lo que resulte de esas pruebas y actualizar sus PR.
3. Completar las pruebas de seguridad y el proof of concept OIDC en entorno no productivo.
4. Auditar las ramas restantes contra `main`; proponer eliminación solo para las confirmadas como fusionadas, duplicadas u obsoletas.
5. Solicitar autorización separada para fusionar PR y desplegar una vez aprobadas las validaciones.

