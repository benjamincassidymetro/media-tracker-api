CREATE TABLE oauth_clients (
  client_id          text PRIMARY KEY,
  client_secret_hash text NOT NULL,
  description        text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;

-- No policies — Edge Functions access this table via service role (bypasses RLS).
-- The GRANTs below make the table visible to PostgREST's schema cache; RLS
-- prevents anon/authenticated from actually reading any rows.
GRANT SELECT ON TABLE public.oauth_clients TO service_role, authenticated, anon;
