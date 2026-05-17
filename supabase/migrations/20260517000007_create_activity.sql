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

-- Users see their own activity and activity from users they follow.
-- Only service role may insert (Edge Functions write activity as a side effect).
CREATE POLICY "activity_select"
  ON activity FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND followee_id = activity.user_id
    )
  );
