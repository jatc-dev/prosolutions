# Documentación técnica

Esta carpeta contiene documentación transversal. Las instrucciones de uso y desarrollo de cada aplicación viven junto a su código.

## Arquitectura
- architecture/: decisiones de arquitectura (ADR), modelos de datos y planes técnicos. Los documentos fechados son registros históricos, no necesariamente el estado actual.
- deployment/PRODUCTION_ARCHITECTURE.md: inventario operativo de Render y Neon.
  
## Despliegue y operación
- deployment/DATABASE_MIGRATIONS.md: procedimiento de migraciones por módulo y controles de RLS.
- deployment/ENVIRONMENT_VARIABLES.md: catálogo de variables por servicio, sin valores secretos.
- deployment/PRODUCTION_RELEASE.md: secuencia de release, validación y recuperación.
- deployment/PRODUCTION_CHECKLIST.md: aviso de sustitución; no ejecutar el checklist histórico.

## Seguridad
- security/: modelo de seguridad, análisis, inventarios, RLS y planes de remediación. Los informes de auditoría reflejan el alcance y la fecha indicados; no sustituyen una evaluación actual.

## Calidad
- quality/: protocolos reproducibles y evidencias de validación. Distingue resultados automatizados de inspecciones manuales y vuelve a ejecutar las pruebas cuando cambie el código.

## Convenciones
- Mantén aquí documentación que aplique a más de un módulo o describa decisiones transversales.
- Mantén las guías específicas dentro de apps/<modulo>/README.md.
- Prefiere una única fuente operativa y enlázala desde los README.
- Añade fecha, alcance y commit a informes de auditoría.
- Marca explícitamente documentos obsoletos como históricos; nunca presentes planes antiguos como instrucciones vigentes.
