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

CREATE INDEX idx_reviews_media_id ON reviews (media_id);
CREATE INDEX idx_reviews_user_id  ON reviews (user_id);

-- Maintain media.average_rating, media.rating_count, media.review_count
CREATE OR REPLACE FUNCTION update_media_rating_stats()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_id integer;
BEGIN
  target_id := COALESCE(NEW.media_id, OLD.media_id);
  UPDATE media SET
    rating_count   = (SELECT COUNT(*)           FROM reviews WHERE media_id = target_id),
    review_count   = (SELECT COUNT(*)           FROM reviews WHERE media_id = target_id),
    average_rating = COALESCE(
                       (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE media_id = target_id),
                       0
                     )
  WHERE id = target_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_reviews_update_media_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_media_rating_stats();

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_all"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own"
  ON reviews FOR DELETE USING (auth.uid() = user_id);
