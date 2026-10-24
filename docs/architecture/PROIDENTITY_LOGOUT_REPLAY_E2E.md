# ProIdentity production logout/JWT replay E2E

This test proves the production sequence with a dedicated, pre-provisioned test account:

1. Log in and retain the issued access JWT and refresh cookie in process memory.
2. Verify the JWT can call `GET /api/auth/me` before logout (HTTP 200).
3. Call `POST /api/auth/logout` with the refresh cookie (HTTP 200).
4. Replay the saved access JWT against `GET /api/auth/me` **without any cookie** and require HTTP 401 with `Session revoked or expired`.

The script never prints credentials, JWTs, refresh tokens, or cookie values. It does not create or delete accounts and does not change application data other than the expected session created and revoked by this test.

## One-time setup

1. Provision a dedicated ProIdentity E2E account through the approved account-management process. It must be active, email-verified, and not an administrator. Use a mailbox controlled by the project team. Do not use a personal or customer account.
2. Set these repository Actions secrets in **Settings → Secrets and variables → Actions → New repository secret**:
   - `IDENTITY_E2E_EMAIL`: the dedicated account email.
   - `IDENTITY_E2E_PASSWORD`: its password.
3. Do not put credentials in workflow YAML, commit messages, issues, pull requests, or chat.
4. Merge this workflow to the default branch after review. Then run **Actions → ProIdentity logout JWT replay E2E → Run workflow** manually.

The workflow is manual-only and hard-pinned to `https://identity.prosolutions.page`. It refuses non-HTTPS or other hosts by default. The account should be dedicated to this check because each successful run logs out and revokes the session it creates.

## Local execution

With Node.js 20.19+ and the same dedicated test account, run:

```sh
IDENTITY_E2E_EMAIL='test-account@example.invalid' \
IDENTITY_E2E_PASSWORD='provided-out-of-band' \
node scripts/e2e/proidentity-logout-replay.mjs
```

Do not paste real credentials into shell history on shared systems. Prefer environment injection from a secret manager.

## Pass criteria

The workflow must report PASS for all four HTTP checkpoints, especially the replay request returning HTTP 401 with `Session revoked or expired`. A login failure, missing refresh cookie, pre-logout 401, logout failure, replay status other than 401, or unexpected rejection reason fails the run. A successful run is the evidence required to close the production E2E validation gap.
