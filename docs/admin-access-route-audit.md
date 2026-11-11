# Admin Access routes and permissions

Reviewed against the current Core and Identity route definitions.

| Surface | Route | Required permission / behavior |
| --- | --- | --- |
| Core UI | `/admin` | `AdminConsolePage` checks the permissions returned by Identity before showing administrative capabilities. |
| Core UI | `/admin/access` | `AdminAccessPage` requires `identity.users.read` to request the directory; `identity.users.manage` enables grant/revoke controls. |
| Identity API | `GET /api/admin/users` | `requirePermission('identity.users.read')` in `apps/identity/src/routes/admin.ts`. |
| Identity API | `POST /api/modules/grant` | `identityMiddleware` and `requirePermission('identity.users.manage')` in `apps/identity/src/routes/modules.ts`. |
| Identity API | `POST /api/modules/revoke` | `identityMiddleware` and `requirePermission('identity.users.manage')` in `apps/identity/src/routes/modules.ts`. |

Core routes only render the administrative console at `/admin` and the user/access page at `/admin/access`; the former links to the latter for user management. The UI permission checks avoid unnecessary administrative requests and disable unauthorized controls. They are presentation safeguards only: Identity revalidates each permission on the corresponding API request and remains the authorization authority.

The user directory is read separately from module access management. A user with `identity.users.read` can inspect module state in read-only mode. A user needs `identity.users.manage` to submit grant or revoke requests. No `role === "admin"` check is used as an authorization decision in this flow.
