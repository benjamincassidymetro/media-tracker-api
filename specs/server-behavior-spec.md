# Media Tracker — Server Behavior Specification

This document specifies how the server (Supabase Edge Functions) behaves beyond what is captured in the API spec. It covers cursor pagination implementation, activity record creation rules, token lifecycle, the `isFollowing` computation, RLS policy details, and business rules enforced server-side.

---

## 0. Cursor-Based Pagination

All list endpoints use cursor-based pagination. Pagination metadata is returned in response headers, not the body. The body is always a bare JSON array.

### Response Headers

| Header | Value | When present |
|---|---|---|
| `X-Has-More` | `"true"` or `"false"` | Always on paginated responses |
| `X-Next-Cursor` | Opaque base64url string | Only when `X-Has-More: true` |

### Cursor Encoding

A cursor encodes the minimum information needed to resume the query from where it left off. All cursors are base64url-encoded JSON objects.

**For `id`-sorted endpoints** (media catalog, sorted ascending):
```json
{ "id": 120 }
```
The server filters: `WHERE id > $cursor_id ORDER BY id ASC LIMIT $limit`

**For `createdAt`-sorted endpoints** (feeds, reviews, activity — sorted descending):
```json
{ "id": 456, "created_at": "2024-03-15T10:30:00.000Z" }
```
The server filters using a row value comparison for stable ordering:
```sql
WHERE (created_at, id) < ($cursor_created_at, $cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT $limit
```
Using a compound `(created_at, id)` cursor handles the edge case where multiple records share the same timestamp.

**For `addedAt`-sorted library endpoints** (sorted descending):
```json
{ "media_id": 42, "added_at": "2024-03-15T10:30:00.000Z" }
```
```sql
WHERE user_id = $user_id
  AND (added_at, media_id) < ($cursor_added_at, $cursor_media_id)
ORDER BY added_at DESC, media_id DESC
LIMIT $limit
```

### Encoding and Decoding

```typescript
function encodeCursor(obj: Record<string, unknown>): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeCursor(cursor: string): Record<string, unknown> {
  const padded = cursor.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - padded.length % 4) % 4;
  return JSON.parse(atob(padded + '='.repeat(padLength)));
}
```

### Setting Response Headers

```typescript
function paginatedResponse(items: unknown[], limit: number, cursorFn: (lastItem: unknown) => string): Response {
  const hasMore = items.length === limit;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.set('X-Has-More', String(hasMore));
  if (hasMore) {
    headers.set('X-Next-Cursor', cursorFn(items[items.length - 1]));
  }
  return new Response(JSON.stringify(items), { status: 200, headers });
}
```

**Important:** Query for `limit + 1` items, then slice back to `limit` before responding. The extra item tells you whether another page exists without a separate COUNT query:
```typescript
const rows = await db.query(`SELECT * FROM media WHERE id > $1 ORDER BY id ASC LIMIT $2`, [cursorId, limit + 1]);
const hasMore = rows.length > limit;
const items = rows.slice(0, limit);
```

### Sort Orders by Endpoint

| Endpoint | Sort | Cursor fields |
|---|---|---|
| `GET /media` | `id ASC` | `{ id }` |
| `GET /library` | `added_at DESC, media_id DESC` | `{ added_at, media_id }` |
| `GET /users/{id}/library` | `added_at DESC, media_id DESC` | `{ added_at, media_id }` |
| `GET /reviews` | `created_at DESC, id DESC` | `{ created_at, id }` |
| `GET /activity` | `created_at DESC, id DESC` | `{ created_at, id }` |
| `GET /users/{id}/activity` | `created_at DESC, id DESC` | `{ created_at, id }` |
| `GET /users/{id}/followers` | `created_at DESC` (follow date) | `{ created_at, follower_id }` |
| `GET /users/{id}/following` | `created_at DESC` (follow date) | `{ created_at, followee_id }` |
| `GET /users/search` | `id ASC` (UUID, stable) | `{ id }` |
| `GET /quotes` | `created_at DESC, id DESC` | `{ created_at, id }` |

---

## 1. Activity Record Creation

The `activity` table is append-only. Clients never write to it directly. Activity records are created by Edge Function logic as a side effect of other mutations. The exact rules:

### When to create an activity record

