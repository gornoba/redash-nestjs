#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_ROOT="${ROOT_DIR}/.redash-setup"
BOOTSTRAP_SQL_PATH="${ROOT_DIR}/bootstrap-redash-schema.sql"
POSTGRES_CLIENT_IMAGE="postgres:17.3-alpine"
DRY_RUN=false
LANGUAGE_CODE="ko"

SETUP_ID=""
BACKEND_ENV_CONTENT=""
CONFIG_MAP_CONTENT=""
SECRET_MAP_CONTENT=""
EXPORT_SCRIPT_CONTENT=""
SUMMARY_CONTENT=""
PLANNED_COMMANDS=""
SWARM_BOOTSTRAP_MODE=""
SWARM_ADVERTISE_ADDR=""
SWARM_JOIN_TOKEN_COMMAND=""
WORKER_JOIN_INSTRUCTIONS=""

DEPLOY_IMAGE_REPOSITORY=""
API_SERVICE_NAME=""
API_REPLICAS="1"
API_LIMIT_CPU="1.0"
API_LIMIT_MEMORY="1024M"
WORKER_SERVICE_NAME=""
WORKER_REPLICAS="2"
WORKER_LIMIT_CPU="1.0"
WORKER_LIMIT_MEMORY="1024M"
SCHEDULE_SERVICE_NAME=""
SCHEDULE_REPLICAS="1"
SCHEDULE_LIMIT_CPU="0.5"
SCHEDULE_LIMIT_MEMORY="512M"
ALERT_SERVICE_NAME=""
ALERT_REPLICAS="1"
ALERT_LIMIT_CPU="0.5"
ALERT_LIMIT_MEMORY="512M"
FRONTEND_SERVICE_NAME=""
FRONTEND_REPLICAS="1"
FRONTEND_LIMIT_CPU="0.5"
FRONTEND_LIMIT_MEMORY="768M"
FRONTEND_PUBLISHED_HTTP_PORT="80"

DB_MODE=""
DB_HOST=""
DB_PORT="5432"
DB_USERNAME=""
DB_PASSWORD=""
DB_DATABASE=""
DB_SCHEMA="public"
DB_SERVICE_NAME=""
DB_VOLUME_NAME=""
DB_PASSWORD_SECRET_NAME=""

REDIS_MODE=""
REDIS_HOST=""
REDIS_PORT="6379"
REDIS_SERVICE_NAME=""
REDIS_VOLUME_NAME=""

SWAGGER_ENABLED="false"
SWAGGER_BASIC_AUTH_USER=""
SWAGGER_BASIC_AUTH_PASSWORD=""
SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME=""

REDASH_BASE_URL=""

JWT_ACCESS_SECRET=""
JWT_ACCESS_SECRET_SECRET_NAME=""
REDASH_SECRET_KEY=""
REDASH_SECRET_KEY_SECRET_NAME=""

MAIL_PROVIDER=""
MAIL_FROM=""
AWS_REGION=""
EMAIL_AWS_USER=""
EMAIL_AWS_PASSWORD=""
EMAIL_AWS_USER_SECRET_NAME=""
EMAIL_AWS_PASSWORD_SECRET_NAME=""
MAIL_GMAIL_USER=""
MAIL_GMAIL_APP_PASSWORD=""
MAIL_GMAIL_USER_SECRET_NAME=""
MAIL_GMAIL_APP_PASSWORD_SECRET_NAME=""

INFRA_NETWORK_NAME=""
NEEDS_INFRA_NETWORK=false
SWAGGER_DOCS_URL=""
BACKEND_PUBLIC_ENV_CONFIG_NAME=""
EXPORT_SCRIPT_CONFIG_NAME=""

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ -n "${TERM:-}" ]] && tput colors >/dev/null 2>&1; then
  COLOR_BOLD="$(tput bold)"
  COLOR_RESET="$(tput sgr0)"
  COLOR_CYAN="$(tput setaf 6)"
  COLOR_GREEN="$(tput setaf 2)"
  COLOR_YELLOW="$(tput setaf 3)"
  COLOR_RED="$(tput setaf 1)"
  COLOR_DIM="$(tput dim)"
else
  COLOR_BOLD=""
  COLOR_RESET=""
  COLOR_CYAN=""
  COLOR_GREEN=""
  COLOR_YELLOW=""
  COLOR_RED=""
  COLOR_DIM=""
fi

usage() {
  cat <<'EOF'
Usage:
  ./redash-start.sh
  ./redash-start.sh --dry-run

Options:
  --dry-run   Docker Swarm secret 생성, 네트워크 생성, 서비스 실행 없이
              wizard 결과와 실행 예정 명령만 출력합니다.
  -h, --help  Show this help message.
EOF
}

