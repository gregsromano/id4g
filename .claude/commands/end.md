---
description: Commit and push everything before stepping away, so the next computer is up to date
---

Run these steps in order and report the outcome plainly — this is the counterpart to
`/start`, meant to guarantee whatever computer picks up next has everything from this
session.

1. `git status --short` to see what changed.
   - If there's nothing to commit, say so and stop — no empty commits, no push.
2. Review what's staged/unstaged before adding anything: skim `git status` and
   `git diff` for files that look like secrets or credentials (`.env`, key files,
   anything not normally tracked) even if the filename looks innocuous. Flag anything
   suspicious to the user and leave it unstaged rather than committing it silently.
3. Stage the legitimate changes with `git add` (name the files — avoid a blind
   `git add -A` if anything from step 2 needs excluding).
4. Write a commit message the same way you would for any other commit in this
   session: 1-2 sentences on the *why*, not a file-by-file list. Base it on the
   actual diff, not on guesswork. End the message with:
   `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
5. Commit, then `git push`.
   - If the push is rejected (remote has commits this computer doesn't), STOP and
     report it rather than force-pushing. Tell the user to run `/start` on this
     computer's next session to reconcile it, or resolve it now if they want.
6. Confirm with a final `git status` that the tree is clean and pushed.

Keep the report short: what got committed (one line), and confirmation it pushed
cleanly.
