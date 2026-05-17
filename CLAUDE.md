# Media Tracker API — CLAUDE.md

## Project Overview

A RESTful API for tracking books, movies, and TV shows. Built on Supabase Edge Functions (Deno/TypeScript). Used as a teaching backend for ICS342 — students build an Android (Kotlin/Retrofit) client against it over the semester. **No direct Supabase SDK access from clients.** Everything goes through REST endpoints served by Edge Functions.

---

## Tech Stack

- **Runtime:** Deno (Supabase Edge Functions)
- **Language:** TypeScript
- **Database:** PostgreSQL via Supabase (`@supabase/supabase-js` v2, service role key in Edge Functions)
- **Storage:** Supabase Storage (`media-covers` bucket, public)
- **Auth:** Custom JWT (not Supabase Auth sessions). Access tokens = short-lived JWTs signed with Supabase JWT secret. Refresh tokens = random strings stored hashed in `refresh_tokens` table.
- **Seed script:** Node.js/TypeScript (`npx tsx`) with `@supabase/supabase-js`, `sharp`, `dotenv`

---

## Project Structure

```
supabase/
  functions/
    _shared/
      auth.ts         # JWT verification, requireAuth middleware
      cursor.ts       # encodeCursor / decodeCursor helpers
      response.ts     # paginatedResponse, errorResponse helpers
      db.ts           # Supabase admin client (service role)
    users/
      index.ts        # POST /users, GET|PUT /users/me, GET /users/search,
                      # GET /users/{id}, GET /users/{id}/followers,
                      # GET|POST|DELETE /users/{id}/following,
                      # GET /users/{id}/activity, GET /users/{id}/library
    tokens/
      index.ts        # POST /tokens (password grant + refresh token grant)
    media/
      index.ts        # GET /media, GET /media/{id}
    library/
      index.ts        # GET|POST /library, GET|PUT|DELETE /library/{mediaId}
    reviews/
      index.ts        # GET|POST /reviews, PUT|DELETE /reviews/{id}
    activity/
      index.ts        # GET /activity
    goals/
      index.ts        # GET|POST /goals
    quotes/
      index.ts        # GET|POST /quotes, PUT|DELETE /quotes/{id},
                      # POST|DELETE /quotes/{id}/likes
    priorities/
      index.ts        # GET|PUT /priorities
backend/
  scripts/
    seed.ts           # Seed script (runs with npx tsx)
    seed-errors.json  # Written by seed script on run
    .env              # gitignored — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY, GOOGLE_BOOKS_API_KEY
docs/
  media-tracker-api-spec.json   # OpenAPI 3.0.3 spec
  media-tracker-wireframes.html # UI wireframes
specs/
  database-schema.md      # Full schema with trigger SQL
  routing-spec.md         # Path routing, disambiguation rules
  server-behavior-spec.md # Pagination, activity rules, token lifecycle, RLS
  seed-data-spec.md       # Seed catalog, script architecture
  client-credentials.md  # clientId / clientSecret values
  token-expiry-config.md # Token lifetimes and rationale
```

---

## Key Constants

### Client Credentials
```
clientId:     ics342-android-v1
clientSecret: mt-android-s26-xK9pQ2
```
Stored as bcrypt hash (`cost=12`) in `oauth_clients` table. Validated on `POST /users` and `POST /tokens`.

### Token Lifetimes
- Access token: **30 minutes** (`exp = iat + 1800`)
- Refresh token: **7 days** (`expires_at = now() + 7 days`)

### JWT Payload
```json
{ "sub": "<uuid>", "email": "...", "role": "authenticated", "iat": ..., "exp": ... }
```

### Test Accounts
- `alice@mediatracker.dev` / `Testing123!` — primary demo account
- `bob@mediatracker.dev` / `Testing123!` — secondary for social features

---

## Auth Flow

1. `POST /users` — creates auth.users + public.users row; validates clientId/clientSecret; returns UserProfile (no tokens)
2. `POST /tokens` with `grantType=password` — validates credentials + clientId/clientSecret; issues JWT + refresh token
3. `POST /tokens` with `grantType=refreshToken` — validates refresh token hash, revokes old token, issues new JWT + refresh token (rotation)
4. All other endpoints require `Authorization: Bearer <jwt>` header

**`POST /users` and `POST /tokens` are the only unauthenticated endpoints.**

---

## Pagination

All list endpoints use cursor-based pagination. **Response body = bare JSON array. Pagination metadata = response headers.**

Headers:
- `X-Has-More: "true" | "false"` — always present on paginated responses
- `X-Next-Cursor: <base64url string>` — only when `X-Has-More: true`

Query param: `?after=<cursor>` to fetch the next page. Default `limit=20`.

**Cursor types by sort order:**
- `id ASC` endpoints (media): `{ "id": 120 }` → `WHERE id > $cursor_id`
- `created_at DESC` endpoints (activity, reviews, quotes): `{ "id": 456, "created_at": "..." }` → `WHERE (created_at, id) < ($cursor_ts, $cursor_id)`
- `added_at DESC` endpoints (library): `{ "media_id": 42, "added_at": "..." }` → `WHERE (added_at, media_id) < ($cursor_ts, $cursor_id)`
- `id ASC` (UUID, user search): `{ "id": "<uuid>" }` → `WHERE id > $cursor_id`

