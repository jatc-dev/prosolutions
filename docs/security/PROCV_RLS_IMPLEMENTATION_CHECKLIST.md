# Checklist individual de implementación RLS ProCV

Inventario fuente: rama projobs-test-2026-10-29, SHA a7ae8de82037ee2baefba544ccabd671ff223429; no es PR #103. Las 33 operaciones OP-001..033 permanecen no implementadas.

## Estados por operación

Cada casilla es independiente. No marcar “validada PostgreSQL real” por mocks. Esta tarea solo documenta; ninguna casilla debe quedar marcada.

| ID | Cat. | Pendiente | Implementada | Compilada | Probada | Validada PostgreSQL RLS real | Tarea verificable y aceptación |
|---|---|---|---|---|---|---|---|
| OP-001 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Cambiar batch por withUserContext interactivo; contexto antes de las operaciones. |
| OP-002 | A | [ ] | [ ] | [ ] | [ ] | [ ] | findMany listado usa tx y where userId; test A/B. |
| OP-003 | A | [ ] | [ ] | [ ] | [ ] | [ ] | count listado comparte tx/context de OP-002. |
| OP-004 | A | [ ] | [ ] | [ ] | [ ] | [ ] | findFirst detalle/tailor contextual; principal autenticado, owner y cache aislada. |
| OP-005 | A | [ ] | [ ] | [ ] | [ ] | [ ] | create CV fija owner desde principal; WITH CHECK real rechaza otro owner. |
| OP-006 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Prelectura update dentro de tx común y filtro id+userId. |
| OP-007 | A | [ ] | [ ] | [ ] | [ ] | [ ] | update comparte tx; policy/check no permite cambio de owner. |
| OP-008 | A | [ ] | [ ] | [ ] | [ ] | [ ] | create version comparte update tx; error revierte CV; parent propio. |
| OP-009 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Prelectura delete en tx común, parent propio. |
| OP-010 | A | [ ] | [ ] | [ ] | [ ] | [ ] | CV delete contextual/atómico; resolver retención/huérfanos y ATS cascade. |
| OP-011 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Export read contextual; cache por principal; PDF render después del tx. |
| OP-012 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Parent read de versiones comparte tx con query hija. |
| OP-013 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Version findMany vía policy EXISTS; orphan/null no visible al usuario. |
| OP-014 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Restore parent read comparte tx con version y update. |
| OP-015 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Version de restore ligada al mismo CV/owner. |
| OP-016 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Restore update contextual; definir snapshot de restore; caches post-commit. |
| OP-017 | A | [ ] | [ ] | [ ] | [ ] | [ ] | ATS parent read contextual; revalidar tras cálculo CPU si se divide. |
| OP-018 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Insert ATS model delegate o raw tipado parametrizado; parent policy; rollback. |
| OP-019 | A | [ ] | [ ] | [ ] | [ ] | [ ] | History parent read con contexto A. |
| OP-020 | A | [ ] | [ ] | [ ] | [ ] | [ ] | ATS history tipado/parametrizado, límite 1..30, policy de parent. |
| OP-021 | B | [ ] | [ ] | [ ] | [ ] | [ ] | AuditLog writer recibe tx + actor verificado, no traga error audit-required; migrar callers. |
| OP-022 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Audit findMany solo admin vigente con withAdminContext. |
| OP-023 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Audit count mismo tx de OP-022; paginación consistente. |
| OP-024 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Settings findMany admin contextual; privado no user. |
| OP-025 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Upsert setting + audit OP-021 atómicos; redactar secreto. |
| OP-026 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Bulk upserts + audit all-or-nothing; prueba fallo a mitad. |
| OP-027 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Read pre-delete setting en tx admin común. |
| OP-028 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Delete + read + audit transaccionales; error audit revierte. |
| OP-029 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Raw count owners con tx admin; SQL literal/param seguro. |
| OP-030 | B | [ ] | [ ] | [ ] | [ ] | [ ] | CV count stats comparte tx con OP-029. |
| OP-031 | B | [ ] | [ ] | [ ] | [ ] | [ ] | Chart CV read contextual admin y campos mínimos. |
| OP-032 | C | [ ] | [ ] | [ ] | [ ] | [ ] | Landing helper público, filtro key+isPublic antes de leer. |
| OP-033 | D | [ ] | [ ] | [ ] | [ ] | [ ] | Health solo SELECT 1, confirmar rol mínimo; timeout/cancelación. |

