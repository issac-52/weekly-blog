# 관리자 로그인 방법

기본 아이디/비밀번호는 만들지 않았습니다. 다음 단계는 **새 Browinfo 전용 Supabase와 Vercel에 연결한 뒤** 수행합니다. 현재 별도 Sites 시제품의 소유자 ChatGPT 로그인과는 다른 로그인입니다.

1. 새 Supabase Dashboard → Authentication → Users에서 관리자로 쓸 이메일과 비밀번호로 사용자를 만듭니다. 이메일 확인 여부도 확인합니다. 앱에 공개 회원가입 화면은 없습니다.
2. 생성한 사용자의 이메일을 Vercel 서버 환경변수 `ADMIN_EMAILS`에 정확하게 등록합니다. 여러 명이면 쉼표로 구분합니다. 비밀번호를 환경변수나 Git에 넣지 않습니다.
3. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPECTED_SUPABASE_PROJECT_REF`가 같은 새 프로젝트를 가리키는지 확인합니다.
4. 비공개 배포에서는 먼저 Basic Auth 접근창을 통과합니다. 사용자명은 `preview`, 비밀번호는 `PREVIEW_ACCESS_PASSWORD` 값입니다. 이 값은 사이트 외곽 보호이며 Supabase 계정 비밀번호와 다릅니다.
5. `/admin/login`에 접속해 1번에서 만든 이메일·비밀번호로 로그인합니다. 성공하면 `/admin`의 통계·콘텐츠 검토 화면으로 이동합니다.
6. 관리가 끝나면 스튜디오의 로그아웃을 누릅니다.

로그인 실패 시: 새 프로젝트 사용자인지, 비밀번호/이메일 확인 상태, ADMIN_EMAILS의 오타, 환경변수를 바꾼 후 재배포했는지 확인합니다. 단순히 Supabase에 가입된 사용자라는 이유만으로 관리자 권한을 부여하지 않습니다. ChatGPT OAuth 연결에 사용하는 `MCP_ADMIN_USER_ID`는 이 관리자의 Supabase 사용자 UUID입니다.

현재 파일에는 실제 계정·비밀번호·서버 키가 없으며, 사용자 계정을 자동 생성하거나 기존 서비스를 변경하지 않았습니다.