t() {
  local key="$1"

  if [[ "${LANGUAGE_CODE}" == "en" ]]; then
    case "${key}" in
      lang_title) printf 'Select language / 언어를 선택하세요' ;;
      lang_option_ko) printf 'Korean (한국어)' ;;
      lang_option_en) printf 'English' ;;
      intro_subtitle) printf 'Prepare Docker Swarm deployment infra, secrets, and environment values interactively.' ;;
      intro_desc) printf 'This wizard collects and organizes the values required before the first Redash deployment.' ;;
      intro_targets) printf 'What this wizard collects:' ;;
      intro_target_1) printf '  1. Docker Swarm bootstrap' ;;
      intro_target_2) printf '  2. PostgreSQL / Redis configuration' ;;
      intro_target_3) printf '  3. Swagger / Base URL' ;;
      intro_target_4) printf '  4. JWT / Redash secrets' ;;
      intro_target_5) printf '  5. Gmail or AWS SES mail settings' ;;
      intro_mode) printf 'Execution mode:' ;;
      intro_mode_dry) printf 'dry-run (preview)' ;;
      intro_mode_apply) printf 'apply (create resources)' ;;
      intro_workdir) printf 'Working directory:' ;;
      dry_run_title) printf 'DRY-RUN' ;;
      dry_run_line_1) printf '  - Does not run docker swarm init/join.' ;;
      dry_run_line_2) printf '  - Does not create Docker secrets.' ;;
      dry_run_line_3) printf '  - Does not create Docker networks/services.' ;;
      dry_run_line_4) printf '  - Only shows the result summary and planned commands.' ;;
      warn_empty) printf 'This value cannot be empty.' ;;
      prompt_select_1_2) printf 'Select [1-2]: ' ;;
      warn_select_1_2) printf 'Enter 1 or 2.' ;;
      warn_yes_no) printf 'Answer with y or n.' ;;
      section_setup_id) printf '0. Setup ID' ;;
      section_swarm) printf '1. Docker Swarm' ;;
      section_database) printf '2. Database' ;;
      section_redis) printf '3. Redis' ;;
      section_swagger) printf '4. Swagger' ;;
      section_base_url) printf '5. Base URL' ;;
      section_app_secrets) printf '6. Application Secrets' ;;
      section_mail) printf '7. Mail' ;;
      section_deploy) printf '8. Deploy' ;;
      section_db_bootstrap) printf '9. Database Bootstrap' ;;
      section_swarm_bootstrap) printf 'Swarm Bootstrap' ;;
      section_setup_summary) printf 'Setup Summary' ;;
      section_backend_public_env) printf 'backend-public.env (docker config payload)' ;;
      section_swarm_configs) printf 'swarm-configs.env' ;;
      section_swarm_secrets) printf 'swarm-secrets.env' ;;
      section_export_script) printf 'export-secrets.sh' ;;
      section_generated_secret_values) printf 'Generated Secret Values (dry-run only)' ;;
      section_planned_commands) printf 'Planned Docker Commands' ;;
      section_dry_run_result) printf 'Dry-run Result' ;;
      section_generated_files) printf 'Generated Files' ;;
      section_notes) printf 'Notes' ;;
      swarm_manager_required) printf 'Does this manager node need Docker Swarm init setup?' ;;
      swarm_advertise_addr) printf 'Current manager advertise address (IP/host reachable from workers)' ;;
      swarm_worker_heading) printf 'Run the following command on the other worker nodes.' ;;
      swarm_worker_done) printf 'Have all worker nodes finished joining?' ;;
      swarm_worker_retry) printf 'Check the worker join command again, then answer y to continue.' ;;
      swarm_manager_only) printf 'This script must be run on a Docker Swarm manager node.' ;;
      swarm_not_active) printf 'Docker Swarm is not active on this node.' ;;
      swarm_worker_node) printf 'This node is already a Swarm worker. Run this again on a manager node.' ;;
      swarm_manager_exists) printf 'This node is already a Docker Swarm manager. Skipping swarm init.' ;;
      swarm_prepare_join) printf 'Preparing worker join instructions from the current manager node.' ;;
      swarm_init_first) printf 'Docker Swarm is not active yet. Run swarm init first.' ;;
      db_how) printf 'How would you like to prepare PostgreSQL?' ;;
      db_opt_external) printf 'Use external PostgreSQL (AWS / GCP / self-managed)' ;;
      db_opt_docker) printf 'Run PostgreSQL on Docker Swarm' ;;
      db_host) printf 'DB host or host:port' ;;
      db_username) printf 'DB username' ;;
      db_password) printf 'DB password' ;;
      db_database) printf 'DB database' ;;
      redis_how) printf 'How would you like to prepare Redis?' ;;
      redis_opt_external) printf 'Use external Redis (AWS / GCP / self-managed)' ;;
      redis_opt_docker) printf 'Run Redis on Docker Swarm' ;;
      redis_managed_notice) printf 'This wizard only supports managed Redis without a password.' ;;
      redis_host) printf 'Redis host or host:port' ;;
      swagger_enable) printf 'Enable Swagger documentation?' ;;
      swagger_username) printf 'Swagger username' ;;
      swagger_password) printf 'Swagger password' ;;
      base_url_prompt) printf 'Public Redash base URL' ;;
      app_secrets_direct) printf 'Do you want to enter the JWT and Redash secrets manually?' ;;
      mail_how) printf 'Choose the mail delivery method.' ;;
      mail_opt_gmail) printf 'Use Gmail app password' ;;
      mail_opt_aws) printf 'Use AWS SES' ;;
      gmail_account) printf 'Gmail account' ;;
      gmail_app_password) printf 'Gmail app password' ;;
      aws_region) printf 'AWS_REGION' ;;
      aws_user) printf 'EMAIL_AWS_USER' ;;
      aws_password) printf 'EMAIL_AWS_PASSWORD' ;;
      mail_from) printf 'MAIL_FROM (verified sender/domain address)' ;;
      deploy_repo) printf 'Docker Hub repository' ;;
      deploy_help) printf 'Enter replicas and max resources for each service. Press Enter to use the defaults.' ;;
      deploy_replicas) printf 'replicas' ;;
      deploy_max_cpu) printf 'max CPU' ;;
      deploy_max_ram) printf 'max RAM' ;;
      setup_id_prompt) printf 'Setup ID (reuse the same value for redeployments)' ;;
      setup_id_help) printf 'This ID is reused in Swarm resource names. Use lowercase letters, numbers, and hyphens only.' ;;
      bootstrap_missing_sql) printf 'bootstrap-redash-schema.sql was not found in the project root.' ;;
      bootstrap_wait) printf 'Waiting for PostgreSQL bootstrap target' ;;
      bootstrap_wait_done) printf 'PostgreSQL bootstrap target is ready' ;;
      bootstrap_apply) printf 'Applying bootstrap-redash-schema.sql' ;;
      bootstrap_apply_done) printf 'Applied bootstrap-redash-schema.sql' ;;
      result_mode) printf 'Mode' ;;
      result_manager_addr) printf 'Manager advertise address' ;;
      result_join_token_cmd) printf 'Worker join token command' ;;
      result_join_instructions) printf 'Worker join instructions' ;;
      result_swagger_url) printf 'Swagger URL' ;;
      result_dry_run_done) printf 'Did not run docker swarm init/join, secrets, networks, or services.' ;;
      note_1) printf -- '- Non-secret settings are separated into Docker configs, and sensitive values into Docker secrets.' ;;
      note_2) printf -- '- The current backend still reads env values directly, so Swarm deployment needs the export-secrets.sh entrypoint wrapper.' ;;
      note_3) printf -- '- Attach configs %s and %s plus the required secrets to the application services.' ;;
      note_4) printf -- '- Application services must join the Docker Swarm network %s.' ;;
      note_5) printf -- '- Docker PostgreSQL will be prepared with database=%s, schema=%s, user=%s.' ;;
      generated_files_path) printf 'Generated files' ;;
      *) printf '%s' "${key}" ;;
    esac
  else
    case "${key}" in
      lang_title) printf '언어를 선택하세요 / Select language' ;;
      lang_option_ko) printf '한국어' ;;
      lang_option_en) printf 'English' ;;
      intro_subtitle) printf 'Docker Swarm 배포를 위한 초기 인프라/시크릿/환경값을 대화형으로 준비합니다.' ;;
      intro_desc) printf '이 wizard는 Redash 첫 배포 전에 필요한 설정값을 모으고 정리합니다.' ;;
      intro_targets) printf '수집 대상:' ;;
      intro_target_1) printf '  1. Docker Swarm bootstrap' ;;
      intro_target_2) printf '  2. PostgreSQL / Redis 구성' ;;
      intro_target_3) printf '  3. Swagger / Base URL' ;;
      intro_target_4) printf '  4. JWT / Redash secret' ;;
      intro_target_5) printf '  5. Gmail 또는 AWS SES 메일 설정' ;;
      intro_mode) printf '실행 모드:' ;;
      intro_mode_dry) printf 'dry-run (미리보기)' ;;
      intro_mode_apply) printf 'apply (실제 생성)' ;;
      intro_workdir) printf '작업 경로:' ;;
      dry_run_title) printf 'DRY-RUN' ;;
      dry_run_line_1) printf '  - Docker swarm init/join 을 실행하지 않습니다.' ;;
      dry_run_line_2) printf '  - Docker secret을 만들지 않습니다.' ;;
      dry_run_line_3) printf '  - Docker network/service를 만들지 않습니다.' ;;
      dry_run_line_4) printf '  - 결과 요약과 실행 예정 명령만 출력합니다.' ;;
      warn_empty) printf '값을 비울 수 없습니다.' ;;
      prompt_select_1_2) printf '선택하세요 [1-2]: ' ;;
      warn_select_1_2) printf '1 또는 2를 입력하세요.' ;;
      warn_yes_no) printf 'y 또는 n으로 답하세요.' ;;
      section_setup_id) printf '0. Setup ID' ;;
      section_swarm) printf '1. Docker Swarm' ;;
      section_database) printf '2. Database' ;;
      section_redis) printf '3. Redis' ;;
      section_swagger) printf '4. Swagger' ;;
      section_base_url) printf '5. Base URL' ;;
      section_app_secrets) printf '6. Application Secrets' ;;
      section_mail) printf '7. Mail' ;;
      section_deploy) printf '8. Deploy' ;;
      section_db_bootstrap) printf '9. Database Bootstrap' ;;
      section_swarm_bootstrap) printf 'Swarm Bootstrap' ;;
      section_setup_summary) printf 'Setup Summary' ;;
      section_backend_public_env) printf 'backend-public.env (docker config payload)' ;;
      section_swarm_configs) printf 'swarm-configs.env' ;;
      section_swarm_secrets) printf 'swarm-secrets.env' ;;
      section_export_script) printf 'export-secrets.sh' ;;
      section_generated_secret_values) printf 'Generated Secret Values (dry-run only)' ;;
      section_planned_commands) printf 'Planned Docker Commands' ;;
      section_dry_run_result) printf 'Dry-run Result' ;;
      section_generated_files) printf 'Generated Files' ;;
      section_notes) printf 'Notes' ;;
      swarm_manager_required) printf '이 manager 노드에서 Docker Swarm init 세팅이 필요한가요?' ;;
      swarm_advertise_addr) printf '현재 manager advertise address (worker가 접근할 IP 또는 호스트)' ;;
      swarm_worker_heading) printf '다른 worker 노드에서 아래 명령을 실행하세요.' ;;
      swarm_worker_done) printf 'worker 노드 join 확인이 끝났나요?' ;;
      swarm_worker_retry) printf 'worker join 명령을 다시 확인한 뒤 y 로 진행하세요.' ;;
      swarm_manager_only) printf '이 스크립트는 Docker Swarm manager 노드에서 실행해야 합니다.' ;;
      swarm_not_active) printf 'Docker Swarm is not active on this node.' ;;
      swarm_worker_node) printf '현재 노드는 이미 Swarm worker 입니다. manager 노드에서 다시 실행하세요.' ;;
      swarm_manager_exists) printf '현재 노드는 이미 Docker Swarm manager 입니다. swarm init은 건너뜁니다.' ;;
      swarm_prepare_join) printf '현재 manager 노드 정보를 기준으로 worker join 명령을 준비합니다.' ;;
      swarm_init_first) printf 'Docker Swarm이 아직 활성화되지 않았습니다. 먼저 swarm init을 진행하세요.' ;;
      db_how) printf 'PostgreSQL을 어떻게 준비할까요?' ;;
      db_opt_external) printf '외부 PostgreSQL 사용 (AWS / GCP / 직접 운영)' ;;
      db_opt_docker) printf 'Docker Swarm에 PostgreSQL 실행' ;;
      db_host) printf 'DB host 또는 host:port' ;;
      db_username) printf 'DB username' ;;
      db_password) printf 'DB password' ;;
      db_database) printf 'DB database' ;;
      redis_how) printf 'Redis를 어떻게 준비할까요?' ;;
      redis_opt_external) printf '외부 Redis 사용 (AWS / GCP / 직접 운영)' ;;
      redis_opt_docker) printf 'Docker Swarm에 Redis 실행' ;;
      redis_managed_notice) printf '이 wizard는 관리형 Redis를 비밀번호 없는 구성으로만 다룹니다.' ;;
      redis_host) printf 'Redis host 또는 host:port' ;;
      swagger_enable) printf 'Swagger 문서를 활성화할까요?' ;;
      swagger_username) printf 'Swagger username' ;;
      swagger_password) printf 'Swagger password' ;;
      base_url_prompt) printf '사용자에게 노출될 Redash base URL' ;;
      app_secrets_direct) printf 'JWT secret과 Redash secret을 직접 입력할까요?' ;;
      mail_how) printf '메일 발송 방식을 선택하세요.' ;;
      mail_opt_gmail) printf 'Gmail 앱 비밀번호 사용' ;;
      mail_opt_aws) printf 'AWS SES 사용' ;;
      gmail_account) printf 'Gmail account' ;;
      gmail_app_password) printf 'Gmail app password' ;;
      aws_region) printf 'AWS_REGION' ;;
      aws_user) printf 'EMAIL_AWS_USER' ;;
      aws_password) printf 'EMAIL_AWS_PASSWORD' ;;
      mail_from) printf 'MAIL_FROM (검증된 sender/domain 주소)' ;;
      deploy_repo) printf 'Docker Hub repository' ;;
      deploy_help) printf '서비스별 replicas와 최대 리소스를 입력하세요. Enter를 누르면 기본값을 사용합니다.' ;;
      deploy_replicas) printf 'replicas' ;;
      deploy_max_cpu) printf 'max CPU' ;;
      deploy_max_ram) printf 'max RAM' ;;
      setup_id_prompt) printf 'Setup ID (재배포 시 같은 값을 재사용)' ;;
      setup_id_help) printf '이 값이 Swarm 리소스 이름에 재사용됩니다. 소문자, 숫자, 하이픈만 사용하세요.' ;;
      bootstrap_missing_sql) printf '프로젝트 루트에 bootstrap-redash-schema.sql 파일이 없습니다.' ;;
      bootstrap_wait) printf 'PostgreSQL bootstrap 대상 준비 대기' ;;
      bootstrap_wait_done) printf 'PostgreSQL bootstrap 대상 준비 완료' ;;
      bootstrap_apply) printf 'bootstrap-redash-schema.sql 적용' ;;
      bootstrap_apply_done) printf 'bootstrap-redash-schema.sql 적용 완료' ;;
      result_mode) printf 'Mode' ;;
      result_manager_addr) printf 'Manager advertise address' ;;
      result_join_token_cmd) printf 'Worker join token command' ;;
      result_join_instructions) printf 'Worker join instructions' ;;
      result_swagger_url) printf 'Swagger URL' ;;
      result_dry_run_done) printf 'Docker swarm init/join, secret, network, service는 생성하지 않았습니다.' ;;
      note_1) printf -- '- 일반 설정은 Docker config, 민감값은 Docker secret 으로 분리하는 구조입니다.' ;;
      note_2) printf -- '- 현재 백엔드는 env 값을 직접 읽으므로, Swarm 배포 시 export-secrets.sh 형태의 entrypoint 래퍼가 필요합니다.' ;;
      note_3) printf -- '- 애플리케이션 서비스에는 config %s, %s 와 필요한 secrets를 함께 붙여야 합니다.' ;;
      note_4) printf -- '- 애플리케이션 서비스는 Docker Swarm network %s 에 같이 붙어야 합니다.' ;;
      note_5) printf -- '- Docker PostgreSQL은 database=%s, schema=%s, user=%s 로 준비됩니다.' ;;
      generated_files_path) printf 'Generated files' ;;
      *) printf '%s' "${key}" ;;
    esac
  fi
}

