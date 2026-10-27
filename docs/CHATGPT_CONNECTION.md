# LLM API 없는 ChatGPT 예약 → 초안 저장

## 현재 구현 범위

사이트는 OpenAI/Claude API를 호출하지 않습니다. ChatGPT가 연결된 도구와 웹 검색으로 조사·작성하고 이 사이트의 MCP 도구로 초안을 전달합니다. 별도 LLM API 키와 Vercel 생성 Cron은 제거했습니다. ChatGPT 구독의 사용량 제한과 호스팅·DB 비용은 별개입니다.

**MCP 코드는 구현/로컬 검증한 상태이며, 새 Vercel 주소에서 OAuth 연결과 예약 실행은 아직 확인하지 않았습니다.** 배포 주소, Supabase OAuth 서버 설정, ChatGPT의 사용자 계정/워크스페이스 연결 지원이 필요합니다. API 주소를 만들었다고 자동 예약 연결이 완성되는 것은 아닙니다. 새 연결을 검증하기 전 기존 Sites 예약을 새 주소로 임의 변경하지 않습니다.

## 연결에 제공하는 도구

- `get_draft_context`: 주간 호, 실행 키, 이미 사용한 출처 확인.
- `submit_drafts`: 기사와 출처를 검토 대기로만 저장. 구조·분량·출처 검사, 동일 실행 키 재시도 보호.
- `get_submission_status`: 제출한 실행의 저장·검토 상태와 출처 검사 결과 확인.

승인·발행·기존 기사 수정·DB 관리·통계·사용자 설정 도구는 없습니다. 서버가 고정한 Supabase 프로젝트 JWKS로 JWT 서명, 발급자, `/mcp` audience, 만료, 관리자 UUID, 전용 OAuth client_id, `browinfo_scope=drafts:write`를 확인합니다. Supabase service_role 키는 서버 안에만 둡니다. 같은 OAuth 토큰을 관리자 API에 보내도 관리자 쿠키 세션을 대신하지 않습니다.

## 배포 후 1회 설정 (외부 변경은 승인 후)

1. 승인받은 비공개 Vercel 배포 주소를 정하고 `APP_ORIGIN=https://정확한배포호스트`로 등록합니다. 끝에 `/`를 붙이지 않습니다. 도메인을 바꾸면 resource/audience도 함께 바뀌므로 다시 연결해야 합니다.
2. 새 전용 Supabase → Authentication → OAuth Server 기능을 활성화합니다. Supabase 공식 문서상 현재 beta 기능입니다. Site URL은 위 APP_ORIGIN, Authorization Path는 `/oauth/consent`로 설정합니다.
3. ChatGPT용 전용 OAuth 클라이언트를 등록합니다. ChatGPT 연결 화면에 나온 **정확한 redirect URI**를 등록하며 wildcard를 쓰지 않습니다. 일반 공개 앱이나 다른 프로젝트의 클라이언트를 재사용하지 않습니다.
4. 발급받은 client ID를 `CHATGPT_OAUTH_CLIENT_ID`, redirect URI를 `CHATGPT_OAUTH_REDIRECT_URI`, 관리자의 Supabase 사용자 UUID를 `MCP_ADMIN_USER_ID`에 등록합니다. client secret을 사용하는 클라이언트라면 ChatGPT 연결의 안전한 인증 설정에서만 관리하고 프롬프트/Git/브라우저 코드에 두지 않습니다.
5. `supabase/optional/chatgpt_oauth.sql`을 전용 프로젝트에 적용합니다. 파일 하단 예시를 실제 client ID, 관리자 UUID, `APP_ORIGIN/mcp`로 채워 `browinfo_oauth_config`에 정확히 1행을 넣습니다. 이 설정에는 비밀번호나 service_role 키가 없습니다.
6. Supabase Custom Access Token Hook에 `browinfo_access_token_hook`을 설정합니다. 이미 다른 hook이 있다면 덮어쓰지 말고 정책을 통합해야 합니다. 새 프로젝트의 ES256 또는 RS256 서명 키를 사용합니다. 이 hook은 전용 client + 지정 관리자에만 MCP audience와 초안 권한을 추가하고 일반 관리자 로그인 토큰은 그대로 둡니다.
7. `CHATGPT_DRAFTS_ENABLED=true`로 설정하고 재배포합니다. 기본은 false입니다. `/admin/connection`에서 설정 유무를 볼 수 있지만 실제 연결 완료 표시로 간주하면 안 됩니다.
8. ChatGPT의 custom MCP/플러그인 연결에 `APP_ORIGIN/mcp`를 OAuth 방식으로 등록합니다. 인증 서버는 `https://프로젝트참조.supabase.co/auth/v1`, protected resource metadata는 `APP_ORIGIN/.well-known/oauth-protected-resource`입니다. 수동 client ID/secret 설정이 가능한 연결 방식으로 위 전용 client를 사용합니다. 자동 DCR을 사용하면 새 client ID가 발급될 수 있으므로 무작정 전체 클라이언트를 허용하지 말고 해당 ID를 고정해 설정을 맞춰야 합니다.
9. `/admin/login`에서 해당 관리자 계정으로 로그인한 뒤 동의 화면에서 초안 저장 권한을 승인합니다. 비공개 Preview의 외곽 비밀번호는 사람의 로그인/동의 화면에 필요하지만 MCP와 metadata는 자체 OAuth로 보호하여 ChatGPT가 Basic Auth 비밀번호를 가질 필요가 없습니다.
10. 일반 채팅에서 도구 목록을 확인하고 테스트 초안을 제출합니다. review 상태와 checks=false, 출처 검사 결과를 읽어 확인한 뒤 예약 실행에서도 같은 과정을 확인합니다. ChatGPT가 OAuth refresh token을 관리하는 연결을 사용합니다. 관리자 비밀번호·세션 쿠키·DB 키를 예약 프롬프트에 넣지 않습니다.

## 예약 프롬프트 예시

매주 월요일 오전 9시(한국 시간), 지난 ISO 주의 공식 자료를 직접 조사해 Browinfo 주간 초안을 최대 4개 작성해줘. 연결된 Browinfo 도구의 get_draft_context를 먼저 읽고 같은 주의 실행 키와 출처를 중복하지 마. 요약은 사건·배경·의미를 완결된 3문장 이상으로 설명하고 본문은 배경/용어/변화/독자 영향/한계를 4~6개 소제목, 약 1200~2000자로 작성해. 사실과 해설을 구분하고 문단별 출처를 남겨줘. submit_drafts의 mode는 ai, idempotencyKey는 weekly-ai:YYYY-Www로 해. 새 주간 호는 메타데이터를 포함해. 저장 뒤 get_submission_status로 review 상태와 출처 검사 결과를 확인하고 초안 수·실패 사유를 알려줘. 승인·발행·기존 글 수정·외부 설정 변경은 하지 마. 연결이 끊겼으면 보호를 낮추지 말고 실패로 알려줘.

## 호환/수동 API

`GET /api/ingest`와 `POST /api/ingest`도 동일한 audience-bound OAuth 인증을 사용합니다. 임의의 공개 POST API나 프롬프트에 적어 둔 장기 비밀키를 사용하지 않습니다. `/api/pipeline`은 사람 관리자 세션용이며 예약 작업의 인증 수단이 아닙니다.

## 참고 공식 문서

- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/build/mcp-server
- https://learn.chatgpt.com/docs/automations
- https://supabase.com/docs/guides/auth/oauth-server/getting-started
- https://supabase.com/docs/guides/auth/oauth-server/token-security
