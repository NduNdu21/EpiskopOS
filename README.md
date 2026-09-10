# EpiskopOS
## Integrated Lighting and Event Management System

> A web-based management platform for small venues — built for churches, community halls, and similar organisations to plan events, coordinate volunteers, and streamline team communication.

*Episkopos* = Greek for "overseer"

---

## Project Overview

Small venues like churches and community halls typically rely on separate, disconnected tools to manage events, lighting, and sound. This fragmentation leads to miscommunication and errors during live services. ILEMS addresses this by providing a unified system that:

- Plans services and events, with ordered, editable segments
- Assigns volunteers to roles and teams
- Enables live messaging and team updates during services, including a fullscreen **Stage mode** for in-service display
- Sends push notifications for go-live, segment changes, and upcoming-service reminders
- (Roadmap) Controls and optimises lighting

This is a final-year Computer Science project (CS3IP) at Aston University, supervised by Professor Tony Dodd. The project was formally submitted and assessed on 21 May 2026, and is currently in a post-submission hardening and feature-addition phase.

---

## Multi-Tenancy

EpiskopOS is multi-tenant: each church/venue is an isolated **organisation**, identified by `organization_id`. Isolation is enforced at every layer:

- **Data access** — every controller scopes its queries by `organization_id`; no cross-org reads or writes are possible.
- **Auth** — `organization_id` is embedded in the JWT on login and checked on every protected request.
- **Real-time (Socket.IO)** — rooms are namespaced per org, e.g. `general:${orgId}` for org-wide broadcasts and `team:${orgId}:${team}` for team-scoped channels. Socket connections are org-checked on join (`join_service`).
- **Onboarding** — new organisations are created with a creator-supplied invite code (4–20 uppercase alphanumeric characters), which subsequent members use to join that org during registration.

---

## Auth & Username Migration

Login is **username + invite code only** — email-based login has been removed. All protected routes are guarded by a `requireUsername` middleware that enforces this on the backend, not just the frontend.

- Registration requires a valid org invite code, tying the new user to that organisation at creation.
- JWT payload carries `organization_id` alongside user identity, so downstream scoping doesn't depend on a second lookup.

---

## Tech Stack

| Layer         | Technology                                          |
|---------------|------------------------------------------------------|
| Frontend      | React 19 + Vite + Tailwind CSS                       |
| Backend       | Node.js + Express (MVC) + Socket.IO                  |
| Real-time     | Socket.IO (org- and team-scoped rooms)               |
| Database      | PostgreSQL via Supabase (pooled, port 6543, SSL)     |
| Auth          | JWT (HS256) — username + invite code login, org-scoped |
| Notifications | Web Push (VAPID) — go-live, segment change, reminders |
| Testing       | Jest, Supertest, socket.io-client                    |
| Deployment    | Render (backend), Vercel (frontend), Supabase (DB), GitHub Actions (cron + CI) |
| Dev Env       | Local (macOS) + VS Code                              |

---

## User Roles

| Role       | Description                                                    |
|------------|------------------------------------------------------------------|
| `admin`    | Full access — event planning, volunteer management, messaging  |
| `sound`    | Sound team                                                      |
| `lighting` | Lighting team                                                   |
| `media`    | Media/projection team                                           |

> Admins are registered via an invite-link system.

---

## Deployment

Deploy order matters, since the frontend needs a live backend URL to build against:

1. **Backend → Render** first, to get a stable domain. `trust proxy` is set to `2` to correctly reflect the real client IP behind Cloudflare + Render's internal hop.
2. **Frontend → Vercel**, using the Render domain as `VITE_API_BASE`.
3. Update the backend's `FRONTEND_URL` with the resulting Vercel domain (CORS, push notification links, etc.).

**GitHub Actions** runs three scheduled/automated jobs: a keep-alive ping (`*/13 * * * *`, to stop the Supabase free-tier DB from pausing after ~7 days idle), an hourly reminder cron for 1-day/3-day service reminders, and the CI pipeline on push. Scheduled workflows auto-disable after 60 days of repo inactivity on free repos, so both crons need occasional activity to keep running.

## Testing & CI

- **Unit/integration**: Jest + Supertest, with `app.js`/`server.js` split so the Express app can be tested without binding a port.
- **Real-time**: `socket.io-client` used to test socket scoping (org/team room isolation) directly.
- **Shared auth helper**: `testAuth.js` (`makeTestToken`) generates valid JWTs for test requests.
- **Coverage**: scoping test suites exist for events, messages, attendance, users, and sockets — verifying multi-tenant isolation holds across the API surface.
- CI runs automatically via GitHub Actions on push.

## Roadmap

| Period           | Goal                                              |
|------------------|---------------------------------------------------|
| Oct–Nov 2025     | Research, requirements gathering                  |
| Nov–Dec 2025     | System architecture design, mockups (Figma)       |
| Dec–Jan 2026     | Dev environment + event planning module           |
| Jan–Feb 2026     | Homepage, auth, live event control UI             |
| March 2026       | User research & evaluation                        |
| April 2026       | Final report, documentation, presentation         |
| 21 May 2026      | Formal submission and assessment                  |
| May 2026–present | Post-submission hardening & feature-addition: multi-tenancy, username-only auth, push notifications, stage mode, colour-coded segment types, security fixes, CI/CD pipeline |

---

## Academic Context

| Field       | Detail                                      |
|-------------|---------------------------------------------|
| Institution | Aston University                            |
| Programme   | BSc Computer Science                        |
| Module      | CS3IP — Final Year Project                  |
| Supervisor  | Professor Tony Dodd                         |
| Student     | Ndumiso Mbangeleli (220216407)              |