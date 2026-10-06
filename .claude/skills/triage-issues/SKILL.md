---
name: triage-issues
description: >-
  Surveys the repo's open GitHub issues, reads where the codebase stands, and recommends the next
  issue to pick up, then offers to hand off to /start-issue. Read-only. Use whenever the user asks
  "what should I work on next", "what's next", "triage the backlog", "which issue should I do", or
  types "/triage-issues". Pairs with /start-issue and /create-issue.
---

# Triage issues

Answer "what should I work on next?" for this repo. This skill reads and recommends; it changes
nothing.

**Precondition:** `gh` installed and authenticated (`gh auth status`).

## Steps

1. **Enumerate the open backlog.**
   ```bash
   gh issue list --state open --limit 100 --json number,title,labels,milestone,assignees,updatedAt
   gh pr list --state open --limit 50 --json number,title,headRefName,isDraft
   ```
   If **Milestones** is `yes`, note the earliest open milestone; the next work usually lives there.
   If **Project Board** is not `NULL`, the board's columns say what is already in progress.

2. **Read the codebase's current status.** Recently merged work shows momentum:
   ```bash
   gh pr list --state merged --limit 15 --json number,title,mergedAt
   ```
   For any issue you are about to recommend, read its comments
   (`gh issue view <N> --json title,body,comments`): blocks and their release are declared there.

3. **Look for issues worth shipping together.** Two issues that touch the same area are cheaper as
   one PR (`/start-issue <M> <N>`, one closing keyword per issue).

4. **Recommend.** Prefer, in order: earliest milestone, unblocked, not already assigned or in an open
   PR, self-contained enough for one PR. Present the top pick with one or two lines on why now, then
   two alternatives with one line each. Say briefly why deferred or blocked issues were skipped.

5. **Offer the hand-off.** End with: "Want me to start on #<N> with `/start-issue <N>`?"

## Output

A short ranked recommendation and the `/start-issue <N>` offer. Do not begin implementation here.

## Project-specific

Every value this file names — **Milestones**, **Project Board** — is registered once in
`CLAUDE.md` under `## Project-specific`. Read it there. Nothing is restated here, so nothing here
can fall out of step with it.