terminal_width() {
  if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ -n "${TERM:-}" ]]; then
    tput cols
    return
  fi

  echo 100
}

repeat_char() {
  local char="$1"
  local count="$2"
  local output=""

  while (( ${#output} < count )); do
    output+="${char}"
  done

  printf '%s' "${output:0:count}"
}

center_text() {
  local text="$1"
  local width="$2"
  local text_length
  text_length="$(visible_text_width "${text}")"

  if (( text_length >= width )); then
    printf '%s\n' "${text}"
    return
  fi

  local padding=$(( (width - text_length) / 2 ))
  printf '%*s%s\n' "${padding}" "" "${text}"
}

visible_text_width() {
  local text="$1"

  if command -v perl >/dev/null 2>&1; then
    perl -CSDA -e '
      my $s = shift // q{};
      $s =~ s/\e\[[0-9;]*[[:alpha:]]//g;
      my $width = 0;
      for my $char (split //, $s) {
        $width += ord($char) < 128 ? 1 : 2;
      }
      print $width;
    ' "${text}"
    return
  fi

  local plain_text=""
  plain_text="$(printf '%s' "${text}" | sed -E $'s/\x1B\\[[0-9;]*[[:alpha:]]//g')"
  printf '%s' "${#plain_text}"
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

print_box() {
  local width="$1"
  shift
  local border_width=$(( width - 2 ))
  local border
  border="$(repeat_char "═" "${border_width}")"
  local use_cursor_border=false

  if [[ -t 1 && -n "${TERM:-}" ]]; then
    use_cursor_border=true
  fi

  printf '╔%s╗\n' "${border}"

  while (($#)); do
    local line="$1"
    shift

    if [[ -z "${line}" ]]; then
      if [[ "${use_cursor_border}" == true ]]; then
        printf '║'
        printf '\033[%dG║\n' "${width}"
      else
        printf '║\n'
      fi
      continue
    fi

    if [[ "${line}" == "__SEPARATOR__" ]]; then
      printf '╠%s╣\n' "${border}"
      continue
    fi

    if [[ "${use_cursor_border}" == true ]]; then
      printf '║ %s' "${line}"
      printf '\033[%dG║\n' "${width}"
    else
      printf '║ %s ║\n' "${line}"
    fi
  done

  printf '╚%s╝\n' "${border}"
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

shell_join() {
  local result=""
  local arg

  for arg in "$@"; do
    printf -v result '%s%q ' "${result}" "${arg}"
  done

  printf '%s' "${result% }"
}

append_backend_env() {
  BACKEND_ENV_CONTENT+="$1=$2"$'\n'
}

append_backend_comment() {
  BACKEND_ENV_CONTENT+="# $1"$'\n'
}

append_secret_map() {
  SECRET_MAP_CONTENT+="$1=$2"$'\n'
}

append_config_map() {
  CONFIG_MAP_CONTENT+="$1=$2"$'\n'
}

append_export_line() {
  EXPORT_SCRIPT_CONTENT+="$1"$'\n'
}

append_summary_line() {
  SUMMARY_CONTENT+="$1"$'\n'
}

append_planned_line() {
  PLANNED_COMMANDS+="$1"$'\n'
}

record_command() {
  PLANNED_COMMANDS+="$(shell_join "$@")"$'\n'
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    die "Required command not found: $1"
  fi
}

random_hex() {
  local length="$1"

  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$(( (length + 1) / 2 ))" | cut -c "1-${length}"
    return
  fi

  if command -v hexdump >/dev/null 2>&1; then
    hexdump -n "$(( (length + 1) / 2 ))" -e '"%02x"' /dev/urandom | cut -c "1-${length}"
    return
  fi

  printf '%s' "$(date +%s)${RANDOM}" | tr -cd '0-9a-f' | cut -c "1-${length}"
}

random_secret_value() {
  local length="$1"

  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$(( (length + 1) / 2 ))" | cut -c "1-${length}"
    return
  fi

  printf '%s' "$(random_hex "${length}")"
}

random_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 24 | tr -d '\n' | tr '+/' 'AZ' | cut -c1-24
    return
  fi

  printf '%s' "$(random_secret_value 24)"
}

sanitize_prompt_value() {
  printf '%s' "$1" | LC_ALL=C tr -d '\000-\010\013\014\016-\037\177'
}

detect_default_advertise_addr() {
  local detected_addr=""
  local interface_name=""

  if command -v ip >/dev/null 2>&1; then
    detected_addr="$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}' || true)"
  fi

  if [[ -z "${detected_addr}" ]] && command -v hostname >/dev/null 2>&1; then
    detected_addr="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi

  if [[ -z "${detected_addr}" ]] && command -v ipconfig >/dev/null 2>&1; then
    for interface_name in en0 en1; do
      detected_addr="$(ipconfig getifaddr "${interface_name}" 2>/dev/null || true)"

      if [[ -n "${detected_addr}" ]]; then
        break
      fi
    done
  fi

  if [[ -z "${detected_addr}" ]]; then
    detected_addr="192.168.0.10"
  fi

  printf '%s' "${detected_addr}"
}

show_intro_screen() {
  local width
  width="$(terminal_width)"

  if (( width < 92 )); then
    width=92
  elif (( width > 120 )); then
    width=120
  fi

  if [[ -t 1 ]]; then
    clear
  fi

  printf '\n'
  center_text "${COLOR_CYAN}${COLOR_BOLD}REDASH INITIAL SETUP${COLOR_RESET}" "${width}"
  center_text "${COLOR_DIM}$(t intro_subtitle)${COLOR_RESET}" "${width}"
  printf '\n'

  print_box "${width}" \
    "$(t intro_desc)" \
    "" \
    "$(t intro_targets)" \
    "$(t intro_target_1)" \
    "$(t intro_target_2)" \
    "$(t intro_target_3)" \
    "$(t intro_target_4)" \
    "$(t intro_target_5)" \
    "__SEPARATOR__" \
    "$(t intro_mode) $( [[ "${DRY_RUN}" == true ]] && printf '%s' "$(t intro_mode_dry)" || printf '%s' "$(t intro_mode_apply)" )" \
    "$(t intro_workdir) ${ROOT_DIR}"

  if [[ "${DRY_RUN}" == true ]]; then
    printf '\n%s%s%s%s\n' "${COLOR_YELLOW}" "${COLOR_BOLD}" "$(t dry_run_title)" "${COLOR_RESET}"
    printf '%s\n' "$(t dry_run_line_1)"
    printf '%s\n' "$(t dry_run_line_2)"
    printf '%s\n' "$(t dry_run_line_3)"
    printf '%s\n' "$(t dry_run_line_4)"
  fi

  printf '\n'
}

prompt_non_empty() {
  local prompt="$1"
  local default_value="${2:-}"
  local value=""

  while true; do
    if [[ -n "${default_value}" ]]; then
      if [[ -t 0 && -r /dev/tty ]]; then
        read -r -p "${prompt} [${default_value}]: " value < /dev/tty
      else
        read -r -p "${prompt} [${default_value}]: " value
      fi
      value="${value:-${default_value}}"
    else
      if [[ -t 0 && -r /dev/tty ]]; then
        read -r -p "${prompt}: " value < /dev/tty
      else
        read -r -p "${prompt}: " value
      fi
    fi

    value="$(sanitize_prompt_value "${value}")"

    if [[ -n "${value}" ]]; then
      printf '%s' "${value}"
      return
    fi

    warn "$(t warn_empty)"
  done
}

prompt_secret_value() {
  local prompt="$1"
  local value=""

  while true; do
    if [[ -t 0 && -r /dev/tty ]]; then
      read -r -s -p "${prompt}: " value < /dev/tty
      printf '\n' > /dev/tty
    elif [[ -t 0 ]]; then
      read -r -s -p "${prompt}: " value
      printf '\n' >&2
    else
      read -r value
    fi

    value="$(sanitize_prompt_value "${value}")"

    if [[ -n "${value}" ]]; then
      printf '%s' "${value}"
      return
    fi

    warn "$(t warn_empty)"
  done
}

prompt_choice() {
  local title="$1"
  local option_one="$2"
  local option_two="$3"
  local answer=""

  while true; do
    if [[ -t 0 && -r /dev/tty && -w /dev/tty ]]; then
      printf '%s\n' "${title}" > /dev/tty
      printf '  1. %s\n' "${option_one}" > /dev/tty
      printf '  2. %s\n' "${option_two}" > /dev/tty
    else
      printf '%s\n' "${title}" >&2
      printf '  1. %s\n' "${option_one}" >&2
      printf '  2. %s\n' "${option_two}" >&2
    fi

    if [[ -t 0 && -r /dev/tty ]]; then
      read -r -p "$(t prompt_select_1_2)" answer < /dev/tty
    else
      read -r -p "$(t prompt_select_1_2)" answer
    fi

    case "${answer}" in
      1) printf '1'; return ;;
      2) printf '2'; return ;;
      *) warn "$(t warn_select_1_2)" ;;
    esac
  done
}

prompt_yes_no() {
  local prompt="$1"
  local default_value="$2"
  local answer=""

  while true; do
    if [[ -t 0 && -r /dev/tty ]]; then
      read -r -p "${prompt} [${default_value}]: " answer < /dev/tty
    else
      read -r -p "${prompt} [${default_value}]: " answer
    fi
    answer="${answer:-${default_value}}"

    case "${answer}" in
      y|Y|yes|YES|Yes) return 0 ;;
      n|N|no|NO|No) return 1 ;;
      *) warn "$(t warn_yes_no)" ;;
    esac
  done
}

collect_setup_id() {
  section "$(t section_setup_id)"
  info "$(t setup_id_help)"

  while true; do
    SETUP_ID="$(prompt_non_empty "$(t setup_id_prompt)" "main")"

    if [[ "${SETUP_ID}" =~ ^[a-z0-9-]+$ ]]; then
      return
    fi

    warn "$(t setup_id_help)"
  done
}

collect_service_deploy_profile() {
  local service_label="$1"
  local default_replicas="$2"
  local default_cpu="$3"
  local default_memory="$4"
  local replicas_var_name="$5"
  local cpu_var_name="$6"
  local memory_var_name="$7"
  local replicas=""
  local limit_cpu=""
  local limit_memory=""

  replicas="$(prompt_non_empty "${service_label} $(t deploy_replicas)" "${default_replicas}")"
  limit_cpu="$(prompt_non_empty "${service_label} $(t deploy_max_cpu)" "${default_cpu}")"
  limit_memory="$(prompt_non_empty "${service_label} $(t deploy_max_ram)" "${default_memory}")"

  printf -v "${replicas_var_name}" '%s' "${replicas}"
  printf -v "${cpu_var_name}" '%s' "${limit_cpu}"
  printf -v "${memory_var_name}" '%s' "${limit_memory}"
}

parse_host_port() {
  local raw="$1"
  local default_port="$2"
  local parsed_host="${raw}"
  local parsed_port="${default_port}"

  if [[ "${raw}" == *:* ]]; then
    local maybe_host="${raw%:*}"
    local maybe_port="${raw##*:}"

    if [[ -n "${maybe_host}" && "${maybe_port}" =~ ^[0-9]+$ ]]; then
      parsed_host="${maybe_host}"
      parsed_port="${maybe_port}"
    fi
  fi

  printf '%s|%s\n' "${parsed_host}" "${parsed_port}"
}

ensure_docker_manager_ready() {
  require_command docker

  local swarm_state=""
  local control_available=""
  swarm_state="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || true)"
  control_available="$(docker info --format '{{.Swarm.ControlAvailable}}' 2>/dev/null || true)"

  if [[ "${swarm_state}" != "active" ]]; then
    die "$(t swarm_not_active)"
  fi

  if [[ "${control_available}" != "true" ]]; then
    die "$(t swarm_manager_only)"
  fi
}

confirm_worker_join_completion() {
  if [[ -z "${WORKER_JOIN_INSTRUCTIONS}" ]]; then
    return
  fi

  while true; do
    info "$(t swarm_worker_heading)"
    printf '%s\n' "${WORKER_JOIN_INSTRUCTIONS}"

    if prompt_yes_no "$(t swarm_worker_done)" "y"; then
      return
    fi

    warn "$(t swarm_worker_retry)"
  done
}

collect_swarm_bootstrap() {
  section "$(t section_swarm)"

  local default_addr=""
  local needs_init=""
  local swarm_state=""
  local control_available=""
  local node_addr=""

  default_addr="$(detect_default_advertise_addr)"
  needs_init="false"

  if prompt_yes_no "$(t swarm_manager_required)" "n"; then
    needs_init="true"
  fi

  if [[ "${DRY_RUN}" == true ]]; then
    if [[ "${needs_init}" == "true" ]]; then
      SWARM_BOOTSTRAP_MODE="dry-run-init"
    else
      SWARM_BOOTSTRAP_MODE="dry-run-existing-manager"
    fi

    SWARM_ADVERTISE_ADDR="$(prompt_non_empty "$(t swarm_advertise_addr)" "${default_addr}")"
    SWARM_JOIN_TOKEN_COMMAND="docker swarm join-token worker"
    WORKER_JOIN_INSTRUCTIONS=$'To add a worker to this swarm, run the following command:\n\ndocker swarm join --token <worker-join-token> '"${SWARM_ADVERTISE_ADDR}"':2377'

    if [[ "${needs_init}" == "true" ]]; then
      append_planned_line "$(shell_join docker swarm init --advertise-addr "${SWARM_ADVERTISE_ADDR}")"
    fi

    append_planned_line "${SWARM_JOIN_TOKEN_COMMAND}"
    append_planned_line "# worker nodes"
    append_planned_line "docker swarm join --token <worker-join-token> ${SWARM_ADVERTISE_ADDR}:2377"
    confirm_worker_join_completion
    return
  fi

  require_command docker
  swarm_state="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || true)"
  control_available="$(docker info --format '{{.Swarm.ControlAvailable}}' 2>/dev/null || true)"
  node_addr="$(docker info --format '{{.Swarm.NodeAddr}}' 2>/dev/null || true)"

  if [[ "${needs_init}" == "true" ]]; then
    if [[ "${swarm_state}" == "active" && "${control_available}" != "true" ]]; then
      die "$(t swarm_worker_node)"
    fi

    if [[ "${swarm_state}" == "active" && "${control_available}" == "true" ]]; then
      SWARM_BOOTSTRAP_MODE="existing-manager"
      SWARM_ADVERTISE_ADDR="${node_addr:-${default_addr}}"
      info "$(t swarm_manager_exists)"
    else
      SWARM_BOOTSTRAP_MODE="initialized"
      SWARM_ADVERTISE_ADDR="$(prompt_non_empty "$(t swarm_advertise_addr)" "${default_addr}")"
      run_cmd docker swarm init --advertise-addr "${SWARM_ADVERTISE_ADDR}"
    fi
  else
    if [[ "${swarm_state}" != "active" ]]; then
      die "$(t swarm_init_first)"
    fi

    if [[ "${control_available}" != "true" ]]; then
      die "$(t swarm_worker_node)"
    fi

    SWARM_BOOTSTRAP_MODE="existing-manager"
    SWARM_ADVERTISE_ADDR="${node_addr:-${default_addr}}"
    info "$(t swarm_prepare_join)"
  fi

  if [[ -z "${SWARM_ADVERTISE_ADDR}" ]]; then
    SWARM_BOOTSTRAP_MODE="initialized"
    SWARM_ADVERTISE_ADDR="$(prompt_non_empty "$(t swarm_advertise_addr)" "${default_addr}")"
  fi

  record_command docker swarm join-token worker
  SWARM_JOIN_TOKEN_COMMAND="docker swarm join-token worker"
  WORKER_JOIN_INSTRUCTIONS="$(docker swarm join-token worker)"

  confirm_worker_join_completion
}

create_swarm_secret() {
  local secret_name="$1"
  local secret_value="$2"
  local tmp_file=""

  record_command docker secret create "${secret_name}" "<secret-value>"

  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  tmp_file="$(mktemp)"
  printf '%s' "${secret_value}" > "${tmp_file}"
  docker secret create "${secret_name}" "${tmp_file}" >/dev/null
  rm -f "${tmp_file}"
}

create_swarm_config() {
  local config_name="$1"
  local config_value="$2"
  local tmp_file=""

  record_command docker config create "${config_name}" "<config-payload>"

  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  tmp_file="$(mktemp)"
  printf '%s' "${config_value}" > "${tmp_file}"
  docker config create "${config_name}" "${tmp_file}" >/dev/null
  rm -f "${tmp_file}"
}

run_cmd() {
  record_command "$@"

  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  "$@"
}

run_quiet_cmd() {
  local start_message="$1"
  local done_message="$2"
  shift 2

  local log_file=""
  record_command "$@"

  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  info "==> ${start_message}"
  log_file="$(mktemp)"

  if "$@" >"${log_file}" 2>&1; then
    info "==> ${done_message}"
    rm -f "${log_file}"
    return
  fi

  warn "Command failed: ${start_message}"
  cat "${log_file}" >&2
  rm -f "${log_file}"
  exit 1
}

run_quiet_masked_cmd() {
  local start_message="$1"
  local done_message="$2"
  local planned_command="$3"
  shift 3

  local log_file=""
  append_planned_line "${planned_command}"

  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  info "==> ${start_message}"
  log_file="$(mktemp)"

  if "$@" >"${log_file}" 2>&1; then
    info "==> ${done_message}"
    rm -f "${log_file}"
    return
  fi

  warn "Command failed: ${start_message}"
  cat "${log_file}" >&2
  rm -f "${log_file}"
  exit 1
}

resource_exists() {
  local resource_type="$1"
  local resource_name="$2"

  case "${resource_type}" in
    service) docker service inspect "${resource_name}" >/dev/null 2>&1 ;;
    secret) docker secret inspect "${resource_name}" >/dev/null 2>&1 ;;
    config) docker config inspect "${resource_name}" >/dev/null 2>&1 ;;
    network) docker network inspect "${resource_name}" >/dev/null 2>&1 ;;
    volume) docker volume inspect "${resource_name}" >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

