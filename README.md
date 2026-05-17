# Media Tracker API

RESTful API backend for the ICS342 Android course. Students build a Kotlin/Retrofit client against this API over the semester — tracking books, movies, and TV shows with social features.

Built on [Supabase Edge Functions](https://supabase.com/docs/guides/functions) (Deno/TypeScript). All data access goes through REST endpoints — students never call Supabase directly.

---

## Prerequisites

| Tool | Install |
|---|---|
| [mise](https://mise.jdx.dev) | `brew install mise` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Required by the Supabase CLI |
| [Deno](https://deno.com) | `brew install deno` (for `deno check` / `deno lint`) |

Once mise is installed, it will manage Node and the Supabase CLI automatically:

```sh
mise install
```

---

## Local Development

### 1. Start the local stack

```sh
mise run start
```

This starts PostgreSQL, Auth, Storage, Studio, and the Edge Function runtime — all via Docker. First run pulls images and takes a minute or two.

### 2. Configure environment variables

Copy the env templates and fill in the values printed by `mise run status`:

```sh
cp supabase/.env.local.example supabase/.env.local
cp backend/scripts/.env.example backend/scripts/.env
```

```sh
mise run status   # prints SUPABASE_URL, anon key, service role key, etc.
```

`supabase/.env.local` is injected into Edge Functions when serving locally.  
`backend/scripts/.env` is used by the seed script.

### 3. Apply migrations

```sh
mise run db-reset   # wipes local DB and re-runs all migrations from scratch
```

Or to apply only new migrations against an existing database:

```sh
mise run db-migrate
```

### 4. Serve Edge Functions

```sh
mise run functions-serve
```

Functions are available at `http://127.0.0.1:54321/functions/v1/{name}`.

### 5. Seed the database

Add your TMDB and Google Books API keys to `backend/scripts/.env`, then:

```sh
mise run seed
```

The seed script loads 500+ media items (books, movies, shows) into the `media` table and uploads cover images to Supabase Storage. It's safe to re-run.

---

## Supabase Studio

The local dashboard is available at **http://127.0.0.1:54323** while the stack is running. Use it to browse tables, run SQL, inspect storage, and view auth users.

---

## Available Commands

| Command | Description |
|---|---|
| `mise run start` | Start the local Supabase stack |
| `mise run stop` | Stop the local Supabase stack |
| `mise run status` | Show service URLs and keys |
| `mise run db-reset` | Wipe local DB and re-run all migrations |
| `mise run db-migrate` | Apply pending migrations |
| `mise run functions-serve` | Serve all edge functions with hot reload |
| `mise run seed` | Run the media seed script |
| `mise run lint` | ESLint on backend scripts |
| `mise run format` | Prettier — write |
| `mise run format-check` | Prettier — check only |
| `mise run typecheck` | tsc on backend scripts |
| `mise run deno-check` | Type-check all edge functions |
| `mise run deno-lint` | Lint all edge functions |
| `mise run deno-format` | Format all edge functions |

---

## Project Structure

```
supabase/
  config.toml               # Local Supabase CLI configuration
  migrations/               # One SQL file per table, in dependency order
  functions/
    _shared/                # Shared modules imported by all functions
      auth.ts               #   JWT verification middleware
      cors.ts               #   CORS headers + preflight handler
      cursor.ts             #   Cursor encode/decode for pagination
      db.ts                 #   Supabase admin client (service role)
      response.ts           #   paginatedResponse, errorResponse helpers
      validate.ts           #   isValidUUID helper
    tokens/index.ts         # POST /tokens
    users/index.ts          # All /users/* routes
    media/index.ts          # GET /media, GET /media/{id}
    library/index.ts        # /library and /library/{mediaId}
    reviews/index.ts        # /reviews and /reviews/{id}
    activity/index.ts       # GET /activity
    goals/index.ts          # /goals
    quotes/index.ts         # /quotes and /quotes/{id}/likes
    priorities/index.ts     # /priorities
backend/
  scripts/
    seed.ts                 # Seed script — fetches from TMDB + Google Books
    .env.example            # Seed script env template
  tsconfig.json
docs/
  media-tracker-api-spec.json   # OpenAPI 3.0.3 spec
  media-tracker-wireframes.html # UI wireframes
specs/                          # Design documents
```

---

## API Overview

Base URL (local): `http://127.0.0.1:54321/functions/v1`

| Tag | Endpoints |
|---|---|
| Auth | `POST /tokens` |
| Users | `POST /users`, `GET /users/me`, `PUT /users/me`, `GET /users/search`, `GET /users/{id}` |
| Social | `GET/POST/DELETE /users/{id}/following`, `GET /users/{id}/followers`, `GET /users/{id}/activity` |
| Library | `GET /users/{id}/library`, `GET/POST /library`, `GET/PUT/DELETE /library/{mediaId}` |
| Media | `GET /media`, `GET /media/{id}` |
| Reviews | `GET/POST /reviews`, `PUT/DELETE /reviews/{id}` |
| Activity | `GET /activity` |
| Goals | `GET/POST /goals` |
| Quotes | `GET/POST /quotes`, `PUT/DELETE /quotes/{id}`, `POST/DELETE /quotes/{id}/likes` |
| Priorities | `GET/PUT /priorities` |

The full OpenAPI spec is in [`docs/media-tracker-api-spec.json`](docs/media-tracker-api-spec.json).

### Authentication

All endpoints except `POST /users` and `POST /tokens` require a bearer token:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained from `POST /tokens`. Access tokens expire after **30 minutes**. Use the refresh token to get a new one without re-entering credentials.

### Pagination

All list endpoints use cursor-based pagination. Results are a bare JSON array; page metadata is in response headers:

```
X-Has-More: true
X-Next-Cursor: eyJpZCI6MjB9
```

Pass the cursor as `?after=<X-Next-Cursor>` on the next request.

---

## Key Design Decisions

- **No direct Supabase access from clients.** Edge Functions are the only entry point. This forces students to work with a real REST API rather than the Supabase client SDK.
- **Custom JWT auth.** Access tokens (30 min) and refresh tokens (7 days, rotated on use) are issued and verified by the `tokens` function. The 30-minute lifetime is intentional — it guarantees students hit a real 401 during Week 4's token refresh lab.
- **Cursor-based pagination.** All list endpoints paginate. With 500+ media items, students must implement real pagination in their LazyColumn.
- **Denormalized counters.** Follower counts, tracked counts, ratings, and like counts are stored on rows and maintained by PostgreSQL triggers, not computed at query time.
- **Activity is append-only.** The `activity` table is written exclusively by Edge Function side effects — never by the client.

For full detail see the [`specs/`](specs/) directory.

---

## Test Accounts

Two accounts are pre-created by the seed script for use during instructor demos:

| Account | Email | Password |
|---|---|---|
| Alice | `alice@mediatracker.dev` | `Testing123!` |
| Bob | `bob@mediatracker.dev` | `Testing123!` |

Post both in Discord at the start of the semester. They share credentials with the whole class — tell students these are **not** their personal login.

---

## Client Credentials

Every auth request (`POST /users`, `POST /tokens`) must include:

```json
{ "clientId": "ics342-android-v1", "clientSecret": "mt-android-s26-xK9pQ2" }
```

Post these in Discord at the start of Week 3. See [`specs/client-credentials.md`](specs/client-credentials.md) for context.
