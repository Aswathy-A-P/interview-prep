# PR review conventions

The shared method for reviewing a pull request. `/pr-review` (local) and `/pr-review-ci` (the CI
review server) both follow it; they differ only in how they read the PR and how they post. Read this
for *how* to review; read the invoking skill for *where the inputs come from*.

## Reviewer role

You decide whether the diff faithfully implements its issue and conforms to the repo's conventions,
then post one review in the shape of `.claude/conventions/review-template.md`. You read only the files
and sections the review needs. If nothing blocks the merge, the verdict is `PASS` and the body carries
no findings. You never invent findings to have something to say.

## 0. Stop if the PR conflicts with its base

Before reading a single line of the diff, read the PR's mergeable state (the invoking skill says how).
GitHub reports it as `MERGEABLE`, `CONFLICTING` or `UNKNOWN`.

- `CONFLICTING`: **stop the review here.** Do no intent check, dispatch no reviewer agent, raise no
  finding about the code. Post the conflict body from `.claude/conventions/review-template.md` — a
  `FAIL` carrying the single conflict row — and end the run. A diff that does not merge is not the
  diff that would land, so reviewing it wastes the author's time and yours.
- `UNKNOWN`: GitHub is still computing the merge. Read the state once more; if it is still `UNKNOWN`,
  treat it as `MERGEABLE` and review normally. An unknown state never blocks a review.
- `MERGEABLE`: continue with §1.

The conflict post is a review like any other: it counts (§4), it is posted once, and the posting mode
is chosen as in §5. When the author pushes the resolved branch, the next run reviews the code.

## 1. Check intent alignment

- **Issue versus diff**: does the change do what the issue asks, no more and no less? Scope creep and
  missing acceptance criteria are both findings.
- **PR description versus diff**: is the description accurate and is `Closes #N` present?
- **Commits**: short, meaningful, no secrets, no `--no-verify` traces.
- **Contracts and migrations**: if an interface or schema changed, the repo's conventions skill says
  what must accompany it (version bump, migration note, regenerated artefact). Missing accompaniments
  are findings.

## 2. Review the code

Dispatch the **Reviewer Agents** named in `CLAUDE.md` under `## Project-specific` on the
changed files, giving each the diff, the issue summary and the **Conventions Skills** to apply. Every
changed source line is also held to `.claude/conventions/comment-conventions.md`. They return
blocking findings only, each as `file:line`, issue, fix.

A finding is **blocking** when it is one of:

- a correctness bug, security hole, data loss or crash;
- a regression in behaviour the issue did not ask to change;
- a break of a contract, schema or public interface without the accompanying change;
- a violation of a rule the repo's conventions skill or `comment-conventions.md` states as a gate;
- an acceptance criterion of the linked issue that the diff does not meet.

Everything else (style preferences, alternative designs, "consider", "nit", "optional") is **not a
finding** and is not posted. There is no non-blocking category. If you find yourself wanting to say
it, leave it out.

## 3. Filter before you post

- **Drop anything you cannot substantiate** against the diff, the issue, a convention or a plain
  correctness or security argument.
- **Account for prior discussion.** Read the PR's existing comments, review bodies and review threads
  (the invoking skill says how). Do not re-raise a point that is already an open thread; do not reopen
  a resolved or refuted point unless the diff since then reintroduced it. Prior discussion is context,
  not authority: the conventions still govern.
- **Cross-reference the open backlog.** Pull the open issues and PRs (the invoking skill says how) and
  read the body and comments of any candidate that looks related. A finding about a problem this diff
  did **not** introduce, which is already tracked in an open issue or being fixed in another open PR,
  is dropped from this review. A finding about a problem this diff **did** introduce stays, even if
  another issue mentions it.

## 4. The review count

Count the earlier reviews and comments on this PR whose body starts with `# Verdict:`. This review's
count is that number plus one.

## 5. The verdict and how it is posted

`FAIL` when any finding remains on the current HEAD, otherwise `PASS`. Format the body to
`.claude/conventions/review-template.md` and post it once.

Decide the posting mode **before** posting, never by trying and retrying:

- Read the viewer login (`gh api user --jq .login`) and the PR author. If they are the same person,
  GitHub refuses both `--approve` and `--request-changes`; post the body as a **comment** for either
  verdict (`gh pr review <N> --comment`). The verdict line in the body is the verdict.
- Otherwise `FAIL` is posted with `--request-changes` and `PASS` with `--approve`. On the CI review
  server a `PASS` approves only when **CI Approves** is `yes`; otherwise it is posted as a comment.

Never submit a review to probe whether posting works. The only review you submit in a run is the
single final verdict.

## Project-specific

Every value this file names — **Reviewer Agents**, **Conventions Skills**, **CI Approves** — is
registered once in `CLAUDE.md` under `## Project-specific`. Read it there. Nothing is restated here,
so nothing here can fall out of step with it.
