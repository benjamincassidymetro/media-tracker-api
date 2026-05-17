CREATE TABLE oauth_clients (
  client_id          text PRIMARY KEY,
  client_secret_hash text NOT NULL,
  description        text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;

-- No policies — service role only. Authenticated users cannot read or write this table.