wait_until_resource_absent() {
  local resource_type="$1"
  local resource_name="$2"
  local attempts=0

  while (( attempts < 30 )); do
    if ! resource_exists "${resource_type}" "${resource_name}"; then
      return
    fi

    attempts=$((attempts + 1))
    sleep 1
  done

  die "Timed out waiting for ${resource_type} ${resource_name} to be removed."
}

remove_swarm_service_if_exists() {
  local service_name="$1"

  if [[ -z "${service_name}" ]] || ! resource_exists service "${service_name}"; then
    return
  fi

  run_quiet_cmd "Removing service ${service_name}" "Removed service ${service_name}" \
    docker service rm "${service_name}"
  wait_until_resource_absent service "${service_name}"
}

remove_swarm_secret_if_exists() {
  local secret_name="$1"

  if [[ -z "${secret_name}" ]] || ! resource_exists secret "${secret_name}"; then
    return
  fi

  run_quiet_cmd "Replacing secret ${secret_name}" "Removed previous secret ${secret_name}" \
    docker secret rm "${secret_name}"
  wait_until_resource_absent secret "${secret_name}"
}

remove_swarm_config_if_exists() {
  local config_name="$1"

  if [[ -z "${config_name}" ]] || ! resource_exists config "${config_name}"; then
    return
  fi

  run_quiet_cmd "Replacing config ${config_name}" "Removed previous config ${config_name}" \
    docker config rm "${config_name}"
  wait_until_resource_absent config "${config_name}"
}

