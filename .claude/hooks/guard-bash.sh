#!/usr/bin/env bash
# PreToolUse hook for Bash: enforces the hard rules in CLAUDE.md.
#   1. No git commands of any kind (git, /usr/bin/git, `cd x && git …`, `bash -c "git …"`).
#   2. No access to .env files (cat/grep/sed/source/cp/… of .env.local, .env, .env.* or globs).
# Reads the hook JSON on stdin; prints a "deny" decision when a rule matches.

cmd="$(jq -r '.tool_input.command // empty')"

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse",
    permissionDecision: "deny", permissionDecisionReason: $r}}'
  exit 0
}

# "git" as a command word: start of line or after ; & | ( ` $( " ' whitespace or a path.
if grep -qE '(^|[;&|(`"'"'"'[:space:]/])git([[:space:];&|)`"'"'"']|$)' <<<"$cmd"; then
  deny "Blocked by project rule (CLAUDE.md): Claude must never run git commands. Ask the user to run it."
fi

# ".env" as a path/file name (not import.meta.env / process.env): preceded by a non-word char.
if grep -qE '(^|[^[:alnum:]_])\.env([^[:alnum:]_]|$)' <<<"$cmd"; then
  deny "Blocked by project rule (CLAUDE.md): Claude must never read or touch .env files. Ask the user for what you need."
fi

exit 0
