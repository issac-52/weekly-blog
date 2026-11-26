-- Let ingested drafts be stored as 'published' when the app decided to auto-publish them.
-- Any other status value still falls back to 'review'.
BEGIN;
CREATE OR REPLACE FUNCTION public.browinfo_ingest_run(p_run text,p_articles text,p_issue text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a jsonb; r jsonb=p_run::jsonb; i jsonb;
BEGIN
 INSERT INTO public.browinfo_runs(id,run_key,payload) VALUES(r->>'id',r->>'key',p_run);
 IF p_issue IS NOT NULL THEN
  i=p_issue::jsonb;
  INSERT INTO public.browinfo_issues(id,payload) VALUES(i->>'id',p_issue) ON CONFLICT(id) DO NOTHING;
 END IF;
 FOR a IN SELECT * FROM jsonb_array_elements(p_articles::jsonb) LOOP
  INSERT INTO public.browinfo_articles(id,slug,issue_id,status,version,payload)
  VALUES(a->>'id',a->>'slug',a->>'issueId',CASE WHEN a->>'status'='published' THEN 'published' ELSE 'review' END,1,a::text);
 END LOOP;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.browinfo_ingest_run(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.browinfo_ingest_run(text,text,text) TO service_role;
COMMIT;
