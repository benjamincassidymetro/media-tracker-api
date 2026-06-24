-- Tracks every media-seeder run. Used both as an audit log and as persistent
-- cursor state — the function reads the last row to determine which pages and
-- book subject to fetch next, replacing the stateless time-based rotation.
CREATE TABLE seeder_runs (
  id               serial PRIMARY KEY,
  run_at           timestamptz NOT NULL DEFAULT now(),

  -- Cursor values used for this run (what was fetched)
  movie_page       integer NOT NULL,
  show_page        integer NOT NULL,
  book_subject     text    NOT NULL,
  book_start_index integer NOT NULL,

  -- Results
  movies_upserted  integer NOT NULL DEFAULT 0,
  shows_upserted   integer NOT NULL DEFAULT 0,
  books_upserted   integer NOT NULL DEFAULT 0,
  errors           text[]  NOT NULL DEFAULT '{}',
  status           text    NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  duration_ms      integer
);

-- Only the seeder (service_role) touches this table.
ALTER TABLE seeder_runs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.seeder_runs TO service_role;
