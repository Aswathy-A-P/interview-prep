---
name: start-issue
description: >-
  The front door for picking up a GitHub issue. Reads the issue and its comments, checks the open
  backlog for overlap, loads only the conventions the issue needs, creates the working branch from an
  up-to-date default branch, and produces a scoped plan. Use at the start of any issue work, e.g.
  "/start-issue 28", "let's start issue 5", "pick up #28", or a pasted issue URL.
argument-hint: "<issue-number> [issue-number…]"
---

# Start an issue

Load **only** the context the issue needs and turn it into a concrete, scoped plan before any code is
written.

**Precondition:** `gh` installed and authenticated (`gh auth status`), clean working tree.

## Steps

1. **Read the issue, body and comments.**
   ```bash
   gh issue view <N> --json number,title,body,labels,milestone,assignees,comments
   ```
   Comments carry clarifications and scope changes that override the body. Given several numbers
   (`/start-issue 46 48`), read each and treat them as one unit: one branch, one PR, one closing
   keyword per issue (`Closes #46, closes #48`).

2. **Cross-reference the backlog.**
   ```bash
   gh issue list --state open --limit 100 --json number,title,labels,updatedAt
   gh pr list --state open --limit 50 --json number,title,headRefName
   ```
   Look for a duplicate or overlapping issue, a blocker this issue depends on that is still open, and
   an open PR already touching the same area. Surface any of these and confirm with the user before
   creating a branch.

3. **Load only what the issue needs.** Map its labels and the areas it names to the **Conventions
   Skills** in `CLAUDE.md` under `## Project-specific` and load each match. Always load
   `.claude/conventions/comment-conventions.md`; it binds every line you write. Do not load skills for
   areas the issue does not touch.

4. **Read narrowly.** Open only the files and areas the issue names, plus enough surrounding code to
   understand the change. Sibling repositories, when needed, are listed in
   `.claude/conventions/sibling-repos.md`; sync one before reading it, as that file says.

5. **Confirm preconditions.** If the issue has no clear acceptance criteria, say so and ask before
   coding.

6. **Claim and branch.** If **Assign On Start** is `yes`: `gh issue edit <N> --add-assignee @me`.
   If **Project Board** is not `NULL`, move the card to the board's in-progress column. Then create
   the branch from an up-to-date **Default Branch**, named per **Branch Name**:
   ```bash
   git switch <Default Branch> && git pull --ff-only
   git switch -c <branch>
   ```
   Never work on a protected branch. From here on `.claude/conventions/git-hygiene.md` governs.

## Output

A short brief, then stop for the user to confirm before implementing:

- **Scope**: two to four lines on what the issue asks and its acceptance criteria.
- **Loaded**: which conventions skill(s) and which files or areas you read.
- **Branch**: the branch you created.
- **Plan**: the first few concrete steps.

When the work is done, `/raise-pr` opens the pull request.

## Project-specific

Every value this file names — **Default Branch**, **Branch Name**, **Assign On Start**,
**Project Board**, **Conventions Skills**, **Label Routing** — is registered once in `CLAUDE.md`
under `## Project-specific`. Read it there. Nothing is restated here, so nothing here can fall out
of step with it.
