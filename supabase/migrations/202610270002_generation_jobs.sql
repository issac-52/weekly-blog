-- NEW Browinfo project only. Lease prevents overlapping model calls.
BEGIN;
CREATE TABLE public.browinfo_jobs(run_key text PRIMARY KEY,status text NOT NULL,token text NOT NULL,lease_until timestamptz NOT NULL,result text,updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.browinfo_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.browinfo_jobs FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.browinfo_jobs TO service_role;
CREATE FUNCTION public.browinfo_claim_job(p_key text,p_token text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 INSERT INTO public.browinfo_jobs(run_key,status,token,lease_until) VALUES(p_key,'running',p_token,now()+interval '10 minutes')
 ON CONFLICT(run_key) DO UPDATE SET status='running',token=p_token,lease_until=now()+interval '10 minutes',updated_at=now()
 WHERE browinfo_jobs.status<>'completed' AND browinfo_jobs.lease_until<now();
 GET DIAGNOSTICS n=ROW_COUNT;RETURN n=1;
END;$$;
CREATE FUNCTION public.browinfo_finish_job(p_key text,p_token text,p_success boolean,p_result text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 UPDATE public.browinfo_jobs SET status=CASE WHEN p_success THEN 'completed' ELSE 'failed' END,result=p_result,lease_until=now(),updated_at=now() WHERE run_key=p_key AND token=p_token AND status='running';
 GET DIAGNOSTICS n=ROW_COUNT;RETURN n=1;
END;$$;
REVOKE ALL ON FUNCTION public.browinfo_claim_job(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.browinfo_finish_job(text,text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.browinfo_claim_job(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.browinfo_finish_job(text,text,boolean,text) TO service_role;
COMMIT;
