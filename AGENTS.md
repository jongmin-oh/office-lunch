# 프로젝트 개요

<!-- TODO: 앱이 무엇을 하는지 2~3줄로 적어주세요 -->
[앱 이름] — [한 줄 설명]

## 스택

- **프론트엔드**: React SPA + TypeScript strict + Vite 8 → 웹 / Capacitor 8 (iOS·Android)
- **라우팅·상태·스타일**: React Router 7 (`react-router`), TanStack Query 5, Zustand 5, Tailwind CSS 4
- **UI**: `mobile-ui-design-system` MCP(`get_design_spec` → `get_component` → `get_icon` → `get_design_tokens` → `get_design_system`)의 HTML + Tailwind CSS v4 + `--ds-*` 토큰(기본 강조색 `#7c4dff`, 라이트·다크·시스템 테마), `THIRD_PARTY_NOTICES.txt` 함께 배포
- **개발 환경**: Node.js 22.12+, iOS 빌드는 macOS + Xcode 26+. 상세: `docs/frontend-stack.md`
- **백엔드**: FastAPI (Python 3.13) → AWS Lambda (Mangum 어댑터) + Lambda Function URL
- **DB 접근·스키마**: SQLAlchemy 2.0 ORM, Alembic 마이그레이션 (DSQL은 `aurora-dsql-sqlalchemy` 방언)
- **인프라**: AWS SAM
- **DB**: Aurora DSQL (로컬 개발도 배포된 DSQL을 그대로 사용)

## 폴더 구조

```
mobile/          # React SPA + Capacitor 앱
  src/
    app/         # App.tsx(라우터·Layout), NativeLifecycle
    features/    # 기능별 폴더. <name>/ 안에 index.ts, api.ts, use*.ts, *.tsx
      auth/      # AuthProvider, useAuth, SignIn, Google 로그인
      account/   # 내 정보 화면
      todos/     # 할 일 (참조 구현)
    components/  # 기능과 무관한 공용 UI (Button, Modal, Screen)
    lib/         # http.ts(API_URL, authedFetch), token.ts, schema.d.ts(openapi에서 생성)
    theme/       # styles.css: Mobile UI Design System MCP 테마·토큰(--ds-*)·Tailwind CSS v4
  public/
    THIRD_PARTY_NOTICES.txt # MCP 라이선스 고지문 (빌드 시 dist/에 포함)
  __tests__/     # Vitest + React Testing Library
  capacitor.config.ts # appId, webDir: dist, 네이티브 플러그인 설정
  ios/          # Capacitor iOS 프로젝트 (SPM)
  android/      # Capacitor Android 프로젝트
backend/         # FastAPI
  app/
    deps.py      # SessionDep (DB 세션), CurrentUser (인증 의존성)
    models/      # SQLAlchemy ORM 모델 (테이블당 <name>.py, __init__.py에서 import)
    routers/
    schemas/     # Pydantic 모델 (API 요청·응답)
    services/    # db.py: 엔진·세션
  migrations/    # ★ Alembic. versions/가 DB 스키마의 기준
  alembic.ini
  main.py        # FastAPI 앱 + Lambda 엔트리포인트 (Mangum, main.lambda_handler)
  template.yml   # AWS SAM 템플릿 (Lambda, Function URL, DB 리소스)
  tests/         # OpenAPI 계약 테스트
run.sh           # 테스트 + 마이그레이션 + 드리프트 검사 + 웹 빌드(backend/static/) + sam build + deploy
docs/
  frontend-stack.md # 프론트엔드 스택·설정 가이드
  spec.md        # 기능 요구사항, 우선순위 (기능 정의 시 작성)
  openapi.json   # ★ 프론트-백엔드 계약 파일
```

## 프론트-백엔드 계약: docs/openapi.json

프론트와 백엔드 사이의 유일한 기준입니다.

1. 엔드포인트를 추가·변경하면 반드시 스펙을 다시 내보냅니다:
   ```bash
   cd backend && python -c "import json; from main import app; print(json.dumps(app.openapi(), indent=2))" > ../docs/openapi.json
   ```
2. 프론트는 스펙에서 타입을 생성해서 씁니다. 타입을 손으로 작성하지 않습니다:
   ```bash
   cd mobile && npx openapi-typescript ../docs/openapi.json -o src/lib/schema.d.ts
   ```
3. 프론트에 필요한 필드나 엔드포인트는 백엔드와 스펙에 먼저 추가합니다.

## 프론트 구조 규칙

1. 의존 방향은 `app → features → components | lib`입니다. `components/`·`lib/`는 `features/`·`app/`를 import하지 않고, `features/`는 `app/`을 import하지 않습니다.
2. 다른 feature는 `@/features/<name>`(index.ts)로만 import합니다. `@/features/<name>/<file>` 딥 임포트는 금지이고, feature 안에서는 `./`를 씁니다.
3. feature 안에서 서버 호출은 `api.ts`, 서버 상태는 `use*.ts`, UI는 `*.tsx`에 둡니다. 컴포넌트는 `fetch`를 직접 부르지 않고, 타입은 `@/lib/schema`에서 가져옵니다.

