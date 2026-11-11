#!/usr/bin/env bash
# READ-ONLY: Run manually on the actual YediCihan VPS as the deployment operator.
# Never upload .env, tokens, donor data or PM2 JSON environment reports.
set -euo pipefail

echo "YediCihan deployed-revision identity check (no modifications)"
echo "UTC now: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Host: $(hostname)"
echo "Working directory: $(pwd)"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "BLOCKED: current directory is not a Git checkout"
  exit 2
fi

remote="$(git remote get-url origin 2>/dev/null || true)"
case "$remote" in
  *github.com[:/]AdhamRef/yedicijan|*github.com[:/]AdhamRef/yedicijan.git)
    echo "Repository identity: AdhamRef/yedicijan"
    ;;
  *)
    echo "BLOCKED: Git origin does not match AdhamRef/yedicijan"
    exit 3
    ;;
esac

echo "HEAD: $(git rev-parse HEAD)"
echo "Branch: $(git branch --show-current || true)"
echo "Working tree dirty count: $(git status --porcelain | wc -l | tr -d ' ')"
echo "Node: $(node --version 2>/dev/null || echo unavailable)"
if command -v pm2 >/dev/null 2>&1; then
  echo "PM2 table (no environment variables):"
  pm2 ls
else
  echo "PM2 not available to this user"
fi
if command -v pm2 >/dev/null 2>&1 && [ -n "${YEDI_PM2_NAME:-}" ]; then
  echo "Checking selected PM2 process (no environment dump): ${YEDI_PM2_NAME}"
  pid="$(pm2 pid "$YEDI_PM2_NAME" 2>/dev/null | tr -d '\r\n ' || true)"
  case "$pid" in
    ''|0|*[!0-9]*)
      echo "BLOCKED: specify a single running PM2 process with YEDI_PM2_NAME"
      exit 4
      ;;
  esac
  cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  if [ -z "$cwd" ] || [ ! -d "$cwd" ]; then
    echo "BLOCKED: cannot inspect the selected running process cwd"
    exit 5
  fi
  process_remote="$(git -C "$cwd" remote get-url origin 2>/dev/null || true)"
  case "$process_remote" in
    *github.com[:/]AdhamRef/yedicijan|*github.com[:/]AdhamRef/yedicijan.git) ;;
    *) echo "BLOCKED: PM2 process cwd does not identify YediCihan repository"; exit 6 ;;
  esac
  echo "PM2 PID: $pid"
  echo "PM2 running-process cwd: $cwd"
  echo "PM2 process cwd git SHA: $(git -C "$cwd" rev-parse HEAD)"
  echo "IMPORTANT: a git SHA in process cwd is not an immutable artifact checksum."
  echo "Verify the process's deployed build artifact and release manifest separately."
else
  echo "PM2 process identity not verified; operator may set YEDI_PM2_NAME after confirming exact service."
fi
echo "No deployment, restart, payment, rollback or database command was executed."