ensure_overlay_network() {
  local network_name="$1"

  if [[ -z "${network_name}" ]] || resource_exists network "${network_name}"; then
    return
  fi

  run_cmd docker network create --driver overlay --attachable "${network_name}"
}

ensure_named_volume() {
  local volume_name="$1"

  if [[ -z "${volume_name}" ]] || resource_exists volume "${volume_name}"; then
    return
  fi

  run_cmd docker volume create "${volume_name}"
}

prepare_existing_setup_resources() {
  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  ensure_docker_manager_ready

  # 같은 setup id로 재실행할 때는 기존 서비스부터 제거해야 secret/config를 같은 이름으로 다시 만들 수 있습니다.
  remove_swarm_service_if_exists "${FRONTEND_SERVICE_NAME}"
  remove_swarm_service_if_exists "${ALERT_SERVICE_NAME}"
  remove_swarm_service_if_exists "${SCHEDULE_SERVICE_NAME}"
  remove_swarm_service_if_exists "${WORKER_SERVICE_NAME}"
  remove_swarm_service_if_exists "${API_SERVICE_NAME}"
  remove_swarm_service_if_exists "${REDIS_SERVICE_NAME}"
  remove_swarm_service_if_exists "${DB_SERVICE_NAME}"

  remove_swarm_config_if_exists "${BACKEND_PUBLIC_ENV_CONFIG_NAME}"
  remove_swarm_config_if_exists "${EXPORT_SCRIPT_CONFIG_NAME}"

  remove_swarm_secret_if_exists "${DB_PASSWORD_SECRET_NAME}"
  remove_swarm_secret_if_exists "${JWT_ACCESS_SECRET_SECRET_NAME}"
  remove_swarm_secret_if_exists "${REDASH_SECRET_KEY_SECRET_NAME}"
  remove_swarm_secret_if_exists "redash-${SETUP_ID}-swagger-basic-auth-password"
  remove_swarm_secret_if_exists "redash-${SETUP_ID}-email-aws-user"
  remove_swarm_secret_if_exists "redash-${SETUP_ID}-email-aws-password"
  remove_swarm_secret_if_exists "redash-${SETUP_ID}-mail-gmail-user"
  remove_swarm_secret_if_exists "redash-${SETUP_ID}-mail-gmail-app-password"
}

apply_database_bootstrap() {
  local bootstrap_script=""
  local actual_args=()
  local planned_args=()
  local network_args=()

  if [[ ! -f "${BOOTSTRAP_SQL_PATH}" ]]; then
    die "$(t bootstrap_missing_sql)"
  fi

  if [[ "${DB_MODE}" == "docker" ]]; then
    network_args=( --network "${INFRA_NETWORK_NAME}" )
  fi

  bootstrap_script='attempt=1; ready=0; while [ "$attempt" -le 60 ]; do if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" >/dev/null 2>&1; then ready=1; break; fi; attempt=$((attempt + 1)); sleep 2; done; [ "$ready" = "1" ] || { echo "PostgreSQL bootstrap target did not become ready in time." >&2; exit 1; }; psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f /bootstrap-redash-schema.sql'

  actual_args=(
    docker run --rm
    "${network_args[@]}"
    -e "PGPASSWORD=${DB_PASSWORD}"
    -e "DB_HOST=${DB_HOST}"
    -e "DB_PORT=${DB_PORT}"
    -e "DB_USERNAME=${DB_USERNAME}"
    -e "DB_DATABASE=${DB_DATABASE}"
    -v "${BOOTSTRAP_SQL_PATH}:/bootstrap-redash-schema.sql:ro"
    "${POSTGRES_CLIENT_IMAGE}"
    sh -ec "${bootstrap_script}"
  )

  planned_args=(
    docker run --rm
    "${network_args[@]}"
    -e "PGPASSWORD=<db-password>"
    -e "DB_HOST=${DB_HOST}"
    -e "DB_PORT=${DB_PORT}"
    -e "DB_USERNAME=${DB_USERNAME}"
    -e "DB_DATABASE=${DB_DATABASE}"
    -v "${BOOTSTRAP_SQL_PATH}:/bootstrap-redash-schema.sql:ro"
    "${POSTGRES_CLIENT_IMAGE}"
    sh -ec "${bootstrap_script}"
  )

  run_quiet_masked_cmd \
    "$(t bootstrap_apply)" \
    "$(t bootstrap_apply_done)" \
    "$(shell_join "${planned_args[@]}")" \
    "${actual_args[@]}"
}

collect_database_config() {
  section "$(t section_database)"

  local choice=""
  choice="$(prompt_choice "$(t db_how)" "$(t db_opt_external)" "$(t db_opt_docker)")"

  if [[ "${choice}" == "1" ]]; then
    local host_input=""
    local parsed=""

    DB_MODE="external"
    host_input="$(prompt_non_empty "$(t db_host)")"
    parsed="$(parse_host_port "${host_input}" "5432")"
    DB_HOST="${parsed%%|*}"
    DB_PORT="${parsed##*|}"
    DB_USERNAME="$(prompt_non_empty "$(t db_username)" "postgres")"
    DB_PASSWORD="$(prompt_secret_value "$(t db_password)")"
    DB_DATABASE="$(prompt_non_empty "$(t db_database)" "redash")"
  else
    DB_MODE="docker"
    NEEDS_INFRA_NETWORK=true
    DB_USERNAME="postgres"
    DB_DATABASE="redash"
    DB_PASSWORD="$(random_password)"
    DB_PASSWORD_SECRET_NAME="redash-${SETUP_ID}-db-password"
    DB_SERVICE_NAME="redash-postgres-${SETUP_ID}"
    DB_VOLUME_NAME="redash-postgres-data-${SETUP_ID}"
    DB_HOST="${DB_SERVICE_NAME}"
    DB_PORT="5432"
  fi
}

collect_redis_config() {
  section "$(t section_redis)"

  local choice=""
  choice="$(prompt_choice "$(t redis_how)" "$(t redis_opt_external)" "$(t redis_opt_docker)")"

  if [[ "${choice}" == "1" ]]; then
    local host_input=""
    local parsed=""

    REDIS_MODE="external"
    info "$(t redis_managed_notice)"
    host_input="$(prompt_non_empty "$(t redis_host)")"
    parsed="$(parse_host_port "${host_input}" "6379")"
    REDIS_HOST="${parsed%%|*}"
    REDIS_PORT="${parsed##*|}"
  else
    REDIS_MODE="docker"
    NEEDS_INFRA_NETWORK=true
    REDIS_SERVICE_NAME="redash-redis-${SETUP_ID}"
    REDIS_VOLUME_NAME="redash-redis-data-${SETUP_ID}"
    REDIS_HOST="${REDIS_SERVICE_NAME}"
    REDIS_PORT="6379"
  fi
}

collect_swagger_config() {
  section "$(t section_swagger)"

  if prompt_yes_no "$(t swagger_enable)" "y"; then
    SWAGGER_ENABLED="true"
    SWAGGER_BASIC_AUTH_USER="$(prompt_non_empty "$(t swagger_username)" "admin")"
    SWAGGER_BASIC_AUTH_PASSWORD="$(prompt_secret_value "$(t swagger_password)")"
    SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME="redash-${SETUP_ID}-swagger-basic-auth-password"
  else
    SWAGGER_ENABLED="false"
  fi
}

collect_base_url() {
  section "$(t section_base_url)"
  REDASH_BASE_URL="$(prompt_non_empty "$(t base_url_prompt)" "https://redash.example.com")"

  if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
    SWAGGER_DOCS_URL="${REDASH_BASE_URL%/}/docs"
  fi
}