| Trigger | `activity_type` | Notes |
|---|---|---|
| `POST /library` with `status = 'want_to'` | `added` | Always created |
| `POST /library` with `status = 'in_progress'` | `started` | Always created |
| `POST /library` with `status = 'finished'` | `finished` | Always created |
| `PUT /library/{mediaId}` where status changes to `in_progress` | `started` | Only on status change — not on idempotent update |
| `PUT /library/{mediaId}` where status changes to `finished` | `finished` | Only on status change |
| `PUT /library/{mediaId}` where status changes to `want_to` | *(no record)* | Moving back to want_to is not a public activity |
| `POST /reviews` with `shareToFeed = true` | `review` | Include `rating` and `reviewText` on the activity record |
| `POST /reviews` with `shareToFeed = false` | *(no record)* | Review is private |
| `PUT /reviews/{id}` | *(no record)* | Editing a review does not create new activity |
| `DELETE /reviews/{id}` | *(no record, but consider)* | If the original review created an activity record, the activity record remains (it's historical) |
| `DELETE /library/{mediaId}` | *(no record)* | Removing an item is not surfaced as activity |

### Status change detection

For `PUT /library/{mediaId}`, fetch the current row before updating. Only create an activity record if `NEW.status != OLD.status`. An update that sets the same status (idempotent) must not produce a duplicate activity record.

### `review` activity record fields

When `shareToFeed = true` on a review:
```sql
INSERT INTO activity (user_id, activity_type, media_id, rating, review_text)
VALUES ($user_id, 'review', $media_id, $rating, $review_text);
```

`review_text` may be NULL if the user submitted a rating-only review.

### Activity record ordering

Always `ORDER BY created_at DESC`. There is no editing or reordering of activity records.

---

## 2. Token Lifecycle

### Access tokens

Access tokens are short-lived JWTs signed with the Supabase JWT secret. They contain:
- `sub` — user UUID
- `exp` — expiry timestamp (see `token-expiry-config.md`)
- `email` — user email
- `role` — `authenticated`

Access tokens are **not stored** anywhere — they are stateless JWTs. Validation is purely signature + expiry check.

### Refresh tokens

Refresh tokens are random URL-safe strings (32 bytes, base64url encoded). They are stored in the `refresh_tokens` table as a SHA-256 hash (`token_hash`).

**Issuance:** A new refresh token is created on every successful password grant or refresh token grant. The raw token is returned to the client once and never stored in plaintext on the server.

**Validation flow on `POST /tokens` with `grantType = refreshToken`:**
1. Hash the incoming `refreshToken` value with SHA-256.
2. Look up `refresh_tokens` where `token_hash = $hash AND revoked_at IS NULL AND expires_at > now()`.
3. If not found: return 401 (invalid or expired).
4. Validate `clientId` and `clientSecret` against `oauth_clients`.
5. Atomically:
   - Mark the existing token as revoked: `SET revoked_at = now()`.
   - Issue a new access token (JWT).
   - Generate a new refresh token, hash it, insert into `refresh_tokens`.
6. Return the new `accessToken` and `refreshToken`.

**Rotation:** This is single-use refresh token rotation. Each refresh token can only be used once. Using a token immediately invalidates it and replaces it with a new one. If a stolen token is used, the legitimate user's next refresh attempt will fail (the token they hold was revoked by the attacker's use). At that point they must log in again.

**Revocation on sign-out:** When a user signs out (`DELETE /tokens` — if implemented) or when the client-side DataStore is cleared, the server should revoke the current refresh token by setting `revoked_at`. If sign-out is not a tracked endpoint, refresh tokens simply expire on their schedule.

See `token-expiry-config.md` for the configured lifetimes.

---

## 3. `isFollowing` Computation

The `UserProfile` schema includes an `isFollowing` boolean: whether the authenticated user follows the profile being returned. This is **never stored** — it is computed at query time.

The query pattern used when building a `UserProfile` response:

```sql
SELECT
  u.*,
  EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = $authenticated_user_id
      AND followee_id = u.id
  ) AS is_following
FROM users u
WHERE u.id = $target_user_id;
```

**Special cases:**
- `GET /users/me` — `isFollowing` is **omitted** from the response entirely (you cannot follow yourself). The API spec documents this.
- Unauthenticated requests — the endpoint requires a valid bearer token, so there is always an authenticated user. No special handling needed.
- When building a list of users (e.g., `GET /users/{id}/followers`) — `isFollowing` must be computed for each user in the list. Use a single JOIN or a subquery rather than N+1 queries.

```sql
-- Efficient batch isFollowing for a list of users
SELECT
  u.*,
  (f.follower_id IS NOT NULL) AS is_following
FROM users u
LEFT JOIN follows f ON f.follower_id = $auth_user_id AND f.followee_id = u.id
WHERE u.id = ANY($user_ids);
```

---

## 4. Client Credential Validation

On every call to `POST /tokens`, the server must validate both `clientId` and `clientSecret`:

1. Look up `oauth_clients` by `clientId`.
2. If not found: return 401.
3. Compare the provided `clientSecret` against the stored `client_secret_hash` using bcrypt verify.
4. If mismatch: return 401.
5. Proceed with the grant flow.

On `POST /users`, perform the same client credential check before creating the account.

**Why both fields on account creation?** It prevents third parties from registering accounts through the API by guessing the endpoint. In a real app, you'd also rate-limit and require email verification.

---

## 5. Business Rules (Edge Function Enforcement)

These rules are enforced in Edge Function code, not by database constraints alone.

### Library

- A user cannot add the same media item twice. The database `UNIQUE (user_id, media_id)` constraint will reject it, but the Edge Function should detect this and return a clean `409` with `{ "message": "This item is already in your library." }` rather than leaking a raw constraint error.

