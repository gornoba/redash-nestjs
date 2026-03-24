#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DOCKERHUB_REPOSITORY="${DOCKERHUB_REPOSITORY:-}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER_NAME="${BUILDER_NAME:-redash-multiarch-builder}"

usage() {
  cat <<'EOF'
Usage:
  DOCKERHUB_REPOSITORY=your-dockerhub-id/new-redash ./docker-push.sh

Environment variables:
  DOCKERHUB_REPOSITORY  Required. Docker Hub repository.
                        Example: DOCKERHUB_REPOSITORY=myteam/new-redash
  PLATFORMS             Optional. Defaults to linux/amd64,linux/arm64
  BUILDER_NAME          Optional. buildx builder name.
                        Defaults to redash-multiarch-builder

Pushed images:
  docker.io/${DOCKERHUB_REPOSITORY}:frontend
  docker.io/${DOCKERHUB_REPOSITORY}:backend-api
  docker.io/${DOCKERHUB_REPOSITORY}:backend-alert
  docker.io/${DOCKERHUB_REPOSITORY}:backend-schedule
  docker.io/${DOCKERHUB_REPOSITORY}:backend-worker
EOF
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
}

ensure_multi_platform_builder() {
  local current_driver=""

  if docker buildx inspect >/dev/null 2>&1; then
    current_driver="$(docker buildx inspect | awk '/Driver:/ { print $2; exit }')"
  fi

  if [[ "${current_driver}" == "docker-container" ]]; then
    docker buildx inspect --bootstrap >/dev/null
    return
  fi

  if docker buildx inspect "${BUILDER_NAME}" >/dev/null 2>&1; then
    docker buildx use "${BUILDER_NAME}" >/dev/null
  else
    docker buildx create \
      --name "${BUILDER_NAME}" \
      --driver docker-container \
      --use >/dev/null
  fi

  docker buildx inspect --bootstrap >/dev/null
}

build_and_push_image() {
  local image_tag="$1"
  local context_dir="$2"
  local dockerfile_path="$3"
  local target_stage="$4"
  shift 4

  local full_image_name="docker.io/${DOCKERHUB_REPOSITORY}:${image_tag}"

  echo "==> Building and pushing ${full_image_name}"

  docker buildx build \
    --platform "${PLATFORMS}" \
    --file "${dockerfile_path}" \
    --target "${target_stage}" \
    --tag "${full_image_name}" \
    "$@" \
    --push \
    "${context_dir}"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ -z "${DOCKERHUB_REPOSITORY}" ]]; then
  echo "DOCKERHUB_REPOSITORY is required." >&2
  echo >&2
  usage >&2
  exit 1
fi

require_command docker

if ! docker buildx version >/dev/null 2>&1; then
  echo "docker buildx is required." >&2
  exit 1
fi

ensure_multi_platform_builder

BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

# API/worker 계열은 공통 Dockerfile과 APP_NAME 빌드 인자를 사용합니다.
for app_name in api alert schedule worker; do
  build_and_push_image \
    "backend-${app_name}" \
    "${BACKEND_DIR}" \
    "${BACKEND_DIR}/Dockerfile" \
    "runtime" \
    --build-arg "APP_NAME=${app_name}"
done

build_and_push_image \
  "frontend" \
  "${FRONTEND_DIR}" \
  "${FRONTEND_DIR}/Dockerfile" \
  "runner"

cat <<EOF

Push completed.
Repository: ${DOCKERHUB_REPOSITORY}
Tags: frontend, backend-api, backend-alert, backend-schedule, backend-worker
Platforms: ${PLATFORMS}
Builder: ${BUILDER_NAME}
EOF
