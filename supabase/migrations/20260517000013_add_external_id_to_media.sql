-- Add external_id to media for deduplication in the scheduled seeder.
-- Format: tmdb-movie-{id} | tmdb-show-{id} | gb-{volumeId}
-- Nullable so existing rows seeded without an external ID are unaffected.
ALTER TABLE media ADD COLUMN external_id text UNIQUE;
