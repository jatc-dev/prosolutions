# ProSolutions — línea base legal y plan de implementación

> **Estado: BORRADOR INTERNO / NO PUBLICAR.**  
> Rama de referencia: `qa`. Línea base inspeccionada: `0e8056a32b0cd0bfac9c18c9b96a22abda9adf0c`.  
> Este documento organiza requisitos y trabajo técnico; no constituye concepto jurídico ni reemplaza revisión profesional en Colombia.

## 1. Modelo operativo confirmado

- Responsable previsto: **Alejandro Torres**, persona natural domiciliada en Colombia. La identidad legal completa indicada por el titular queda incorporada para la preparación de los documentos; su publicación final queda condicionada a verificar los demás datos de contacto y el texto jurídico.
- Marca comercial utilizada: JATC.DEV (no se presentará como sociedad ni como marca registrada).
- Plataforma: ProSolutions, integrada por Core, ProIdentity, ProCV y ProJobs.
- Modelo para usuarios: gratuito.
- Monetización prevista: publicidad, incluida Google AdSense.
- No se ha definido un modelo de suscripción o cobro a usuarios.
- Correo propuesto de privacidad: `privacidad@prosolutions.page`.
- Correo propuesto para asuntos legales: `legal@prosolutions.page`.
- Correo propuesto de soporte: `soporte@prosolutions.page`.

Los datos de contacto físicos y telefónicos suministrados por el titular se mantienen fuera de este documento y del repositorio hasta completar la identificación legal, comprobar la disponibilidad de los canales y aprobar el texto definitivo que se publicará.

## 2. Identificación del responsable y límites de divulgación

La política debe identificar al responsable como persona natural, por su nombre legal completo, e indicar que utiliza JATC.DEV como marca y opera ProSolutions. No debe afirmar que JATC.DEV es una persona jurídica, SAS o marca registrada.

No incorporar al repositorio ni publicar:
- Copia, fotografía, QR o número de cédula sin una necesidad legal validada.
- RUT completo.
- Datos tributarios, bancarios o documentos privados.
- Domicilio o teléfono personal antes de validar el alcance de publicación y contar con aprobación del texto final.

La Ley 1581 de 2012, artículo 12, exige informar la identificación, dirección física o electrónica y teléfono del responsable al solicitar autorización. El Decreto 1074 de 2015, artículo 2.2.2.25.3.1, enumera los datos mínimos de la política, incluidos nombre o razón social, domicilio, dirección, correo y teléfono.

La Ley 1480 de 2011, artículos 49 y 50, regula el comercio electrónico y exige a los proveedores comprendidos en su ámbito informar nombre o razón social, NIT, dirección de notificación judicial, teléfono y correo. El servicio gratuito financiado por publicidad requiere una calificación jurídica concreta: no se asumirá ni que está automáticamente excluido ni que está automáticamente incluido. El contrato de monetización con Google y la relación gratuita con el usuario deben analizarse por separado.

**Decisión pendiente antes de publicar:** obtener revisión jurídica colombiana sobre la aplicación del artículo 50 al servicio digital gratuito, financiado por publicidad, y documentar la conclusión. Si el NIT es exigible, se publicará únicamente el dato legalmente requerido, nunca el RUT completo ni una copia de la cédula.

## 3. Domicilio y canales de atención

El titular confirmó un domicilio en Facatativá, Colombia, y un teléfono de contacto, autorizando su publicación en los documentos legales. Antes de publicar:
1. Verificar que el domicilio recibe efectivamente comunicaciones oficiales.
2. Confirmar si puede recibir notificaciones judiciales y si el titular tiene disponibilidad y control de la recepción.
3. Verificar coherencia con los datos tributarios aplicables.
4. Confirmar que el correo de privacidad existe, está operativo y puede conservar trazabilidad de solicitudes.
5. Considerar una línea telefónica profesional dedicada si el número suministrado es personal.

Una oficina virtual o coworking solo será alternativa válida si el contrato permite expresamente el uso declarado y la recepción de notificaciones pertinentes. Un buzón de paquetes o dirección postal no se tratará como domicilio judicial sin validación.

## 4. Obligaciones de protección de datos

