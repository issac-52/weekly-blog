-- NEW Browinfo project only. Additive: no changes to existing articles or Auth.
BEGIN;
CREATE TABLE public.browinfo_source_domains (
 domain text PRIMARY KEY CHECK(length(domain) BETWEEN 3 AND 253 AND domain=lower(domain) AND domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 100),
 kind text NOT NULL CHECK(kind IN ('official','news','research','other')),
 enabled boolean NOT NULL DEFAULT true,
 include_subdomains boolean NOT NULL DEFAULT false,
 usage_note text NOT NULL DEFAULT '' CHECK(length(usage_note)<=2000),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text NOT NULL
);
CREATE TABLE public.browinfo_source_domain_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 domain text NOT NULL, actor text NOT NULL, before_value jsonb,
 after_value jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.browinfo_source_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browinfo_source_domain_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.browinfo_source_domains,public.browinfo_source_domain_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.browinfo_source_domains,public.browinfo_source_domain_events TO service_role;

INSERT INTO public.browinfo_source_domains(domain,label,kind,include_subdomains,updated_by)
 SELECT domain,domain,'official',true,'migration:004' FROM unnest(ARRAY[
 'bok.or.kr','imf.org','unep.org','un.org','anthropic.com','blog.cloudflare.com','github.blog',
 'federalreserve.gov','ecb.europa.eu','oecd.org','worldbank.org','nextjs.org','typescriptlang.org',
 'developers.openai.com','supabase.com'
 ]) AS domain;

CREATE FUNCTION public.browinfo_put_source_domain(p_domain text,p_expected integer,p_value jsonb,p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE previous public.browinfo_source_domains%ROWTYPE; saved public.browinfo_source_domains%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('browinfo-source-registry'));
 IF p_actor IS NULL OR length(p_actor)<1 OR p_expected<0 THEN RAISE EXCEPTION 'invalid source change'; END IF;
 SELECT * INTO previous FROM public.browinfo_source_domains WHERE domain=p_domain FOR UPDATE;
 IF FOUND THEN
  IF previous.version<>p_expected THEN RETURN NULL; END IF;
 ELSE
  IF p_expected<>0 THEN RETURN NULL; END IF;
  IF (SELECT count(*) FROM public.browinfo_source_domains)>=200 THEN RAISE EXCEPTION 'source registry limit'; END IF;
 END IF;
 INSERT INTO public.browinfo_source_domains(domain,label,kind,enabled,include_subdomains,usage_note,version,updated_by)
 VALUES(p_domain,p_value->>'label',p_value->>'kind',(p_value->>'enabled')::boolean,(p_value->>'include_subdomains')::boolean,p_value->>'usage_note',p_expected+1,p_actor)
 ON CONFLICT(domain) DO UPDATE SET label=EXCLUDED.label,kind=EXCLUDED.kind,enabled=EXCLUDED.enabled,
 include_subdomains=EXCLUDED.include_subdomains,usage_note=EXCLUDED.usage_note,version=EXCLUDED.version,updated_at=now(),updated_by=p_actor
 RETURNING * INTO saved;
 INSERT INTO public.browinfo_source_domain_events(domain,actor,before_value,after_value)
 VALUES(p_domain,p_actor,CASE WHEN previous.domain IS NULL THEN NULL ELSE to_jsonb(previous) END,to_jsonb(saved));
 RETURN to_jsonb(saved);
END;$$;
REVOKE ALL ON FUNCTION public.browinfo_put_source_domain(text,integer,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.browinfo_put_source_domain(text,integer,jsonb,text) TO service_role;
COMMIT;
