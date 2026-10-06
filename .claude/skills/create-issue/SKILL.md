---
name: create-issue
description: >-
  Files a GitHub issue as a plain-English user story with acceptance criteria, after checking the open
  issues and pull requests so nothing is filed twice. Use whenever the user says "create an issue",
  "file an issue", "open an issue", "raise a ticket", "log this as a bug", "track this", "add this to
  the backlog", or similar, even if they never type the command. Invoke as "/create-issue". Pairs
  with /start-issue, which picks the issue back up.
---

# Create an issue

Issues are the plan of record: every PR `Closes #N`. This skill turns a bug, a need or an idea into one
issue that a person who does not read code can understand and that `/start-issue` can pick up later.
Filing is outward-facing: **draft, confirm with the user, then create.**

**Precondition:** `gh` installed and authenticated (`gh auth status`).

## 1. Understand what is being asked

Take the substance from the invocation or from the chat context (for example an out-of-scope finding
handed over by `/fix-review-comments`). If the problem or the desired outcome is unclear, ask before
drafting. Do not invent acceptance criteria.

## 2. Check it is not already tracked

```bash
gh issue list --state open --limit 100 --json number,title,labels,updatedAt
gh pr list --state open --limit 50 --json number,title,headRefName
```

For any candidate that looks related, read its body **and comments** (`gh issue view <N> --json
title,body,comments`; `gh pr view <N> --json title,body,comments`). Scope is often added in comments,
and an open PR may already carry the fix. If the work is already tracked or in flight, do not open a
new issue: offer to add the new detail as a comment on the existing item and point the user there.

## 3. Draft the issue

**Title**: one plain sentence describing the outcome or the problem from the user's point of view.
No ticket keys, no type prefixes, no file names.

**Body**: write it to `issue-body.md` using this template. It is the only issue template; there is no
separate template file in `.github/` or `.claude/`.

```markdown
## Story

As a <who>, I want <what> so that <why>.

## Background

<Two to five sentences in plain English. What happens today, why it matters, who is affected.
No file paths, line numbers, code, counts or version numbers: those move before anyone starts.>

## Acceptance criteria

- [ ] <An outcome someone can check without reading code.>
- [ ] <…>

## Out of scope

<What this issue deliberately does not cover, or "Nothing noted.">

## Related

<Links found in step 2, or "None.">
```

**Labels**: pick from the repo's actual labels (`gh label list --limit 100`). Use the area label(s)
that match **Label Routing** when the repo has one, plus one type label (`bug`, `enhancement`, or the
repo's equivalent).

**Milestone**: if **Milestones** is `yes`, choose the earliest open milestone that fits
(`gh api repos/{owner}/{repo}/milestones --jq '.[].title'`).

## 4. Confirm, then create

Show the user the title, labels, milestone and body. On confirmation:

```bash
gh issue create --title "<title>" --body-file issue-body.md --label "<label>" [--label "<label>"] [--milestone "<name>"]
```

If **Project Board** is not `NULL`, add the issue to it; creation alone does not:

```bash
gh project item-add <board number> --owner edstem-tech --url <issue-url>
```

Delete `issue-body.md`.

## Output

The issue number, URL and labels. If the user will work on it now, point them to `/start-issue <N>`.

## Project-specific

Every value this file names — **Project Board**, **Milestones**, **Label Routing** — is registered
once in `CLAUDE.md` under `## Project-specific`. Read it there. Nothing is restated here, so
nothing here can fall out of step with it.
