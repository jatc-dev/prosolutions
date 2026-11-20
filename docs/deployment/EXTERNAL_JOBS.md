# Vacantes externas en ProJobs (Careerjet)

Estado: código desplegable y **apagado**. Se activa solo cuando Careerjet acepte las IP de salida de Render y el owner confirme sus condiciones.

## Cómo funciona

- `GET /api/external-jobs?q=&location=&page=` (API de ProJobs) busca en vivo en Careerjet (`https://search.api.careerjet.net/v4/query`) con la clave del publisher, la IP (`req.ip`) y el user agent del visitante, que Careerjet exige.
- No se guarda nada en la base de datos ni hay migraciones. Caché en memoria opcional (`EXTERNAL_JOBS_CACHE_SECONDS`, 0 por defecto) solo si las condiciones de Careerjet lo permiten.
- La web muestra "Más vacantes en la web" bajo los resultados propios, con "Publicada en Careerjet", el enlace "Empleos por Careerjet" y el botón "Ver oferta" (`rel="nofollow noopener noreferrer sponsored"`, pestaña nueva).
- Esas vacantes no tienen página propia, no llevan JobPosting, no entran en el sitemap, no piden registro y la respuesta de la API lleva `X-Robots-Tag: noindex` y `Cache-Control: no-store`.
- Si Careerjet falla o tarda más de `EXTERNAL_JOBS_TIMEOUT_MS`, la sección queda vacía; ProJobs sigue funcionando.

## Variables (servicios ProJobs-API-QA y ProJobs API)

| Variable | Valor | Notas |
|---|---|---|
| `CAREERJET_API_KEY` | clave del publisher | Ya creada en ambos servicios (2026-11-19). Nunca en el repo. |
| `EXTERNAL_JOBS_ENABLED` | `true` | Sin ella (o con `false`) la integración está apagada aunque haya clave. |
| `CAREERJET_LOCALE` | `es_CO` | Por defecto. Si Careerjet no lo soporta responde 400: revisar logs. |
| `EXTERNAL_JOBS_CACHE_SECONDS` | `0` | Subir (máx. 3600) solo si los términos permiten caché. |
| `EXTERNAL_JOBS_TIMEOUT_MS` | `4000` | Por defecto. |

## Bloqueo actual: IP de salida

Careerjet exige declarar hasta 8 IP de servidor. Render (región Oregon, plan free) sale por los rangos `74.220.48.0/24` y `74.220.56.0/24`. Se pidió a Careerjet (2026-11-19) que acepte los rangos. Si lo rechazan, opciones: proxy de IP fija (Fixie/QuotaGuard) o plan de Render con IP dedicada.

## Activación (cuando Careerjet confirme)

1. Revisar las condiciones del programa de publisher: mostrar resultados en el sitio, atribución exigida, enlaces sin modificar, caché permitida, pagos por clic, soporte de `es_CO`.
2. Publicar el párrafo de privacidad de abajo en `apps/core/src/content/legal/privacidad.md` (y fecha de actualización) **antes o junto con** la activación.
3. En **QA**: `EXTERNAL_JOBS_ENABLED=true` en ProJobs-API-QA → redeploy → buscar en https://projobs-qa.prosolutions.page y revisar logs (`external jobs: careerjet enabled`, sin `external jobs search failed`).
4. En **producción**: misma variable en ProJobs API, con autorización del owner.

## Párrafo para la política de privacidad (pendiente de publicar)

En "Encargados y transferencias internacionales", después de la lista:

> **Vacantes de otros portales (ProJobs):** cuando buscas empleo en ProJobs mostramos también ofertas de Careerjet. Para obtenerlas enviamos a Careerjet tu búsqueda (palabras clave y ciudad), tu dirección IP y la identificación de tu navegador, datos que Careerjet exige para prevenir el fraude. Careerjet los trata como responsable independiente según su propia política de privacidad. No le enviamos tu nombre, correo ni hoja de vida. Al abrir una oferta pasas al sitio de Careerjet o del empleador, que aplican sus propias políticas.
