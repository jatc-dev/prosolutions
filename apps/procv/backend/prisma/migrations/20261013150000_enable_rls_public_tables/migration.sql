-- Enable Row Level Security on every public-schema table.
--
-- Supabase exposes the public schema through PostgREST with the anon key
-- (which is public by design). With RLS disabled, anyone holding that key can
-- read and write every table directly, bypassing the Express API. Enabling RLS
-- with no policies denies all access through the Supabase client APIs by
-- default, while the application keeps working: it connects with the postgres
-- role, which owns the tables and therefore bypasses RLS.
--
-- If direct Supabase access is ever needed for a table, add explicit policies
-- for that table instead of disabling RLS globally.

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.tablename);
  END LOOP;
END $$;
