> **Histórico (ProJobs v1).** Este documento describe la implementación estática anterior (generador Python + API PoC), reemplazada el 2026-11-17 por ProJobs v2. Arquitectura vigente: [apps/projobs/server/README.md](../apps/projobs/server/README.md) y [apps/projobs/README.md](../apps/projobs/README.md).

# ProJobs — arquitectura objetivo y plan de evolución

Fecha de referencia: 2026-10-18. Este documento separa lo que ya existe de las capacidades que requieren diseño e implementación adicionales.

> **Nota de vigencia (2026-11-10):** los apartados que proponen suscripciones o Premium son históricos y quedan obsoletos. El modelo aprobado para usuarios de ProSolutions es gratuito y financiado mediante publicidad. Se conservan para trazabilidad; no representan una hoja de ruta vigente.

## Estado técnico observado

- ProJobs se publica como sitio estático desde `apps/projobs` en Render.
- `scripts/build.mjs` copia los artefactos a `dist/`; `generator.py` normaliza y agrega ofertas de fuentes externas.
- La UI de búsqueda ya cuenta con búsqueda textual, filtros por país/sector/modalidad/contrato/jornada/experiencia, tarjetas de empleo, traducción ES/EN, tema oscuro y espacios de publicidad.
- El sitio generado y el `index.html` versionado pueden divergir si la compilación no ejecuta el generador. El build ahora debe fallar explícitamente ante ausencia/fallo de Python o HTML incompleto, en vez de publicar silenciosamente el archivo anterior.
- La aplicación no debe presentar como disponibles perfiles autenticados, seguimiento persistente de postulaciones ni recomendaciones personales hasta que exista una API y almacenamiento seguro para esas funciones.

## Arquitectura objetivo

### 1. Experiencia compartida

- Mantener `packages/ui` como fuente de verdad de tokens, logo, navegación, estados activos, iconografía, footer y enlaces canónicos.
- ProJobs conserva generación estática para indexabilidad y rendimiento; el markup del encabezado generado debe seguir el contrato visual y semántico de `ProHeader`.
- Compartir CSS/tokens y pruebas de contrato, no duplicar URLs de módulos ni mantener estilos de navegación divergentes.
- Añadir pruebas responsive y de accesibilidad: navegación por teclado, foco visible, nombres accesibles, contraste, menú móvil y enlaces externos seguros.

### 2. Dominio de ofertas

Normalizar cada empleo a un contrato común: identificador estable, fuente, URL canónica, empresa, título, ubicación, modalidad, tipo de contrato, nivel, salario y moneda cuando estén disponibles, fecha de publicación, fecha de expiración/última verificación, etiquetas, descripción y estado. Deduplicar por URL canónica y huella de empresa+título+ubicación. Mostrar fuente y fecha verificable; excluir ofertas caducadas o inválidas y no inventar salarios ni condiciones.

### 3. Servicios transaccionales — etapa posterior

Cuando se habiliten cuentas, usar API autenticada y PostgreSQL/Supabase con migraciones, validación, límites de tasa, auditoría, autorización por propietario y políticas RLS verificadas. Entidades funcionales propuestas: CandidateProfile, CompanyProfile, SavedJob, JobAlert, Application, ApplicationEvent, EmployerJob y AdPlacement. ~~Subscription~~ queda obsoleta como propuesta comercial futura; no implica que exista una tabla o facturación activa. Las postulaciones a fuentes externas deben identificarse como externas; no prometer seguimiento interno cuando no exista integración con el empleador.

### 4. Descubrimiento, búsqueda y SEO

- Búsqueda por texto con filtros combinables, orden por relevancia/recencia, recuento de resultados, filtros activos, botón limpiar y estado vacío útil.
- Facetas por país/ciudad, remoto/híbrido/presencial, sector, experiencia, tipo de contrato, jornada y rango salarial solo si el dato existe.
- URL compartible con parámetros de búsqueda, canonical coherente, títulos/descripciones específicos, sitemap actualizado y datos estructurados JobPosting solo para ofertas individuales válidas y vigentes con los campos requeridos.
- Alertas por correo, guardar ofertas y recomendaciones basadas en preferencias explícitas, inicialmente con reglas transparentes; no llamar “IA” a un ranking heurístico.

## Benchmark funcional

