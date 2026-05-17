CREATE TABLE activity (
  id             serial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type  text NOT NULL CHECK (activity_type IN ('added', 'started', 'finished', 'review')),
  media_id       integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  rating         smallint CHECK (rating BETWEEN 1 AND 5),
  review_text    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_user_id    ON activity (user_id, created_at DESC);
CREATE INDEX idx_activity_created_at ON activity (created_at DESC);

ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

-- activity_select policy is defined in 20260517000008_create_follows.sql
-- because it references the follows table.
