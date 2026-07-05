#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${INTERVIEW_PRO_REPO_URL:-https://github.com/kleberAbreu/personal-interviewer-pro.git}"
BRANCH="${INTERVIEW_PRO_BRANCH:-main}"
INSTALL_DIR="${INTERVIEW_PRO_HOME:-$HOME/.local/share/personal-interviewer-pro}"
BIN_DIR="${INTERVIEW_PRO_BIN_DIR:-$HOME/.local/bin}"
BIN_PATH="$BIN_DIR/interview-pro"

log() {
  printf '==> %s\n' "$*"
}

fail() {
  printf 'interview-pro install: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_node_20() {
  require_command node

  local major
  major="$(node -p "Number(process.versions.node.split('.')[0])")"

  if [ "$major" -lt 20 ]; then
    fail "Node.js 20+ is required. Current version: $(node --version)"
  fi
}

install_or_update_repo() {
  mkdir -p "$INSTALL_DIR"

  if [ -d "$INSTALL_DIR/.git" ]; then
    local origin_url
    origin_url="$(git -C "$INSTALL_DIR" remote get-url origin 2>/dev/null || true)"

    if [ "$origin_url" != "$REPO_URL" ]; then
      fail "$INSTALL_DIR already contains a different Git repository: $origin_url"
    fi

    log "Updating Personal Interviewer Pro in $INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch --depth=1 origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
    git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
    git -C "$INSTALL_DIR" clean -fdx
  else
    if [ "$(find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 2>/dev/null | head -n 1)" ]; then
      fail "$INSTALL_DIR exists and is not empty. Set INTERVIEW_PRO_HOME to use another install directory."
    fi

    log "Cloning Personal Interviewer Pro into $INSTALL_DIR"
    git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi
}

build_app() {
  log "Installing dependencies"
  npm --prefix "$INSTALL_DIR" ci

  log "Building app"
  npm --prefix "$INSTALL_DIR" run build
}

install_command() {
  mkdir -p "$BIN_DIR"

  cat >"$BIN_PATH" <<EOF
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$INSTALL_DIR"
exec node "\$APP_DIR/bin/interview-pro.mjs" "\$@"
EOF

  chmod +x "$BIN_PATH"
}

path_contains_bin_dir() {
  case ":$PATH:" in
    *":$BIN_DIR:"*) return 0 ;;
    *) return 1 ;;
  esac
}

suggest_path_update() {
  if path_contains_bin_dir; then
    return
  fi

  cat <<EOF

Note: $BIN_DIR is not currently in PATH.
For this terminal, run:

  export PATH="$BIN_DIR:\$PATH"

To make it permanent, add that line to your shell profile.
EOF
}

main() {
  require_command git
  require_command npm
  require_node_20

  install_or_update_repo
  build_app
  install_command

  log "Installed Personal Interviewer Pro"
  printf '\nRun:\n\n  interview-pro\n'
  suggest_path_update
}

main "$@"
