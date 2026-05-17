CREATE TABLE priorities (
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id              integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  priority              integer NOT NULL CHECK (priority BETWEEN 1 AND 3),
  order_index           integer NOT NULL DEFAULT 0,
  estimated_time_hours  integer,
  notes                 text CHECK (length(notes) <= 200),

  PRIMARY KEY (user_id, media_id)
);

CREATE INDEX idx_priorities_user_id ON priorities (user_id, order_index);

-- Max 5 items per user is enforced in Edge Function code, not here.

ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "priorities_select_own"
  ON priorities FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "priorities_insert_own"
  ON priorities FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "priorities_update_own"
  ON priorities FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "priorities_delete_own"
  ON priorities FOR DELETE USING (auth.uid() = user_id);
