#!/usr/bin/env bash
# Copy ProIdentity application data from Supabase to Neon.
# Run from a trusted workstation with PostgreSQL client tools installed.
# This script never prints connection URLs or row contents.
set -Eeuo pipefail
umask 077

: "${SUPABASE_IDENTITY_URL:?Set SUPABASE_IDENTITY_URL in your shell; do not paste it into chat}"
: "${NEON_IDENTITY_URL:?Set NEON_IDENTITY_URL to the direct Neon owner connection URL}"
: "${NEON_IDENTITY_RUNTIME_URL:?Set NEON_IDENTITY_RUNTIME_URL to the proidentity_login connection URL}"

for cmd in psql pg_dump diff awk; do
  command -v "$cmd" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$cmd" >&2
    exit 2
  }
done

application_tables=(
  "User"
  "Session"
  "PasswordResetToken"
  "EmailVerificationToken"
  "ProfessionalProfile"
  "ModuleAccess"
  "AuditLog"
)

manifest_sql="
SELECT table_name || '|' || n || '|' || digest
FROM (
  SELECT 'User'::text AS table_name, count(*)::text AS n,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY t.\"id\"),'')) AS digest
    FROM public.\"User\" t
  UNION ALL
  SELECT 'Session', count(*)::text,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY t.\"id\"),''))
    FROM public.\"Session\" t
  UNION ALL
  SELECT 'PasswordResetToken', count(*)::text,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY t.\"id\"),''))
    FROM public.\"PasswordResetToken\" t
  UNION ALL
  SELECT 'EmailVerificationToken', count(*)::text,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY t.\"id\"),''))
    FROM public.\"EmailVerificationToken\" t
  UNION ALL
  SELECT 'ProfessionalProfile', count(*)::text,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY t.\"id\"),''))
    FROM public.\"ProfessionalProfile\" t
  UNION ALL
  SELECT 'ModuleAccess', count(*)::text,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY t.\"id\"),''))
    FROM public.\"ModuleAccess\" t
  UNION ALL
  SELECT 'AuditLog', count(*)::text,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY t.\"id\"),''))
    FROM public.\"AuditLog\" t
  UNION ALL
  SELECT '_prisma_migrations', count(*)::text,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY t.\"id\"),''))
    FROM public.\"_prisma_migrations\" t
) AS manifest
ORDER BY table_name;
"

printf 'Checking source and target connections...\n'
source_db="$(psql --no-psqlrc -X -qAt "$SUPABASE_IDENTITY_URL" -c 'SELECT current_database()')"
target_db="$(psql --no-psqlrc -X -qAt "$NEON_IDENTITY_URL" -c 'SELECT current_database()')"
runtime_role="$(psql --no-psqlrc -X -qAt "$NEON_IDENTITY_RUNTIME_URL" -c 'SELECT current_user')"

[[ -n "$source_db" ]] || { printf 'Source connection failed.\n' >&2; exit 3; }
[[ "$target_db" == "proidentity" ]] || {
  printf 'NEON_IDENTITY_URL must connect to database proidentity (got %s).\n' "$target_db" >&2
  exit 4
}
[[ "$runtime_role" == "proidentity_login" ]] || {
  printf 'NEON_IDENTITY_RUNTIME_URL must connect as proidentity_login (got %s).\n' "$runtime_role" >&2
  exit 5
}

runtime_role_flags="$(psql --no-psqlrc -X -qAt -F '|' "$NEON_IDENTITY_URL" -c "SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_catalog.pg_roles WHERE rolname = 'proidentity_login'")"
[[ "$runtime_role_flags" == "t|f|f|f|f|f" ]] || {
  printf 'Target role proidentity_login must be LOGIN without SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, or BYPASSRLS. Refusing to transfer data.\n' >&2
  exit 10
}
runtime_owned_objects="$(psql --no-psqlrc -X -qAt "$NEON_IDENTITY_URL" -c "SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles r ON r.oid = c.relowner WHERE r.rolname = 'proidentity_login' AND c.relkind IN ('r','p','v','m','S','f')")"
[[ "$runtime_owned_objects" == "0" ]] || {
  printf 'Target role proidentity_login must not own database objects. Refusing to transfer data.\n' >&2
  exit 11
}

