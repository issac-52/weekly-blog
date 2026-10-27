# Vercel 및 새 Supabase 이전 절차

## 1. 새 DB

기존 다른 서비스와 공유하는 프로젝트에는 SQL을 적용하지 않습니다. 새 전용 프로젝트에 다음을 순서대로 적용합니다.

1. `supabase/migrations/202610260001_browinfo_magazine.sql`
2. `supabase/migrations/202610270002_generation_jobs.sql`

5개 콘텐츠 테이블과 실행 lease 테이블 1개가 생성됩니다. 익명/일반 인증 사용자는 발행본만 조회하고 관리 쓰기 및 RPC는 service_role에만 허용됩니다. 관리자 권한은 앱 서버가 Supabase Auth의 검증된 사용자와 ADMIN_EMAILS를 대조합니다. 단순 로그인만으로 관리자가 되지 않습니다.

## 2. 환경변수

`.env.example`의 값을 로컬과 검증용 Vercel 프로젝트에 설정합니다. 공개 URL과 publishable key만 NEXT_PUBLIC 접두사입니다. service_role / Claude API key / Cron secret / preview 비밀번호는 서버 전용입니다. EXPECTED_SUPABASE_PROJECT_REF와 URL이 일치하지 않으면 DB 호출은 거부됩니다.

기본 SITE_VISIBILITY=private, PREVIEW_ACCESS_PASSWORD는 16자 이상입니다. 접근값이 없으면 공개되지 않고 401로 차단됩니다. 이 비밀번호는 사이트 외곽 접근 보호이며, 관리자 쓰기 권한은 별도의 Supabase 로그인으로 보호합니다.

## 3. 데이터

README의 import 명령으로 백업을 가져옵니다. 실행 전에 모든 입력 행과 기존 동일 ID 행의 충돌을 확인하며, 다른 내용은 자동 덮어쓰지 않습니다. GET 요청에서 샘플을 자동 삽입하지 않습니다. 관리자의 내보내기 API는 /api/export입니다. 백업 JSON은 공개 저장소에 올리지 않습니다.

## 4. Vercel Preview

기존 Vercel 프로젝트의 Git 연결과 자동 배포 동작을 확인한 후, 승인받은 별도 프로젝트/배포로 검증합니다. Preview에 바로 browinfo.com을 연결하지 않습니다. 기본 비공개 게이트와 관리자 인증이 동작해야 합니다. 실제 서버 키를 테스트/가짜 키와 섞지 마세요.

확인: 익명 초안 접근 차단, 일반 사용자의 쓰기 거부, 관리자 승인 흐름, 수정 시 승인 초기화, 원문 접근 실패 차단, 동시 수정 거부, 데이터 재조회, 로그아웃, 비공개 비밀번호 없는 접근 차단.

## 5. 생성

AI_GENERATION_ENABLED를 true로 설정하기 전 모델/API 접근과 예산을 확인합니다. 관리자 POST /api/generate와 Cron GET /api/cron/weekly가 같은 서버 로직을 씁니다. Cron은 CRON_SECRET Bearer 헤더가 일치해야 실행되고, 시크릿 미설정/32자 미만이면 거부됩니다. 기본 예약은 비활성화했습니다.

지난 한국 ISO 주 범위의 RSS에서 원문을 가져오고, 선택한 공식 원문 내용만 Claude에 전달합니다. 응답은 Zod 검증을 거쳐 검토 대기로 저장합니다. 출처가 부족하거나 출력 형식·분량 검증이 실패하면 발행하지 않습니다. 도달 가능한 원문이라고 사실관계가 참이라는 보장은 없으므로 편집자 대조가 필요합니다. 기본 피드가 Cloudflare 하나이므로 다양한 분야를 원하면 공식 피드를 추가해야 합니다.

DB lease는 10분 동안 중복 모델 호출을 막고, 완료된 주간 키는 재실행하지 않습니다. 실패한 작업은 다시 시도할 수 있고, 함수 강제 종료 시 lease 만료 후 재시도할 수 있습니다. 함수 실행 한도와 API 응답 시간을 실제 Vercel 계정에서 확인합니다. 자동 생성은 API 비용이 들며 최대 기사 수는 실행당 1~4개로 제한했습니다. 기본은 2개입니다.

## 6. 운영 전환

공개 전환 승인 후 SITE_VISIBILITY=public으로 변경하고 재배포합니다. 운영 Vercel 프로젝트와 도메인 연결도 별도로 승인받습니다. 기존 사이트·DB·DNS 값은 복구용으로 보존합니다. 새 예약을 검증한 뒤 Sites 대상 ChatGPT 예약을 중지합니다. 이 코드에는 ChatGPT/Sites 토큰이 없고, 기존 예약을 수정하는 로직도 없습니다.

## 참고한 공식 문서

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://platform.claude.com/docs/en/api/messages/create
