-- Local development seed data.
-- Run automatically by: mise run db:reset
-- Run manually with:    supabase db reset  (or psql if needed)

-- OAuth client for the Android app (and local API testing)
INSERT INTO public.oauth_clients (client_id, client_secret_hash)
VALUES (
  'ics342-android-v1',
  'mt-android-s26-xK9pQ2'
)
ON CONFLICT (client_id) DO NOTHING;

-- Minimal media catalog for e2e tests.
-- Tests query these by title to get stable IDs.
INSERT INTO public.media (media_type, title, description, published_year, genres, author, director, creator)
VALUES
  ('book',  'Test Book Alpha',  'A test book.',  2000, ARRAY['Science Fiction'], 'Test Author', NULL,          NULL),
  ('movie', 'Test Movie Alpha', 'A test movie.', 2001, ARRAY['Action'],          NULL,          'Test Director', NULL),
  ('show',  'Test Show Alpha',  'A test show.',  2002, ARRAY['Drama'],           NULL,          NULL,          'Test Creator');
