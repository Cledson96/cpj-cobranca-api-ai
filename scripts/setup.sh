#!/usr/bin/env bash
#
# Manual fallback setup — normally NOT needed.
# The GitHub Actions workflow handles everything automatically.
# Use this script only if you need to set up the VPS without GitHub Actions.
#
# Usage (as root):
#   REPO_URL=git@github.com:Cledson96/cpj-cobranca-api-ai.git bash setup.sh

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/cpj-cobranca}"
REPO_URL="${REPO_URL:-git@github.com:Cledson96/cpj-cobranca-api-ai.git}"
BRANCH="${BRANCH:-main}"

log() {
  printf '[setup] %s\n' "$1"
}

# ---------- clone ----------
if [ -d "${DEPLOY_PATH}/.git" ]; then
  log "repository already exists at ${DEPLOY_PATH}, pulling latest"
  cd "${DEPLOY_PATH}"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
else
  log "cloning repository to ${DEPLOY_PATH}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${DEPLOY_PATH}"
  cd "${DEPLOY_PATH}"
fi

# ---------- env ----------
if [ ! -f "${DEPLOY_PATH}/.env" ]; then
  log "creating .env — edit it with your secrets!"
  cat > "${DEPLOY_PATH}/.env" << 'EOF'
POSTGRES_PASSWORD=CHANGE_ME
OPENROUTER_API_KEY=CHANGE_ME
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
EOF
  log ""
  log "IMPORTANT: Edit ${DEPLOY_PATH}/.env then re-run this script"
  exit 1
fi

# ---------- run deploy (handles everything) ----------
log "running deploy script"
DEPLOY_PATH="${DEPLOY_PATH}" bash "${DEPLOY_PATH}/scripts/deploy.sh"

log "setup complete!"
