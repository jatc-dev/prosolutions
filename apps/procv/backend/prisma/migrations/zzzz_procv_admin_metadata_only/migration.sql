-- Keep platform analytics useful without granting administrators access to
-- private CV content. The admin connection may read only aggregate metadata
-- from CV; CV versions and ATS analyses remain owner-only.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE
  public."CV",
  public."CVVersion",
  public."CVAtsAnalysis"
FROM procv_admin_app, procv_admin_login;

-- Admin analytics currently need only stable owner counts and timestamps.
-- Never grant title, template, data, snapshots, job descriptions, or analysis.
GRANT SELECT ("id", "userId", "createdAt")
ON TABLE public."CV"
TO procv_admin_app;

COMMIT;
