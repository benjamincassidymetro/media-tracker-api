# Media Tracker API — Implementation TODO

Tracks all work across coding agent sessions. Mark items `[x]` when complete.

---

## Phase 0 — Supabase Project Setup (Manual)

These steps are done once in the Supabase dashboard or via CLI by the instructor. Not automated by code agents.

- [ ] Create Supabase project
- [ ] Note project URL and service role key
- [ ] Change JWT expiry in dashboard to 1800s (30 min) — Authentication → Settings (if using built-in; skip if using custom JWT signing in Edge Functions)
- [ ] Create `media-covers` Storage bucket (public read)
- [ ] Insert `oauth_clients` row for `ics342-android-v1` with bcrypt hash of `mt-android-s26-xK9pQ2`
- [ ] Set required environment variables for Edge Functions in dashboard (SUPABASE_JWT_SECRET if needed)

---

## Phase 1 — Database Schema & Triggers

All SQL can be run via the Supabase SQL editor or migration files.

### 1.1 Tables
- [x] Create `users` table with indexes — `20260517000001_create_users.sql`
- [x] Create `oauth_clients` table — `20260517000002_create_oauth_clients.sql`
- [x] Create `media` table with indexes — `20260517000003_create_media.sql`
- [x] Create `refresh_tokens` table with indexes — `20260517000004_create_refresh_tokens.sql`
- [x] Create `library_items` table with indexes — `20260517000005_create_library_items.sql`
- [x] Create `reviews` table with indexes — `20260517000006_create_reviews.sql`
- [x] Create `activity` table with indexes — `20260517000007_create_activity.sql`
- [x] Create `follows` table with indexes — `20260517000008_create_follows.sql`
- [x] Create `goals` table with indexes — `20260517000009_create_goals.sql`
- [x] Create `quotes` table with indexes — `20260517000010_create_quotes.sql`
- [x] Create `quote_likes` table — `20260517000011_create_quote_likes.sql`
- [x] Create `priorities` table with indexes — `20260517000012_create_priorities.sql`

### 1.2 Triggers
- [x] `trg_follows_counts` — in `20260517000008_create_follows.sql`
- [x] `trg_library_tracked_count` — in `20260517000005_create_library_items.sql`
- [x] `trg_reviews_update_media_stats` — in `20260517000006_create_reviews.sql`
- [x] `trg_quote_likes_count` — in `20260517000011_create_quote_likes.sql`

### 1.3 Row Level Security
- [x] Enable RLS on all tables
- [x] `users` — public SELECT; own-row UPDATE; no INSERT for authenticated role
- [x] `oauth_clients` — service role only (no policies for authenticated)
- [x] `refresh_tokens` — service role only
- [x] `media` — public SELECT; no mutations for authenticated
- [x] `library_items` — own-row SELECT/INSERT/UPDATE/DELETE
- [x] `reviews` — public SELECT; own-row INSERT/UPDATE/DELETE
- [x] `activity` — SELECT own + followed users; no INSERT/UPDATE/DELETE for authenticated
- [x] `follows` — public SELECT; own-row INSERT/DELETE
- [x] `goals` — own-row SELECT/INSERT/UPDATE/DELETE
- [x] `quotes` — SELECT own + public; own-row INSERT/UPDATE/DELETE
- [x] `quote_likes` — public SELECT; own-row INSERT/DELETE
- [x] `priorities` — own-row SELECT/INSERT/UPDATE/DELETE

---

## Phase 2 — Shared Edge Function Modules

Files under `supabase/functions/_shared/`.

- [x] `db.ts` — Supabase admin client (service role key from env); export `supabaseAdmin`
- [x] `auth.ts` — `requireAuth(req)` that verifies JWT, returns `{ userId: string }`; throws `AuthError` on failure; export `AuthError`
- [x] `cursor.ts` — `encodeCursor(obj)` and `decodeCursor(str)` (base64url JSON); helpers for each sort type
- [x] `response.ts` — `paginatedResponse(items, limit, cursorFn)` that sets `X-Has-More` + `X-Next-Cursor` headers; `errorResponse(status, message)` helper
- [x] `validate.ts` — `isValidUUID(str)` helper
- [x] `types.ts` — DB row types + API formatter functions for all resources

---

## Phase 3 — Edge Functions

Each function is a Deno module at `supabase/functions/{name}/index.ts`. All functions must:
- Handle CORS preflight (`OPTIONS` → 200 with appropriate headers)
- Return JSON with `Content-Type: application/json`
- Call `requireAuth` for all routes except `POST /users` and `POST /tokens`
- Return `{ "message": "..." }` errors

