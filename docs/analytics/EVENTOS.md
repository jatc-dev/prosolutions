# Eventos de analítica (GA4 vía Google Tag Manager)

Las aplicaciones envían eventos a `dataLayer` con `trackEvent()` (`packages/ui/src/analytics.ts`). Para que lleguen a Google Analytics, el contenedor de GTM tiene que reenviarlos (ver "Configuración en GTM").

**Privacidad**
- Nada se envía hasta que la persona acepta las cookies de análisis.
- Los parámetros nunca incluyen datos personales, textos escritos por la persona ni nombres de archivo. Solo valores de una lista corta (sección, formato, plantilla, resultado).
- `search` incluye el término buscado (hasta 100 caracteres), como hace el evento estándar de GA4.

## Catálogo

| Evento | Dónde | Parámetros |
|---|---|---|
| `sign_up` | Core: registro con correo completado | `method` (`email`) |
| `cta_click` | Core: "Crear hoja de vida"; ProCV: invitado → crear cuenta | `cta`, `location` (`guest_banner`, `guest_leave`, `guest_clear`, …) |
| `search` | Core (inicio) y ProJobs | `search_term`, `source` |
| `cv_created` | ProCV: nueva hoja de vida o duplicado (panel) | `source` (`dashboard`, `duplicate`) |
| `cv_saved` | ProCV: clic en "Guardar" (no el autoguardado) | `mode` (`guest`, `account`) |
| `cv_imported` | ProCV: importar PDF/Word/texto | `result` (`success`, `error`), `file_type` |
| `document_download` | ProCV: descarga | `document` (`cv`, `cover_letter`), `format` (`pdf`, `docx`), `template` |
| `export_error` | ProCV: falla al generar PDF o Word | `document`, `format`, `template` |
| `ai_improve` | ProCV: "Mejorar con IA" | `section`, `action`, `result`, `error_code` |
| `ai_improve_applied` | ProCV: "Usar esta versión" | `section` |
| `job_match` | ProCV: "Comparar con vacante" | `kind` (`analysis`, `tailoring`), `result` |
| `guest_data_cleared` | ProCV: "Borrar mis datos" | `leaving` |
| `select_external_job` | ProJobs: clic en oferta externa | `source` |
| `job_save` / `job_unsave` | ProJobs: guardar o quitar oferta | — |
| `job_alert_create` | ProJobs: crear alerta | `frequency` |
| `job_apply` | ProJobs: postulación enviada | `cv_source` (`procv`, `manual`), `cover_letter` |
| `job_publish` | ProJobs (empresa): publicar oferta | `new_job` |

## Configuración en GTM

1. **Variables** → Nueva → *Variable de capa de datos* para cada parámetro usado: `method`, `cta`, `location`, `search_term`, `source`, `mode`, `result`, `file_type`, `document`, `format`, `template`, `section`, `action`, `error_code`, `kind`, `leaving`, `frequency`, `cv_source`, `cover_letter`, `new_job`.
2. **Activadores** → Nuevo → *Evento personalizado* → nombre del evento (expresión regular):
   `^(sign_up|cta_click|search|cv_created|cv_saved|cv_imported|document_download|export_error|ai_improve|ai_improve_applied|job_match|guest_data_cleared|select_external_job|job_save|job_unsave|job_alert_create|job_apply|job_publish)$`
3. **Etiquetas** → Nueva → *Google Analytics: evento GA4*:
   - ID de medición: el de la propiedad GA4.
   - Nombre del evento: `{{Event}}`.
   - Parámetros: una fila por cada variable del paso 1 (nombre = parámetro, valor = la variable).
   - Activador: el del paso 2.
4. **Vista previa** (Tag Assistant): abre el sitio, acepta las cookies de análisis y realiza una acción (por ejemplo, descargar un PDF). Comprueba que la etiqueta se dispara. Luego **Publicar**.
5. En GA4 → Administrar → *Definiciones personalizadas*, crea dimensiones personalizadas (ámbito evento) para los parámetros que se quieran ver en los informes: `template`, `format`, `document`, `section`, `action`, `result`, `source`, `cv_source`.
