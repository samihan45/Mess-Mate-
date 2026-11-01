# MessMate

Real-time food discovery for college messes. Students see **today's sabji and menu, an honest crowd estimate, price, ratings and distance**. Owners post menus and rush updates. Admins verify messes.
Launch area: DY Patil College, Akurdi, Pune.

> **Honesty rule:** crowd levels are *estimates* from student reports, location-verified QR check-ins and owner updates. They expire automatically, show their last-updated time, and say "No recent reports" when there is no fresh evidence. See [docs/CROWD_ALGORITHM.md](docs/CROWD_ALGORITHM.md). Seed data is clearly labelled sample data and contains no ratings, check-ins or crowd reports.

## Features
- Student: search by mess or dish, filter by budget / crowd / veg / open, sort, list or map, dish ratings, reviews (food, hygiene, value), crowd reports, QR check-in, favourites.
- Owner: mess profile (with photo), dish library with photos, daily menu with sold-out marking, crowd updates, printable QR code.
- Admin: approve / reject / suspend messes, deactivate users, hide reviews. Every decision is logged.
- Live updates over Socket.IO; background sweeper expires stale crowd data.

## Screenshots
_Add screenshots here after your first run (`docs/screenshots/home.png`, `mess.png`, `owner.png`)._

## Architecture
```
client/  React 18 + TypeScript + Vite + Tailwind, TanStack Query, Leaflet/OSM, socket.io-client
server/  Express + TypeScript, Prisma (PostgreSQL), JWT, zod validation, Socket.IO
  src/lib/crowd.ts      pure crowd estimator (unit tested)
  src/routes/*          auth, messes, dishes, checkins, favourites, owner, admin
  src/services/*        crowd + mess queries, background sweeper
  prisma/               schema, migrations, seed
docs/    API.md, CROWD_ALGORITHM.md
```
A single modular API plus a SPA. No microservices.

## Setup
Requirements: Node 20+ (22 recommended), PostgreSQL 14+ (or Docker).
```bash
npm install
docker compose up -d db                  # local Postgres; skip if you have your own
cp .env.example server/.env              # then set JWT_SECRET (see below)
npm run db:generate
npm run db:deploy                        # apply migrations
npm run db:seed                          # sample messes + admin/owner accounts (passwords printed once)
npm run dev                              # API :4000, web :5173
```
Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

### Environment variables (`server/.env`)
| Var | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | 32+ chars, required |
| CLIENT_URL / PUBLIC_APP_URL | Allowed browser origin(s) / base URL inside QR codes |
| UPLOAD_DIR | Image folder (local disk) |
| CHECKIN_MAX_DISTANCE_M | Check-in geofence radius, default 300 |
| ADMIN_EMAIL, ADMIN_PASSWORD, SEED_DEMO_PASSWORD | Seed only. Blank password = random, printed once |

Client (`client/.env`, optional): `VITE_API_URL`, `VITE_CAMPUS_LAT`, `VITE_CAMPUS_LNG` (campus coordinates default to an approximation; verify and adjust).

### Trying the flows
1. Sign in as the printed admin, then open **Admin**.
2. Register a student in another browser; open a sample mess; report crowd; rate a dish.
3. Register an owner, add a mess, approve it as admin, build today's menu, print the QR.
4. Sample menus are for the day you seed. Re-run `npm run db:seed` to refresh them.

## Tests
```bash
npm test                      # server (node:test) + client (vitest)
```
Server tests: crowd algorithm, geo/date helpers, API auth/validation gates (need generated Prisma client, not a running DB). Client tests: format helpers and crowd components.

## Deployment
- **Database:** any managed PostgreSQL (Neon, Supabase, Render, RDS).
- **API:** `server/Dockerfile` (applies migrations on start). Set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `PUBLIC_APP_URL`. Uploads use local disk, so mount a persistent volume or move to S3/R2 before running multiple instances. Socket.IO needs sticky sessions if you scale horizontally.
- **Client:** `npm run build -w client`, host `client/dist` on any static host with SPA fallback to `index.html`; set `VITE_API_URL` at build time. Alternatively serve client and API on one domain behind a reverse proxy routing `/api`, `/uploads`, `/socket.io`.
- `render.yaml` is a ready blueprint for Render.com.

## Security notes
bcrypt (cost 12) passwords, JWT with expiry, role checks on every protected route, zod validation, helmet, CORS allow-list, rate limits on auth and writes, upload type/size limits, no secrets in the repo.

## Publishing to GitHub
```bash
git init -b main && git add . && git commit -m "Initial commit: MessMate MVP"
git remote add origin git@github.com:<you>/messmate.git
git push -u origin main
```

## License
MIT