4. 서버 데이터는 TanStack Query 훅(`use<Name>.ts`)에 두고, 화면 안에서만 쓰는 클라이언트 상태는 `features/<name>/store.ts`(Zustand)에 둡니다.

규칙 1·2는 `mobile/eslint.config.js`의 `no-restricted-imports`가 강제하며 `npm run lint`가 위반을 잡습니다. `features/` 아래 새 폴더는 자동으로 적용됩니다.

## 새 기능 추가 순서

ToDo(`backend/app/*/todos.py`, `backend/app/models/todo.py`, `mobile/src/features/todos/`, `mobile/__tests__`의 `todos` 테스트)를 복사해 이름만 바꿔 시작합니다.

1. `backend/app/models/<name>.py`에 모델을 만들고 `app/models/__init__.py`에서 import합니다.
2. 마이그레이션을 만듭니다 (아래 DB 스키마와 마이그레이션 참고).
3. `backend/app/schemas/<name>.py`, `services/<name>.py`, `routers/<name>.py`를 만듭니다. `routers/`의 `router`는 자동 등록되고, DB 세션은 `SessionDep`, 인증은 `CurrentUser`(`app/deps.py`)로 받습니다.
4. `docs/openapi.json`을 내보냅니다 (위 계약 1번).
5. `cd mobile && npm run api:types`로 타입을 다시 생성합니다.
6. `features/<name>/`에 `api.ts`, `use<Name>.ts`, `<Name>Screen.tsx`, `index.ts`(밖에서 쓸 것만 export)를 만듭니다.
7. `app/App.tsx`에 라우트를 추가합니다.
8. `mobile/__tests__/<name>.test.tsx`를 추가합니다. 백엔드는 DB 테스트를 두지 않습니다(DB는 DSQL 하나뿐이라 테이블을 비우는 테스트를 돌릴 수 없습니다).
9. 확인합니다:
   ```bash
   cd backend && pytest && ruff check . && ruff format --check .
   cd mobile && npm run typecheck && npm run lint && npm test
   ```

## DB 스키마와 마이그레이션

`backend/app/models/<name>.py`는 코드에서 쓰는 테이블 모양이고, `backend/migrations/versions/`는 스키마 변경 이력이자 DB 스키마의 기준입니다. 현재 스키마는 마이그레이션 파일을 순서대로(`0001_...`, `0002_...`) 읽어서 확인합니다.

Alembic은 항상 `samconfig.toml` 스택의 DSQL 클러스터를 대상으로 하며, 스택이나 `DsqlEndpoint` 출력이 없으면 에러로 멈춥니다. 첫 배포 전 호출만 `run.sh`가 `-x allow_missing_stack=true`로 스택 없음을 건너뜁니다.

스키마를 바꾸는 순서입니다.

1. 모델을 수정합니다.
2. `cd backend && alembic revision --autogenerate -m "<무엇을 바꿨는지>"`로 마이그레이션을 만듭니다.
3. 생성된 파일을 검토합니다. DSQL에는 트랜잭션 DDL이 없으므로 마이그레이션 하나는 스키마 작업 하나만 하거나 멱등한 작업(`if_not_exists` 등)만 담아, 실패해도 반쯤 적용된 리비전이 남지 않게 합니다. 데이터 백필은 별도 마이그레이션으로 나눕니다. 배포된 마이그레이션은 수정하지 않고 새 마이그레이션을 추가합니다.
4. 배포 시 `run.sh`가 `alembic upgrade head`로 DSQL 클러스터에 적용합니다. 그 직후 `alembic check`가 모델과 DB 스키마가 어긋났는지 읽기 전용으로 검사하고, 마이그레이션이 빠졌으면 배포 전에 실패합니다.

## 명령어

```bash
# 백엔드
# 로컬 백엔드 서버는 없습니다. 백엔드 변경은 run.sh로 배포해 확인합니다.
./run.sh                                          # 테스트 + 마이그레이션 + 웹 빌드 + 배포 (루트에서)
cd backend && pytest                              # OpenAPI 계약 테스트만 (DB 테스트 없음)
cd backend && ruff check . && ruff format .      # 린트/포맷

# 프론트엔드 (Node.js 22.12+)
cd mobile && npm ci                               # 잠금 버전 설치
cd mobile && npm run dev                          # 브라우저 개발
cd mobile && npm test                             # Vitest + React Testing Library
cd mobile && npm run typecheck && npm run lint     # 타입체크/린트
cd mobile && npm run sync                         # 빌드 + cap sync
cd mobile && npm run ios                          # Xcode (Mac 필수)
cd mobile && npm run android                      # Android Studio
```

## Git

커밋·푸시는 요청받았을 때만 합니다. 브랜치는 만들지 않고 `main`에 합니다.