La implementación debe cubrir como mínimo:
- Política de tratamiento de datos personales, publicada y accesible.
- Aviso de privacidad en los puntos de recolección.
- Autorización previa, expresa e informada cuando sea requerida y conservación de evidencia.
- Finalidades concretas por producto y categoría de datos.
- Derechos de conocer, actualizar, rectificar, solicitar prueba de autorización, ser informado del uso, presentar quejas ante la SIC, revocar autorización y solicitar supresión cuando proceda.
- Canal y procedimiento para consultas y reclamos, con plazos legales.
- Medidas de seguridad, acceso por roles, trazabilidad y gestión de incidentes.
- Contratos e instrucciones a encargados/proveedores que procesen datos.
- Revisión de transferencias y transmisiones internacionales.
- Reglas de conservación, bloqueo y supresión, incluidas excepciones legales.
- Tratamiento especial para datos sensibles y datos de niños, niñas y adolescentes. Evitar recolectarlos salvo necesidad justificada y cumplimiento de requisitos reforzados.

No se utilizará una fórmula genérica de “interés legítimo” importada del RGPD como sustituto automático de las reglas colombianas de autorización y excepciones de la Ley 1581.

## 5. Mapa inicial de datos y servicios

| Servicio | Datos / operaciones identificados | Trabajo requerido |
|---|---|---|
| ProIdentity | Registro, correo, perfil, credenciales, sesiones, tokens y seguridad | Inventario de campos, finalidades, retención, derechos y eliminación de cuenta |
| ProCV | CV, versiones, análisis ATS y registros de auditoría | Clasificar datos profesionales y posibles datos sensibles; exportación y supresión coordinada |
| ProJobs | Vacantes, empleos guardados, postulaciones, búsquedas y alertas | Inventario completo, exportación y supresión por usuario |
| Core | Portal, preferencias y acceso a módulos | Avisos en formularios, enlaces legales y gestión de preferencias |
| Publicidad / medición | Cookies, identificadores, eventos y tecnologías de terceros | CMP, consentimiento, política de cookies y configuración de Google |

La clasificación anterior es preliminar y debe contrastarse con esquemas, endpoints, logs, proveedores y flujos reales. No debe interpretarse como inventario exhaustivo.

## 6. Publicidad, cookies y Google

La política debe describir de forma veraz el uso de cookies, almacenamiento local, identificadores, medición, direcciones IP y tecnologías de publicidad de Google y otros proveedores, según la configuración efectiva.

Plan técnico:
- Inventariar todas las etiquetas y scripts por dominio y subdominio.
- Cargar una sola instancia de Google Tag Manager por documento, evitando duplicados.
- Definir categorías de consentimiento y preferencias persistentes y revocables.
- Configurar Consent Mode v2 antes de inicializar etiquetas que dependan del consentimiento.
- No disparar etiquetas no esenciales antes de obtener la señal requerida para la jurisdicción y finalidad.
- Usar una CMP certificada compatible con IAB TCF para los requisitos de Google en EEE, Reino Unido y Suiza.
- Mantener un enlace visible para reabrir preferencias.
- No cargar AdSense en páginas privadas, autenticadas o de herramientas si no son aptas conforme a políticas de Google.
- Validar que la política describe la configuración real y no capacidades que no están activas.

No instalar todavía un CMP, cambiar etiquetas ni activar nuevas transferencias hasta decidir proveedor, configuración y alcance por dominio.

## 7. Derechos del usuario y eliminación de cuenta

La experiencia de privacidad debe ofrecer:
- Acceso y actualización de datos.
- Solicitud de copia/exportación en formato legible.
- Consultas y reclamos.
- Revocación de autorizaciones y preferencias de cookies.
- Solicitud de supresión y eliminación de cuenta.
- Estado y confirmación de cada solicitud.

La eliminación debe diseñarse como un flujo coordinado:
1. Reautenticación y confirmación explícita.
2. Registro de solicitud y plazo.
3. Revocación de todas las sesiones y credenciales.
4. Bloqueo de nuevos tratamientos no necesarios.
5. Eliminación o anonimización coordinada en Identity, ProCV y ProJobs.
6. Tratamiento de registros de auditoría, obligaciones legales y prevención del fraude mediante retención limitada y justificada.
7. Propagación a encargados cuando corresponda.
8. Política documentada para copias de seguridad y expiración.
9. Confirmación al titular y conservación de evidencia mínima de cumplimiento.

