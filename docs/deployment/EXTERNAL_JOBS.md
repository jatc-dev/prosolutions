# Vacantes externas en ProJobs (Careerjet y Remotive)

Estado:

- **Careerjet**: código listo y **apagado** (`CAREERJET_ENABLED`). Se activa cuando Careerjet acepte las IP de salida de Render y el owner confirme sus condiciones.
- **Remotive**: código listo; se activa con `REMOTIVE_ENABLED=true`. No envía datos de los visitantes. La API pública devuelve pocas vacantes (15 el 2026-11-19, 9 abiertas a Colombia); la API privada es de pago.

## Cómo funciona

- `GET /api/external-jobs?q=&location=&page=` consulta en paralelo las fuentes activas; si una falla, las demás siguen respondiendo.
- **Remotive** (`https://remotive.com/api/remote-jobs`): una copia en memoria que se renueva cada 6 horas (sus términos piden no más de ~4 consultas al día), filtrada localmente por palabras clave. Solo se muestran ofertas abiertas a Colombia (Worldwide, LATAM, Americas, Colombia…). Cada oferta enlaza a Remotive y se cita la fuente; sus términos prohíben enviarlas a Google Jobs y usarlas para captar registros, por eso no hay JobPosting ni registro.
- **Careerjet** busca en vivo (`https://search.api.careerjet.net/v4/query`) con la clave del publisher, la IP (`req.ip`) y el user agent del visitante, que Careerjet exige.
- No se guarda nada en la base de datos ni hay migraciones. Caché en memoria opcional (`EXTERNAL_JOBS_CACHE_SECONDS`, 0 por defecto) solo si las condiciones de Careerjet lo permiten.
- La web muestra "Más vacantes en la web" bajo los resultados propios, con "Publicada en Careerjet", el enlace "Empleos por Careerjet" y el botón "Ver oferta" (`rel="nofollow noopener noreferrer sponsored"`, pestaña nueva).
- Esas vacantes no tienen página propia, no llevan JobPosting, no entran en el sitemap, no piden registro y la respuesta de la API lleva `X-Robots-Tag: noindex` y `Cache-Control: no-store`.
- Si Careerjet falla o tarda más de `EXTERNAL_JOBS_TIMEOUT_MS`, la sección queda vacía; ProJobs sigue funcionando.

## Variables (servicios ProJobs-API-QA y ProJobs API)

| Variable | Valor | Notas |
|---|---|---|
| `CAREERJET_API_KEY` | clave del publisher | Ya creada en ambos servicios (2026-11-19). Nunca en el repo. |
| `CAREERJET_ENABLED` | `true` | Sin ella (o con `false`) Careerjet está apagado aunque haya clave. Envía IP y user agent del visitante a Careerjet: publicar antes el párrafo de privacidad. |
| `REMOTIVE_ENABLED` | `true` | Activa Remotive. No envía datos del visitante. |
| `CAREERJET_LOCALE` | `es_CO` | Por defecto. Si Careerjet no lo soporta responde 400: revisar logs. |
| `EXTERNAL_JOBS_CACHE_SECONDS` | `0` | Subir (máx. 3600) solo si los términos permiten caché. |
| `EXTERNAL_JOBS_TIMEOUT_MS` | `4000` | Por defecto. |

## Bloqueo actual: IP de salida

Careerjet exige declarar hasta 8 IP de servidor. Render (región Oregon, plan free) sale por los rangos `74.220.48.0/24` y `74.220.56.0/24`. Se pidió a Careerjet (2026-11-19) que acepte los rangos. Si lo rechazan, opciones: proxy de IP fija (Fixie/QuotaGuard) o plan de Render con IP dedicada.

## Activación (cuando Careerjet confirme)

1. Revisar las condiciones del programa de publisher: mostrar resultados en el sitio, atribución exigida, enlaces sin modificar, caché permitida, pagos por clic, soporte de `es_CO`.
2. Publicar el párrafo de privacidad de abajo en `apps/core/src/content/legal/privacidad.md` (y fecha de actualización) **antes o junto con** la activación.
3. En **QA**: `CAREERJET_ENABLED=true` en ProJobs-API-QA → redeploy → buscar en https://projobs-qa.prosolutions.page y revisar logs (`external jobs` con `providers` que incluya `careerjet`, sin `external jobs search failed`).
4. En **producción**: misma variable en ProJobs API, con autorización del owner.

## Párrafo para la política de privacidad (pendiente de publicar)

En "Encargados y transferencias internacionales", después de la lista:

> **Vacantes de otros portales (ProJobs):** cuando buscas empleo en ProJobs mostramos también ofertas de Careerjet. Para obtenerlas enviamos a Careerjet tu búsqueda (palabras clave y ciudad), tu dirección IP y la identificación de tu navegador, datos que Careerjet exige para prevenir el fraude. Careerjet los trata como responsable independiente según su propia política de privacidad. No le enviamos tu nombre, correo ni hoja de vida. Al abrir una oferta pasas al sitio de Careerjet o del empleador, que aplican sus propias políticas.
