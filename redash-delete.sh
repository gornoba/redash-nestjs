#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_ROOT="${ROOT_DIR}/.redash-setup"
DELETE_ALL=false
ASSUME_YES=false
SETUP_ID="${1:-}"
LANGUAGE_CODE="ko"

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ -n "${TERM:-}" ]] && tput colors >/dev/null 2>&1; then
  COLOR_BOLD="$(tput bold)"
  COLOR_RESET="$(tput sgr0)"
  COLOR_CYAN="$(tput setaf 6)"
  COLOR_YELLOW="$(tput setaf 3)"
  COLOR_RED="$(tput setaf 1)"
else
  COLOR_BOLD=""
  COLOR_RESET=""
  COLOR_CYAN=""
  COLOR_YELLOW=""
  COLOR_RED=""
fi

usage() {
  if [[ "${LANGUAGE_CODE}" == "en" ]]; then
    cat <<'EOF'
Usage:
  ./redash-delete.sh
  ./redash-delete.sh <setup-id>
  ./redash-delete.sh --all
  ./redash-delete.sh <setup-id> --yes

Options:
  --all   Remove every Docker Swarm resource created by redash-start.sh.
  --yes   Skip the interactive confirmation prompt.
  -h      Show this help message.
EOF
    return
  fi

  cat <<'EOF'
사용법:
  ./redash-delete.sh
  ./redash-delete.sh <setup-id>
  ./redash-delete.sh --all
  ./redash-delete.sh <setup-id> --yes

옵션:
  --all   redash-start.sh가 만든 모든 Docker Swarm 리소스를 삭제합니다.
  --yes   확인 프롬프트를 건너뜁니다.
  -h      도움말을 출력합니다.
EOF
}

t() {
  local key="$1"

  if [[ "${LANGUAGE_CODE}" == "en" ]]; then
    case "${key}" in
      lang_title) printf 'Select language / 언어를 선택하세요' ;;
      lang_option_ko) printf 'Korean (한국어)' ;;
      lang_option_en) printf 'English' ;;
      delete_target) printf 'Delete Target' ;;
      delete_one) printf 'Delete one setup id' ;;
      delete_all) printf 'Delete all Redash Swarm resources created by the wizard' ;;
      select_1_2) printf 'Select [1-2]: ' ;;
      setup_id_prompt) printf 'Setup ID: ' ;;
      setup_id_empty) printf 'Setup ID cannot be empty.' ;;
      enter_1_2) printf 'Enter 1 or 2.' ;;
      confirmation) printf 'Confirmation' ;;
      confirm_all) printf 'ALL redash-* Docker Swarm resources' ;;
      confirm_one) printf "setup id '%s'" ;;
      confirm_line_1) printf 'This will permanently remove %s.' ;;
      confirm_line_2) printf 'Services, secrets, configs, networks, volumes, and generated setup files will be deleted.' ;;
      confirm_line_3) printf 'This action cannot be undone.' ;;
      confirm_prompt) printf 'Type DELETE to continue: ' ;;
      delete_cancelled) printf 'Deletion cancelled.' ;;
      docker_not_found) printf 'docker command not found.' ;;
      swarm_not_active) printf 'Docker Swarm is not active on this node.' ;;
      manager_only) printf 'Run this script on a Docker Swarm manager node.' ;;
      removing_service) printf 'Removing service %s' ;;
      removing_secret) printf 'Removing secret %s' ;;
      removing_config) printf 'Removing config %s' ;;
      removing_network) printf 'Removing network %s' ;;
      removing_volume) printf 'Removing volume %s' ;;
      removing_files) printf 'Removing generated files %s' ;;
      deleting_resources) printf 'Deleting Resources' ;;
      done) printf 'Done' ;;
      done_message) printf 'Redash Swarm resources have been removed.' ;;
      one_setup_only) printf 'Only one setup id can be provided.' ;;
      either_setup_or_all) printf 'Use either a setup id or --all, not both.' ;;
      *) printf '%s' "${key}" ;;
    esac
    return
  fi

  case "${key}" in
    lang_title) printf '언어를 선택하세요 / Select language' ;;
    lang_option_ko) printf '한국어' ;;
    lang_option_en) printf 'English' ;;
    delete_target) printf '삭제 대상' ;;
    delete_one) printf 'setup id 하나만 삭제' ;;
    delete_all) printf 'wizard가 만든 모든 Redash Swarm 리소스 삭제' ;;
    select_1_2) printf '선택하세요 [1-2]: ' ;;
    setup_id_prompt) printf 'Setup ID: ' ;;
    setup_id_empty) printf 'Setup ID를 비울 수 없습니다.' ;;
    enter_1_2) printf '1 또는 2를 입력하세요.' ;;
    confirmation) printf '최종 확인' ;;
    confirm_all) printf '모든 redash-* Docker Swarm 리소스' ;;
    confirm_one) printf "setup id '%s'" ;;
    confirm_line_1) printf '%s 를 영구적으로 삭제합니다.' ;;
    confirm_line_2) printf '서비스, 시크릿, 설정, 네트워크, 볼륨, 생성된 setup 파일이 모두 삭제됩니다.' ;;
    confirm_line_3) printf '이 작업은 복구할 수 없습니다.' ;;
    confirm_prompt) printf '계속하려면 DELETE 를 입력하세요: ' ;;
    delete_cancelled) printf '삭제를 취소했습니다.' ;;
    docker_not_found) printf 'docker 명령을 찾을 수 없습니다.' ;;
    swarm_not_active) printf '이 노드에서 Docker Swarm이 활성화되어 있지 않습니다.' ;;
    manager_only) printf 'Docker Swarm manager 노드에서 실행하세요.' ;;
    removing_service) printf '서비스 삭제 %s' ;;
    removing_secret) printf '시크릿 삭제 %s' ;;
    removing_config) printf '설정 삭제 %s' ;;
    removing_network) printf '네트워크 삭제 %s' ;;
    removing_volume) printf '볼륨 삭제 %s' ;;
    removing_files) printf '생성 파일 삭제 %s' ;;
    deleting_resources) printf '리소스 삭제 중' ;;
    done) printf '완료' ;;
    done_message) printf 'Redash Swarm 리소스를 삭제했습니다.' ;;
    one_setup_only) printf 'setup id는 하나만 입력할 수 있습니다.' ;;
    either_setup_or_all) printf 'setup id 또는 --all 중 하나만 사용하세요.' ;;
    *) printf '%s' "${key}" ;;
  esac
}