### 3.1 `tokens` — `POST /tokens`
- [x] Parse body, validate `grantType` is `password` or `refreshToken`
- [x] Validate `clientId` + `clientSecret` against `oauth_clients` (bcrypt verify)
- [x] **Password grant:** look up user by email in `auth.users`, verify password via Supabase Admin API (`supabase.auth.admin.signInWithPassword` or direct bcrypt check), issue JWT + refresh token
- [x] **Refresh token grant:** SHA-256 hash incoming token, look up in `refresh_tokens` (not revoked, not expired), revoke old token, issue new JWT + refresh token
- [x] JWT payload: `{ sub, email, role: "authenticated", iat, exp: iat + 1800 }`
- [x] Refresh token: 32-byte random, base64url encoded, stored as SHA-256 hex, expires in 7 days
- [x] Return `{ accessToken, refreshToken, user: UserProfile }`

### 3.2 `users` — All `/users/*` routes
- [x] Route dispatcher (literal checks before UUID parse — see routing-spec.md)
- [x] `POST /users` (no auth): validate clientId/clientSecret; create auth.users via `supabase.auth.admin.createUser`; insert into `public.users`; return 201 with UserProfile; 409 on duplicate email/username
- [x] `GET /users/me` (auth): fetch own profile; omit `isFollowing` field
- [x] `PUT /users/me` (auth): update displayName/username/bio/avatarUrl; 409 on duplicate username
- [x] `GET /users/search` (auth): search by username/displayName ILIKE; cursor paginated by `id ASC`; include `isFollowing` for each result
- [x] `GET /users/{id}` (auth): fetch profile by UUID; compute `isFollowing`; 404 if not found
- [x] `GET /users/{id}/followers` (auth): list users who follow target; cursor paginated `created_at DESC`; include `isFollowing` for each
- [x] `GET /users/{id}/following` (auth): list users target follows; cursor paginated `created_at DESC`; include `isFollowing` for each
- [x] `POST /users/{id}/following` (auth): insert into `follows`; 400 on self-follow; 409 on already following
- [x] `DELETE /users/{id}/following` (auth): delete from `follows`; 204
- [x] `GET /users/{id}/activity` (auth): user's public activity, cursor paginated `created_at DESC, id DESC`; join user + media on each activity item
- [x] `GET /users/{id}/library` (auth): target user's library, cursor paginated `added_at DESC, media_id DESC`; optional `?status=` filter; join media on each item

### 3.3 `media` — `GET /media`, `GET /media/{id}`
- [x] `GET /media` (auth): paginated list, sorted `id ASC`; optional `?query=`, `?type=`, `?genre=` filters; full-text search on title using `to_tsvector`; cursor by `id`
- [x] `GET /media/{id}` (auth): full MediaDetail response; 404 if not found

### 3.4 `library` — `/library` and `/library/{mediaId}`
- [x] `GET /library` (auth): own library, cursor paginated `added_at DESC, media_id DESC`; optional `?status=` filter; join media
- [x] `POST /library` (auth): insert library_items; 409 on duplicate; create activity record as side effect
- [x] `GET /library/{mediaId}` (auth): single library entry; 404 if not in library; join media
- [x] `PUT /library/{mediaId}` (auth): update status; fetch current status first; create activity record only if status changed (and not to want_to); 404 if not in library
- [x] `DELETE /library/{mediaId}` (auth): delete from library_items; 204

### 3.5 `reviews` — `/reviews` and `/reviews/{id}`
- [x] `GET /reviews` (auth): list reviews; filter by `?mediaId=` or `?userId=`; cursor paginated `created_at DESC, id DESC`; join user + media
- [x] `POST /reviews` (auth): insert review; 409 on duplicate; if shareToFeed=true, insert activity record
- [x] `PUT /reviews/{id}` (auth): update rating/reviewText; 403 if not author; 404 if not found; do NOT create new activity record
- [x] `DELETE /reviews/{id}` (auth): delete review; 403 if not author; 204; activity record from original review is preserved (historical)

### 3.6 `activity` — `GET /activity`
- [x] `GET /activity` (auth): activity from followed users; cursor paginated `created_at DESC, id DESC`; join user + media on each item

### 3.7 `goals` — `GET /goals`, `POST /goals`
- [x] `GET /goals` (auth): return all goals for user; optional `?year=` filter; compute `current_count` live in JS by filtering finished library items; not paginated
- [x] `POST /goals` (auth): insert goal; 409 on duplicate `(user_id, year, media_type)`