## Operaciones requeridas nuevas que no existen en inventario estático

| ID | Cat. | Pendiente | Implementada | Compilada | Probada | Validada PostgreSQL RLS real | Aceptación |
|---|---|---|---|---|---|---|---|
| FUT-01 | A | [ ] | [ ] | [ ] | [ ] | [ ] | Añadir deleteMany de CVVersion por cvId en deleteCV si se elige cleanup; misma tx que CV.delete; probar huérfanos y no borrar versión de CV ajeno. No contar como operación actual. |

## Checklist de flujos

- [ ] Crear CV: OP-005; autenticación antes, owner del principal, commit antes de invalidar cache.
- [ ] Listar/detalle/export: OP-001..004, OP-011; cache keys por principal verificado.
- [ ] Actualizar CV/snapshot: OP-006..008; una tx, rollback si falla snapshot.
- [ ] Eliminar CV: OP-009/010/FUT-01; reconciliar comentario migración y FK ausente.
- [ ] Listar/crear versiones: OP-008, OP-012/013; hija depende de padre.
- [ ] Restore: OP-014..016; una tx y decisión de nuevo snapshot.
- [ ] ATS persistido: OP-017..020; parent, persistencia, history; revisar insert-success/history-failure e idempotencia.
- [ ] Stats/audit/settings admin: OP-021..031; auth admin viva y mismo tx para audit-required.
- [ ] Landing público: OP-032; no leer setting privado.
- [ ] Logo: OP-021; reconciliar archivo con audit mediante compensación/outbox.
- [ ] Eliminación cuenta: no hay operación local; definir integración de ProIdentity antes de agregar worker/DB operation.
- [ ] Import pública, ATS draft/tailor, parser PDF/DOCX, render PDF, templates y cache cleanup no consultan Prisma; no requieren contexto de DB en estado observado.

## Gates de rama, schema y roles

- [ ] Obtener rama y SHA reales PR #103; comparar diff antes de editar checkout.
- [ ] Confirmar contrato de introspección: revocación viva, userId, módulos y rol vigente.
- [ ] Auth común y admin usan el mismo issuer/audience; cambio de rol/revoked bloquea query antes de abrir tx admin.
- [ ] Implementar dbContext y compilar Prisma.TransactionClient con Prisma 5.22.0 generado en rama destino.
- [ ] procv_login y procv_runtime pueden SET ROLE procv_app en PostgreSQL aislado.
- [ ] Ninguno de esos roles es owner, superuser o BYPASSRLS; procv_app tampoco owner/BYPASSRLS; mínimo grants.
- [ ] Cinco tablas ENABLE + FORCE; policies amplias previas eliminadas; catálogo coincide.
- [ ] Resolver CVVersion.cvId nullable/sin FK y limpieza/orphan policy.
- [ ] Verificar transaction rollback, rol/GUC local en commit/rollback, pool reutilizado y concurrencia A/B.
- [ ] Probar context absent: ninguna tabla protegida ni escritura; public solo mediante helper explícito.
- [ ] Política de audit failure definida; sin cambio exitoso sin evento para acciones audit-required.
- [ ] Prisma validate/generate, TS build, lint, tests unitarios, integración y PostgreSQL RLS real en base local aislada.
- [ ] Migración desde vacío y upgrade fixture local; sin Actions como única validación.
- [ ] Producción fuera de alcance: ninguna migración/activación productiva en esta fase.

**Regla:** ninguna marca se considera cumplida por documentación. “Probada” requiere ejecutar test y registrar resultado. “Validada PostgreSQL RLS real” requiere consulta desde roles/login y políticas reales en PostgreSQL aislado; un mock no sirve. Todo queda pendiente al crear este documento.
