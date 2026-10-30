# App Subagent Template

React + Vite SPA를 Capacitor 8로 감싼 웹·iOS·Android 앱과 FastAPI/AWS Lambda 백엔드 템플릿입니다.
React Router 7, TanStack Query 5, Zustand 5, Tailwind CSS 4를 사용합니다.

Google 로그인, 앱 JWT 발급·복원, 사용자 조회·로그아웃을 지원합니다. UI는 Mobile UI Design System MCP에서 제공하는 HTML + Tailwind CSS v4 컴포넌트·토큰(`#7c4dff`, 라이트/다크/시스템 테마)·아이콘을 사용합니다. 백엔드는 Lambda Function URL 하나로 API와 웹 빌드를 함께 서빙하고, DB는 Aurora DSQL입니다. 로컬 백엔드 서버는 없습니다.

## 1. 사전 준비

- Node.js 22.12+
- Python 3.13
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS 자격 증명(`aws login`). CloudFormation, Lambda, IAM, S3, SSM, Aurora DSQL을 만들고 `dsql:DbConnectAdmin`으로 접속할 수 있어야 합니다.
- iOS: macOS + Xcode 26+, Android: Android Studio
- 디자인 시스템 MCP를 쓰려면 `MCP_ACCESS_TOKEN` 환경 변수 (`.mcp.json` 참고)

```bash
python3.13 -m venv .venv && .venv/bin/pip install -r backend/requirements-dev.txt
cd mobile && npm ci && cp .env.example .env.local
```

`run.sh`는 루트의 `.venv`를 사용합니다. `.env.local`은 웹 빌드에 포함되어 배포되므로 첫 배포 전에 반드시 만듭니다.

## 2. 식별자 바꾸기

```bash
scripts/new-app.sh <slug> <bundle-id> "<Display Name>"
# 예: scripts/new-app.sh idea-box com.example.ideabox "Idea Box"
```

스택 이름, 번들 ID(iOS·Android), 표시 이름이 한 번에 바뀝니다. Lambda 이름과 JWT 시크릿 경로(`/<slug>/JWT_SECRET`)는 스택 이름에서 파생됩니다.

## 3. 직접 정하고 바꿀 값

스크립트가 바꾸지 않는 값입니다. 아래 굵은 항목은 템플릿 작성자의 값이 남아 있으므로 반드시 바꿉니다.

| 값 | 위치 | 비고 |
|---|---|---|
| **Google 웹 클라이언트 ID** | `backend/samconfig.toml`의 `GoogleWebClientId`, `mobile/.env.local`의 `VITE_GOOGLE_WEB_CLIENT_ID` | 4단계에서 생성 |
| **Google iOS 클라이언트 ID** | `mobile/.env.local`의 `VITE_GOOGLE_IOS_CLIENT_ID`, `mobile/ios/App/App/Info.plist`의 `CFBundleURLSchemes` | URL scheme은 `com.googleusercontent.apps.<iOS 클라이언트 ID의 .apps.googleusercontent.com 앞부분>` |
| AWS 리전 | `backend/samconfig.toml`(2곳), `.mcp.json`, 아래 SSM 명령 | 기본 `ap-northeast-2` |
| 시간대 | `backend/template.yml`의 `TZ` | 기본 `Asia/Seoul` |
| 앱 설명 | `AGENTS.md` 맨 위 `[앱 이름] — [한 줄 설명]`, `docs/spec.md` | 에이전트가 읽는 기준 |
| 아이콘·스플래시 | `mobile/assets/images/`, `mobile/assets/expo.icon/` | 템플릿 이미지 |
| 강조색 | `mobile/index.html`의 `theme-color`, `mobile/src/theme/styles.css` | 기본 `#7c4dff`, 토큰은 디자인 시스템 MCP에서 다시 받음 |
| 운영 안전장치 | `backend/template.yml`의 `DeletionProtectionEnabled`, `backend/samconfig.toml`의 `disable_rollback` | 템플릿은 개발 편의로 `false` / `true` |
| 추가 웹 출처 | `backend/template.yml`의 `AllowedOrigins` | 웹을 Function URL이 아닌 다른 도메인에서 호스팅할 때만 |

## 4. Google OAuth 클라이언트 만들기

Google Cloud에서 세 가지를 만듭니다 ([상세](docs/frontend-stack.md#google-로그인과-api)).

- **웹**: 승인된 JavaScript 출처 `http://localhost:5173`, 리디렉션 URI `http://localhost:5173/sign-in`. 배포 후 Function URL도 추가합니다(6단계).
- **iOS**: 번들 ID `<bundle-id>`
- **Android**: 패키지 `<bundle-id>` + 개발·배포 서명의 SHA-1

만든 ID를 3단계 표의 위치에 넣습니다.

## 5. 첫 배포

```bash
aws ssm put-parameter --name /<slug>/JWT_SECRET --type SecureString --value "$(openssl rand -hex 32)" --region ap-northeast-2
./run.sh
```

`run.sh`는 테스트, DB 마이그레이션(`alembic upgrade head`), 스키마 드리프트 검사(`alembic check`), 웹 빌드, `sam build`/`sam deploy`를 순서대로 실행합니다. 첫 배포는 스택이 없으므로 마이그레이션을 건너뛰고 배포 뒤에 적용합니다.

## 6. 배포 후

1. 배포 출력의 `FunctionUrl`을 `mobile/.env.local`의 `VITE_API_URL`에 넣습니다. `npm run dev`와 네이티브 앱도 이 배포된 백엔드를 씁니다.
2. `FunctionUrl`을 Google 웹 클라이언트의 승인된 JavaScript 출처에, `<FunctionUrl>/sign-in`을 리디렉션 URI에 추가합니다. 배포된 웹은 Function URL 루트에서 서빙됩니다.
3. `./run.sh`를 다시 실행해 바뀐 `.env.local`로 웹을 빌드합니다.

## 개발 명령

```bash
cd mobile
npm run dev       # 브라우저 개발 (배포된 백엔드 사용)
npm test
npm run typecheck && npm run lint
npm run sync      # 빌드 + cap sync
npm run ios       # macOS + Xcode 26+
npm run android   # Android Studio

cd backend && ../.venv/bin/pytest   # OpenAPI 계약 테스트
./run.sh                            # 백엔드 변경 확인은 배포로 (루트에서)
```

[프론트엔드 스택·OAuth·플랫폼 설정](docs/frontend-stack.md), [개발 규칙](AGENTS.md)을 참고하세요.