### LinkedIn Jobs
La documentación pública describe filtros por ubicación, fecha, empresa, nivel de experiencia, tipo de empleo, Easy Apply y orden por relevancia/recencia, además de alertas de búsqueda. Lección: permitir refinar y guardar búsquedas, y distinguir claramente postulación externa de postulación rápida.
Fuente: https://www.linkedin.com/help/linkedin/answer/a507441/filter-and-sort-job-search-results?lang=en
Alertas: https://www.linkedin.com/help/linkedin/answer/a508396

### Indeed
Indeed documenta búsqueda y contacto de candidatos, coincidencias con ofertas, alertas y gestión de perfiles mediante herramientas para empleadores. Lección: los perfiles y el matching requieren un producto de cuenta/consentimiento, no solo una tarjeta pública.
Fuente: https://co.indeed.com/help/employers/articles/360015979211?co=CO&hl=es

### Get on Board
La plataforma destaca postulaciones y mensajes asociados a cada proceso, ATS con columnas de seguimiento, base de talento y publicaciones potenciadas/Boost. Lección: el valor B2B surge de conectar publicación, pipeline y métricas; las promociones deben etiquetarse y ser distinguibles de resultados orgánicos.
Fuentes: https://www.getonbrd.com.co/help?subcategory=applying_to_jobs
https://www.getonbrd.com/pricing
https://www.getonbrd.com.co/user-manual/como-potenciar-tu-empleo

### Remote OK
La publicación de ofertas usa tipo de empleo, etiquetas/stack y categorías de búsqueda por tecnología. Lección: etiquetas técnicas normalizadas y páginas de categoría indexables pueden mejorar descubrimiento en el nicho remoto.
Fuente: https://www.remoteok.com/hire-remotely

## Plan por etapas

### Lote 1 — Fundamentos (en curso)
- Evitar publicación de HTML obsoleto y validar artefactos generados.
- Corregir enlaces canónicos de vuelta a Core.
- Documentar arquitectura, benchmark, límites de funcionalidad y criterios de aceptación.
- Siguiente: unificar el contrato del header/footer generado y automatizar pruebas de build/UX.

### Lote 2 — Búsqueda y calidad del catálogo
- Normalización, deduplicación, expiración, observabilidad de fuentes y errores.
- Filtros combinables, orden, URL compartible, conteos, accesibilidad y pruebas móviles.
- SEO técnico, datos estructurados por oferta válida, sitemap y Core Web Vitals.

### Lote 3 — Captura y retención de candidatos
- Guardar ofertas y alertas de empleo, con consentimiento y baja sencilla.
- Integrar ProCV para reutilizar el CV/perfil mediante flujo explícito y seguro.
- Perfiles candidatos privados por defecto; controles de visibilidad y exportación/eliminación.

### Lote 4 — Producto para empresas
- Perfil de empresa verificado, publicación y caducidad de ofertas.
- Pipeline de candidatos con estados, historial y mensajes.
- Moderación, prevención de fraude, reportes y métricas de conversión.

### Lote 5 — Monetización (histórico; propuestas comerciales obsoletas)
- AdSense: ubicaciones limitadas y responsive; etiqueta publicitaria clara; no insertar anuncios junto a botones de postulación ni dentro de controles; probar rendimiento y políticas antes de aumentar densidad.
- Patrocinios: ofertas destacadas etiquetadas, vencimiento automático, facturación y separación del ranking orgánico.
- ~~Premium: alertas avanzadas, filtros y herramientas de empresa con límites/beneficios transparentes.~~ Obsoleto: las funciones implementadas para usuarios no se condicionan a planes pagos.
- Acceso a talento: solo con perfiles voluntariamente visibles, consentimiento revocable, control de acceso, auditoría y privacidad. No vender datos personales ni exponer CV/contactos por defecto.

## Métricas de éxito

- Calidad: proporción de ofertas válidas, caducadas y duplicadas; fallos por fuente.
- Descubrimiento: búsqueda sin resultados, uso de filtros, clics en ofertas y clics de postulación.
- Retención: alertas confirmadas, visitas recurrentes y ofertas guardadas.
- Monetización: ingresos por sesión, viewability y CTR sin degradar experiencia; conversión B2B y tasa de renovación.
- Rendimiento: Core Web Vitals, peso JS/CSS, accesibilidad y tiempo de compilación.

## Criterios para considerar terminado un lote

No se despliega solo por estado `Live`: el build debe validar los artefactos, CI debe pasar y debe verificarse el HTML publicado y los enlaces principales. Los cambios transaccionales requieren revisión de seguridad y migraciones antes de habilitarse a usuarios reales.