choose_language() {
  local answer=""

  while true; do
    printf '%s\n' "$(t lang_title)"
    printf '  1. %s\n' "$(t lang_option_ko)"
    printf '  2. %s\n' "$(t lang_option_en)"
    read -r -p "Select [1-2]: " answer

    case "${answer}" in
      1)
        LANGUAGE_CODE="ko"
        return
        ;;
      2)
        LANGUAGE_CODE="en"
        return
        ;;
      *)
        warn "1 or 2 only / 1 또는 2만 입력하세요."
        ;;
    esac
  done
}

section() {
  printf '\n%s%s%s\n' "${COLOR_CYAN}${COLOR_BOLD}" "$1" "${COLOR_RESET}"
}

info() {
  printf '%s\n' "$1"
}

warn() {
  printf '%s%s%s\n' "${COLOR_YELLOW}" "$1" "${COLOR_RESET}" >&2
}

die() {
  printf '%s%s%s\n' "${COLOR_RED}" "$1" "${COLOR_RESET}" >&2
  exit 1
}

parse_args() {
  local args=("$@")
  local arg=""

  if (($# == 0)); then
    return
  fi

  SETUP_ID=""

  for arg in "${args[@]}"; do
    case "${arg}" in
      --all)
        DELETE_ALL=true
        ;;
      --yes)
        ASSUME_YES=true
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        if [[ -n "${SETUP_ID}" ]]; then
          die "$(t one_setup_only)"
        fi
        SETUP_ID="${arg}"
        ;;
    esac
  done

  if [[ "${DELETE_ALL}" == true && -n "${SETUP_ID}" ]]; then
    die "$(t either_setup_or_all)"
  fi
}

require_docker_manager() {
  if ! command -v docker >/dev/null 2>&1; then
    die "$(t docker_not_found)"
  fi

  local swarm_state=""
  local control_available=""
  swarm_state="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || true)"
  control_available="$(docker info --format '{{.Swarm.ControlAvailable}}' 2>/dev/null || true)"

  if [[ "${swarm_state}" != "active" ]]; then
    die "$(t swarm_not_active)"
  fi

  if [[ "${control_available}" != "true" ]]; then
    die "$(t manager_only)"
  fi
}

prompt_target() {
  local answer=""

  section "$(t delete_target)"
  info "1. $(t delete_one)"
  info "2. $(t delete_all)"

  while true; do
    read -r -p "$(t select_1_2)" answer

    case "${answer}" in
      1)
        read -r -p "$(t setup_id_prompt)" SETUP_ID
        [[ -n "${SETUP_ID}" ]] || die "$(t setup_id_empty)"
        DELETE_ALL=false
        return
        ;;
      2)
        DELETE_ALL=true
        SETUP_ID=""
        return
        ;;
      *)
        warn "$(t enter_1_2)"
        ;;
    esac
  done
}

confirm_delete() {
  local answer=""
  local target_label=""
  local normalized_answer=""

  if [[ "${ASSUME_YES}" == true ]]; then
    return
  fi

  if [[ "${DELETE_ALL}" == true ]]; then
    target_label="$(t confirm_all)"
  else
    printf -v target_label "$(t confirm_one)" "${SETUP_ID}"
  fi

  section "$(t confirmation)"
  warn "$(printf "$(t confirm_line_1)" "${target_label}")"
  warn "$(t confirm_line_2)"
  warn "$(t confirm_line_3)"

  read -r -p "$(t confirm_prompt)" answer
  normalized_answer="$(printf '%s' "${answer}" | tr '[:lower:]' '[:upper:]')"

  if [[ "${normalized_answer}" != "DELETE" ]]; then
    die "$(t delete_cancelled)"
  fi
}

