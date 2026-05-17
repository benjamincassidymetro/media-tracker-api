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

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email    ON users (email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_public"
  ON users FOR SELECT USING (true);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE USING (auth.uid() = id);