collect_application_secrets() {
  section "$(t section_app_secrets)"

  if prompt_yes_no "$(t app_secrets_direct)" "n"; then
    JWT_ACCESS_SECRET="$(prompt_secret_value "JWT_ACCESS_SECRET")"
    REDASH_SECRET_KEY="$(prompt_secret_value "REDASH_SECRET_KEY (32자 권장)")"
  else
    JWT_ACCESS_SECRET="$(random_secret_value 64)"
    REDASH_SECRET_KEY="$(random_secret_value 32)"
  fi

  JWT_ACCESS_SECRET_SECRET_NAME="redash-${SETUP_ID}-jwt-access-secret"
  REDASH_SECRET_KEY_SECRET_NAME="redash-${SETUP_ID}-redash-secret-key"
}

collect_mail_config() {
  section "$(t section_mail)"

  local choice=""
  choice="$(prompt_choice "$(t mail_how)" "$(t mail_opt_gmail)" "$(t mail_opt_aws)")"

  if [[ "${choice}" == "1" ]]; then
    MAIL_PROVIDER="gmail"
    MAIL_GMAIL_USER="$(prompt_non_empty "$(t gmail_account)")"
    MAIL_GMAIL_APP_PASSWORD="$(prompt_secret_value "$(t gmail_app_password)")"
    MAIL_FROM="${MAIL_GMAIL_USER}"

    MAIL_GMAIL_USER_SECRET_NAME="redash-${SETUP_ID}-mail-gmail-user"
    MAIL_GMAIL_APP_PASSWORD_SECRET_NAME="redash-${SETUP_ID}-mail-gmail-app-password"
  else
    MAIL_PROVIDER="aws_ses"
    AWS_REGION="$(prompt_non_empty "$(t aws_region)" "ap-northeast-2")"
    EMAIL_AWS_USER="$(prompt_non_empty "$(t aws_user)")"
    EMAIL_AWS_PASSWORD="$(prompt_secret_value "$(t aws_password)")"
    MAIL_FROM="$(prompt_non_empty "$(t mail_from)")"

    EMAIL_AWS_USER_SECRET_NAME="redash-${SETUP_ID}-email-aws-user"
    EMAIL_AWS_PASSWORD_SECRET_NAME="redash-${SETUP_ID}-email-aws-password"
  fi
}

collect_deploy_config() {
  section "$(t section_deploy)"

  DEPLOY_IMAGE_REPOSITORY="$(prompt_non_empty "$(t deploy_repo)" "hyunhoo84/redash-nestjs-nextjs")"
  NEEDS_INFRA_NETWORK=true

  info "$(t deploy_help)"

  collect_service_deploy_profile "backend-api" "1" "1.0" "1024M" "API_REPLICAS" "API_LIMIT_CPU" "API_LIMIT_MEMORY"
  collect_service_deploy_profile "backend-worker" "2" "1.0" "1024M" "WORKER_REPLICAS" "WORKER_LIMIT_CPU" "WORKER_LIMIT_MEMORY"
  collect_service_deploy_profile "backend-schedule" "1" "0.5" "512M" "SCHEDULE_REPLICAS" "SCHEDULE_LIMIT_CPU" "SCHEDULE_LIMIT_MEMORY"
  collect_service_deploy_profile "backend-alert" "1" "0.5" "512M" "ALERT_REPLICAS" "ALERT_LIMIT_CPU" "ALERT_LIMIT_MEMORY"
  collect_service_deploy_profile "frontend" "1" "0.5" "768M" "FRONTEND_REPLICAS" "FRONTEND_LIMIT_CPU" "FRONTEND_LIMIT_MEMORY"
}

prepare_output_model() {
  if [[ -z "${DB_PASSWORD_SECRET_NAME}" ]]; then
    DB_PASSWORD_SECRET_NAME="redash-${SETUP_ID}-db-password"
  fi

  if [[ -z "${DB_SERVICE_NAME}" ]]; then
    DB_SERVICE_NAME="redash-postgres-${SETUP_ID}"
  fi

  if [[ -z "${DB_VOLUME_NAME}" ]]; then
    DB_VOLUME_NAME="redash-postgres-data-${SETUP_ID}"
  fi

  if [[ -z "${REDIS_SERVICE_NAME}" ]]; then
    REDIS_SERVICE_NAME="redash-redis-${SETUP_ID}"
  fi

  if [[ -z "${REDIS_VOLUME_NAME}" ]]; then
    REDIS_VOLUME_NAME="redash-redis-data-${SETUP_ID}"
  fi

  BACKEND_PUBLIC_ENV_CONFIG_NAME="redash-${SETUP_ID}-backend-public-env"
  EXPORT_SCRIPT_CONFIG_NAME="redash-${SETUP_ID}-export-secrets-sh"
  API_SERVICE_NAME="redash-api-${SETUP_ID}"
  WORKER_SERVICE_NAME="redash-worker-${SETUP_ID}"
  SCHEDULE_SERVICE_NAME="redash-schedule-${SETUP_ID}"
  ALERT_SERVICE_NAME="redash-alert-${SETUP_ID}"
  FRONTEND_SERVICE_NAME="redash-frontend-${SETUP_ID}"

  if [[ "${NEEDS_INFRA_NETWORK}" == true ]]; then
    INFRA_NETWORK_NAME="redash-net-${SETUP_ID}"
  fi

  append_backend_env "ENV" "production"
  append_backend_env "SWAGGER_ENABLED" "${SWAGGER_ENABLED}"

  if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
    append_backend_env "SWAGGER_BASIC_AUTH_USER" "${SWAGGER_BASIC_AUTH_USER}"
  fi

  append_backend_env "DB_HOST" "${DB_HOST}"
  append_backend_env "DB_PORT" "${DB_PORT}"
  append_backend_env "DB_USERNAME" "${DB_USERNAME}"
  append_backend_env "DB_DATABASE" "${DB_DATABASE}"
  append_backend_comment "DB schema is fixed to ${DB_SCHEMA}"
  append_backend_env "REDASH_BASE_URL" "${REDASH_BASE_URL}"
  append_backend_env "MAIL_PROVIDER" "${MAIL_PROVIDER}"
  append_backend_env "MAIL_FROM" "${MAIL_FROM}"

  if [[ "${MAIL_PROVIDER}" == "aws_ses" ]]; then
    append_backend_env "AWS_REGION" "${AWS_REGION}"
  fi

  append_backend_env "REDIS_HOST" "${REDIS_HOST}"
  append_backend_env "REDIS_PORT" "${REDIS_PORT}"

  if [[ -n "${INFRA_NETWORK_NAME}" ]]; then
    append_backend_comment "Attach app services to Docker Swarm network: ${INFRA_NETWORK_NAME}"
  fi

  append_secret_map "DB_PASSWORD_SECRET_NAME" "${DB_PASSWORD_SECRET_NAME}"
  append_secret_map "JWT_ACCESS_SECRET_SECRET_NAME" "${JWT_ACCESS_SECRET_SECRET_NAME}"
  append_secret_map "REDASH_SECRET_KEY_SECRET_NAME" "${REDASH_SECRET_KEY_SECRET_NAME}"

  append_config_map "BACKEND_PUBLIC_ENV_CONFIG_NAME" "${BACKEND_PUBLIC_ENV_CONFIG_NAME}"
  append_config_map "EXPORT_SCRIPT_CONFIG_NAME" "${EXPORT_SCRIPT_CONFIG_NAME}"

  if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
    append_secret_map "SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME" "${SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME}"
  fi

  if [[ "${MAIL_PROVIDER}" == "aws_ses" ]]; then
    append_secret_map "EMAIL_AWS_USER_SECRET_NAME" "${EMAIL_AWS_USER_SECRET_NAME}"
    append_secret_map "EMAIL_AWS_PASSWORD_SECRET_NAME" "${EMAIL_AWS_PASSWORD_SECRET_NAME}"
  else
    append_secret_map "MAIL_GMAIL_USER_SECRET_NAME" "${MAIL_GMAIL_USER_SECRET_NAME}"
    append_secret_map "MAIL_GMAIL_APP_PASSWORD_SECRET_NAME" "${MAIL_GMAIL_APP_PASSWORD_SECRET_NAME}"
  fi

  append_export_line "#!/usr/bin/env sh"
  append_export_line "set -eu"
  append_export_line "set -a"
  append_export_line ". /run/configs/${BACKEND_PUBLIC_ENV_CONFIG_NAME}"
  append_export_line "set +a"
  append_export_line "export DB_PASSWORD=\"\$(cat /run/secrets/${DB_PASSWORD_SECRET_NAME})\""
  append_export_line "export JWT_ACCESS_SECRET=\"\$(cat /run/secrets/${JWT_ACCESS_SECRET_SECRET_NAME})\""
  append_export_line "export REDASH_SECRET_KEY=\"\$(cat /run/secrets/${REDASH_SECRET_KEY_SECRET_NAME})\""

  if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
    append_export_line "export SWAGGER_BASIC_AUTH_PASSWORD=\"\$(cat /run/secrets/${SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME})\""
  fi

  if [[ "${MAIL_PROVIDER}" == "aws_ses" ]]; then
    append_export_line "export EMAIL_AWS_USER=\"\$(cat /run/secrets/${EMAIL_AWS_USER_SECRET_NAME})\""
    append_export_line "export EMAIL_AWS_PASSWORD=\"\$(cat /run/secrets/${EMAIL_AWS_PASSWORD_SECRET_NAME})\""
  else
    append_export_line "export MAIL_GMAIL_USER=\"\$(cat /run/secrets/${MAIL_GMAIL_USER_SECRET_NAME})\""
    append_export_line "export MAIL_GMAIL_APP_PASSWORD=\"\$(cat /run/secrets/${MAIL_GMAIL_APP_PASSWORD_SECRET_NAME})\""
  fi

  append_export_line "exec \"\$@\""

  append_summary_line "SETUP_ID=${SETUP_ID}"
  append_summary_line "SWARM_BOOTSTRAP_MODE=${SWARM_BOOTSTRAP_MODE}"
  append_summary_line "SWARM_ADVERTISE_ADDR=${SWARM_ADVERTISE_ADDR}"
  append_summary_line "DEPLOY_IMAGE_REPOSITORY=${DEPLOY_IMAGE_REPOSITORY}"
  append_summary_line "DB_MODE=${DB_MODE}"
  append_summary_line "DB_HOST=${DB_HOST}"
  append_summary_line "DB_PORT=${DB_PORT}"
  append_summary_line "DB_USERNAME=${DB_USERNAME}"
  append_summary_line "DB_DATABASE=${DB_DATABASE}"
  append_summary_line "DB_SCHEMA=${DB_SCHEMA}"
  append_summary_line "REDIS_MODE=${REDIS_MODE}"
  append_summary_line "REDIS_HOST=${REDIS_HOST}"
  append_summary_line "REDIS_PORT=${REDIS_PORT}"
  append_summary_line "SWAGGER_ENABLED=${SWAGGER_ENABLED}"

  if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
    append_summary_line "SWAGGER_BASIC_AUTH_USER=${SWAGGER_BASIC_AUTH_USER}"
    append_summary_line "SWAGGER_DOCS_URL=${SWAGGER_DOCS_URL}"
  fi

  append_summary_line "REDASH_BASE_URL=${REDASH_BASE_URL}"
  append_summary_line "MAIL_PROVIDER=${MAIL_PROVIDER}"
  append_summary_line "MAIL_FROM=${MAIL_FROM}"
  append_summary_line "BACKEND_PUBLIC_ENV_CONFIG_NAME=${BACKEND_PUBLIC_ENV_CONFIG_NAME}"
  append_summary_line "EXPORT_SCRIPT_CONFIG_NAME=${EXPORT_SCRIPT_CONFIG_NAME}"
  append_summary_line "API_REPLICAS=${API_REPLICAS}"
  append_summary_line "API_LIMIT_CPU=${API_LIMIT_CPU}"
  append_summary_line "API_LIMIT_MEMORY=${API_LIMIT_MEMORY}"
  append_summary_line "WORKER_REPLICAS=${WORKER_REPLICAS}"
  append_summary_line "WORKER_LIMIT_CPU=${WORKER_LIMIT_CPU}"
  append_summary_line "WORKER_LIMIT_MEMORY=${WORKER_LIMIT_MEMORY}"
  append_summary_line "SCHEDULE_REPLICAS=${SCHEDULE_REPLICAS}"
  append_summary_line "SCHEDULE_LIMIT_CPU=${SCHEDULE_LIMIT_CPU}"
  append_summary_line "SCHEDULE_LIMIT_MEMORY=${SCHEDULE_LIMIT_MEMORY}"
  append_summary_line "ALERT_REPLICAS=${ALERT_REPLICAS}"
  append_summary_line "ALERT_LIMIT_CPU=${ALERT_LIMIT_CPU}"
  append_summary_line "ALERT_LIMIT_MEMORY=${ALERT_LIMIT_MEMORY}"
  append_summary_line "FRONTEND_REPLICAS=${FRONTEND_REPLICAS}"
  append_summary_line "FRONTEND_LIMIT_CPU=${FRONTEND_LIMIT_CPU}"
  append_summary_line "FRONTEND_LIMIT_MEMORY=${FRONTEND_LIMIT_MEMORY}"
  append_summary_line "FRONTEND_PUBLISHED_HTTP_PORT=${FRONTEND_PUBLISHED_HTTP_PORT}"

  if [[ "${MAIL_PROVIDER}" == "aws_ses" ]]; then
    append_summary_line "AWS_REGION=${AWS_REGION}"
  fi

  if [[ -n "${INFRA_NETWORK_NAME}" ]]; then
    append_summary_line "INFRA_NETWORK_NAME=${INFRA_NETWORK_NAME}"
  fi
}

