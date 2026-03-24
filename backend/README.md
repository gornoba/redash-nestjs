## New Redash Backend

## Project setup

```bash
npm install
```

## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Environment Variables

현재까지 필요한 환경 변수는 아래와 같습니다.

```env
PORT=4000
SWAGGER_ENABLED=true
SWAGGER_BASIC_AUTH_USER=admin
SWAGGER_BASIC_AUTH_PASSWORD=change-me

DB_HOST=127.0.0.1
DB_PORT=15432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=new_redash

JWT_ACCESS_SECRET=new-redash-local-secret

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

토큰 기본값

- 이메일 인증 토큰은 `JWT_ACCESS_SECRET` 를 공용 secret 으로 사용하고 기본 만료 시간은 `1d` 입니다.
- 초대/비밀번호 재설정 토큰도 `JWT_ACCESS_SECRET` 를 공용 secret 으로 사용하고 기본 만료 시간은 `1h` 입니다.
- 액세스 토큰은 `JWT_ACCESS_SECRET` 를 사용하고 기본 만료 시간은 `24h` 입니다.
- 액세스 토큰 쿠키 이름은 `redash_access_token` 기본값을 사용합니다.
- 액세스 토큰 쿠키 옵션은 `httpOnly=true`, `path=/`, `sameSite=lax`, `secure=false` 기본값을 사용합니다.
- 사용자에게 보이는 링크는 모두 `REDASH_BASE_URL` 기준으로 생성됩니다.
- BullMQ Redis prefix 는 `new-redash` 기본값을 사용합니다.
- DB SSL 은 `DB_HOST` 가 AWS RDS 호스트일 때만 자동으로 활성화됩니다.

Swagger 문서 보호

- `SWAGGER_ENABLED=true` 이면 `/docs`, `/docs-json` 가 열립니다.
- Swagger 는 Basic Auth 로 보호됩니다.
- 개발 기본값은 `admin / change-me` 이므로 로컬에서도 바로 변경하는 편이 맞습니다.

메일 설정 방식

- Gmail 앱 비밀번호
  - `MAIL_PROVIDER=gmail`
  - `MAIL_FROM`, `MAIL_GMAIL_USER`, `MAIL_GMAIL_APP_PASSWORD`
- AWS SES
  - `MAIL_PROVIDER=aws_ses`
  - `MAIL_FROM`, `AWS_REGION`, `EMAIL_AWS_USER`, `EMAIL_AWS_PASSWORD`

## Run tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```
