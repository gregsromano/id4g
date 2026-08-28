---
description: Sync this computer with the latest pushed work before starting a session
---

Run these steps in order and report the outcome plainly — this is meant to catch the
"which computer has the latest code" problem before it causes a merge headache.

1. `git status --short` — check for leftover uncommitted work from a previous session
   on THIS computer.
   - If there are uncommitted changes, STOP here. Do not pull, stash, or discard
     anything automatically. Show the user what's uncommitted and ask whether to
     commit it (suggest running `/end` first), stash it, or handle it manually. This
     computer may have unfinished work that `/end` never ran on.
2. If the tree is clean, run `git pull` (plain, no `--rebase`/`--autostash` flags —
   the working tree is already known clean from step 1, so a fast-forward is
   expected).
   - If it fast-forwards, summarize what came in: run `git log --oneline HEAD@{1}..HEAD`
     and list the incoming commits.
   - If it says "Already up to date," say so plainly — this computer already has the
     latest.
   - If it fails (diverged history, conflict, no upstream) STOP and report the exact
     git error rather than trying to resolve it automatically.
3. Show `git log -1 --stat` so the user has the latest commit in view before they
   start working.

Keep the report short: clean/dirty status, what was pulled (or why not), and the
latest commit. No need to read further into the codebase unless the user asks.
