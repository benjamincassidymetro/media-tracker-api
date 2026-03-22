# Media Tracker API

Supabase-backed REST API for the ICS 342 Mobile Application Development course.
A single Deno Edge Function (`supabase/functions/api/`) implements the full REST API on top of Supabase PostgREST.

---

## Prerequisites

| Tool | How to install |
|------|---------------|
| [mise](https://mise.jdx.dev) | `brew install mise` |
| Docker Desktop | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Node.js 18 + | managed by mise or system |

mise manages Deno and acts as the task runner for this project.

---

## Quick Start

### 1. Clone & trust mise

```bash
git clone <repo-url>
cd media-tracker-api
mise trust       # allow mise to use mise.toml in this directory
mise install     # installs Deno (and any other tools declared in mise.toml)
```

### 2. Install Node dependencies

```bash
mise run install
# equivalent to: npm install
```

### 3. Configure environment

Environment variables are managed via `mise.toml` (no `.env` files required). Defaults are already configured for local Supabase CLI development.

If you need to override a value (e.g. `OPENAI_API_KEY`), edit `mise.toml` or set the environment variable in your shell before running tasks.

### 4. Start the full dev environment

```bash
mise run dev
```

This runs three steps in sequence:
1. `supabase start` — spins up Postgres, Auth, Storage, Studio, and the local REST API via Docker
2. `supabase db reset` — drops and recreates the DB, runs all migrations, then loads `supabase/seed.sql`
3. `supabase functions serve api` — starts the Edge Function dev server with hot-reload

On first run Docker will pull images — this takes a few minutes.

### 5. Hit the API

```
http://127.0.0.1:54321/functions/v1/api
```

API docs endpoint:

```
http://127.0.0.1:54321/functions/v1/api/docs
```

The pre-seeded test account is:
- **email:** `dev@example.com`
- **password:** `password123`

---

## mise Tasks

| Task | Description |
|------|-------------|
| `mise run dev` | Start DB + reset schema/seed + serve API (recommended) |
| `mise run dev:api` | Start only the Edge Function dev server (hot-reload) |
| `mise run dev:db:start` | Start the Supabase Docker stack |
| `mise run dev:db:stop` | Stop the Supabase Docker stack |
| `mise run dev:db:reset` | Wipe + re-run migrations + seed |
| `mise run dev:db:status` | Print API URL, anon key, service role key |
| `mise run dev:db:logs` | Follow the Postgres container logs |
| `mise run dev:db:psql` | Open a psql shell to the local database |
| `mise run db:migrate` | Create a new migration file |
| `mise run lint` | Lint SQL migration files with squawk |
| `mise run docker:up` | Start standalone Postgres (blocks until healthy) |
| `mise run docker:down` | Stop standalone Postgres |
| `mise run docker:reset` | Wipe volume + restart Postgres (blocks until healthy) |
| `mise run docker:logs` | Tail Docker Compose logs |
| `mise run docker:psql` | Open a psql shell via Docker Compose |

---

## Docker Compose (standalone DB)

For CI or environments where the full Supabase CLI stack isn't needed, a standalone Postgres container is available:

```bash
mise run docker:up     # starts postgres on port 54322, runs migrations + seed
mise run docker:down   # stop
mise run docker:reset  # wipe data and restart fresh
```

The DB will be available at `postgresql://postgres:postgres@localhost:54322/postgres`.

---

## Migrations

Migrations live in `supabase/migrations/` and run in filename (timestamp) order.

| File | Purpose |
|------|---------|
| `..._extensions.sql` | Enables `pg_trgm` for fuzzy text search |
| `..._users.sql` | `public.users` profile table + auth trigger |
| `..._media.sql` | `public.media` table (pre-seeded books & movies) |
| `..._user_media.sql` | User library (`want_to`, `reading`, `in_progress`, `finished`) |
| `..._reviews.sql` | User ratings & reviews |
| `..._social.sql` | `follows` and `activity_feed` tables |
| `..._custom_features.sql` | `want_to_priorities`, `reading_goals`, `goal_achievements`, `quotes`, `quote_likes` |
| `..._functions_and_triggers.sql` | Triggers: rating aggregation, activity feed, quote likes, goal achievements |
| `..._rls_policies.sql` | Row-Level Security policies for all tables |
| `..._storage.sql` | `avatars` storage bucket + storage policies |

### Creating a new migration

```bash
npx supabase migration new <descriptive_name>
```

---

## Linking to a Remote Supabase Project

```bash
# Login to Supabase
npx supabase login

# Link this directory to your remote project
npx supabase link --project-ref <your-project-ref>

# Push migrations to the remote database
npx supabase db push
```

---

## CI / CD

The workflow at `.github/workflows/deploy-migrations.yml` automatically pushes migrations to the remote Supabase project whenever migration files are merged to `main`.

### Required GitHub Actions secrets

| Secret | Where to get it |
|--------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | Supabase Dashboard → Project Settings → General |
| `SUPABASE_DB_PASSWORD` | Set during project creation (or reset in Dashboard → Database) |

Add these in your GitHub repo under **Settings → Secrets and variables → Actions**.

---

## Useful CLI Commands

```bash
# View migration status (local)
npx supabase migration list

# Open local Supabase Studio
npx supabase studio

# Pull remote schema changes into a new migration
npx supabase db pull

# Check CLI version
npx supabase --version
```

---

## Project Structure

```
media-tracker-api/
├── development-specs/          # API & database design documents
├── docker/
│   └── migrate.sh              # Migration runner for Docker Compose
├── supabase/
│   ├── config.toml             # Local dev configuration
│   ├── seed.sql                # Dev seed data (test user + 40 media items)
│   ├── migrations/             # SQL migration files (run in order)
│   └── functions/
│       └── api/                # Edge Function — full REST API
│           ├── index.ts        # Router entry point
│           ├── deno.json       # Deno import map
│           ├── README.md       # API docs + curl examples
│           └── lib/            # Handler modules per resource
├── docker-compose.yml          # Standalone Postgres for CI / no-CLI setups
├── mise.toml                   # Tool versions + task runner
└── README.md
```

---

## Authentication

Uses Supabase Auth (JWT) surfaced through the Edge Function API at `/auth/signup`, `/auth/login`, and `/auth/refresh`.

See [`supabase/functions/api/README.md`](supabase/functions/api/README.md) for full endpoint docs and curl examples.

When a user signs up, a database trigger automatically creates a row in `public.users`.

All protected endpoints require:
```
Authorization: Bearer <jwt>
```

---

## Storage

Profile avatars are stored in the public `avatars` bucket.

- **Upload:** `POST /storage/v1/object/avatars/{filename}`
- **Public URL:** `https://<project>.supabase.co/storage/v1/object/public/avatars/{filename}`
