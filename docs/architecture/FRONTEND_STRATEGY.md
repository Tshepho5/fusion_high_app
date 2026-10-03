# Frontend strategy — Geleza SA

**Decision (2026-10):** The React + Vite app in `client/` is the **source of truth** for all authenticated portals and public SPA routes.

## Dual frontend reality

| Path | Status | Role |
|------|--------|------|
| `client/` | **Active** | React 18 + TypeScript + Vite. Learner / parent / teacher / admin dashboards, login, help, Support Desk UI. |
| `public/` | **Legacy (freeze)** | Older HTML/JS assets and Express-served static pages (e.g. `application.html`). Still used where not yet migrated. |
| `flutter_app/` | **Parked** | Experimental native shell. Not the primary delivery channel. |

## Rules going forward

1. **New UI work ships in `client/` only.** Do not add features to `public/*.html` or `public/js` unless fixing a production hotspot that has no React equivalent yet.
2. **Shared backend stays in Express** (`server.js`, `public/src/controller`, `public/src/routes`). Controllers are API, not UI.
3. When a legacy page is replaced in React, remove or redirect the old HTML entry after one release cycle.
4. Prefer Firebase Hosting of `client/dist` as the production web surface.

## Retirement backlog (incremental)

- [ ] Parent Portal Application form fully owned by React (`RegisterPage` / dedicated apply flow)
- [ ] Redirect `public/application.html` → React route
- [ ] Inventory remaining `public/*.html` hits in analytics / server static mounts
- [ ] Delete unused duplicate scripts under `public/js` once traffic is zero
