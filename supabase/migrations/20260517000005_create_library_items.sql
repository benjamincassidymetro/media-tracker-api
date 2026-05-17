CREATE TABLE library_items (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id   integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('want_to', 'in_progress', 'finished')),
  added_at   timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, media_id)
);

CREATE INDEX idx_library_user_id ON library_items (user_id);
CREATE INDEX idx_library_status  ON library_items (user_id, status);

-- Maintain users.tracked_count
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

ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_select_own"
  ON library_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "library_insert_own"
  ON library_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "library_update_own"
  ON library_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "library_delete_own"
  ON library_items FOR DELETE USING (auth.uid() = user_id);
