CREATE TABLE follows (
  follower_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id != followee_id)
);

CREATE INDEX idx_follows_followee_id ON follows (followee_id);
CREATE INDEX idx_follows_follower_id ON follows (follower_id);

-- Maintain users.follower_count and users.following_count
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

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all"
  ON follows FOR SELECT USING (true);

CREATE POLICY "follows_insert_own"
  ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own"
  ON follows FOR DELETE USING (auth.uid() = follower_id);
