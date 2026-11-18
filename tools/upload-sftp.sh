#!/usr/bin/env bash
# Build the app and upload dist/ to the server over SFTP from THIS computer.
#
#   npm run upload                    build + upload
#   npm run upload -- --skip-build    upload the existing dist/
#
# Settings come from .env.local (git-ignored), with the same names as the GitHub secrets:
#   SFTP_HOST=myserver.com          (also accepts host:port, user@host, sftp://host:port)
#   SFTP_USER=myuser
#   SFTP_PASSWORD='my password'     (quote it if it has spaces or " #")
#   SFTP_REMOTE_DIR=/www
#   SFTP_PORT=22                    (optional)
# Variables already set in the environment win over the file.
# NEVER prefix these with VITE_: Vite would embed them in the public bundle.
#
# The file is parsed as plain KEY=value text (no shell evaluation), so passwords with
# $, !, spaces or quotes are safe. The password is handed to ssh through a temporary
# SSH_ASKPASS helper that reads it from the environment; it is never written to disk
# or put on a command line. Uses OpenSSH `sftp` (preinstalled on Fedora/macOS).
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${UPLOAD_ENV_FILE:-.env.local}"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    *) echo "Unknown option: $arg (only --skip-build is supported)" >&2; exit 2 ;;
  esac
done

command -v sftp > /dev/null || { echo "sftp not found. Install it: sudo dnf install openssh-clients" >&2; exit 1; }

# --- read SFTP_* settings -----------------------------------------------------------
if [ -f "$ENV_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?(SFTP_[A-Z_]+)[[:space:]]*=(.*)$ ]] || continue
    key="${BASH_REMATCH[2]}"
    val="${BASH_REMATCH[3]}"
    case "$key" in SFTP_HOST|SFTP_USER|SFTP_PASSWORD|SFTP_REMOTE_DIR|SFTP_PORT) ;; *) continue ;; esac
    val="${val#"${val%%[![:space:]]*}"}"                     # trim leading spaces
    if [[ "$val" =~ ^\"(.*)\"[[:space:]]*(#.*)?$ ]] || [[ "$val" =~ ^\'(.*)\'[[:space:]]*(#.*)?$ ]]; then
      val="${BASH_REMATCH[1]}"                               # quoted: take as-is
    else
      val="$(sed -E 's/[[:space:]]+#.*$//; s/[[:space:]]+$//' <<< "$val")"  # unquoted: drop " # comment"
    fi
    [ -n "${!key:-}" ] || printf -v "$key" '%s' "$val"
  done < "$ENV_FILE"
fi

missing=()
for v in SFTP_HOST SFTP_USER SFTP_PASSWORD SFTP_REMOTE_DIR; do
  [ -n "${!v:-}" ] || missing+=("$v")
done
if (( ${#missing[@]} )); then
  {
    echo "Missing in $ENV_FILE: ${missing[*]}"
    echo "Add these lines (same values as the GitHub secrets):"
    echo "  SFTP_HOST=myserver.com"
    echo "  SFTP_USER=myuser"
    echo "  SFTP_PASSWORD='my password'"
    echo "  SFTP_REMOTE_DIR=/www"
  } >&2
  exit 1
fi

# Accept "host", "host:port", "user@host", "sftp://host:port/anything" (same as CI).
host="${SFTP_HOST#*://}"; host="${host%%/*}"; host="${host##*@}"
if [[ "$host" == *:* ]]; then port="${host##*:}"; host="${host%:*}"; else port="${SFTP_PORT:-22}"; fi

# --- build --------------------------------------------------------------------------
if [ "$SKIP_BUILD" = 0 ]; then
  npm run build
fi
[ -f dist/index.html ] || { echo "dist/ has no build. Run without --skip-build." >&2; exit 1; }

# --- upload -------------------------------------------------------------------------
askpass="$(mktemp)"
trap 'rm -f "$askpass"' EXIT
# Answers only password prompts; anything else (e.g. host key questions) gets "no".
cat > "$askpass" <<'HELPER'
#!/bin/sh
case "$1" in *assword*) printf '%s\n' "$SFTP_PASSWORD" ;; *) exit 1 ;; esac
HELPER
chmod 700 "$askpass"

echo
echo "Uploading dist/ -> $SFTP_USER@$host:$SFTP_REMOTE_DIR (port $port)"

# -b - : read commands from stdin and stop at the first failing one ("-" prefix = ignore error).
# BatchMode=no keeps password auth that -b would otherwise disable.
# accept-new: trust the server key on first connect (saved in ~/.ssh/known_hosts),
#             refuse if it changes later.
# SFTP_SSH_OPTS (environment only): extra ssh options; they come first, so they win.
# shellcheck disable=SC2086
SSH_ASKPASS="$askpass" SSH_ASKPASS_REQUIRE=force SFTP_PASSWORD="$SFTP_PASSWORD" \
  sftp ${SFTP_SSH_OPTS:-} -o BatchMode=no -o StrictHostKeyChecking=accept-new \
       -o NumberOfPasswordPrompts=1 -P "$port" -b - "$SFTP_USER@$host" <<EOF
-mkdir "$SFTP_REMOTE_DIR"
put -r dist/* "$SFTP_REMOTE_DIR/"
EOF

echo
echo "Done: uploaded to $SFTP_REMOTE_DIR"