# Reconcile only the known-safe case: exactly one User differs in the two
# activity timestamps, while all other User fields and the complete ID set match.
# Temporary manifests contain IDs/timestamps only and are protected by umask 077.
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
source_user_shape="$(psql --no-psqlrc -X -qAt "$SUPABASE_IDENTITY_URL" -c 'SELECT count(*) || \'|\' || md5(COALESCE(string_agg((to_jsonb(t) - \'lastLoginAt\' - \'updatedAt\')::text, E\'\\n\' ORDER BY t."id"), \'\')) FROM public."User" t')"
target_user_shape="$(psql --no-psqlrc -X -qAt "$NEON_IDENTITY_URL" -c 'SELECT count(*) || \'|\' || md5(COALESCE(string_agg((to_jsonb(t) - \'lastLoginAt\' - \'updatedAt\')::text, E\'\\n\' ORDER BY t."id"), \'\')) FROM public."User" t')"
source_user_ids="$(psql --no-psqlrc -X -qAt "$SUPABASE_IDENTITY_URL" -c 'SELECT md5(COALESCE(string_agg("id", E\'\\n\' ORDER BY "id"), \'\')) FROM public."User"')"
target_user_ids="$(psql --no-psqlrc -X -qAt "$NEON_IDENTITY_URL" -c 'SELECT md5(COALESCE(string_agg("id", E\'\\n\' ORDER BY "id"), \'\')) FROM public."User"')"
[[ "$source_user_shape" == "$target_user_shape" && "$source_user_ids" == "$target_user_ids" ]] || {
  printf 'User identity or non-activity fields differ between source and target. Refusing timestamp reconciliation.\n' >&2
  exit 12
}

psql --no-psqlrc -X -qAt "$SUPABASE_IDENTITY_URL" -c 'SELECT md5("id") || \'|\' || encode(convert_to("id", \'UTF8\'), \'base64\') || \'|\' || COALESCE("lastLoginAt"::text, \'<NULL>\') || \'|\' || "updatedAt"::text FROM public."User" ORDER BY md5("id")' > "$tmp_dir/source-user-times"
psql --no-psqlrc -X -qAt "$NEON_IDENTITY_URL" -c 'SELECT md5("id") || \'|\' || encode(convert_to("id", \'UTF8\'), \'base64\') || \'|\' || COALESCE("lastLoginAt"::text, \'<NULL>\') || \'|\' || "updatedAt"::text FROM public."User" ORDER BY md5("id")' > "$tmp_dir/target-user-times"
exec 3<"$tmp_dir/target-user-times"
timestamp_differences=0
reconcile_hash=""
while IFS='|' read -r source_hash source_id_b64 source_last_login source_updated; do
  IFS= read -r target_line <&3 || {
    printf 'User timestamp manifests have different lengths. Refusing reconciliation.\n' >&2
    exit 13
  }
  IFS='|' read -r target_hash target_id_b64 target_last_login target_updated <<< "$target_line"
  [[ "$source_hash" == "$target_hash" && "$source_id_b64" == "$target_id_b64" ]] || {
    printf 'User ID sets differ. Refusing timestamp reconciliation.\n' >&2
    exit 13
  }
  if [[ "$source_last_login" != "$target_last_login" || "$source_updated" != "$target_updated" ]]; then
    timestamp_differences=$((timestamp_differences + 1))
    reconcile_hash="$source_hash"
  fi
done < "$tmp_dir/source-user-times"
if IFS= read -r _ <&3; then
  printf 'User timestamp manifests have different lengths. Refusing reconciliation.\n' >&2
  exit 13
fi
exec 3<&-

