-- NEW, dedicated Supabase project ONLY. This script never touches legacy posts,
-- meter_records, auth, existing buckets, or other services. Apply after approval.
BEGIN;
CREATE TABLE public.browinfo_issues (id text PRIMARY KEY,payload text NOT NULL);
CREATE TABLE public.browinfo_articles (id text PRIMARY KEY,slug text UNIQUE NOT NULL,issue_id text NOT NULL,status text NOT NULL CHECK(status IN ('review','changes','approved','published','rejected')),version integer NOT NULL DEFAULT 1,payload text NOT NULL);
CREATE INDEX browinfo_articles_issue_status_idx ON public.browinfo_articles(issue_id,status);
CREATE TABLE public.browinfo_runs (id text PRIMARY KEY,run_key text UNIQUE NOT NULL,payload text NOT NULL);
CREATE TABLE public.browinfo_events (id text PRIMARY KEY,article_id text NOT NULL,payload text NOT NULL);
CREATE TABLE public.browinfo_bookmarks (article_id text PRIMARY KEY);
ALTER TABLE public.browinfo_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browinfo_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browinfo_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browinfo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browinfo_bookmarks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.browinfo_issues,public.browinfo_articles,public.browinfo_runs,public.browinfo_events,public.browinfo_bookmarks FROM anon,authenticated;
GRANT SELECT ON public.browinfo_issues,public.browinfo_articles TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.browinfo_issues,public.browinfo_articles,public.browinfo_runs,public.browinfo_events,public.browinfo_bookmarks TO service_role;
CREATE POLICY browinfo_read_issues ON public.browinfo_issues FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY browinfo_read_published ON public.browinfo_articles FOR SELECT TO anon,authenticated USING(status='published');
CREATE FUNCTION public.browinfo_update_article(p_id text,p_expected integer,p_payload text,p_status text,p_slug text,p_event text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 UPDATE public.browinfo_articles SET payload=p_payload,status=p_status,slug=p_slug,version=p_expected+1 WHERE id=p_id AND version=p_expected;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RETURN false; END IF;
 INSERT INTO public.browinfo_events(id,article_id,payload) VALUES((p_event::jsonb)->>'id',p_id,p_event);
 RETURN true;
END;
$$;
CREATE FUNCTION public.browinfo_ingest_run(p_run text,p_articles text,p_issue text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a jsonb; r jsonb=p_run::jsonb; i jsonb;
BEGIN
 INSERT INTO public.browinfo_runs(id,run_key,payload) VALUES(r->>'id',r->>'key',p_run);
 IF p_issue IS NOT NULL THEN
  i=p_issue::jsonb;
  INSERT INTO public.browinfo_issues(id,payload) VALUES(i->>'id',p_issue) ON CONFLICT(id) DO NOTHING;
 END IF;
 FOR a IN SELECT * FROM jsonb_array_elements(p_articles::jsonb) LOOP
  INSERT INTO public.browinfo_articles(id,slug,issue_id,status,version,payload) VALUES(a->>'id',a->>'slug',a->>'issueId','review',1,a::text);
 END LOOP;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.browinfo_update_article(text,integer,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.browinfo_ingest_run(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.browinfo_update_article(text,integer,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.browinfo_ingest_run(text,text,text) TO service_role;
COMMIT;
