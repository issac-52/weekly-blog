-- OPTIONAL, NEW Browinfo Supabase project only.
-- Install this only when connecting ChatGPT OAuth. No LLM API key is needed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.browinfo_oauth_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 client_id text NOT NULL,
 admin_user_id uuid NOT NULL,
 resource text NOT NULL CHECK(resource ~ '^https://[^/]+/mcp$')
);
ALTER TABLE public.browinfo_oauth_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.browinfo_oauth_config FROM anon,authenticated,PUBLIC;
GRANT SELECT ON public.browinfo_oauth_config TO supabase_auth_admin;
CREATE POLICY browinfo_hook_config ON public.browinfo_oauth_config FOR SELECT TO supabase_auth_admin USING(true);
CREATE OR REPLACE FUNCTION public.browinfo_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=public,pg_temp AS $$
DECLARE claims jsonb=event->'claims'; cfg public.browinfo_oauth_config%ROWTYPE;
BEGIN
 SELECT * INTO cfg FROM public.browinfo_oauth_config WHERE singleton=true;
 IF FOUND AND COALESCE(event->>'client_id',claims->>'client_id')=cfg.client_id AND event->>'user_id'=cfg.admin_user_id::text THEN
  claims=jsonb_set(claims,'{aud}',to_jsonb(cfg.resource));
  claims=jsonb_set(claims,'{browinfo_scope}','"drafts:write"'::jsonb);
 END IF;
 RETURN jsonb_build_object('claims',claims);
END;$$;
REVOKE ALL ON FUNCTION public.browinfo_access_token_hook(jsonb) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.browinfo_access_token_hook(jsonb) TO supabase_auth_admin;
COMMIT;
-- After registering a dedicated OAuth client, insert exactly one row yourself:
-- INSERT INTO public.browinfo_oauth_config(singleton,client_id,admin_user_id,resource)
-- VALUES(true,'EXACT_OAUTH_CLIENT_ID','EXACT_ADMIN_USER_UUID','https://YOUR-DEPLOYED-ORIGIN/mcp');
-- Enable this function in Authentication > Hooks > Custom Access Token Hook.
-- Keep APP_ORIGIN, CHATGPT_OAUTH_CLIENT_ID and MCP_ADMIN_USER_ID identical to this row.
-- Existing access-token hooks must be merged deliberately; do not silently replace one.
