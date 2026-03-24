# syntax=docker/dockerfile:1

# ==========================================
# 스테이지 1: Base - 슬림 이미지 및 공통 설정
# ==========================================
FROM node:24.14.0-slim AS base
WORKDIR /app
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# ==========================================
# 스테이지 2: Deps - 전체 패키지 설치 (로컬 개발용 호환)
# 로컬 개발 시 target을 deps로 지정하고 소스만 마운트하면 됩니다.
# ==========================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install

# ==========================================
# 스테이지 3: Builder - 앱 빌드용
# ==========================================
FROM base AS builder
# 개발 관련 의존성(TS 컴파일러 등)이 모두 포함된 node_modules 복사
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.json nest-cli.json ecosystem.config.js ./
COPY libs ./libs
COPY apps ./apps

RUN npm run build ${APP_NAME}

# ==========================================
# 스테이지 4: Prod-deps - 런타임용 모듈 최적화
# ==========================================
FROM deps AS prod-deps
# deps의 내용 위에서 prune을 진행하여 원본 builder 등에 영향을 주지 않고 안전하게 쳐냄
RUN npm prune --production

# ==========================================
# 스테이지 5: Runtime - 최종 실행 (PM2 적용)
# ==========================================
FROM base AS runtime

RUN --mount=type=cache,target=/root/.npm \
    npm install -g pm2

USER node
ENV NODE_ENV=production

# 런타임에 필요한 파일만 정확히 조준하여 복사
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/ecosystem.config.js ./ecosystem.config.js

# 각 backend 앱은 PORT 환경변수로 포트를 나누고 동일한 /api/health 엔드포인트를 노출합니다.
# 별도 curl 설치 없이 Node 런타임만으로 healthcheck를 수행합니다.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "const port = process.env.PORT || '4000'; require('http').request({ host: '127.0.0.1', port, path: '/api/health', timeout: 5000 }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1)).on('timeout', function () { this.destroy(); process.exit(1); }).end()"

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
