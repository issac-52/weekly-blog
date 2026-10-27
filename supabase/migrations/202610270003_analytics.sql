-- NEW Browinfo project only. No IP, full user-agent, referrer, or raw cookie is stored.
BEGIN;
CREATE TABLE public.browinfo_pageviews(
 id uuid PRIMARY KEY,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 local_day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
 path text NOT NULL CHECK(length(path)<=180),
 article_id text,
 visitor_hash text NOT NULL CHECK(visitor_hash ~ '^[a-f0-9]{64}$')
);
CREATE INDEX browinfo_pageviews_time_idx ON public.browinfo_pageviews(occurred_at);
CREATE INDEX browinfo_pageviews_day_idx ON public.browinfo_pageviews(local_day);
CREATE INDEX browinfo_pageviews_visitor_idx ON public.browinfo_pageviews(visitor_hash,occurred_at);
ALTER TABLE public.browinfo_pageviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.browinfo_pageviews FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.browinfo_pageviews TO service_role;
CREATE FUNCTION public.browinfo_record_pageview(p_id uuid,p_path text,p_visitor_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE article text;n integer;
BEGIN
 IF p_visitor_hash !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
 IF p_path NOT IN('/','/archive') THEN
  IF p_path !~ '^/blog/[a-zA-Z0-9_-]{1,150}$' THEN RETURN false; END IF;
  SELECT id INTO article FROM public.browinfo_articles WHERE slug=substring(p_path FROM 7) AND status='published';
  IF article IS NULL THEN RETURN false; END IF;
 END IF;
 -- Serialize the short per-visitor rate check. No IP-based fingerprinting.
 PERFORM pg_advisory_xact_lock(hashtext(p_visitor_hash)::bigint);
 IF (SELECT count(*) FROM public.browinfo_pageviews WHERE visitor_hash=p_visitor_hash AND occurred_at>now()-interval '1 minute')>=30 THEN RETURN false; END IF;
 INSERT INTO public.browinfo_pageviews(id,path,article_id,visitor_hash) VALUES(p_id,p_path,article,p_visitor_hash) ON CONFLICT(id) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 -- Bounded cleanup; never send historical visitor identifiers to the browser.
 DELETE FROM public.browinfo_pageviews WHERE id IN(SELECT id FROM public.browinfo_pageviews WHERE occurred_at<now()-interval '90 days' ORDER BY occurred_at LIMIT 250);
 RETURN n=1;
END;$$;
CREATE FUNCTION public.browinfo_analytics_overview(p_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE today date=(now() AT TIME ZONE 'Asia/Seoul')::date; days integer=CASE WHEN p_days=30 THEN 30 ELSE 7 END; result jsonb;
BEGIN
 SELECT jsonb_build_object(
  'timezone','Asia/Seoul','days',days,
  'today',today::text,
  'todayViews',(SELECT count(*) FROM public.browinfo_pageviews WHERE local_day=today),
  'yesterdayViews',(SELECT count(*) FROM public.browinfo_pageviews WHERE local_day=today-1),
  'todayVisitors',(SELECT count(DISTINCT visitor_hash) FROM public.browinfo_pageviews WHERE local_day=today),
  'todayArticleViews',(SELECT count(*) FROM public.browinfo_pageviews WHERE local_day=today AND article_id IS NOT NULL),
  'last30Views',(SELECT count(*) FROM public.browinfo_pageviews WHERE local_day BETWEEN today-29 AND today),
  'daily',(SELECT coalesce(jsonb_agg(jsonb_build_object('day',d.day::date::text,'views',coalesce(v.views,0),'visitors',coalesce(v.visitors,0)) ORDER BY d.day),'[]'::jsonb)
   FROM generate_series((today-days+1)::timestamp,today::timestamp,interval '1 day') d(day)
   LEFT JOIN(SELECT local_day,count(*) views,count(DISTINCT visitor_hash) visitors FROM public.browinfo_pageviews WHERE local_day BETWEEN today-days+1 AND today GROUP BY local_day) v ON v.local_day=d.day::date),
  'popular',(SELECT coalesce(jsonb_agg(row),'[]'::jsonb) FROM(
   SELECT a.id,a.slug,replace((a.payload::jsonb)->>'title',E'\n',' ') title,count(*) views
   FROM public.browinfo_pageviews p JOIN public.browinfo_articles a ON a.id=p.article_id
   WHERE p.local_day BETWEEN today-days+1 AND today AND a.status='published'
   GROUP BY a.id,a.slug,a.payload ORDER BY count(*) DESC,a.id LIMIT 5
  )row)
 )INTO result;
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.browinfo_record_pageview(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.browinfo_analytics_overview(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.browinfo_record_pageview(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.browinfo_analytics_overview(integer) TO service_role;
COMMIT;