### 3.8 `quotes` — `/quotes` and `/quotes/{id}` and `/quotes/{id}/likes`
- [x] `GET /quotes` (auth): own quotes + public quotes if `?public=true`; cursor paginated `created_at DESC, id DESC`; join media
- [x] `POST /quotes` (auth): insert quote
- [x] `PUT /quotes/{id}` (auth): update quoteText/isPublic; 403 if not author; 404 if not found
- [x] `DELETE /quotes/{id}` (auth): delete quote; 403 if not author; 204
- [x] `POST /quotes/{id}/likes` (auth): insert quote_like; 409 on duplicate
- [x] `DELETE /quotes/{id}/likes` (auth): delete quote_like; 204

### 3.9 `priorities` — `GET /priorities`, `PUT /priorities`
- [x] `GET /priorities` (auth): return user's priority list ordered by `order_index`; join media; not paginated (max 5)
- [x] `PUT /priorities` (auth): upsert priority row; check count < 5 before insert (400 if exceeded); return updated priority with media

---

## Phase 4 — Seed Script (`backend/scripts/seed.ts`)

- [ ] Scaffold script with `dotenv` config, env var validation
- [ ] Supabase Storage setup — create `media-covers` bucket; upload placeholder.jpg
- [ ] Define `seedItems: SeedItem[]` array with all 120 curated titles (books, movies, shows from seed-data-spec.md)
- [ ] Phase 2: Fetch metadata for curated items (TMDB search + detail for movies/shows; Google Books for books); 250ms rate limit between calls
- [ ] Phase 3: Bulk fill — TMDB top-rated movies (pages 1–7) + TV (pages 1–6); Google Books subject searches; deduplicate by title + media_type
- [ ] Phase 4: Download covers, resize to 300×450 JPEG with `sharp` (fit: cover), upload to Storage; skip if already exists; fall back to placeholder on failure
- [ ] Phase 5: Bulk upsert into `media` table (ignoreDuplicates: true on title+media_type conflict)
- [ ] Write `seed-errors.json` at end with any failed items
- [ ] Log summary: items inserted, skipped, image errors
- [ ] Test accounts: after seeding, create alice + bob via `POST /users` with test credentials

---

## Phase 5 — Configuration & Documentation

- [x] `supabase/config.toml` — configure function names, JWT secret reference
- [x] `mise.toml` — all local dev env vars documented in `[env]` section; secrets go in `mise.local.toml`
- [x] `.gitignore` — covers `backend/scripts/seed-errors.json` and `mise.local.toml`
- [ ] Verify OpenAPI spec (`docs/media-tracker-api-spec.json`) matches implementation

---

## Phase 6 — Deployment & Smoke Tests

- [ ] Deploy all Edge Functions via `supabase functions deploy`
- [ ] Smoke test `POST /users` and `POST /tokens`
- [ ] Smoke test `GET /media` (verify pagination headers present)
- [ ] Smoke test `GET /media/{id}` with a valid ID
- [ ] Smoke test `POST /library`, `GET /library`, `PUT /library/{id}`, `DELETE /library/{id}`
- [ ] Smoke test activity record creation (library status change → check GET /activity)
- [ ] Smoke test `GET /goals` (verify `currentCount` computed correctly)
- [ ] Verify token expiry: wait 30min (or set short exp in dev) and confirm 401 returned
- [ ] Verify refresh token rotation: use refresh token twice, second use must return 401

---

## Implementation Notes

### Auth in Edge Functions
Use `supabase.auth.admin.*` APIs for user creation and password verification — this avoids re-implementing bcrypt for user passwords. Supabase handles the `auth.users` table. Custom JWT must be signed with `SUPABASE_JWT_SECRET`.

### Shared code across functions
Supabase Edge Functions support `_shared/` directory under `functions/`. Import with relative path: `import { requireAuth } from '../_shared/auth.ts'`.

### CORS
All functions must respond to `OPTIONS` requests with CORS headers. Consider whether the API needs to be called from browser clients (probably not for this Android course, but add headers for curl/Postman testing).

### N+1 query prevention
When returning lists with nested `user` or `media` objects (e.g., reviews list, activity feed), use a single JOIN rather than fetching each nested object separately.

### `isFollowing` batch computation
For endpoints returning lists of users (followers, following, search), compute `isFollowing` for all users in one query using a LEFT JOIN against `follows` for the authenticated user. See server-behavior-spec.md for the SQL.
