# New Redash Frontend

Next.js 기반 프론트엔드입니다.

## 시작

```bash
npm install
npm run dev
```

기본 개발 서버 주소는 `http://localhost:3000` 입니다.

## 환경변수

이 프로젝트는 Next.js 공식 환경변수 규칙을 따릅니다.

- 서버 전용 값:
  `API_BASE_URL`
- 브라우저에 공개해도 되는 값:
  `NEXT_PUBLIC_API_BASE_URL`

로컬 예시는 [`.env.example`](/Users/gornoba/Downloads/redash-10.1.0/new-redash/frontend/.env.example) 를 기준으로 잡습니다.

```bash
cp .env.example .env.local
```

기본 규칙은 아래와 같습니다.

- Route Handler, 서버 렌더링, 서버 유틸은 `API_BASE_URL` 을 우선 사용합니다.
- 브라우저 코드에서 직접 백엔드로 호출해야 하는 경우만 `NEXT_PUBLIC_API_BASE_URL` 을 사용합니다.
- secret, 내부 전용 host, 토큰은 `NEXT_PUBLIC_` 로 노출하지 않습니다.

세부 작업 기준은 [frontend-nextjs-env 스킬](/Users/gornoba/Downloads/redash-10.1.0/.agents/skills/frontend-nextjs-env/SKILL.md) 과 참조 문서를 따릅니다.
