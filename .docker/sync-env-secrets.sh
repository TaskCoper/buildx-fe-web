#!/usr/bin/env bash
# Upload application secrets and deployment settings from .docker/.env.<profile>.
# Requires gh auth with repository admin access. This script changes GitHub settings.
# Example: .docker/sync-env-secrets.sh
set -euo pipefail

ENVIRONMENTS="${ENVIRONMENTS:-dev}"
DIR="$(cd "$(dirname "$0")" && pwd)"

command -v gh >/dev/null || {
  echo "Install gh CLI and run 'gh auth login'." >&2
  exit 1
}
gh auth status >/dev/null 2>&1 || {
  echo "Run 'gh auth login' first." >&2
  exit 1
}
REPO="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

# Check all requested files before making any remote changes.
for ENVIRONMENT in $ENVIRONMENTS; do
  case "$ENVIRONMENT" in
    dev|prod) ;;
    *) echo "Unsupported environment: $ENVIRONMENT (use dev or prod)." >&2; exit 1 ;;
  esac
  FILE="${ENV_FILE:-$DIR/.env.$ENVIRONMENT}"
  [ -f "$FILE" ] || { echo "Missing environment file: $FILE" >&2; exit 1; }
done

for ENVIRONMENT in $ENVIRONMENTS; do
  FILE="${ENV_FILE:-$DIR/.env.$ENVIRONMENT}"
  case "$ENVIRONMENT" in
    dev) BRANCH=develop ;;
    prod) BRANCH=main ;;
  esac

  echo ">> Configuring '$ENVIRONMENT' in $REPO (branch $BRANCH)..."
  gh api -X PUT "repos/$REPO/environments/$ENVIRONMENT" --input - >/dev/null <<JSON
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON

  existing="$(gh api "repos/$REPO/environments/$ENVIRONMENT/deployment-branch-policies" \
    --jq '.branch_policies[].name')"
  if ! printf '%s\n' "$existing" | grep -Fxq "$BRANCH"; then
    gh api -X POST "repos/$REPO/environments/$ENVIRONMENT/deployment-branch-policies" \
      -f name="$BRANCH" >/dev/null
  fi

  # Allow only this application's env names. Never execute/source the env file.
  gh secret set --repo "$REPO" --env "$ENVIRONMENT" --env-file <(
    awk '/^(BMT_API_ORIGIN|NEXT_PUBLIC_API_BASE_URL|NEXT_PUBLIC_API_TIMEOUT|NEXT_PUBLIC_APP_NAME|NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_USE_MOCK_AUTH|NEXT_PUBLIC_USE_MOCK_API|NEXT_PUBLIC_VIETMAP_API_KEY|VIETMAP_API_KEY)=/' "$FILE"
  )

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      NETWORK=*)
        value="${line#*=}"
        value="${value%$'\r'}"
        value="${value#\"}"; value="${value%\"}"
        value="${value#\'}"; value="${value%\'}"
        if [ -n "$value" ]; then
          gh variable set DOCKER_NETWORK --repo "$REPO" --env "$ENVIRONMENT" --body "$value"
        fi
        ;;
    esac
  done < "$FILE"

  echo ">> Finished '$ENVIRONMENT'."
done
