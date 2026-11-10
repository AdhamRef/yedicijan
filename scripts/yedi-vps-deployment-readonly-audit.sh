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
echo "WARNING: this only identifies the cwd checkout. Verify process cwd/release symlink separately with an authorized operator."
echo "No deployment, restart, payment, rollback or database command was executed."
