CREATE TABLE goals (
  id            serial PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year          integer NOT NULL,
  target_count  integer NOT NULL CHECK (target_count >= 1),
  media_type    text NOT NULL DEFAULT 'all' CHECK (media_type IN ('book', 'movie', 'show', 'all')),

  UNIQUE (user_id, year, media_type)
);

CREATE INDEX idx_goals_user_id ON goals (user_id, year);

-- current_count is NOT stored. It is computed live in GET /goals via SQL aggregate.

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select_own"
  ON goals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own"
  ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own"
  ON goals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "goals_delete_own"
  ON goals FOR DELETE USING (auth.uid() = user_id);
