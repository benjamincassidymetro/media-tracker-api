CREATE TABLE media (
  id               serial PRIMARY KEY,
  media_type       text NOT NULL CHECK (media_type IN ('book', 'movie', 'show')),
  title            text NOT NULL,
  description      text,
  cover_url        text,
  published_year   integer,
  genres           text[] NOT NULL DEFAULT '{}',

  -- Book-specific
  author           text,
  page_count       integer,
  isbn             text,

  -- Movie-specific
  director         text,
  runtime_minutes  integer,

  -- Show-specific
  creator          text,
  network          text,
  season_count     integer,
  episode_count    integer,

  -- Maintained by trigger on reviews
  average_rating   numeric(3,2) NOT NULL DEFAULT 0,
  rating_count     integer NOT NULL DEFAULT 0,
  review_count     integer NOT NULL DEFAULT 0,

  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_type   ON media (media_type);
CREATE INDEX idx_media_title  ON media USING gin (to_tsvector('english', title));
CREATE INDEX idx_media_author ON media (author) WHERE author IS NOT NULL;

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_select_all"
  ON media FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies — only service role (seed script) may modify media.
