# New Redash Backend

`backend/`는 NestJS monorepo 구조로 구성된 Redash 백엔드입니다.

## Apps

```text
backend/
├── apps/
│   ├── api/        # HTTP API, auth, setup, users, queries
│   ├── worker/     # background jobs, query execution
│   ├── alert/      # alert dispatch, notification delivery
│   └── schedule/   # cron and scheduled batch jobs
└── libs/
    ├── common/     # guards, mail, queue, utils
    └── database/   # TypeORM entities and DB config
```

## Install

```bash
npm install
```

## Run

기본 API 실행:

```bash
npm run start:api
```

개발 모드:

```bash
npm run start:api:dev
npm run start:worker:dev
npm run start:alert:dev
npm run start:schedule:dev
```

프로덕션 빌드:

```bash
npm run build
```

프로덕션 실행:

```bash
npm run start:prod
npm run start:worker:prod
npm run start:alert:prod
npm run start:schedule:prod
```

## Environment

현재 코드 기준 핵심 환경변수는 아래입니다.

```env
PORT=4000

SWAGGER_ENABLED=true
SWAGGER_BASIC_AUTH_USER=admin
SWAGGER_BASIC_AUTH_PASSWORD=change-me

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=redash

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_ACCESS_SECRET=change-me
REDASH_SECRET_KEY=change-me

REDASH_BASE_URL=http://localhost:3000

# MAIL_PROVIDER=disabled | gmail | aws_ses
MAIL_PROVIDER=disabled
MAIL_FROM=
MAIL_GMAIL_USER=
MAIL_GMAIL_APP_PASSWORD=
AWS_REGION=ap-northeast-2
EMAIL_AWS_USER=
EMAIL_AWS_PASSWORD=
```

## Current Defaults

- 이메일 인증 토큰은 `JWT_ACCESS_SECRET`를 사용하고 기본 만료 시간은 `1d`입니다.
- 초대 / 비밀번호 재설정 토큰은 `JWT_ACCESS_SECRET`를 사용하고 기본 만료 시간은 `1h`입니다.
- 액세스 토큰은 `JWT_ACCESS_SECRET`를 사용하고 기본 만료 시간은 `24h`입니다.
- 액세스 토큰 쿠키 이름은 `redash_access_token`으로 고정되어 있습니다.
- 액세스 토큰 쿠키 옵션은 `httpOnly=true`, `path=/`, `sameSite=lax`, `secure=false` 기본값을 사용합니다.
- 사용자에게 보이는 링크는 모두 `REDASH_BASE_URL` 기준으로 생성됩니다.
- BullMQ Redis prefix는 `new-redash`로 고정되어 있습니다.
- DB SSL은 `DB_HOST`가 AWS RDS 호스트일 때만 자동 활성화됩니다.

## Swagger

- `SWAGGER_ENABLED=true`이면 `/docs`, `/docs-json`가 열립니다.
- Swagger는 Basic Auth로 보호됩니다.
- Swarm 배포 기준으로는 `backend-api:4000` 포트를 외부 publish할 때만 외부에서 접근할 수 있습니다.

## Mail Providers

Gmail:

- `MAIL_PROVIDER=gmail`
- `MAIL_GMAIL_USER`
- `MAIL_GMAIL_APP_PASSWORD`
- `MAIL_FROM`

AWS SES:

- `MAIL_PROVIDER=aws_ses`
- `AWS_REGION`
- `EMAIL_AWS_USER`
- `EMAIL_AWS_PASSWORD`
- `MAIL_FROM`

## Database Bootstrap

초기 스키마는 루트의 [bootstrap-redash-schema.sql](/Users/gornoba/Downloads/redash-10.1.0/new-redash/bootstrap-redash-schema.sql)을 사용합니다.

- `redash-start.sh`는 PostgreSQL 준비 후 이 SQL 파일을 자동으로 적용합니다.
- 현재 구조는 TypeORM 기준 RDBMS를 전제로 합니다.

## Migrations

```bash
npm run migration:create --name=your_migration_name
npm run migration:generate --name=your_migration_name
npm run migration:run
npm run migration:revert
```

## Test

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Notes

- 현재 [backend/.env](/Users/gornoba/Downloads/redash-10.1.0/new-redash/backend/.env)에 실제 값처럼 보이는 항목이 들어 있으므로, 공유나 커밋 전에는 별도 secret 관리로 분리하는 편이 맞습니다.
- Swarm 배포 시에는 `.env` 직접 주입보다 Docker `config`와 `secret` 분리를 기본값으로 사용합니다.
