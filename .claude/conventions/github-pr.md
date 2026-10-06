# GitHub and PR conventions

Shared reference, read on demand by `/create-issue`, `/raise-pr`, `/pr-review` and
`/fix-review-comments`. Not auto-loaded. The values this file needs are in `CLAUDE.md` under
`## Project-specific`.

## Issues are the plan of record

- Every PR implements an issue and says **`Closes #N`** in its body. Work without an issue gets one
  first (`/create-issue`).
- Issues are written as plain-English user stories with acceptance criteria (`/create-issue` carries
  the template). They name outcomes, not files or line numbers.
- Labels are the repo's own; read them with `gh label list` rather than assuming a vocabulary.
- If **Milestones** is `yes`, every issue carries the earliest open milestone that fits.
- If **Project Board** is not `NULL`, every new issue is added to it
  (`gh project item-add <number> --owner edstem-tech --url <issue-url>`), because issue creation alone
  does not attach it.

## One closing keyword per issue

`Closes #46, #48` closes only #46. Write `Closes #46, closes #48`, then verify with
`gh pr view <N> --json closingIssuesReferences`.

## The PR

- Base branch is the **Default Branch** unless the branch is a promotion PR along the
  **Promotion Chain**.
- Title follows **PR Title**. When **PR Title Regex** is set, CI rejects a title that does not match
  it, so check before creating.
- Read the file **PR Template** names and fill every section it defines; it is the single source of
  truth for the body. The shared set ships that file, so every repo has one.
- Tick a checklist item only when it is genuinely true.
- If **Version Bump** is set, the PR carries that bump exactly once, however many pushes it takes.

## Review and merge

- `/pr-review` posts one review in the shape of `.claude/conventions/review-template.md`. `PASS`
  approves; `FAIL` requests changes; on the author's own PR both post as a comment. The CI reviewer
  approves on `PASS` only where **CI Approves** is `yes`.
- Merge only when CI is green and the latest harness review is `PASS`. Merge method and post-merge
  steps are in **Merge Method**.

## Creating the PR

```bash
git push -u origin HEAD
gh pr create --base <Default Branch> --title "<per PR Title>" --body-file pr-body.md
```

## Project-specific

Every value this file names — **Default Branch**, **Promotion Chain**, **Project Board**,
**Milestones**, **PR Title**, **PR Title Regex**, **PR Template**, **Version Bump**,
**Merge Method**, **CI Approves** — is registered once in `CLAUDE.md` under `## Project-specific`.
Read it there. Nothing is restated here, so nothing here can fall out of step with it.