apply_swarm_resources() {
  prepare_existing_setup_resources

  create_swarm_config "${BACKEND_PUBLIC_ENV_CONFIG_NAME}" "${BACKEND_ENV_CONTENT}"
  create_swarm_config "${EXPORT_SCRIPT_CONFIG_NAME}" "${EXPORT_SCRIPT_CONTENT}"

  if [[ "${DRY_RUN}" == true ]]; then
    create_swarm_secret "${DB_PASSWORD_SECRET_NAME:-redash-${SETUP_ID}-db-password}" "${DB_PASSWORD}"
    create_swarm_secret "${JWT_ACCESS_SECRET_SECRET_NAME}" "${JWT_ACCESS_SECRET}"
    create_swarm_secret "${REDASH_SECRET_KEY_SECRET_NAME}" "${REDASH_SECRET_KEY}"

    if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
      create_swarm_secret "${SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME}" "${SWAGGER_BASIC_AUTH_PASSWORD}"
    fi

    if [[ "${MAIL_PROVIDER}" == "aws_ses" ]]; then
      create_swarm_secret "${EMAIL_AWS_USER_SECRET_NAME}" "${EMAIL_AWS_USER}"
      create_swarm_secret "${EMAIL_AWS_PASSWORD_SECRET_NAME}" "${EMAIL_AWS_PASSWORD}"
    else
      create_swarm_secret "${MAIL_GMAIL_USER_SECRET_NAME}" "${MAIL_GMAIL_USER}"
      create_swarm_secret "${MAIL_GMAIL_APP_PASSWORD_SECRET_NAME}" "${MAIL_GMAIL_APP_PASSWORD}"
    fi
  else
    create_swarm_secret "${DB_PASSWORD_SECRET_NAME:-redash-${SETUP_ID}-db-password}" "${DB_PASSWORD}"
    create_swarm_secret "${JWT_ACCESS_SECRET_SECRET_NAME}" "${JWT_ACCESS_SECRET}"
    create_swarm_secret "${REDASH_SECRET_KEY_SECRET_NAME}" "${REDASH_SECRET_KEY}"

    if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
      create_swarm_secret "${SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME}" "${SWAGGER_BASIC_AUTH_PASSWORD}"
    fi

    if [[ "${MAIL_PROVIDER}" == "aws_ses" ]]; then
      create_swarm_secret "${EMAIL_AWS_USER_SECRET_NAME}" "${EMAIL_AWS_USER}"
      create_swarm_secret "${EMAIL_AWS_PASSWORD_SECRET_NAME}" "${EMAIL_AWS_PASSWORD}"
    else
      create_swarm_secret "${MAIL_GMAIL_USER_SECRET_NAME}" "${MAIL_GMAIL_USER}"
      create_swarm_secret "${MAIL_GMAIL_APP_PASSWORD_SECRET_NAME}" "${MAIL_GMAIL_APP_PASSWORD}"
    fi
  fi

  if [[ "${NEEDS_INFRA_NETWORK}" == true ]]; then
    ensure_overlay_network "${INFRA_NETWORK_NAME}"
  fi

  if [[ "${DB_MODE}" == "docker" ]]; then
    ensure_named_volume "${DB_VOLUME_NAME}"
    run_cmd \
      docker service create \
      --name "${DB_SERVICE_NAME}" \
      --network "${INFRA_NETWORK_NAME}" \
      --mount "type=volume,source=${DB_VOLUME_NAME},target=/var/lib/postgresql/data" \
      --secret "source=${DB_PASSWORD_SECRET_NAME},target=postgres_password" \
      --env "POSTGRES_DB=${DB_DATABASE}" \
      --env "POSTGRES_USER=${DB_USERNAME}" \
      --env "POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password" \
      postgres:17.3-alpine
  fi

  if [[ "${REDIS_MODE}" == "docker" ]]; then
    ensure_named_volume "${REDIS_VOLUME_NAME}"
    run_cmd \
      docker service create \
      --name "${REDIS_SERVICE_NAME}" \
      --network "${INFRA_NETWORK_NAME}" \
      --mount "type=volume,source=${REDIS_VOLUME_NAME},target=/data" \
      redis:7.4-alpine \
      redis-server \
      --appendonly yes
  fi
}

pull_deployment_images() {
  run_quiet_cmd "Pulling image backend-api" "Pulled image backend-api" \
    docker pull "docker.io/${DEPLOY_IMAGE_REPOSITORY}:backend-api"
  run_quiet_cmd "Pulling image backend-worker" "Pulled image backend-worker" \
    docker pull "docker.io/${DEPLOY_IMAGE_REPOSITORY}:backend-worker"
  run_quiet_cmd "Pulling image backend-schedule" "Pulled image backend-schedule" \
    docker pull "docker.io/${DEPLOY_IMAGE_REPOSITORY}:backend-schedule"
  run_quiet_cmd "Pulling image backend-alert" "Pulled image backend-alert" \
    docker pull "docker.io/${DEPLOY_IMAGE_REPOSITORY}:backend-alert"
  run_quiet_cmd "Pulling image frontend" "Pulled image frontend" \
    docker pull "docker.io/${DEPLOY_IMAGE_REPOSITORY}:frontend"
}

