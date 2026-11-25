#!/usr/bin/env bash
# Encrypted logical backups of the ProSolutions Neon databases.
#
#   db-backup.sh dump   <name> <source-url> <out-dir>   pg_dump + row-count manifest + age encryption
#   db-backup.sh verify <name> <out-dir> <restore-url>  restore the plain dump and compare row counts
#
# The source role must bypass RLS (neondb_owner does): several ProCV and
# ProJobs tables use FORCE ROW LEVEL SECURITY, and a filtered dump would be
# silently incomplete. Dumps contain password hashes, session hashes and the
# ProCV context signing keys, so only the age-encrypted file may leave the job.
# BACKUP_AGE_RECIPIENT holds the public key; the private key never touches CI.
set -euo pipefail

mode="${1:?mode: dump|verify}"
name="${2:?database name}"

counts_sql="
SELECT format('%s.%s', n.nspname, c.relname) || E'\t' ||
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname), false, true, '')))[1]::text
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY 1"

case "$mode" in
  dump)
    src="${3:?source url}"
    out="${4:?output dir}"
    : "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT (age public key) is required}"
    mkdir -p "$out"
    # Same snapshot for the manifest and the dump is not possible across two
    # sessions; counts are taken first and the verify step allows growth only.
    psql "$src" -v ON_ERROR_STOP=1 -AtXq -c "$counts_sql" > "$out/$name.counts.tsv"
    psql "$src" -v ON_ERROR_STOP=1 -AtXq -c "SELECT rolname FROM pg_roles WHERE rolname !~ '^(pg_|neon)' ORDER BY 1" > "$out/$name.roles.txt"
    pg_dump "$src" --format=custom --compress=6 --no-comments --file="$out/$name.dump"
    age --recipient "$BACKUP_AGE_RECIPIENT" --output "$out/$name.dump.age" "$out/$name.dump"
    echo "$name: $(wc -l < "$out/$name.counts.tsv") tables, $(du -h "$out/$name.dump" | cut -f1) dump"
    ;;
  verify)
    out="${3:?output dir}"
    restore="${4:?restore url}"
    psql "$restore" -v ON_ERROR_STOP=1 -qX -c "DROP DATABASE IF EXISTS \"verify_$name\"" -c "CREATE DATABASE \"verify_$name\""
    target="${restore%/*}/verify_$name"
    # Grants and policies name the production roles; create them without login.
    while read -r role; do
      [ -n "$role" ] && psql "$restore" -qX -c "DO \$\$BEGIN CREATE ROLE \"$role\" NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END\$\$;"
    done < "$out/$name.roles.txt"
    # Neon-only objects (extensions, publications) may fail; the data check below decides.
    pg_restore --dbname="$target" --no-owner "$out/$name.dump" 2> "$out/$name.restore.log" || true
    psql "$target" -v ON_ERROR_STOP=1 -AtXq -c "$counts_sql" > "$out/$name.restored.tsv"
    # Every table in the manifest must exist with at least the counted rows
    # (rows inserted between the count and the dump are allowed, losses are not).
    status=0
    while IFS=$'\t' read -r table expected; do
      actual="$(awk -F'\t' -v t="$table" '$1 == t { print $2 }' "$out/$name.restored.tsv")"
      if [ -z "$actual" ]; then echo "::error::$name: table $table missing after restore"; status=1
      elif [ "$actual" -lt "$expected" ]; then echo "::error::$name: $table has $actual rows, expected at least $expected"; status=1
      fi
    done < "$out/$name.counts.tsv"
    [ "$status" -eq 0 ] && echo "$name: restore verified ($(wc -l < "$out/$name.counts.tsv") tables)"
    exit "$status"
    ;;
  *) echo "unknown mode: $mode" >&2; exit 2 ;;
esac
