#!/usr/bin/env bash
#
# Deploy script for CPJ Cobrança.
# Uses docker compose for everything (postgres + api + web).
# Handles first-time setup (nginx) and subsequent deploys automatically.

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/cpj-cobranca}"
BRANCH="${BRANCH:-main}"
COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
API_HEALTHCHECK_URL="${API_HEALTHCHECK_URL:-http://127.0.0.1:3020/docs}"
WEB_HEALTHCHECK_URL="${WEB_HEALTHCHECK_URL:-http://127.0.0.1:3021}"
HEALTHCHECK_ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-20}"
HEALTHCHECK_SLEEP_SECONDS="${HEALTHCHECK_SLEEP_SECONDS:-5}"

log() {
  printf '[deploy] %s\n' "$1"
}

healthcheck() {
  local name="$1"
  local url="$2"
  local attempt=1

  log "waiting for ${name} healthcheck (${url})"
  until curl --fail --silent --show-error "${url}" >/dev/null; do
    if [ "${attempt}" -ge "${HEALTHCHECK_ATTEMPTS}" ]; then
      log "${name} healthcheck failed after ${HEALTHCHECK_ATTEMPTS} attempts"
      ${COMPOSE_CMD} logs --tail=50 "${name}" || true
      exit 1
    fi

    log "${name} healthcheck attempt ${attempt}/${HEALTHCHECK_ATTEMPTS} failed, retrying in ${HEALTHCHECK_SLEEP_SECONDS}s"
    attempt=$((attempt + 1))
    sleep "${HEALTHCHECK_SLEEP_SECONDS}"
  done

  log "${name} is healthy"
}

log "starting deploy"
log "path: ${DEPLOY_PATH}"
log "branch: ${BRANCH}"

cd "${DEPLOY_PATH}"

# ---------- pull ----------
log "fetching latest code"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

# ---------- nginx (install if missing) ----------
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

for conf in preambulo.cledson.com.br.conf api.preambulo.cledson.com.br.conf; do
  if [ ! -f "${NGINX_AVAILABLE}/${conf}" ]; then
    log "installing nginx config: ${conf}"
    cp "${DEPLOY_PATH}/deploy/nginx/${conf}" "${NGINX_AVAILABLE}/${conf}"
    ln -sf "${NGINX_AVAILABLE}/${conf}" "${NGINX_ENABLED}/${conf}"
  else
    log "nginx config already exists: ${conf} (skipping)"
  fi
done

if nginx -t 2>/dev/null; then
  log "reloading nginx"
  systemctl reload nginx
else
  log "nginx config test failed, skipping reload"
fi

# ---------- docker compose ----------
log "building and starting containers"
${COMPOSE_CMD} up -d --build --remove-orphans

log "waiting for postgres to be healthy"
${COMPOSE_CMD} exec -T postgres pg_isready -U postgres -d cpj_cobranca || sleep 5

# ---------- healthcheck ----------
healthcheck "api" "${API_HEALTHCHECK_URL}"
healthcheck "web" "${WEB_HEALTHCHECK_URL}"

log "deploy finished successfully"