remove_service_if_exists() {
  local name="$1"

  if ! docker service inspect "${name}" >/dev/null 2>&1; then
    return
  fi

  info "==> $(printf "$(t removing_service)" "${name}")"
  docker service rm "${name}" >/dev/null
}

remove_secret_if_exists() {
  local name="$1"

  if ! docker secret inspect "${name}" >/dev/null 2>&1; then
    return
  fi

  info "==> $(printf "$(t removing_secret)" "${name}")"
  docker secret rm "${name}" >/dev/null
}

remove_config_if_exists() {
  local name="$1"

  if ! docker config inspect "${name}" >/dev/null 2>&1; then
    return
  fi

  info "==> $(printf "$(t removing_config)" "${name}")"
  docker config rm "${name}" >/dev/null
}

remove_network_if_exists() {
  local name="$1"

  if ! docker network inspect "${name}" >/dev/null 2>&1; then
    return
  fi

  info "==> $(printf "$(t removing_network)" "${name}")"
  docker network rm "${name}" >/dev/null
}

remove_volume_if_exists() {
  local name="$1"

  if ! docker volume inspect "${name}" >/dev/null 2>&1; then
    return
  fi

  info "==> $(printf "$(t removing_volume)" "${name}")"
  docker volume rm "${name}" >/dev/null
}

delete_generated_files() {
  local path="$1"

  if [[ ! -e "${path}" ]]; then
    return
  fi

  info "==> $(printf "$(t removing_files)" "${path}")"
  rm -rf "${path}"
}

delete_single_setup() {
  local id="$1"

  # Services must be removed before secrets/configs because Swarm refuses to delete in-use resources.
  remove_service_if_exists "redash-frontend-${id}"
  remove_service_if_exists "redash-alert-${id}"
  remove_service_if_exists "redash-schedule-${id}"
  remove_service_if_exists "redash-worker-${id}"
  remove_service_if_exists "redash-api-${id}"
  remove_service_if_exists "redash-redis-${id}"
  remove_service_if_exists "redash-postgres-${id}"

  remove_secret_if_exists "redash-${id}-db-password"
  remove_secret_if_exists "redash-${id}-jwt-access-secret"
  remove_secret_if_exists "redash-${id}-redash-secret-key"
  remove_secret_if_exists "redash-${id}-swagger-basic-auth-password"
  remove_secret_if_exists "redash-${id}-email-aws-user"
  remove_secret_if_exists "redash-${id}-email-aws-password"
  remove_secret_if_exists "redash-${id}-mail-gmail-user"
  remove_secret_if_exists "redash-${id}-mail-gmail-app-password"

  remove_config_if_exists "redash-${id}-backend-public-env"
  remove_config_if_exists "redash-${id}-export-secrets-sh"

  remove_network_if_exists "redash-net-${id}"
  remove_volume_if_exists "redash-postgres-data-${id}"
  remove_volume_if_exists "redash-redis-data-${id}"
  delete_generated_files "${OUTPUT_ROOT}/${id}"
}

delete_all_setups() {
  local name=""
  local ids=()
  local id_map=""

  while IFS= read -r name; do
    [[ -n "${name}" ]] || continue
    ids+=("${name#redash-net-}")
  done < <(docker network ls --format '{{.Name}}' | grep '^redash-net-' || true)

  while IFS= read -r name; do
    [[ -n "${name}" ]] || continue
    ids+=("${name#redash-}")
    ids[${#ids[@]}-1]="${ids[${#ids[@]}-1]%-backend-public-env}"
  done < <(docker config ls --format '{{.Name}}' | grep '^redash-.*-backend-public-env$' || true)

  while IFS= read -r name; do
    [[ -n "${name}" ]] || continue
    ids+=("${name#redash-api-}")
  done < <(docker service ls --format '{{.Name}}' | grep '^redash-api-' || true)

  for name in "${ids[@]}"; do
    [[ -n "${name}" ]] || continue
    if [[ ",${id_map}," == *",${name},"* ]]; then
      continue
    fi
    id_map+=",${name}"
    delete_single_setup "${name}"
  done

  if [[ -d "${OUTPUT_ROOT}" ]]; then
    while IFS= read -r name; do
      [[ -n "${name}" ]] || continue
      if [[ ",${id_map}," == *",${name},"* ]]; then
        continue
      fi
      id_map+=",${name}"
      delete_single_setup "${name}"
    done < <(find "${OUTPUT_ROOT}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null || true)
  fi
}

main() {
  choose_language
  parse_args "$@"
  require_docker_manager

  if [[ "${DELETE_ALL}" != true && -z "${SETUP_ID}" ]]; then
    prompt_target
  fi

  confirm_delete

  section "$(t deleting_resources)"
  if [[ "${DELETE_ALL}" == true ]]; then
    delete_all_setups
  else
    delete_single_setup "${SETUP_ID}"
  fi

  section "$(t done)"
  info "$(t done_message)"
}

main "$@"
