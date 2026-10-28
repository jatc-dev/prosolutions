# ADR: Ownership and placement of module landing features

**Status: Superseded by [ADR_PROSOLUTIONS_MODULE_CATALOG.md](./ADR_PROSOLUTIONS_MODULE_CATALOG.md).**

This document records the original exploration only. The accepted decision is now in `ADR_PROSOLUTIONS_MODULE_CATALOG.md`, which is the canonical design reference for public module content, storage/API ownership, migration, authorization, and rollout.

Implementation status at supersession:
- Core public landing is `/`; focused login is `/login`.
- Core's `Modules` component reads ProCV's existing public Landing Features endpoint as a temporary compatibility bridge and uses localized static fallback copy.
- ProCV's legacy admin editor and the `PlatformSetting` keys `landing_features_en` and `landing_features_es` remain in place to preserve existing content during transition.
- Central module-catalog CRUD, migration/reconciliation, and production browser/CORS verification are not yet complete.

Do not use this document as the current implementation plan. Follow the accepted ADR and keep issues #82 and #83 open until their acceptance criteria are satisfied.
