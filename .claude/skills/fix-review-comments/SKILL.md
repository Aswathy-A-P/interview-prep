---
name: fix-review-comments
description: >-
  Acts on the latest harness review of an open pull request. Reads the findings table, verifies each
  row against the repo conventions, agrees the fix with you, commits on the PR's own branch, posts one
  plain-English reply, then pushes. Use whenever the user says "fix the review comments on PR X",
  "address the review", or similar, with a PR number, URL, or the PR already in context. Invoke as
  "/fix-review-comments 81". Counterpart to /pr-review.
argument-hint: "[pr-number]"
---

# Fix review comments

Turn the findings of a PR review into verified, agreed, committed fixes, then close the loop with one
reply. A finding is a claim, not an order: verify it before changing code, refute it with evidence
when it is wrong, and file it separately when it is out of the issue's scope.

**Precondition:** `gh` installed and authenticated (`gh auth status`). Only `gh …` and `git …` are
used. The repo hooks still apply (protected branches, lint on edit); fix what they flag, never
`--no-verify`.

## 1. Gather context

Take the PR number from the invocation, a pasted URL, or the PR in context. With no number, use the
current branch's PR (`gh pr view --json number`).

```bash
gh pr view <PR> --json number,title,body,author,headRefName,baseRefName,labels,files,reviews,comments
gh api repos/{owner}/{repo}/pulls/<PR>/comments --paginate --jq '.[] | {id, path, line, original_line, author: .user.login, body}'
gh api user --jq .login
```

The **latest review or comment whose body starts with `# Verdict:`** is the review you act on. Parse its
Findings table: one row per finding with file, issue and fix. Add any human inline comments that are
not yet resolved (resolution state is in GraphQL `reviewThreads { isResolved }`; query it if unsure).
Read the linked issue for intent: `gh issue view <N> --json title,body,comments`.

If the latest verdict is `✅ PASS` with no human comments, say so and stop.

## 2. Load only the conventions the PR touches

Load the **Conventions Skills** in `CLAUDE.md` under `## Project-specific` that match the PR's labels and changed
files, plus `.claude/conventions/comment-conventions.md`, which binds every line you write.

## 3. Verify each finding

Decide, for every row, before touching code, and cite what decides it:

- **Valid**: a real defect or convention violation. Cite the convention or describe the failure.
- **Invalid**: contradicts the conventions or is a false positive. Cite what makes it wrong.
- **Out of scope**: fair, but outside the linked issue. Check the open backlog first so you do not
  file a duplicate:

```bash
gh issue list --state open --limit 100 --json number,title
gh pr list --state open --limit 50 --json number,title,headRefName
```

  If it is already tracked, link it; otherwise it becomes a `/create-issue` candidate in step 4.

## 4. Decide with the user

- **Valid** → offer the fix options with their trade-offs (`AskUserQuestion`) and apply the chosen one.
- **Invalid** → draft a one-sentence, evidence-cited rebuttal for the reply. No code change.
- **Out of scope** → offer to file it with `/create-issue` (or link the existing issue). No code change
  here.

Settle every finding before writing code.

## 5. Apply the fixes on the PR's own branch

```bash
git switch <headRefName>
git pull --ff-only
```

If the branch is behind its base, merge the base in (never rebase) per
`.claude/conventions/git-hygiene.md`. Make the edits, run the **Gate Commands** from `/raise-pr` that
apply to the diff, and commit atomically with short imperative messages naming the finding number.
Stage with `git add -p`. **Commit, but do not push yet.**

## 6. Reply first, then push

Where a CI review runs on push, it snapshots the discussion at the start of its run; a reply posted
after the push is invisible to that review and the same findings come back. So post the reply first.

Write `reply-body.md` as the same table the review used (`.claude/conventions/review-template.md`),
one row per finding in the review's order, keeping its **No.**, **File** and **Issue** cells verbatim
and replacing **Fix** with what was done, at most 25 words: the commit that fixed it, or `Not changed:`
plus the one-line reason, or `Tracked in #N`. Nothing else goes in the body except a first line
`Reply to review <n>` (the review count you acted on); when the review author is the same login as the
viewer that line reads `Reply to my own review <n>`.

```markdown
Reply to review 2

| No. | File | Issue | Fix |
|---|---|---|---|
| 1 | `src/app/store.js:42-45` | Session token is stored in localStorage where any script can read it. | Fixed in a1b2c3d: moved to sessionStorage, cleared on logout. |
| 2 | `src/pages/Login.jsx:88` | The retry loop never stops when the server keeps returning 500. | Not changed: the loop is bounded by the caller's timeout; see thread. |
```

Then:

```bash
gh pr comment <PR> --body-file reply-body.md
git push
```

Confirm the push landed (reconcile and push again if it was rejected), then delete `reply-body.md`.

## Output

The same table you posted, and the PR URL.

## Project-specific

Every value this file names — **Conventions Skills**, **Label Routing**, **Gate Commands** — is
registered once in `CLAUDE.md` under `## Project-specific`. Read it there. Nothing is restated
here, so nothing here can fall out of step with it.
