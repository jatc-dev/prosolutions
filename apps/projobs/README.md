# ProJobs web v2

React 18 + TypeScript + Vite + Tailwind SPA, using the shared ProSolutions design system (`@prosolutions/ui`).

- **Search**: instant, URL-synced search (shareable links) with filters (workplace, seniority, contract type, skills, salary, recency), facet counts, sorting by relevance, recency, salary or **affinity** with the candidate's ProCV skills, and a desktop split view.
- **Apply**: one click with a ProCV CV (affinity preview and exactly what the company will see) or a quick profile.
- **Candidate**: saved jobs, applications with stage tracker and withdraw.
- **Employer (ATS)**: company profile, job editor (draft → publish → close), KPIs and a kanban pipeline with candidate snapshot, notes and history. Lazy-loaded.

Authentication is delegated to ProIdentity: the access token is obtained from the HttpOnly refresh cookie (`POST /api/auth/refresh`) and kept in memory; login goes through Core (`/login?redirect_uri=`).

```bash
npm run dev --workspace=apps/projobs     # http://localhost:5175 (API at VITE_PROJOBS_API_URL)
npm test --workspace=apps/projobs
npm run build --workspace=apps/projobs   # dist/ (includes ads.txt and privacidad.html)
```

The API lives in [`server/`](server/README.md).
