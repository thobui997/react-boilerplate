#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Enforces the git rules from CLAUDE.md:
#   - no commit/push on main or develop, and no push whose refspec targets them (deny)
#   - `shadcn init` is never run (deny)
#   - `git tag` and `gh pr merge` need the user's OK (ask); local `git merge` is allowed on any branch
# It matches the command text, so it is a guardrail against slips, not a sandbox.
set -u

input=$(cat)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')
[ -z "$command" ] && exit 0

branch=$(git -C "${cwd:-.}" branch --show-current 2>/dev/null || true)
protected='^(main|develop)$'
on_protected=0
[[ "$branch" =~ $protected ]] && on_protected=1

respond() { # $1 = deny|ask, $2 = reason
  jq -n --arg d "$1" --arg r "$2" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r}}'
  exit 0
}

git_sub() { # does the command run `git ... <subcommand>`?
  printf '%s' "$command" | grep -Eq "(^|[;&|(]|[[:space:]])git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+$1([[:space:]]|$)"
}

if printf '%s' "$command" | grep -Eq '(^|[[:space:];&|])shadcn(@[^[:space:]]+)?[[:space:]]+init([[:space:]]|$)'; then
  respond deny "Never run 'shadcn init' here (CLAUDE.md). Add components with 'npx shadcn@latest add <name>'."
fi

if git_sub commit || git_sub push; then
  if [ "$on_protected" -eq 1 ]; then
    respond deny "Branch '$branch' is protected (CLAUDE.md): create '<type>/<slug>' and commit there instead."
  fi
fi

if git_sub push && printf '%s' "$command" | grep -Eq '[[:space:]:](main|develop)([[:space:]]|$)'; then
  respond deny "Pushing to main/develop is not allowed (CLAUDE.md): push the '<type>/<slug>' branch instead."
fi

if git_sub tag && ! printf '%s' "$command" | grep -Eq 'git([[:space:]]+-[^[:space:]]+)*[[:space:]]+tag([[:space:]]+(-l|--list)([[:space:]]|$)|[[:space:]]*($|[;&|]))'; then
  respond ask "Tagging needs the user's approval (CLAUDE.md)."
fi

if printf '%s' "$command" | grep -Eq '(^|[[:space:];&|])gh[[:space:]]+pr[[:space:]]+merge([[:space:]]|$)'; then
  respond ask "Merging a PR needs the user's approval (CLAUDE.md)."
fi

exit 0
