# syntax=docker/dockerfile:1

# ==========================================
# 1. Base Stage - 공통 OS 베이스
# ==========================================
FROM node:24.14.0-slim AS base
WORKDIR /app

# ==========================================
# 2. Deps Stage - 패키지 설치
# (로컬 docker-compose 연동 시 target: deps 활용)
# ==========================================
FROM base AS deps
COPY package.json package-lock.json ./
# npm 레지스트리 캐시 마운트로 빠른 의존성 설치 환경 구축
RUN --mount=type=cache,target=/root/.npm \
    npm install

# ==========================================
# 3. Builder Stage - 소스코드 빌드
# (next build를 통해 standalone 산출물 생성)
# ==========================================
FROM base AS builder
# 모듈 복사 및 소스 복사
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js 원격 추적 통계 데이터 전송 비활성화 (보안 및 빌드 속도 확보)
ENV NEXT_TELEMETRY_DISABLED=1

# 빌드 수행
RUN npm run build

# ==========================================
# 4. Runner Stage - 최적화된 프로덕션 실행 이미지
# ==========================================
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Nextjs 기본 서빙 포트
ENV PORT=3000

# root 권한 탈취 방지를 위한 애플리케이션 전용 Non-root 유저 생성 (Alpine 표준 그룹)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 컨테이너 내 에셋, 이미지 등 라우팅에 필요한 정적 파일 복사
COPY --from=builder /app/public ./public

# 캐시용 폴더 사전 생성 후 권한 부여
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 실제 런타임에 필요한 파일만 선택적 복사 (가장 극적인 용량 절감 단계)
# 스탠드얼론 모드의 핵심: node_modules 전체가 아니라 server.js가 요구하는 최소치만 넘어옴
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 유저 교체
USER nextjs

EXPOSE 3000

# server.js는 standalone에서 자체적으로 생성한 미니 Node 서버 엔트리
CMD ["node", "server.js"]
