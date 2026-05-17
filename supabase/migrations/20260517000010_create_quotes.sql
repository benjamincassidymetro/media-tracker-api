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

CREATE INDEX idx_quotes_user_id  ON quotes (user_id);
CREATE INDEX idx_quotes_media_id ON quotes (media_id);
CREATE INDEX idx_quotes_public   ON quotes (is_public) WHERE is_public = true;

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Own quotes are always visible; public quotes from any user are visible.
CREATE POLICY "quotes_select"
  ON quotes FOR SELECT USING (
    user_id = auth.uid() OR is_public = true
  );

CREATE POLICY "quotes_insert_own"
  ON quotes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_update_own"
  ON quotes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "quotes_delete_own"
  ON quotes FOR DELETE USING (auth.uid() = user_id);
