#!/usr/bin/env bash
set -u

input="$(cat)"
f="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')"
[ -z "$f" ] && exit 0

dir="$(dirname "$f")"
repo="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)"
[ -z "$repo" ] && exit 0

cd "$repo" || exit 0

git add -A
git diff --cached --quiet && exit 0

git commit -m "auto: sync edits" --quiet || exit 1
git -c credential.helper= -c credential.helper='!gh auth git-credential' push --quiet
