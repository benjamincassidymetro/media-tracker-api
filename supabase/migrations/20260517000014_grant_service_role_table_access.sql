-- Explicit grants for service_role on all public tables used by Edge Functions.
--
-- In hosted Supabase, the platform applies these automatically at project creation
-- via ALTER DEFAULT PRIVILEGES. In local development (supabase db reset --local),
-- that initialization is not replicated, so the service_role ends up with only
-- TRUNCATE/REFERENCES/TRIGGER on tables but not INSERT/SELECT/UPDATE/DELETE.
--
-- The ALTER DEFAULT PRIVILEGES at the end ensures any future tables added in
-- subsequent migrations also receive these grants automatically.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refresh_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.library_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activity TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.follows TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quotes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quote_likes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.priorities TO service_role;

-- Apply grants for any future tables added in new migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
