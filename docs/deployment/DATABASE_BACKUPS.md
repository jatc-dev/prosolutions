# Copias de seguridad de las bases de datos

Neon conserva solo 6 horas de historial para restaurar en el plan actual. El workflow
[`database-backup.yml`](../../.github/workflows/database-backup.yml) guarda cada día, fuera de
Neon, una copia cifrada de `proidentity`, `procv` y `projobs`, y en la misma ejecución restaura cada
copia en un PostgreSQL temporal y compara el número de filas por tabla.

- Frecuencia: todos los días a las 02:15 (Bogotá), y a mano desde *Actions → Database backup → Run workflow*.
- Conservación: 30 días como artefacto de GitHub Actions (`db-backup-<run id>`).
- Contenido: incluye hashes de contraseñas y de sesiones y las claves de firma del contexto RLS de ProCV.
  Por eso solo se suben los archivos `.age` cifrados. El repositorio es público y cualquier usuario de
  GitHub puede descargar los artefactos.
- Aviso de fallo: GitHub envía un correo cuando falla un workflow programado.

## Configuración (una vez)

1. Generar el par de claves en tu equipo (en Windows: `winget install FiloSottile.age`):
   ```
   age-keygen -o prosolutions-backup.key
   ```
   El archivo contiene la clave privada y, en un comentario, la pública (`age1…`).
   Guarda la clave privada fuera del repositorio y del correo (gestor de contraseñas o medio offline).
   Sin ella las copias no se pueden abrir.
2. En GitHub, *Settings → Secrets and variables → Actions*:
   - Variable `BACKUP_AGE_RECIPIENT`: la clave pública `age1…`.
   - Secretos `BACKUP_DB_PROIDENTITY_URL`, `BACKUP_DB_PROCV_URL` y `BACKUP_DB_PROJOBS_URL`: la URL
     **directa** (sin `-pooler`) de cada base de producción con el rol `neondb_owner`, copiada desde la
     consola de Neon. Ese rol puede saltarse RLS; un rol de la aplicación produciría copias incompletas,
     porque varias tablas usan `FORCE ROW LEVEL SECURITY`.
3. Ejecutar el workflow a mano una vez y confirmar que termina en verde.

## Restaurar

1. Descargar el artefacto `db-backup-<run id>` y comprobar la integridad: `sha256sum -c SHA256SUMS`.
2. Descifrar: `age --decrypt -i prosolutions-backup.key -o procv.dump procv.dump.age`.
3. Restaurar **en una rama nueva de Neon**, nunca directamente sobre producción:
   ```
   pg_restore --dbname="<url directa de la rama nueva>" --no-owner --clean --if-exists procv.dump
   ```
4. Revisar los datos en la rama y, solo entonces, decidir si se copian datos concretos a producción o
   se cambia la rama por defecto. Ambas operaciones requieren autorización del owner.
