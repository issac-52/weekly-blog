# Browinfo — Next.js / Supabase / Vercel 이전본

이 코드는 `issac-52/weekly-blog`의 master 커밋 `260e7034f9bddb61a00a100f47a51e3f5077e778`을 기준으로 만든 **매거진 전용 변경안**입니다. GitHub push, Supabase 적용, Vercel 배포, 도메인 변경은 실행하지 않았습니다.

## 포함한 기능

- 확대된 본문(PC 19px / 모바일 17px), 사건·배경·의미를 설명하는 요약
- 주간 호 / 카테고리 / 검색 / 기사 / 관리자용 저장 목록
- 출처 검사 / 수정 / 검토 / 승인 / 발행 / 반려 / 버전 충돌 방지 / 이력
- 관리자 출처 도메인 추가·수정·비활성화, 신문·전문 매체 지원, 자동 접근 검사와 수동 원문 확인 분리
- 인용·이미지·이용 조건 편집 확인과 비공개 변경 이력
- Supabase Auth + 명시적인 관리자 이메일 허용 목록
- 독자 API의 발행본 전용 조회, 모든 쓰기·내보내기 API의 관리자 인증
- 기본 비공개 접근 보호. `SITE_VISIBILITY=public` 전에는 접근 비밀번호 필요
- ChatGPT 조사·작성 → OAuth 초안 전용 MCP/API → 출처 검사 → review 저장
- 주간 실행 키로 제출 중복 방지, 관리자 검토 후 발행
- 새 Supabase 전용 SQL, JSON 가져오기, 선택적 샘플 데이터

Sites/Vinext/Cloudflare D1/ChatGPT 인증 의존성은 없습니다. 원본의 검침 관리·공유 R2 라우트는 이 **새 매거진 배포본에 포함하지 않습니다**. 기존 검침 서비스를 이 저장소의 같은 배포에서 이용하고 있다면, 현재 운영 배포를 유지하고 별도 Vercel 프로젝트에서 검증해야 합니다. 기존 DB의 posts, meter_records, Storage/Auth 계정은 삭제하거나 수정하지 않습니다.

## 가장 먼저 할 일

1. 새 작업 브랜치에서 변경안을 적용합니다. [START_HERE.md](START_HERE.md)를 먼저 읽어주세요.
2. 새 Browinfo 전용 Supabase에 migration 4개를 순서대로 적용합니다.
3. `.env.example`을 `.env.local`로 복사하고 **새 프로젝트 값만** 설정합니다.
4. Node 22.13 이상에서 의존성을 설치합니다. 제공한 `pnpm-lock.yaml`을 사용합니다.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

로컬 주소에서 Basic Auth 창이 나타나면 사용자명은 `preview`, 비밀번호는 `PREVIEW_ACCESS_PASSWORD` 값을 입력합니다. 관리자 계정은 새 Supabase Dashboard에서 별도로 만들고, 그 이메일을 `ADMIN_EMAILS`에 등록합니다. 자동 가입이나 기존 서비스 관리자 계정의 자동 이전은 하지 않습니다.

## 데이터 이전

동봉한 `migration-data/browinfo-content.json`은 현재 비공개 시제품의 기사·초안·검토 이력을 담은 백업입니다. **공개 GitHub에 커밋하지 마세요.** 압축 파일 안에서 소스 폴더 밖에 분리했습니다.

```bash
node --env-file=.env.local scripts/import-content.mjs ../migration-data/browinfo-content.json --confirm-new-project
```

가져오기는 ID가 같은 기존 데이터의 내용이 다르면 **쓰기 전에 중단**합니다. 여러 테이블에 걸친 가져오기는 전체 단일 트랜잭션이 아니므로, 네트워크 오류 시 일부 테이블만 완료될 수 있습니다. 동일 파일로 재실행하면 같은 행은 중복 추가하지 않습니다. 운영 대상이 빈 새 프로젝트인지 반드시 확인합니다.

백업 대신 샘플 7개 기사만 넣고 싶을 때:

```bash
node --env-file=.env.local --experimental-strip-types scripts/seed.mts --confirm-new-project
```

실제 백업과 샘플 seed를 동시에 넣지 마세요. 서비스의 GET 요청은 데이터에 seed를 자동 추가하지 않습니다.

## ChatGPT 연결과 관리자 통계

유료 LLM API 호출 코드와 Vercel 생성 Cron을 제거했습니다. ChatGPT가 작성한 콘텐츠를 초안 전용 OAuth MCP/API로 받아 **검토 대기**로 저장합니다. 사이트에 LLM API 키를 넣지 않습니다. 실제 OAuth 연결과 예약은 배포 후 검증해야 하며 현재 연결 완료 상태는 아닙니다. [CHATGPT_CONNECTION.md](docs/CHATGPT_CONNECTION.md)를 따르세요.

관리자는 Supabase Auth 이메일·비밀번호로 `/admin/login`에서 로그인합니다. [ADMIN_LOGIN.md](docs/ADMIN_LOGIN.md)에 계정 생성과 접근 방법이 있습니다. 기본 계정은 없습니다.

관리 화면에는 오늘 조회수·방문 브라우저 수·기사 조회수, 어제 대비, 7/30일 추이, 인기 글을 추가했습니다. 수집은 기본 비활성화이고 비공개 사이트·관리자 방문은 집계하지 않습니다. 공개 전환은 별도 승인 후 진행합니다. [ANALYTICS.md](docs/ANALYTICS.md)를 참고하세요.

## 검증

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm run test:routes
```

실행 결과와 제한은 [VALIDATION.md](docs/VALIDATION.md), 운영 이전 순서는 [DEPLOYMENT.md](docs/DEPLOYMENT.md)에 있습니다. 실제 Supabase Auth 로그인, OAuth 연결과 ChatGPT 예약은 새 프로젝트와 배포 주소를 연결한 뒤 추가 검증해야 합니다.

출처 관리 v2.2 적용·편집 절차는 [SOURCE_MANAGEMENT.md](docs/SOURCE_MANAGEMENT.md)를 참고하세요. 도메인 등록은 해당 매체 콘텐츠의 이용 허락을 뜻하지 않습니다.
