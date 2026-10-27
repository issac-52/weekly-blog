# 먼저 읽어주세요

**이 압축 파일은 아직 배포되지 않은 코드 변경안입니다.** 기존 GitHub, Supabase, Vercel, browinfo.com은 변경하지 않았습니다.

## 압축 파일 구성

- `browinfo-nextjs/`: Next.js 전체 소스, 환경변수 예시, SQL, 테스트, 운영 문서
- `weekly-blog-browinfo.patch`: 원본 master 260e703 기준 전체 변경 패치
- `browinfo-v2.1-update.patch`: 이전 이전본 1950341을 이미 적용한 경우에만 사용하는 추가 패치
- `migration-data/browinfo-content.json`: 시제품 기사·초안·검토 이력 백업. 공개 저장소에 넣지 마세요.

## 기존 저장소에 적용하는 방법

기존 저장소의 수정 사항을 먼저 보관하고 **새 브랜치**에서 진행합니다. master에 바로 반영하지 않습니다.

```bash
git switch -c feature/browinfo-magazine
git am /압축을푼경로/weekly-blog-browinfo.patch
```

패치 기준 커밋은 `260e7034f9bddb61a00a100f47a51e3f5077e778`입니다. 이후 원본 변경이나 로컬 수정이 있다면 충돌을 검토해야 합니다. `git am` 실패 시 `git am --abort`로 되돌릴 수 있습니다. 패치를 무리하게 강제 적용하지 마세요.

전체 소스 폴더를 별도 작업 폴더로 열어 먼저 빌드해도 됩니다. `node_modules`, `.next`, `.env.local`, 비밀 키, `.git`은 포함하지 않았습니다.

## 다음 순서

1. `README.md`를 읽고 의존성을 설치합니다.
2. 새 전용 Supabase에 migration 세 개를 순서대로 적용합니다.
3. `.env.local`에 새 프로젝트와 관리자 이메일, 비공개 접근 비밀번호를 설정합니다.
4. 백업 JSON을 가져옵니다. 샘플 seed와 중복 실행하지 않습니다.
5. 로컬에서 로그인·조회·검토·발행·내보내기를 검증합니다.
6. **승인 후** 별도 Vercel 프로젝트에서 비공개로 검증합니다. 기존 연결 저장소에 push하면 자동 배포될 수 있으므로 먼저 Git 연동을 확인합니다.
7. `docs/ADMIN_LOGIN.md`, `docs/CHATGPT_CONNECTION.md`, `docs/ANALYTICS.md`대로 관리자 계정·초안 전용 OAuth·통계를 연결하고 실제 저장을 확인합니다. 별도 유료 LLM API는 사용하지 않습니다.
8. **별도 승인 후** 운영 배포·도메인 연결·예약 활성화를 진행합니다.

현재 Sites 대상 ChatGPT 주간 예약은 별도로 남아 있습니다. 이 압축 파일은 그 예약을 변경하지 않습니다. 새 운영 흐름을 검증한 후 중지해 중복 생성을 피해야 합니다.

이전 이전본을 이미 적용했다면 전체 패치를 중복 적용하지 말고 `git am /압축을푼경로/browinfo-v2.1-update.patch`를 새 브랜치에서 실행합니다. 현재 수정에서는 기존 Sites 비공개 시제품 화면도 변경하지 않았습니다.