Implementation: query `limit + 1` rows, `hasMore = rows.length > limit`, return `rows.slice(0, limit)`.

**Not paginated:** `GET /goals`, `GET /priorities` — return plain arrays.

---

## Routing — `/users` Function

Path disambiguation order (critical — check literals before UUID parse):
1. `segment === undefined` → `POST /users`
2. `segment === 'me'` → `GET|PUT /users/me`
3. `segment === 'search'` → `GET /users/search`
4. Otherwise: parse as UUID → `GET /users/{id}` + sub-resources

Sub-resources on `/users/{id}`: `followers`, `following`, `activity`, `library`

## Routing — `/media` Function

1. `segment === undefined` → `GET /media`
2. `parseInt(segment)` is valid → `GET /media/{id}`

## Routing — `/quotes` Function

Three-segment path for likes: `['quotes', '{id}', 'likes']` → `POST|DELETE /quotes/{id}/likes`

---

## Error Response Format

All errors use `{ "message": "Human-readable description." }`. Never expose raw database errors or stack traces.

Common status codes:
- `400` — bad input, business rule violation (e.g., self-follow, max priorities)
- `401` — missing/invalid/expired token, bad client credentials
- `403` — authenticated but not authorized (e.g., editing another user's review)
- `404` — resource not found (always `{ "message": "Not found." }`)
- `405` — method not allowed
- `409` — conflict (duplicate library item, duplicate review, already following, duplicate goal)
- `500` — `{ "message": "Something went wrong. Please try again." }`

---

## Activity Record Rules

Activity is server-side only — clients never write to `activity` directly.

| Action | Activity type created? |
|---|---|
| POST /library (want_to) | `added` |
| POST /library (in_progress) | `started` |
| POST /library (finished) | `finished` |
| PUT /library/{id} status → in_progress (changed) | `started` |
| PUT /library/{id} status → finished (changed) | `finished` |
| PUT /library/{id} status → want_to | none |
| PUT /library/{id} same status | none (idempotent) |
| POST /reviews with shareToFeed=true | `review` (with rating + reviewText) |
| POST /reviews with shareToFeed=false | none |
| PUT /reviews/{id} | none |
| DELETE /library or DELETE /reviews | none |

---

## Database Denormalization

These counters are stored on rows and maintained by PostgreSQL triggers (not computed at query time):
- `users.follower_count`, `users.following_count` — maintained by follows trigger
- `users.tracked_count` — maintained by library_items trigger
- `media.average_rating`, `media.rating_count`, `media.review_count` — maintained by reviews trigger
- `quotes.like_count` — maintained by quote_likes trigger

**Exception:** `goals.current_count` is NEVER stored — always computed live via SQL aggregate.

**`isFollowing` on UserProfile** is NEVER stored — computed live via EXISTS subquery. Omitted entirely on `GET /users/me`.

---

## RLS Strategy

Edge Functions use the **service role key** (bypasses RLS) for all database operations. This is intentional — RLS is defined for security documentation purposes but Edge Function code enforces ownership rules explicitly before mutations. The service role is never exposed to clients.

Do NOT use the anon key in Edge Functions. Do NOT rely on RLS as the sole authorization mechanism — check `user_id = authenticated_user_id` in Edge Function code before any write.

---

## Business Rules (Edge Function Enforcement)

- **Library:** 409 on duplicate `(user_id, media_id)`; create activity records as side effects
- **Reviews:** 409 on duplicate; 403 if not author on PUT/DELETE
- **Priorities:** max 5 per user (400 if exceeded); PUT is an upsert
- **Goals:** 409 on duplicate `(user_id, year, media_type)`
- **Follows:** 400 on self-follow; 409 on already-following
- **Quotes:** 409 on duplicate like; 403 if not author on PUT/DELETE

---

## Seed Script (`backend/scripts/seed.ts`)

Run with: `npx tsx backend/scripts/seed.ts`

Five phases:
1. Create `media-covers` bucket, upload placeholder.jpg
2. Fetch metadata for 120 curated items (TMDB + Google Books)
3. Bulk fill to 500+ items (TMDB top-rated, Google Books subject searches)
4. Download, resize (300×450 JPEG), upload cover images to Storage
5. Bulk insert into `media` table (upsert, safe to re-run)

Canonical genres: `Science Fiction`, `Fantasy`, `Literary Fiction`, `Historical Fiction`, `Mystery`, `Thriller`, `Horror`, `Crime`, `Drama`, `Comedy`, `Action`, `Romance`, `Non-Fiction`, `Documentary`, `Animation`, `Reality`, `War`

Never use `Sci-Fi`, `SciFi`, etc.

---

## Teaching Context

This API is designed so students encounter specific behaviors during specific course weeks:
- Week 3: `POST /users`, `POST /tokens` (account creation + auth)
- Week 4: Token expiry → 401 → refresh flow (30-min tokens guarantee this happens in class)
- Week 5: Library CRUD
- Later: Social features, activity feed, pagination

Keep error messages student-friendly. The 30-minute access token is intentional pedagogy, not a bug.
