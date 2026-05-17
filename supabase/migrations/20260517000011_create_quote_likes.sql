CREATE TABLE quote_likes (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_id   integer NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, quote_id)
);

-- Maintain quotes.like_count
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

ALTER TABLE quote_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_likes_select_all"
  ON quote_likes FOR SELECT USING (true);

CREATE POLICY "quote_likes_insert_own"
  ON quote_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quote_likes_delete_own"
  ON quote_likes FOR DELETE USING (auth.uid() = user_id);
