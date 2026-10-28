# Vercel 및 새 Supabase 이전 절차

기존 GitHub·Vercel·Supabase·DNS는 이번 수정에서 변경하지 않았습니다. 연결된 저장소에 push하면 자동 배포될 수 있으므로 새 브랜치와 별도 검증 프로젝트를 사용합니다. 외부 설정·배포는 승인 후 진행합니다.

1. 새 Browinfo 전용 Supabase를 준비합니다. 기존 공유 DB에는 적용하지 않습니다.
2. `supabase/migrations/`의 001, 002, 003, 004을 순서대로 적용합니다. 001은 콘텐츠/RLS/RPC, 002는 이전 버전의 작업 lease 이력(현재 생성 코드에서 미사용), 003은 비공개 통계/RPC, 004는 출처 관리·변경 이력/RPC입니다. 이전에 적용한 migration은 재실행하지 않고 미적용 migration만 추가합니다. 이미 v2.1이면 004만 적용합니다.
3. `.env.example`을 `.env.local`로 복사합니다. Supabase URL·publishable key·service_role·EXPECTED_SUPABASE_PROJECT_REF는 같은 새 프로젝트 값이어야 합니다. service_role과 접근 비밀번호는 서버 전용입니다.
4. SITE_VISIBILITY=private와 16자 이상 PREVIEW_ACCESS_PASSWORD를 유지합니다. 외곽 Basic Auth의 사용자명은 preview입니다. 이 비밀번호는 관리자 계정 비밀번호와 다릅니다.
5. [관리자 로그인](ADMIN_LOGIN.md)대로 Supabase 사용자를 만들고 ADMIN_EMAILS를 설정합니다. 별도의 기본 계정은 없습니다.
6. README의 import 명령으로 동봉한 백업을 가져옵니다. JSON을 공개 저장소에 올리지 않습니다. 샘플 seed와 함께 넣지 않습니다.
7. 의존성 설치, typecheck/test/build/test:routes를 실행합니다. 승인받은 별도 Vercel 프로젝트에 비공개 배포하고 로그인·검토·승인·발행·로그아웃·초안 접근 차단을 실제 확인합니다. browinfo.com 연결은 아직 하지 않습니다.
8. [ChatGPT 연결](CHATGPT_CONNECTION.md)대로 Supabase OAuth와 초안 전용 MCP를 연결합니다. 실제 테스트 초안을 review 상태로 저장하고 재시도 중복 방지를 확인한 뒤 예약에서도 실행을 확인합니다. 연결 전까지 기존 Sites 예약은 변경하지 않습니다.
9. [통계 설정](ANALYTICS.md)대로 32자 이상 ANALYTICS_SECRET을 만들고 수집을 준비합니다. 비공개 상태에서는 방문 통계를 수집하지 않습니다.
10. 공개 전환·운영 Vercel·도메인·예약 대상 변경은 별도 승인 후 진행합니다. 공개 전환 후 비관리자 브라우저로 한 번 조회하고 관리자 통계에 반영되는지 확인합니다. 기존 DB·배포·DNS는 복구용으로 보존합니다.

호스팅·DB·ChatGPT 사용량 제한은 각 계정 조건에 따릅니다. 사이트 자체는 별도의 LLM API를 호출하지 않습니다. 새 연결의 실제 예약 실행을 검증하기 전 자동화가 완성됐다고 간주하지 않습니다.