create_backend_app_service() {
  local service_name="$1"
  local image_tag="$2"
  local app_name="$3"
  local port="$4"
  local replicas="$5"
  local limit_cpu="$6"
  local limit_memory="$7"
  local published_port="${8:-}"
  local args=(
    docker service create
    --name "${service_name}"
    --network "${INFRA_NETWORK_NAME}"
    --replicas "${replicas}"
    --limit-cpu "${limit_cpu}"
    --limit-memory "${limit_memory}"
    --env "APP_NAME=${app_name}"
    --env "PORT=${port}"
    --config "source=${BACKEND_PUBLIC_ENV_CONFIG_NAME},target=/run/configs/${BACKEND_PUBLIC_ENV_CONFIG_NAME}"
    --config "source=${EXPORT_SCRIPT_CONFIG_NAME},target=/usr/local/bin/export-secrets.sh,mode=0555"
    --secret "source=${DB_PASSWORD_SECRET_NAME},target=${DB_PASSWORD_SECRET_NAME}"
    --secret "source=${JWT_ACCESS_SECRET_SECRET_NAME},target=${JWT_ACCESS_SECRET_SECRET_NAME}"
    --secret "source=${REDASH_SECRET_KEY_SECRET_NAME},target=${REDASH_SECRET_KEY_SECRET_NAME}"
  )

  # API Swagger를 외부에서 열 때만 backend-api 서비스의 4000 포트를 publish합니다.
  if [[ -n "${published_port}" ]]; then
    args+=( --publish "published=${published_port},target=${port}" )
  fi

  if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
    args+=( --secret "source=${SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME},target=${SWAGGER_BASIC_AUTH_PASSWORD_SECRET_NAME}" )
  fi

  if [[ "${MAIL_PROVIDER}" == "aws_ses" ]]; then
    args+=( --secret "source=${EMAIL_AWS_USER_SECRET_NAME},target=${EMAIL_AWS_USER_SECRET_NAME}" )
    args+=( --secret "source=${EMAIL_AWS_PASSWORD_SECRET_NAME},target=${EMAIL_AWS_PASSWORD_SECRET_NAME}" )
  else
    args+=( --secret "source=${MAIL_GMAIL_USER_SECRET_NAME},target=${MAIL_GMAIL_USER_SECRET_NAME}" )
    args+=( --secret "source=${MAIL_GMAIL_APP_PASSWORD_SECRET_NAME},target=${MAIL_GMAIL_APP_PASSWORD_SECRET_NAME}" )
  fi

  args+=(
    "docker.io/${DEPLOY_IMAGE_REPOSITORY}:${image_tag}"
    sh
    /usr/local/bin/export-secrets.sh
    pm2-runtime
    start
    ecosystem.config.js
  )

  run_quiet_cmd "Creating service ${service_name}" "Created service ${service_name}" "${args[@]}"
}

create_frontend_service() {
  local args=(
    docker service create
    --name "${FRONTEND_SERVICE_NAME}"
    --network "${INFRA_NETWORK_NAME}"
    --replicas "${FRONTEND_REPLICAS}"
    --limit-cpu "${FRONTEND_LIMIT_CPU}"
    --limit-memory "${FRONTEND_LIMIT_MEMORY}"
    --publish "published=${FRONTEND_PUBLISHED_HTTP_PORT},target=3000"
    --env "PORT=3000"
    --env "HOSTNAME=0.0.0.0"
    --env "API_BASE_URL=http://${API_SERVICE_NAME}:4000"
    --env "NEXT_PUBLIC_API_BASE_URL=${REDASH_BASE_URL%/}/api"
    "docker.io/${DEPLOY_IMAGE_REPOSITORY}:frontend"
  )

  run_quiet_cmd "Creating service ${FRONTEND_SERVICE_NAME}" "Created service ${FRONTEND_SERVICE_NAME}" "${args[@]}"
}

deploy_application_services() {
  local api_published_port=""

  pull_deployment_images

  if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
    api_published_port="4000"
  fi

  create_backend_app_service "${API_SERVICE_NAME}" "backend-api" "api" "4000" "${API_REPLICAS}" "${API_LIMIT_CPU}" "${API_LIMIT_MEMORY}" "${api_published_port}"
  create_backend_app_service "${WORKER_SERVICE_NAME}" "backend-worker" "worker" "4003" "${WORKER_REPLICAS}" "${WORKER_LIMIT_CPU}" "${WORKER_LIMIT_MEMORY}"
  create_backend_app_service "${SCHEDULE_SERVICE_NAME}" "backend-schedule" "schedule" "4002" "${SCHEDULE_REPLICAS}" "${SCHEDULE_LIMIT_CPU}" "${SCHEDULE_LIMIT_MEMORY}"
  create_backend_app_service "${ALERT_SERVICE_NAME}" "backend-alert" "alert" "4001" "${ALERT_REPLICAS}" "${ALERT_LIMIT_CPU}" "${ALERT_LIMIT_MEMORY}"
  create_frontend_service
}

write_output_files() {
  local output_dir="${OUTPUT_ROOT}/${SETUP_ID}"

  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi

  mkdir -p "${output_dir}"
  printf '%s' "${BACKEND_ENV_CONTENT}" > "${output_dir}/backend-public.env"
  printf '%s' "${CONFIG_MAP_CONTENT}" > "${output_dir}/swarm-configs.env"
  printf '%s' "${SECRET_MAP_CONTENT}" > "${output_dir}/swarm-secrets.env"
  printf '%s' "${EXPORT_SCRIPT_CONTENT}" > "${output_dir}/export-secrets.sh"
  printf '%s' "${SUMMARY_CONTENT}" > "${output_dir}/summary.env"
  chmod 700 "${output_dir}/export-secrets.sh"
}

show_results() {
  section "$(t section_swarm_bootstrap)"
  printf '%s: %s\n' "$(t result_mode)" "${SWARM_BOOTSTRAP_MODE}"
  printf '%s: %s\n' "$(t result_manager_addr)" "${SWARM_ADVERTISE_ADDR}"
  printf '%s: %s\n' "$(t result_join_token_cmd)" "${SWARM_JOIN_TOKEN_COMMAND}"
  printf '%s:\n%s\n' "$(t result_join_instructions)" "${WORKER_JOIN_INSTRUCTIONS}"

  section "$(t section_setup_summary)"
  printf '%s\n' "${SUMMARY_CONTENT}"

  if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
    printf '%s: %s\n' "$(t result_swagger_url)" "${SWAGGER_DOCS_URL}"
  fi

  section "$(t section_backend_public_env)"
  printf '%s\n' "${BACKEND_ENV_CONTENT}"

  section "$(t section_swarm_configs)"
  printf '%s\n' "${CONFIG_MAP_CONTENT}"

  section "$(t section_swarm_secrets)"
  printf '%s\n' "${SECRET_MAP_CONTENT}"

  section "$(t section_export_script)"
  printf '%s\n' "${EXPORT_SCRIPT_CONTENT}"

  if [[ "${DRY_RUN}" == true ]]; then
    section "$(t section_generated_secret_values)"
    printf 'DB_PASSWORD=%s\n' "${DB_PASSWORD}"
    printf 'JWT_ACCESS_SECRET=%s\n' "${JWT_ACCESS_SECRET}"
    printf 'REDASH_SECRET_KEY=%s\n' "${REDASH_SECRET_KEY}"

    if [[ "${SWAGGER_ENABLED}" == "true" ]]; then
      printf 'SWAGGER_BASIC_AUTH_PASSWORD=%s\n' "${SWAGGER_BASIC_AUTH_PASSWORD}"
    fi

    if [[ "${MAIL_PROVIDER}" == "aws_ses" ]]; then
      printf 'EMAIL_AWS_USER=%s\n' "${EMAIL_AWS_USER}"
      printf 'EMAIL_AWS_PASSWORD=%s\n' "${EMAIL_AWS_PASSWORD}"
    else
      printf 'MAIL_GMAIL_USER=%s\n' "${MAIL_GMAIL_USER}"
      printf 'MAIL_GMAIL_APP_PASSWORD=%s\n' "${MAIL_GMAIL_APP_PASSWORD}"
    fi
  fi

  if [[ -n "${PLANNED_COMMANDS}" ]]; then
    section "$(t section_planned_commands)"
    printf '%s\n' "${PLANNED_COMMANDS}"
  fi

  if [[ "${DRY_RUN}" == true ]]; then
    section "$(t section_dry_run_result)"
    info "$(t result_dry_run_done)"
  else
    section "$(t section_generated_files)"
    info "${OUTPUT_ROOT}/${SETUP_ID}/backend-public.env"
    info "${OUTPUT_ROOT}/${SETUP_ID}/swarm-configs.env"
    info "${OUTPUT_ROOT}/${SETUP_ID}/swarm-secrets.env"
    info "${OUTPUT_ROOT}/${SETUP_ID}/export-secrets.sh"
    info "${OUTPUT_ROOT}/${SETUP_ID}/summary.env"
  fi

  section "$(t section_notes)"
  info "$(t note_1)"
  info "$(t note_2)"
  printf -- "$(t note_3)\n" "${BACKEND_PUBLIC_ENV_CONFIG_NAME}" "${EXPORT_SCRIPT_CONFIG_NAME}"

  if [[ "${NEEDS_INFRA_NETWORK}" == true ]]; then
    printf -- "$(t note_4)\n" "${INFRA_NETWORK_NAME}"
  fi

  if [[ "${DB_MODE}" == "docker" ]]; then
    printf -- "$(t note_5)\n" "${DB_DATABASE}" "${DB_SCHEMA}" "${DB_USERNAME}"
  fi
}

parse_args() {
  while (($#)); do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
    shift
  done
}

main() {
  parse_args "$@"

  if [[ ! -t 0 && "${DRY_RUN}" != true ]]; then
    die "Interactive setup requires a TTY. Use --dry-run with piped input if needed."
  fi

  choose_language
  show_intro_screen
  collect_setup_id
  collect_swarm_bootstrap
  collect_database_config
  collect_redis_config
  collect_swagger_config
  collect_base_url
  collect_application_secrets
  collect_mail_config
  collect_deploy_config
  prepare_output_model
  apply_swarm_resources
  apply_database_bootstrap
  deploy_application_services
  write_output_files
  show_results
}

main "$@"
