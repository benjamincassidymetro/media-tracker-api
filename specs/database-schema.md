# Media Tracker — Database Schema

This document defines the PostgreSQL schema for the Supabase backend. All tables live in the `public` schema. Auth is handled by Supabase's built-in `auth.users` table; the `users` table here is a profile extension.

---

## Design Decisions

**Denormalized counters vs. live aggregates.** Several counts (`follower_count`, `following_count`, `tracked_count`, `rating_count`, `average_rating`, `like_count`) are stored as columns and maintained by triggers rather than computed at query time. Aggregating across large tables on every request is expensive and unnecessary for a teaching project. Triggers keep counts consistent while keeping queries simple — which is also the right pattern to teach.

**`current_count` on goals** is the one exception: it is never stored. It is always computed as a live aggregate at query time. The reason: it must stay perfectly in sync with library status changes, and a goal miscounting finished items would be confusing and hard to debug during demos. Computing it fresh on each `GET /goals` request is acceptable for the volume involved.

**`media.review_count`** is maintained separately from `rating_count`. Every review has a rating, so they will always be equal in this app — but they're modeled separately in case the schema ever allows rating-only submissions. Keep them in sync via the same trigger.

**`isFollowing` on UserProfile** is not stored anywhere. It is computed at query time as a JOIN against the `follows` table for the authenticated user. This is straightforward SQL and avoids denormalization of a relationship that changes frequently.

**IDs.** User IDs are UUIDs (from Supabase auth). All other primary keys are `serial` integers (auto-incrementing) for simplicity. The API exposes media IDs as integers.

**`media.cover_url`** stores Supabase Storage public URLs, not external CDN links. Cover images are fetched from TMDB and Google Books during seeding, resized to 300×450px JPEG, and uploaded to the `media-covers` Storage bucket. The app only ever loads covers from Supabase — no runtime dependency on TMDB or Google Books.

---

## Supabase Storage

One bucket is required. Create it before running the seed script.

| Bucket | Public | Contents |
|---|---|---|
| `media-covers` | Yes (public read) | Cover images for all media items. Named `{media_type}-{slug}.jpg`. Also contains `placeholder.jpg` for items whose image fetch failed during seeding. |

No RLS policies are needed on Storage for this bucket — public buckets allow unauthenticated GET. Uploads are performed only by the seed script via the service role key.

---

## Tables

### `users`

Profile data for each registered user. Extended from `auth.users` via the same UUID primary key.

```sql
CREATE TABLE users (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            text NOT NULL UNIQUE,
  username         text NOT NULL UNIQUE CHECK (length(username) >= 3),
  display_name     text NOT NULL,
  bio              text CHECK (length(bio) <= 160),
  avatar_url       text,
  follower_count   integer NOT NULL DEFAULT 0,
  following_count  integer NOT NULL DEFAULT 0,
  tracked_count    integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email    ON users (email);
```

**Trigger maintenance:**
- `follower_count` — incremented on `INSERT` into `follows` (followee_id = this user); decremented on `DELETE`.
- `following_count` — incremented on `INSERT` into `follows` (follower_id = this user); decremented on `DELETE`.
- `tracked_count` — incremented on `INSERT` into `library_items`; decremented on `DELETE`.

---

### `oauth_clients`

Stores recognized client applications. The Android app must supply a matching `client_id` + `client_secret` pair on every auth request. This table validates those credentials.

```sql
CREATE TABLE oauth_clients (
  client_id          text PRIMARY KEY,
  client_secret_hash text NOT NULL,  -- bcrypt hash of the secret
  description        text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
```

No RLS — this table is only readable by Edge Function service-role calls. Students never query it directly.

**Initial row:** See `backend/client-credentials.md`.

---

### `refresh_tokens`

Stores refresh tokens issued to users. Access tokens are short-lived JWTs; refresh tokens are long-lived and stored here for validation and revocation.

```sql
CREATE TABLE refresh_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id    text NOT NULL REFERENCES oauth_clients(client_id),
  token_hash   text NOT NULL UNIQUE,  -- SHA-256 hex of the raw token
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,           -- NULL = active; set on use or explicit revocation
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
```

**Rotation policy:** When a refresh token is used, it is immediately revoked (`revoked_at = now()`) and a new refresh token is issued. This is refresh token rotation — it limits the window of exposure if a token is stolen. See `server-behavior-spec.md` for full token lifecycle.

---

### `media`

The static media catalog. Seeded once; students cannot create or modify media items through the app. See `seed-data-spec.md` for catalog details.

