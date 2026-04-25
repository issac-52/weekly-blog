-- ============================================================
-- booup-blog Supabase 스키마
-- Supabase Dashboard > SQL Editor에서 순서대로 실행하세요
-- ============================================================

-- 1. posts 테이블 생성
CREATE TABLE IF NOT EXISTS public.posts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        UNIQUE NOT NULL,
  title       text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  content     text        NOT NULL DEFAULT '',
  category    text        NOT NULL DEFAULT 'uncategorized',
  published   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Row Level Security 활성화
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 4. 공개 정책: 누구나 published 포스트를 읽을 수 있음 (anon key 사용)
CREATE POLICY "public_read_published"
  ON public.posts
  FOR SELECT
  USING (published = true);

-- 5. 관리자 정책: 인증된 사용자(관리자)는 모든 작업 가능
--    (service role key는 RLS를 우회하므로 별도 정책 불필요)
CREATE POLICY "authenticated_all"
  ON public.posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- meter_records 테이블 (야장관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meter_records (
  id                bigserial   PRIMARY KEY,
  block             text        NOT NULL,
  row_no            text,                -- NO (엑셀 정렬번호)
  name              text,                -- 성명
  address           text,                -- 도로명주소
  old_meter_number  text,                -- 기물번호(기존) - 읽기전용
  meter_number      text,                -- 기물번호 - 편집가능
  reading           text,                -- 지침
  sealed            text,                -- 봉인유무
  location          text,                -- 위치
  usage_type        text,                -- 사용형태
  floor             text,                -- 층수
  note              text,                -- 비고
  survey_date       text,                -- 조사일자(입력일시)
  cover_type        text,                -- 보호통뚜껑양식
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meter_records_block_idx ON public.meter_records (block);

ALTER TABLE public.meter_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_meter"
  ON public.meter_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 관리자 계정 생성 방법
-- ============================================================
-- 방법 A) Supabase Dashboard 사용 (권장)
--   1. Dashboard > Authentication > Users > Add user
--   2. 이메일과 비밀번호 입력 후 생성
--
-- 방법 B) SQL로 직접 생성 (Supabase Auth 스키마 사용)
-- INSERT INTO auth.users (
--   instance_id, id, aud, role, email, encrypted_password,
--   email_confirmed_at, created_at, updated_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'admin@youremail.com',
--   crypt('your-password', gen_salt('bf')),
--   now(), now(), now()
-- );
-- ============================================================
