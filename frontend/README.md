# New Redash Frontend

`frontend/`는 Next.js App Router 기반의 Redash 프론트엔드입니다.

## Structure

```text
frontend/
└── src/
    ├── app/         # pages, route handlers, top-level routing
    ├── features/    # feature-oriented UI and domain logic
    ├── components/  # shared presentational components
    └── lib/         # env, API helpers, server utilities
```

## Install

```bash
npm install
```

## Run

개발 서버:

```bash
npm run dev
```

프로덕션 빌드:

```bash
npm run build
```

프로덕션 실행:

```bash
npm run start
```

기본 주소는 `http://localhost:3000`입니다.

## Environment

로컬 예시는 [frontend/.env.example](/Users/gornoba/Downloads/redash-10.1.0/new-redash/frontend/.env.example)를 기준으로 잡습니다.

```bash
cp .env.example .env.local
```

현재 사용하는 주요 환경변수는 아래 두 개입니다.

```env
API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Env Rules

- `API_BASE_URL`
  - 서버 전용 값입니다.
  - Route Handler, 서버 렌더링, 서버 유틸리티에서 사용합니다.
- `NEXT_PUBLIC_API_BASE_URL`
  - 브라우저에 공개되는 값입니다.
  - 클라이언트 코드에서 직접 백엔드 호출이 필요할 때만 사용합니다.

기본 원칙:

- 서버 코드에서는 `API_BASE_URL`을 우선 사용합니다.
- 브라우저에 secret, 내부 host, 토큰은 `NEXT_PUBLIC_`로 노출하지 않습니다.
- Swarm 배포 시 frontend 서비스는 일반적으로 다음 값을 사용합니다.

```env
API_BASE_URL=http://redash-api-<setup-id>:4000
NEXT_PUBLIC_API_BASE_URL=<REDASH_BASE_URL>/api
```

## Routing Notes

- `/`는 setup 상태와 로그인 상태를 보고 setup 화면 또는 로그인 흐름으로 분기합니다.
- 이메일 인증, 초대, 비밀번호 재설정 같은 사용자 공개 링크는 프론트 경유 방식으로 동작합니다.
- 공개 링크 기준 URL은 백엔드의 `REDASH_BASE_URL`과 맞춰야 합니다.

## Deployment Notes

- Docker Swarm 기준 frontend는 `80 -> 3000`으로 publish됩니다.
- frontend 컨테이너는 `HOSTNAME=0.0.0.0` 환경에서 실행되는 것을 전제로 합니다.
- HTTPS `443` 종료는 현재 앱 자체가 아니라 별도 reverse proxy / ingress에서 처리하는 방향이 맞습니다.

## Lint

```bash
npm run lint
```
