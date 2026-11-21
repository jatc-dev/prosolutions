# ProCV — Protocolo de calidad de paginación PDF

**Documento de evidencia histórica.** Desde el 2026-11-20 el backend ya no genera PDF (se eliminaron Puppeteer, la ruta `GET /api/cvs/:id/pdf` y los scripts `pdf:smoke` / `pdf:audit`); el PDF y el Word se generan en el navegador desde el editor. Alcance inicial: 9 plantillas de CV. Fecha de la primera ejecución registrada: 2026-03-16.

## Ejecución reproducible

Desde `apps/procv/backend`:

```bash
npm run pdf:smoke
npm run pdf:audit
```

El smoke test genera PDFs para las plantillas disponibles. El audit automatizado inspecciona geometría y riesgos de paginación. La salida se genera en el directorio temporal configurado por el backend; no debe versionarse como artefacto.

## Criterios de revisión

- Los encabezados de sección no deben quedar aislados al final de página.
- Los bloques de experiencia y educación deben conservar una lectura coherente.
- El encabezado y los datos de contacto deben permanecer legibles.
- Las listas, enlaces y márgenes no deben sufrir recortes horizontales.
- La última página no debe truncar contenido.
- Los colores y elementos visuales deben conservar contraste suficiente en impresión.

## Evidencia registrada

En la ejecución del **2026-10-16** se documentó:

| Plantilla | Resultado automatizado | Páginas estimadas | Bloques divididos | Encabezados huérfanos | Recorte horizontal |
|---|---:|---:|---:|---:|---:|
| minimal | PASS | 6 | 0 | 0 | 0 |
| sidebar | PASS | 6 | 0 | 0 | 0 |
| corporate | PASS | 7 | 0 | 0 | 0 |
| developer | PASS | 7 | 0 | 0 | 0 |
| creative | PASS | 7 | 0 | 0 | 0 |
| classic | PASS | 5 | 0 | 0 | 0 |
| executive | PASS | 7 | 0 | 0 | 0 |
| timeline | PASS | 7 | 0 | 0 | 0 |
| compact | PASS | 5 | 0 | 0 | 0 |

La evidencia de esa fecha también registra una revisión visual de las nueve plantillas. Es un resultado histórico de los fixtures probados, no una garantía para futuras versiones.

## Registro de defectos

Para cada defecto, registra plantilla, severidad, página, sección, descripción y corrección propuesta. Distingue siempre entre resultado automatizado y revisión visual humana.