```sql
CREATE TABLE media (
  id               serial PRIMARY KEY,
  media_type       text NOT NULL CHECK (media_type IN ('book', 'movie', 'show')),
  title            text NOT NULL,
  description      text,
  cover_url        text,
  published_year   integer,
  genres           text[] NOT NULL DEFAULT '{}',

  -- Book-specific
  author           text,
  page_count       integer,
  isbn             text,

  -- Movie-specific
  director         text,
  runtime_minutes  integer,

  -- Show-specific
  creator          text,
  network          text,
  season_count     integer,
  episode_count    integer,

  -- Computed by triggers (see below)
  average_rating   numeric(3,2) NOT NULL DEFAULT 0,
  rating_count     integer NOT NULL DEFAULT 0,
  review_count     integer NOT NULL DEFAULT 0,

  created_at       timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_media_type         ON media (media_type);
CREATE INDEX idx_media_title        ON media USING gin (to_tsvector('english', title));
CREATE INDEX idx_media_author       ON media (author) WHERE author IS NOT NULL;
```

**Trigger maintenance:**
- `average_rating`, `rating_count`, `review_count` — recalculated on `INSERT`, `UPDATE`, `DELETE` of `reviews` rows referencing this media item.

```sql
-- Example trigger function (implement in Edge Function or as pg trigger)
CREATE OR REPLACE FUNCTION update_media_rating_stats()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_id integer;
BEGIN
  target_id := COALESCE(NEW.media_id, OLD.media_id);
  UPDATE media SET
    rating_count   = (SELECT COUNT(*) FROM reviews WHERE media_id = target_id),
    review_count   = (SELECT COUNT(*) FROM reviews WHERE media_id = target_id),
    average_rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE media_id = target_id), 0)
  WHERE id = target_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_reviews_update_media_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_media_rating_stats();
```

---

### `library_items`

Tracks each user's reading/watching list. Composite primary key — one row per user per media item.

```sql
CREATE TABLE library_items (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id   integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('want_to', 'in_progress', 'finished')),
  added_at   timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, media_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_library_user_id  ON library_items (user_id);
CREATE INDEX idx_library_status   ON library_items (user_id, status);
```

**Trigger maintenance:**
- `users.tracked_count` — incremented on `INSERT`, decremented on `DELETE`.
- `goals.current_count` — NOT stored. Computed live. See Goals table.
- Activity records — see `server-behavior-spec.md`.

```sql
-- Update tracked_count on the user
CREATE OR REPLACE FUNCTION update_tracked_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET tracked_count = tracked_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET tracked_count = tracked_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_library_tracked_count
AFTER INSERT OR DELETE ON library_items
FOR EACH ROW EXECUTE FUNCTION update_tracked_count();
```

---

### `reviews`

One review per user per media item. The `UNIQUE` constraint on `(user_id, media_id)` enforces this at the database level.

```sql
CREATE TABLE reviews (
  id           serial PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id     integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text  text CHECK (length(review_text) <= 500),
  share_to_feed boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, media_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_reviews_media_id ON reviews (media_id);
CREATE INDEX idx_reviews_user_id  ON reviews (user_id);
```

---

### `activity`

An append-only log of public user actions. Activity records are created by server-side trigger or Edge Function logic — never by the client directly. See `server-behavior-spec.md` for exactly when records are created.

```sql
CREATE TABLE activity (
  id             serial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type  text NOT NULL CHECK (activity_type IN ('added', 'started', 'finished', 'review')),
  media_id       integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  rating         smallint CHECK (rating BETWEEN 1 AND 5),    -- present when activity_type = 'review'
  review_text    text,                                        -- present when activity_type = 'review' and text was written
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_activity_user_id    ON activity (user_id, created_at DESC);
CREATE INDEX idx_activity_created_at ON activity (created_at DESC);
```

**Note:** The activity feed (`GET /activity`) queries this table filtered by users the authenticated user follows. The query is:
```sql
SELECT a.* FROM activity a
WHERE a.user_id IN (
  SELECT followee_id FROM follows WHERE follower_id = $authenticated_user_id
)
ORDER BY a.created_at DESC
LIMIT $limit OFFSET $offset;
```

---

### `follows`

A follow relationship: `follower_id` follows `followee_id`. Self-follows are prohibited by the CHECK constraint.

```sql
CREATE TABLE follows (
  follower_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id != followee_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_follows_followee_id ON follows (followee_id);
CREATE INDEX idx_follows_follower_id ON follows (follower_id);
```

**Trigger maintenance:**
- `users.follower_count` (on the followee) — incremented on `INSERT`, decremented on `DELETE`.
- `users.following_count` (on the follower) — incremented on `INSERT`, decremented on `DELETE`.

```sql
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET follower_count  = follower_count  + 1 WHERE id = NEW.followee_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET follower_count  = follower_count  - 1 WHERE id = OLD.followee_id;
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_follows_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();
```

---

### `goals`

Yearly reading/watching goals, one per user per year per media_type. `current_count` is computed live, not stored.

```sql
CREATE TABLE goals (
  id            serial PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year          integer NOT NULL,
  target_count  integer NOT NULL CHECK (target_count >= 1),
  media_type    text NOT NULL DEFAULT 'all' CHECK (media_type IN ('book', 'movie', 'show', 'all')),

  UNIQUE (user_id, year, media_type)
);
```

