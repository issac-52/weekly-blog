# Browinfo (weekly-blog)

주간 기사 초안을 받아 출처를 확인하고, 관리자가 승인한 글만 발행하는 매거진입니다. Next.js 16(React 19), Supabase, Vercel로 만들었습니다.

```
ChatGPT 작성 → OAuth 초안 전용 MCP/API → 출처 검사 → 검토 대기 → 관리자 승인 → 발행
```

## 기능

- 주간 호, 카테고리, 검색, 기사 페이지 (본문 PC 19px / 모바일 17px, 사건·배경·의미 요약)
- 출처 검사, 수정, 검토, 승인, 발행, 반려와 버전 충돌 방지, 변경 이력
- 출처 도메인 관리(추가·수정·비활성화), 자동 접근 검사와 사람의 원문 확인 분리
- 인용·이미지·이용 조건 확인과 비공개 변경 이력
- Supabase Auth + 관리자 이메일 허용 목록. 독자 API는 발행본만 조회하고 모든 쓰기·내보내기 API는 관리자 인증 필요
- 기본 비공개(`SITE_VISIBILITY=private`). 공개 전에는 Basic Auth 접근 비밀번호 필요
- 주간 실행 키로 같은 주 초안의 중복 제출 방지
- 관리자 통계: 조회수, 방문 브라우저 수, 7/30일 추이, 인기 글 (비공개 상태와 관리자 방문은 집계하지 않음)

사이트는 LLM API를 직접 호출하지 않습니다. 글은 ChatGPT에서 작성하고, 연결 도구는 초안 생성만 할 수 있으며 승인·발행 권한이 없습니다.

## 로컬 실행

Node.js 22.13 이상과 pnpm(corepack)을 사용합니다.

1. Browinfo 전용 Supabase 프로젝트에 `supabase/migrations/`의 SQL 4개를 순서대로 적용합니다.
2. `.env.example`을 `.env.local`로 복사하고 같은 Supabase 프로젝트 값만 설정합니다. `service_role`과 접근 비밀번호는 서버 전용입니다.
3. Supabase Dashboard에서 관리자 사용자를 만들고 그 이메일을 `ADMIN_EMAILS`에 등록합니다. 기본 계정은 없습니다([관리자 로그인](docs/ADMIN_LOGIN.md)).

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

비공개 모드에서는 Basic Auth 창이 뜹니다. 사용자명은 `preview`, 비밀번호는 `PREVIEW_ACCESS_PASSWORD`입니다. 관리자 계정 비밀번호와는 다릅니다.

## 콘텐츠 가져오기

기존 기사·초안·검토 이력 백업(JSON)을 빈 프로젝트에 넣을 때 사용합니다. 백업 파일은 공개 저장소에 커밋하지 않습니다.

```bash
node --env-file=.env.local scripts/import-content.mjs <백업 JSON 경로> --confirm-new-project
```

ID가 같은 기존 데이터의 내용이 다르면 쓰기 전에 중단하고, 같은 파일로 다시 실행해도 중복 추가하지 않습니다. 여러 테이블을 한 트랜잭션으로 묶지 않으므로 네트워크 오류 시 일부만 들어갈 수 있습니다.

샘플 기사 7개만 넣을 때는 아래를 실행합니다. 백업과 샘플을 함께 넣지 않습니다.

```bash
node --env-file=.env.local --experimental-strip-types scripts/seed.mts --confirm-new-project
```

## 검증

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm run test:routes
```

## 문서

- [배포 절차](docs/DEPLOYMENT.md)
- [관리자 로그인](docs/ADMIN_LOGIN.md)
- [ChatGPT 연결 (OAuth·MCP)](docs/CHATGPT_CONNECTION.md)
- [출처 관리](docs/SOURCE_MANAGEMENT.md) — 도메인 등록은 해당 매체 콘텐츠의 이용 허락을 뜻하지 않습니다.
- [관리자 통계](docs/ANALYTICS.md)
- [검증 기록과 운영에서 확인할 항목](docs/VALIDATION.md)
