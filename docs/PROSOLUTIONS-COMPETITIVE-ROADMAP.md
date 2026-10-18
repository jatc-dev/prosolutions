# ProSolutions — propuesta de evolución competitiva

Fecha: 2026-10-18

Este documento distingue capacidades recomendadas de funcionalidades ya implementadas. No habilitar características transaccionales hasta contar con API, almacenamiento seguro, permisos, consentimiento, pruebas y observabilidad.

## Prioridad 0 — Fiabilidad y experiencia unificada

1. Catálogo compartido de países y valores ISO 3166-1 alpha-2 para evitar variantes como US/USA/United States.
2. Selector accesible con búsqueda, teclado, idioma actual y compatibilidad con valores históricos.
3. Una única implementación del editor ProCV para invitado y usuario registrado; las diferencias deben ser de persistencia y permisos, no de herramientas de edición.
4. Contrato de datos común para carga, guardado, importación, exportación y renderizado de CV. Las respuestas de API y el almacenamiento local deben normalizar la misma estructura.
5. Pruebas de regresión para reabrir CVs, conservar nacionalidad/país, cambios de plantilla, importación y exportación PDF.

## Prioridad 1 — Valor inmediato para candidatos

- **Búsqueda avanzada ProJobs:** filtros combinables, ordenar por relevancia/fecha, etiquetas activas, recuento, limpiar filtros, búsquedas compartibles por URL y mensajes de cero resultados.
- **Ofertas guardadas y alertas:** guardar búsquedas/ofertas, alertas por correo con frecuencia configurable, consentimiento explícito y baja sencilla.
- **CV orientado a vacante:** comparar CV con descripción de puesto, mostrar coincidencias y brechas de habilidades con explicaciones, sugerir mejoras concretas y permitir aceptar/rechazar cada cambio.
- **Carta de presentación:** generar un borrador editable desde el CV y una vacante; no inventar experiencia ni enviar nada automáticamente.
- **Preparación de entrevistas:** preguntas por puesto y nivel, simulación guiada, rúbrica y recomendaciones de práctica; dejar claro que la evaluación es orientativa.
- **Perfil profesional portable:** historial de CV/versiones, portfolio de enlaces, logros y habilidades estructuradas, privado por defecto.

## Prioridad 2 — Carrera y aprendizaje

- **Mapa de habilidades:** comparar habilidades declaradas con requisitos frecuentes de roles objetivo y recomendar un plan de aprendizaje por etapas.
- **Rutas de carrera:** comparar roles relacionados, competencias transferibles y posibles próximos pasos, sin presentar predicciones como certezas.
- **Seguimiento de búsqueda:** tablero privado de candidaturas introducidas por el propio usuario, etapas, fechas, notas y recordatorios. Distinguirlas de postulaciones externas que ProSolutions no puede consultar.
- **Preparación de perfil público opcional:** enlaces compartibles con expiración, controles de campos visibles y revocación inmediata.

## Prioridad 3 — Herramientas para empresas y reclutamiento

- Perfil de empresa verificado, publicación/edición/caducidad de ofertas y gestión de permisos por equipo.
- ATS ligero: pipeline configurable, evaluación estructurada, historial de actividad y colaboración entre reclutadores.
- Formularios de postulación, mensajes y agenda solo cuando ProSolutions gestione el proceso directamente.
- Búsqueda de talento basada en perfiles que eligieron ser visibles; acceso con consentimiento, auditoría y controles anti-extracción.
- Analítica de vacantes: vistas, clics, conversiones, calidad de fuente y tiempo de cobertura; evitar métricas engañosas.

## Prioridad 4 — Monetización responsable

- Premium para herramientas de productividad: CV/versiones adicionales, alertas avanzadas y personalización ampliada con beneficios claros.
- Publicaciones patrocinadas con etiqueta visible, expiración automática y separación del ranking orgánico.
- Planes para empresas por volumen de ofertas, colaboración y analítica.
- AdSense limitado y medido; nunca ocultar contenido, confundir anuncios con ofertas orgánicas ni degradar accesibilidad.

## Requisitos transversales de calidad

- Accesibilidad WCAG 2.2 AA como objetivo: teclado, foco visible, etiquetas, contraste, lectores de pantalla y pruebas móviles.
- Español/inglés coherentes, formatos regionales y persistencia independiente del idioma de interfaz.
- Privacidad por defecto, minimización de datos, exportación/eliminación, consentimiento revocable y auditoría de acciones sensibles.
- Seguridad: autorización por propietario, validación de entrada, límites de tasa, protección anti-spam/fraude y políticas RLS verificadas.
- Observabilidad de fuentes de empleo, fecha de última comprobación, enlaces rotos y ofertas caducadas.
- Métricas de producto: tasa de búsqueda sin resultados, clics externos, CV guardados correctamente, errores de exportación, retención y satisfacción.

## Secuencia recomendada

1. Corregir carga/guardado de datos y normalización de países.
2. Consolidar el editor único y comprobar paridad invitado/registrado.
3. Añadir pruebas de regresión, build y verificación de publicación.
4. Mejorar búsqueda y calidad de catálogo ProJobs.
5. Lanzar guardados/alertas y flujo seguro de integración ProCV–ProJobs.
6. Construir módulos de empresa/ATS y después monetización.

Las funciones con persistencia, correos, cuentas de empresa, pagos o exposición de perfiles necesitan diseño de datos, migraciones, controles de seguridad y pruebas antes de presentarse como disponibles.