**Indexes:**
```sql
CREATE INDEX idx_goals_user_id ON goals (user_id, year);
```

**`current_count` computation:** Computed at query time by joining against `library_items` and `media`. The Edge Function that handles `GET /goals` runs:

```sql
SELECT
  g.*,
  COUNT(li.media_id) FILTER (
    WHERE li.status = 'finished'
    AND EXTRACT(YEAR FROM li.updated_at) = g.year
    AND (g.media_type = 'all' OR m.media_type = g.media_type)
  ) AS current_count
FROM goals g
LEFT JOIN library_items li ON li.user_id = g.user_id
LEFT JOIN media m ON m.id = li.media_id
WHERE g.user_id = $user_id
  AND ($year IS NULL OR g.year = $year)
GROUP BY g.id;
```

---

### `quotes`

Favorite quotes saved by users, optionally public. `like_count` is denormalized and maintained by trigger.

```sql
CREATE TABLE quotes (
  id          serial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id    integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  quote_text  text NOT NULL CHECK (length(quote_text) <= 500),
  page_number integer,
  is_public   boolean NOT NULL DEFAULT false,
  like_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_quotes_user_id  ON quotes (user_id);
CREATE INDEX idx_quotes_media_id ON quotes (media_id);
CREATE INDEX idx_quotes_public   ON quotes (is_public) WHERE is_public = true;
```

---

### `quote_likes`

Tracks which users have liked which quotes. Composite primary key prevents double-liking.

```sql
CREATE TABLE quote_likes (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_id   integer NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, quote_id)
);
```

**Trigger maintenance:**
- `quotes.like_count` — incremented on `INSERT`, decremented on `DELETE`.

```sql
CREATE OR REPLACE FUNCTION update_quote_like_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE quotes SET like_count = like_count + 1 WHERE id = NEW.quote_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE quotes SET like_count = like_count - 1 WHERE id = OLD.quote_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_quote_likes_count
AFTER INSERT OR DELETE ON quote_likes
FOR EACH ROW EXECUTE FUNCTION update_quote_like_count();
```

---

### `priorities`

User-curated priority list for want-to items. Max 5 priorities enforced at the application layer (Edge Function checks before insert/update). Composite primary key — one priority record per user per media item.

```sql
CREATE TABLE priorities (
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id              integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  priority              integer NOT NULL CHECK (priority BETWEEN 1 AND 3),
  order_index           integer NOT NULL DEFAULT 0,
  estimated_time_hours  integer,
  notes                 text CHECK (length(notes) <= 200),

  PRIMARY KEY (user_id, media_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_priorities_user_id ON priorities (user_id, order_index);
```

---

## Enum Types (PostgreSQL)

Rather than `CHECK` constraints on raw text, the schema above uses inline CHECK for clarity. For production, promote these to proper PostgreSQL enum types:

```sql
CREATE TYPE media_type_enum   AS ENUM ('book', 'movie', 'show');
CREATE TYPE library_status    AS ENUM ('want_to', 'in_progress', 'finished');
CREATE TYPE activity_type     AS ENUM ('added', 'started', 'finished', 'review');
CREATE TYPE goal_media_type   AS ENUM ('book', 'movie', 'show', 'all');
```

In Supabase, either approach works — CHECK constraints are fine for a course project.

---

## Row Level Security (RLS) — Intent Summary

Full RLS policies are specified in `server-behavior-spec.md`. The intent for each table:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | Public (anyone) | Service role only (on auth signup) | Own row only | Service role only |
| `oauth_clients` | Service role only | Service role only | Service role only | Service role only |
| `refresh_tokens` | Service role only | Service role only | Service role only | Service role only |
| `media` | Public (anyone) | Service role only | Service role only | Service role only |
| `library_items` | Own rows; others' rows if their profile is public | Own rows only | Own rows only | Own rows only |
| `reviews` | Public (anyone) | Own rows only | Own rows only (own reviews) | Own rows only |
| `activity` | Followers can see; own always visible | Service role only (created by trigger/function) | No one | No one |
| `follows` | Public | Own rows only | No one | Own rows only |
| `goals` | Own rows only | Own rows only | Own rows only | Own rows only |
| `quotes` | Public rows (`is_public = true`) + own rows | Own rows only | Own rows only | Own rows only |
| `quote_likes` | Public | Own rows only | No one | Own rows only |
| `priorities` | Own rows only | Own rows only | Own rows only | Own rows only |

---

## Schema Diagram (Entity Relationships)

```
auth.users ──< users >──< library_items >── media
                │              │               │
                │         follows              reviews ──< activity
                │              │               │
                └──< goals     └── follows     └── quote_likes
                │
                └──< quotes >── quote_likes
                │
                └──< priorities
                │
                └──< refresh_tokens
```

`users` is the hub — every user-generated table foreign-keys to it. `media` is the shared catalog that multiple user tables reference.