if (( timestamp_differences > 0 )); then
  [[ "$timestamp_differences" == "1" ]] || {
    printf 'Found %s users with activity timestamp differences; only exactly one is permitted. Refusing reconciliation.\n' "$timestamp_differences" >&2
    exit 14
  }
  printf 'Reconciling the single verified User activity-timestamp discrepancy from source of truth...\n'
  psql --no-psqlrc -X -qAt "$SUPABASE_IDENTITY_URL" -c "SELECT format('UPDATE public.\\"User\\" SET \\"lastLoginAt\\" = %L, \\"updatedAt\\" = %L WHERE \\"id\\" = %L;', \\"lastLoginAt\\", \\"updatedAt\\", \\"id\\") FROM public.\\"User\\" WHERE md5(\\"id\\") = '$reconcile_hash'" |
    { printf 'BEGIN;\n'; cat; printf '\nCOMMIT;\n'; } |
    psql --no-psqlrc -X --set=ON_ERROR_STOP=1 "$NEON_IDENTITY_URL" >/dev/null
fi

printf 'Capturing source and target integrity manifests...\n'
source_manifest="$(psql --no-psqlrc -X -qAt "$SUPABASE_IDENTITY_URL" -c "$manifest_sql")"
target_manifest="$(psql --no-psqlrc -X -qAt "$NEON_IDENTITY_URL" -c "$manifest_sql")"

missing_tables=()
while IFS='|' read -r table source_count source_digest; do
  [[ -n "$table" ]] || continue
  target_line="$(printf '%s\n' "$target_manifest" | awk -F'|' -v name="$table" '$1 == name {print; exit}')"
  if [[ -z "$target_line" ]]; then
    printf 'Target manifest is missing table %s. Refusing to continue.\n' "$table" >&2
    exit 6
  fi
  IFS='|' read -r _ target_count target_digest <<< "$target_line"

  if [[ "$source_count" == "$target_count" && "$source_digest" == "$target_digest" ]]; then
    continue
  fi
  if [[ "$target_count" == "0" && "$source_count" != "0" && "$table" != "_prisma_migrations" ]]; then
    missing_tables+=("$table")
    continue
  fi
  printf 'Target table %s is neither empty nor an exact match. Refusing to overwrite or duplicate data.\n' "$table" >&2
  exit 7
done <<< "$source_manifest"

if (("${#missing_tables[@]}" > 0)); then
  dump_args=()
  for table in "${missing_tables[@]}"; do
    dump_args+=(--table="public.\"$table\"")
  done
  printf 'Copying %s missing Identity table(s) in one transaction...\n' "${#missing_tables[@]}"
  {
    printf 'BEGIN;\n'
    pg_dump --data-only --inserts --no-owner --no-privileges "${dump_args[@]}" "$SUPABASE_IDENTITY_URL"
    printf '\nCOMMIT;\n'
  } | psql --no-psqlrc -X --set=ON_ERROR_STOP=1 "$NEON_IDENTITY_URL" >/dev/null
else
  printf 'No missing Identity tables detected; checking integrity only.\n'
fi

printf 'Verifying row counts and content digests...\n'
source_manifest="$(psql --no-psqlrc -X -qAt "$SUPABASE_IDENTITY_URL" -c "$manifest_sql")"
target_manifest="$(psql --no-psqlrc -X -qAt "$NEON_IDENTITY_URL" -c "$manifest_sql")"
if [[ "$source_manifest" != "$target_manifest" ]]; then
  diff -u <(printf '%s\n' "$source_manifest") <(printf '%s\n' "$target_manifest") || true
  printf 'Integrity verification failed. Do not switch application traffic. Keep Supabase unchanged and investigate the diff above.\n' >&2
  exit 8
fi

runtime_user_count="$(psql --no-psqlrc -X -qAt "$NEON_IDENTITY_RUNTIME_URL" -c 'SELECT count(*) FROM public."User"')"
source_user_count="$(psql --no-psqlrc -X -qAt "$SUPABASE_IDENTITY_URL" -c 'SELECT count(*) FROM public."User"')"
[[ "$runtime_user_count" == "$source_user_count" ]] || {
  printf 'Runtime role visibility check failed. Do not switch application traffic.\n' >&2
  exit 9
}

printf '\nIdentity data transfer verified.\n'
printf 'Source database: %s\nTarget database: %s\n' "$source_db" "$target_db"
printf 'User rows visible to proidentity_login: %s\n' "$runtime_user_count"
printf 'Row counts and content digests match for all Identity tables, including migration history.\n'
printf 'Supabase remains unchanged. Render cutover is a separate step and has not been performed.\n'
