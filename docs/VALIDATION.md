# 검증 결과 (2026-10-27)

## 통과

- 실제 `next build --webpack` 프로덕션 빌드와 TypeScript 검사.
- Node 테스트 7개: 출처/편집 확인 누락 승인 차단, 승인 전 발행 차단, 출처 ID 불일치, 관리자 이메일 허용 목록, Cron 시크릿 누락/오류, 한국 ISO 주와 연도 경계, PostgreSQL 통합 검증.
- PGlite(PostgreSQL)에서 SQL migration 2개 실제 적용. anon의 발행본 전용 읽기, anon 쓰기 거부, authenticated의 관리 RPC 거부, service_role의 RPC 호출, 낙관적 버전 검사, 이력 중복 방지, ingest 실패 시 트랜잭션 rollback, 작업 lease/실패 재시도/완료 중복 차단 확인.
- 빌드한 Next.js 서버의 HTTP 검사: 기본 비공개 게이트, 잘못된 접근값 차단, 관리자 로그인 페이지로 이동, 관리 API 6개 작업의 익명 거부, Cron Bearer 인증, 비활성 상태에서 생성 미실행.
- 원본 GitHub master 기준 커밋이 260e7034f9bddb61a00a100f47a51e3f5077e778임을 읽기 전용 조회로 확인.

## 아직 검증하지 않은 부분

- 사용자 새 Supabase 프로젝트에 실제 SQL/데이터 적용과 Auth 로그인/토큰 갱신.
- 실제 유료 Claude API 호출, 모델별 출력/품질/비용 및 원문 수집의 운영 환경 접근성.
- 사용자 Vercel 배포, 프로젝트별 실행 시간 한도, 예약 실행, 도메인 연결.

따라서 이것은 **빌드·로컬 DB·접근 제어 검증을 마친 이전 코드**이며, 사용자 운영 환경에 배포 완료한 상태가 아닙니다. 외부 서비스 설정과 키는 수정하거나 포함하지 않았습니다.
