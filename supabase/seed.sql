-- Local development seed data.
-- Run automatically by: mise run db:reset
-- Run manually with:    supabase db reset  (or psql if needed)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- OAuth client for the Android app (and local API testing)
INSERT INTO public.oauth_clients (client_id, client_secret_hash)
VALUES (
  'ics342-android-v1',
  crypt('mt-android-s26-xK9pQ2', gen_salt('bf', 12))
)
ON CONFLICT (client_id) DO NOTHING;
