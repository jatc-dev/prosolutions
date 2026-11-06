# Documentación técnica

Esta carpeta contiene documentación transversal. Las instrucciones de uso y desarrollo de cada aplicación viven junto a su código.

## Arquitectura
- `architecture/`: decisiones de arquitectura (ADR), modelos de datos, límites entre módulos y planes técnicos. Los documentos fechados son registros históricos, no necesariamente el estado actual.
  
## Despliegue
- `deployment/`: procedimientos y controles de preparación de releases. Verifica siempre que el procedimiento corresponda al servicio y proveedor actuales antes de ejecutarlo.

## Seguridad
- `security/`: modelo de seguridad, análisis, inventarios, RLS y planes de remediación. Los informes de auditoría reflejan el alcance y la fecha indicados en cada documento; no sustituyen una evaluación actual.

## Calidad
- `quality/`: protocolos reproducibles y evidencias de validación. Distingue resultados automatizados de inspecciones manuales y vuelve a ejecutar las pruebas cuando cambie el código.

## Convenciones
- Mantén aquí documentación que aplique a más de un módulo o que describa decisiones transversales.
- Mantén las guías de desarrollo local y comandos específicos dentro de `apps/<modulo>/README.md`.
- Prefiere ADR breves para decisiones permanentes; evita duplicar instrucciones operativas en varios archivos.
- Añade fecha, alcance, versión o commit a informes que representen una auditoría puntual.
- Marca explícitamente documentos obsoletos como históricos; no presentes planes antiguos como instrucciones vigentes.
