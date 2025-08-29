Yogi Integration and Multi-Tenancy

Overview
- Frontend reads an entry JWT passed in the URL and includes it on every backend request.
- Backend derives `req.orgId` from the JWT (or headers) and scopes all queries by organization.
- `yogiRoutes` proxies to the Yogi platform, forwarding org headers and auth according to `YOGI_AUTH_MODE`.

Frontend
- Entry token discovery: `frontend/src/auth.ts` looks for token/org in both query and hash params:
  - Token keys: `token`, `jwt`, `id_token`, `access_token`, `yogiToken`
  - Org keys: `orgId`, `organizationId`, `tenantId`, `org`, `tenant`
- It stores them in `sessionStorage` and cleans the URL to avoid leaking tokens.
- All API calls go through `authFetch` which adds `Authorization: Bearer <token>` and `x-org-id`.
- API base is configured via `frontend/public/config.js` → `window.__API_BASE__` or `VITE_API_BASE`.

Backend
- `middleware/orgContext.js`:
  - Reads `Authorization: Bearer <jwt>` or `x-org-id`.
  - Verifies with `JWT_PUBLIC_KEY` (RS256) or `JWT_SECRET` (HS256); falls back to decode if none present.
  - Sets `req.orgId` using any of: `orgId`, `tenantId`, `organizationId` in the JWT payload.
- Routes (layouts, workflows, workflow-executions) use `req.orgId` to scope queries.

Yogi Proxy (`backend/routes/yogiRoutes.js`)
- Required env:
  - `YOGI_BASE_URL`: upstream base URL (no trailing slash needed).
  - `YOGI_AUTH_MODE`: one of `env` | `passthrough` | `prefer-env` (default: `env` if `YOGI_BEARER_TOKEN` is set, otherwise `passthrough`).
  - `YOGI_BEARER_TOKEN`: service token when using `env` or as fallback in `prefer-env`.
  - `YOGI_TIMEOUT_MS` (optional, default 15000).
- Behavior:
  - Always forwards `x-org-id` (when available) and some tracing headers.
  - Auth header strategy:
    - `env`: `Authorization: Bearer ${YOGI_BEARER_TOKEN}`
    - `passthrough`: use incoming `Authorization` (entry token)
    - `prefer-env`: use incoming `Authorization` if present else `Bearer ${YOGI_BEARER_TOKEN}`
  - Also forwards `x-entry-token` if provided by the caller.

Typical Configs
- Verify entry tokens: set either `JWT_PUBLIC_KEY` or `JWT_SECRET` in backend `.env`.
- Forward entry token to Yogi: set `YOGI_AUTH_MODE=passthrough`.
- Use a platform service token to reach Yogi: set `YOGI_AUTH_MODE=env` and `YOGI_BEARER_TOKEN=...`.
- Hybrid (prefer entry token, fallback to service token): `YOGI_AUTH_MODE=prefer-env`.

Notes
- The server also mounts routes under both `/layout-be/api/*` and `/api/*` for convenience.
- CORS is controlled by `CORS_ORIGIN` (comma-separated list or leave unset to allow all in dev).

