# Media Tracker API

Supabase-backed REST API for the ICS 342 Mobile Application Development course.
Students query the Supabase REST API directly from their Android apps — no Edge Functions required.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 + |
| npx (bundled with Node) | — |
| Docker Desktop | latest (required for local dev) |

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd media-tracker-api
npm install
```

This installs the pinned Supabase CLI version from `package.json` into a local `node_modules` — keeping local and CI environments in sync.

### 2. Configure environment

```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, etc.
```

### 3. Start the local Supabase stack

```bash
npx supabase start
```

This spins up a local Postgres instance, Auth, Storage, and the REST API via Docker.
The CLI prints the local API URL and keys when it's ready.

### 4. Apply migrations

```bash
npx supabase db reset
```

`db reset` drops and recreates the local database then runs all migrations in order.

### 5. Stop the local stack

```bash
npx supabase stop
```

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
├── supabase/
│   ├── config.toml             # Local dev configuration
│   └── migrations/             # SQL migration files (run in order)
├── .env.example                # Environment variable template
└── README.md
```

---

## Authentication

Uses Supabase Auth (JWT). When a user signs up, a trigger automatically creates a row in `public.users`.

Endpoints used by students:

| Action | Endpoint |
|--------|----------|
| Sign up | `POST /auth/v1/signup` |
| Log in | `POST /auth/v1/token?grant_type=password` |
| Refresh token | `POST /auth/v1/token?grant_type=refresh_token` |

All subsequent requests require:
```
apikey: <anon-key>
Authorization: Bearer <jwt>
```

---

## Storage

Profile avatars are stored in the public `avatars` bucket.

- **Upload:** `POST /storage/v1/object/avatars/{filename}`
- **Public URL:** `https://<project>.supabase.co/storage/v1/object/public/avatars/{filename}`
