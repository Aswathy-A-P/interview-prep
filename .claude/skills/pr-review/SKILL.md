---
name: pr-review
description: >-
  Reviews an open pull request from your own machine. Checks the PR branch out, reviews the diff
  against the linked issue and the repo conventions through the reviewer agent, and posts one
  plain-English verdict (PASS or FAIL with a findings table) using gh. Use whenever the user says
  "review this PR", "review PR 81", or pastes a PR URL. Invoke as "/pr-review 81"; with no number it
  reviews the current branch's PR. The CI review server runs the pr-review-ci variant instead.
argument-hint: "[pr-number]"
---

# PR review (local)

Review an open PR from your own machine and post one verdict. **The method (what blocks, how to filter,
the review count, how to decide the posting mode) lives in `.claude/conventions/review-conventions.md`;
read it.** This skill covers only the local I/O: how you read the PR and how you post. Every changed
line is also held to `.claude/conventions/comment-conventions.md`.

**Precondition:** `gh` installed and authenticated (`gh auth status`), a clean working tree. Every
command is plain `gh …` or `git …`. Nothing under `.claude/review/` is used locally.

## 1. Check out the PR

Take the PR number from the invocation (`/pr-review 81` or a pasted URL). With no number, use the
current branch's PR: `gh pr view --json number`. Then:

```bash
gh pr view <PR> --json number,title,body,author,headRefName,baseRefName,headRefOid,labels,mergeable
gh pr checkout <PR>
git fetch origin <baseRefName>
git diff --stat origin/<baseRefName>...HEAD
```

You now have the PR's files on disk. Read changed files from the working tree and take hunks from
`git diff origin/<baseRefName>...HEAD -- <path>`. Do not fetch file contents or diffs through the
GitHub API.

`mergeable` is the merge state (`review-conventions.md` §0). If it is `CONFLICTING`, review nothing:
gather only the review count and the posting identity (step 2), then post the conflict body (step 4)
and stop. If it is `UNKNOWN`, GitHub is still computing it; read it once more with the same
`gh pr view <PR> --json mergeable` and, if it is still `UNKNOWN`, carry on with the review.

## 2. Gather the context the review needs

- The linked issue (`Closes #N` in the body) with its comments:
  `gh issue view <N> --json title,body,labels,milestone,comments`.
- The PR's existing discussion, so settled points are not re-raised:

```bash
gh api graphql -f owner='<owner>' -f name='<repo>' -F pr=<PR> -f query='
query($owner: String!, $name: String!, $pr: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      comments(first: 100) { nodes { author { login } body } }
      reviews(first: 100) { nodes { author { login } state body } }
      reviewThreads(first: 100) { nodes { isResolved isOutdated comments(first: 50) { nodes { author { login } path line body } } } }
    }
  }
}'
```

`gh api graphql` does not fill `{owner}`/`{repo}`; read them once with `gh repo view --json owner,name`
and substitute the literal values.

- The review count (`review-conventions.md` §4): count the review bodies and comments above that
  start with `# Verdict:` and add one.
- Who is posting: `gh api user --jq .login`, compared with `author.login` from step 1.

## 3. Review

Load the **Conventions Skills** listed in `CLAUDE.md` under `## Project-specific` and dispatch the
**Reviewer Agents** on the changed files with the diff and the issue summary. Keep only blocking findings
(`review-conventions.md` §2). Then filter (§3): drop what you cannot substantiate, drop points already
in discussion, and cross-reference the open backlog:

```bash
gh issue list --state open --limit 100 --json number,title,labels,updatedAt
gh pr list --state open --limit 50 --json number,title,headRefName
```

Read the body and comments of any candidate (`gh issue view <M> --json title,body,comments`) before
deciding it already covers a finding.

## 4. Post the verdict

Write the body to `review-body.md` in the repo root in the exact shape of
`.claude/conventions/review-template.md`, then post once, choosing the mode up front:

```bash
gh pr review <PR> --comment         --body-file review-body.md   # author == viewer, either verdict
gh pr review <PR> --request-changes --body-file review-body.md   # FAIL, author != viewer
gh pr review <PR> --approve         --body-file review-body.md   # PASS, author != viewer
```

Delete `review-body.md`, then return to the branch you started from (`git switch -`).

## Output

One line to the user: the verdict, the review count and the review URL. Nothing else.

## Project-specific

Every value this file names — **Conventions Skills**, **Reviewer Agents**, **Label Routing** — is
registered once in `CLAUDE.md` under `## Project-specific`. Read it there. Nothing is restated
here, so nothing here can fall out of step with it.
