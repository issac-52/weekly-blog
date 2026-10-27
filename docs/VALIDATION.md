# 검증 결과 (2026-10-27, v2.1)

## 로컬 검증

- Next.js 프로덕션 빌드, TypeScript 검사.
- Node 테스트 11개: 출처·승인·발행 품질 검사, 관리자 이메일, 한국 ISO 주 경계, PostgreSQL 콘텐츠/RLS/원자적 RPC, 통계, 실제 서명 JWT 검증, MCP SDK 호출, OAuth hook.
- PGlite에서 migration 001~003과 선택 OAuth hook 실제 적용. 통계는 KST 날짜, 중복 이벤트, 발행본만 집계, 방문 브라우저 수, 추이 빈 날짜, 인기 글, RLS 접근 거부를 확인했습니다.
- 실제 ES256 서명 토큰의 client_id·관리자 UUID·scope·issuer·audience·만료 검증. MCP는 초안 컨텍스트/제출/상태 3개 도구만 노출하며 승인·발행 도구는 없습니다. hook은 지정 client와 관리자에만 초안 권한을 추가하고 DB role을 높이지 않습니다.
- 실제 빌드 서버 HTTP 검사: 비공개 Basic Auth, 관리자 페이지 이동·관리 API 익명 거부, OAuth MCP/ingest의 인증 challenge, metadata discovery, 통계 비활성·교차 Origin 거부, 제거한 유료 생성/Cron 경로 404.

## 운영 환경에서 추가 확인할 부분

- 새 Supabase에 실제 SQL·백업 적용, 이메일/비밀번호 로그인, 세션 갱신.
- 배포 주소에서 Supabase OAuth 동의·토큰 갱신·ChatGPT 도구 연결 및 실제 예약 실행. 로컬 MCP 프로토콜 검증은 외부 연결 성공을 뜻하지 않습니다.
- 승인 후 공개 전환 시 실제 브라우저 조회→관리자 통계 반영. 비공개 상태와 관리자 방문은 수집하지 않으며 이전 방문은 소급 집계되지 않습니다.
- 사용자 Vercel 배포와 실행 시간 한도·도메인 연결.

현재 결과는 검증한 이전 코드이며 사용자 서비스에 적용 완료한 상태가 아닙니다. 별도 유료 LLM API·Vercel 생성 Cron은 제거했습니다. 외부 계정·예약·사이트 설정을 변경하지 않았습니다.