**Hallazgo de la revisión de código:** en `apps/identity/src/routes/auth.ts` no se observó una ruta de eliminación de cuenta; se exponen rutas de registro, autenticación, perfil y gestión de sesiones. La revisión anterior tampoco encontró un flujo central completo de supresión que coordine los tres servicios. Esto debe verificarse con búsqueda integral antes de diseñar la implementación. No afirmar que la eliminación está disponible hasta contar con pruebas de integración.

## 8. Auditoría técnica inicial en la rama qa

- `apps/projobs/privacidad.html` contiene una página breve centrada en cookies y anuncios; no constituye una política completa del ecosistema.
- El footer compartido `packages/ui/src/ProFooter.tsx` enlaza a privacidad y términos, pero todavía no ofrece un centro legal integral ni un canal de privacidad.
- Core usa rutas React y actualmente no muestra rutas públicas legales en `apps/core/src/App.tsx`.
- ProCV tiene un sitemap que solo contiene la página principal.
- ProJobs tiene un sitemap que contiene inicio y una página de privacidad antigua.
- ProCV dispone de robots.txt con referencia a su sitemap.
- Hay archivos `ads.txt` en Core, ProCV y ProJobs; validar que cada uno corresponde al publisher y host correctos.
- Se observan preferencias de tema/idioma almacenadas en cookies/localStorage; no deben confundirse con consentimiento de publicidad.

La auditoría completa debe revisar también el HTML de Core y ProCV, el generador de ProJobs, enlaces de navegación, canonical, robots, sitemap, indexación de páginas privadas y etiquetas de analítica/ads.

## 9. Entregables propuestos

1. `PRIVACY_POLICY.md`: política de tratamiento y privacidad del ecosistema.
2. `COOKIE_POLICY.md`: cookies, publicidad, analítica y gestión de preferencias.
3. `TERMS_OF_USE.md`: condiciones del servicio gratuito, límites, contenido de usuarios y enlaces externos.
4. `DATA_RETENTION_AND_DELETION.md`: conservación, supresión, copias y excepciones.
5. `DATA_SUBJECT_REQUESTS.md`: canal, validación de identidad, consultas y reclamos.
6. `LEGAL_REVIEW_CHECKLIST.md`: decisiones jurídicas y tributarias pendientes.
7. Centro público de privacidad con páginas compartidas o versiones sincronizadas en los dominios.
8. Implementación CMP/Consent Mode y controles de consentimiento.
9. Flujo técnico de exportación y eliminación de cuenta.
10. QA de enlaces, formularios, cookies, consentimientos, exportación, eliminación y aislamiento de datos.

## 10. Bloqueos antes de publicar

- Nombre legal completo del responsable.
- Confirmación de que los alias de correo se crearon y reciben/responden correctamente.
- Confirmación operativa del domicilio y canal telefónico.
- Revisión jurídica sobre Ley 1480, artículo 50, en el modelo gratuito con publicidad.
- Verificación del RUT, actividades económicas y responsabilidades tributarias con la DIAN/contador; no almacenar datos privados en el repositorio.
- Inventario definitivo de encargados, subencargados, transferencias y tecnologías.
- Política de retención y eliminación aprobada.
- Implementación técnica y pruebas reales del flujo de derechos.
- Revisión legal final antes de publicación.

## 11. Límites de despliegue

Este trabajo se desarrolla como preparación en `qa`. No modificar `main`, producción, dominios, DNS, secretos, servicios Render ni bases de datos de producción. No ejecutar migraciones. Cualquier migración Neon de producción requiere plan específico y aprobación independiente. No crear infraestructura de pago sin autorización.

## 12. Fuentes normativas oficiales para revisión

- Ley 1581 de 2012 — Cancillería: https://www.cancilleria.gov.co/normograma/compilacion/docs/ley_1581_2012.htm
- Decreto 1074 de 2015 — Cancillería: https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/decreto_1074_2015_pr025.htm
- Ley 1480 de 2011 — Función Pública: https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306
- Ley 1480 de 2011 — compilación DIAN: https://normograma.dian.gov.co/dian/compilacion/docs/ley_1480_2011.htm
- SIC — Ley 1581 de 2012: https://sedeelectronica.sic.gov.co/transparencia/normativa/ley-estatutaria-1581-de-2012
- SIC — consulta sobre ámbito de RNBD y datos personales: https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/ambito-de-aplicacion-de-la-ley-1581-de-2012-en-datos-corporativos

---
**Nota:** Las referencias normativas deben revisarse en su versión vigente y aplicarse al flujo real de ProSolutions. Este documento no es una opinión legal definitiva.