### Reviews

- One review per user per media item. The database `UNIQUE (user_id, media_id)` constraint on `reviews` enforces this. Return `409` on duplicate.
- Only the review's author may `PUT` or `DELETE` it. Check `reviews.user_id = $authenticated_user_id` before any mutation.

### Priorities

- Maximum 5 items may be prioritized per user at any time. Before inserting a new priority row, count existing rows for that user. If `COUNT >= 5`, return `400` with `{ "message": "You can have at most 5 priority items. Remove one before adding another." }`.
- `PUT /priorities` is an upsert — if a row already exists for `(user_id, media_id)`, update it in place.

### Goals

- One goal per user per year per media_type. The `UNIQUE (user_id, year, media_type)` constraint enforces this. Return `409` on duplicate.

### Follows

- A user cannot follow themselves. The database `CHECK (follower_id != followee_id)` constraint enforces this. Return `400` on self-follow attempts.
- Following a user already followed should return `409` (the database `PRIMARY KEY` constraint will enforce uniqueness; return a clean message).

---

## 6. Row Level Security — Full Policy Definitions

Enable RLS on all tables. The Edge Functions run as the authenticated user (via the JWT), so RLS applies to all database queries made through the client-side Supabase client. Queries made via the service role key (from Edge Functions using `supabaseAdmin`) bypass RLS — this is how activity records and counter updates are made safely.

### `users`

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Anyone can read any user profile (public social app)
CREATE POLICY "users_select_public"
  ON users FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "users_update_own"
  ON users FOR UPDATE USING (auth.uid() = id);

-- Insert handled by service role on account creation (not user-initiated)
-- No INSERT policy for authenticated role
```

### `media`

```sql
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read media (or make public if needed for search)
CREATE POLICY "media_select_all"
  ON media FOR SELECT USING (true);

-- No mutations allowed from client — only service role can seed/modify
```

### `library_items`

```sql
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;

-- Users can always read their own library
CREATE POLICY "library_select_own"
  ON library_items FOR SELECT USING (auth.uid() = user_id);

-- Users can manage (insert/update/delete) their own library
CREATE POLICY "library_insert_own"
  ON library_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "library_update_own"
  ON library_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "library_delete_own"
  ON library_items FOR DELETE USING (auth.uid() = user_id);

-- Reading others' library (for User Profile screen): handled in Edge Function
-- using service role to bypass RLS, then filtering as appropriate
```

**Note on public library access:** `GET /users/{id}/library` returns another user's library. Rather than adding a blanket "all libraries are public" RLS policy (which would expose library data to arbitrary authenticated queries), this endpoint runs as the service role in the Edge Function, reads the target user's library, and returns it. This keeps the data model simple while keeping the API behavior explicit.

### `reviews`

```sql
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews are public
CREATE POLICY "reviews_select_all"
  ON reviews FOR SELECT USING (true);

-- Users can only insert, update, delete their own reviews
CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own"
  ON reviews FOR DELETE USING (auth.uid() = user_id);
```

### `activity`

```sql
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

-- Activity is only inserted by service role (no INSERT policy for authenticated users)
-- SELECT: users can see their own activity and activity from users they follow
CREATE POLICY "activity_select"
  ON activity FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND followee_id = activity.user_id
    )
  );
```

### `follows`

```sql
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see who follows whom (public social graph)
CREATE POLICY "follows_select_all"
  ON follows FOR SELECT USING (true);

-- Users can only add/remove their own follows
CREATE POLICY "follows_insert_own"
  ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own"
  ON follows FOR DELETE USING (auth.uid() = follower_id);
```

### `goals`, `quotes`, `quote_likes`, `priorities`

All follow the same pattern: SELECT and all mutations are restricted to `auth.uid() = user_id` (or `auth.uid() = quote_likes.user_id` for quote_likes). Public quotes are the one exception:

```sql
-- quotes: own rows + public rows are readable
CREATE POLICY "quotes_select"
  ON quotes FOR SELECT USING (
    user_id = auth.uid() OR is_public = true
  );
```

---

## 7. Error Response Format

All errors return JSON with a consistent shape:

```json
{ "message": "Human-readable description of the error." }
```

The `message` field is safe to display to end users for the common cases (409, 401, 400). For unexpected server errors (500), return `{ "message": "Something went wrong. Please try again." }` — never expose stack traces or raw database errors.

---

## 8. Request Authentication

Every endpoint except `POST /users` and `POST /tokens` requires a valid bearer token. The Edge Function middleware:

1. Reads the `Authorization: Bearer <token>` header.
2. Verifies the JWT signature and `exp` claim.
3. Extracts `sub` (user UUID) and attaches it to the request context as `$authenticated_user_id`.
4. If missing or invalid: returns `401 { "message": "Authentication required." }`.

The `X-Client-ID` header (attached by the Android `AuthInterceptor`) is informational only at the middleware layer — it is not re-validated on authenticated endpoints. Client credentials are only validated on the auth endpoints (`POST /users`, `POST /tokens`).
