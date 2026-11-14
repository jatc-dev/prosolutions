-- The isolated admin login must be able to connect before it explicitly assumes procv_admin_app.
GRANT CONNECT ON DATABASE procv TO procv_admin_login;

-- Keep the login least-privileged between explicit SET ROLE transactions.
-- This forward-only migration aligns production with the already-applied QA role setting.
ALTER ROLE procv_admin_login NOINHERIT;
