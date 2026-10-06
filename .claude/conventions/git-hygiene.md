# Git hygiene

Shared reference, read on demand by `/start-issue`, `/raise-pr`, `/fix-review-comments` and the review
agents. Not auto-loaded, but it governs every change on the repo from the first commit on a branch,
not just at PR time. The branch names this file needs are in `CLAUDE.md` under `## Project-specific`.

## Branches

- The **Default Branch** and every branch in **Protected Branches** stay releasable at all times.
  Never commit directly to any of them; a hook blocks it.
- One branch per issue, cut from an up-to-date **Default Branch**, named per **Branch Name**. Keep
  branches short-lived.
- Where a **Promotion Chain** exists, feature branches target the first branch in the chain and later
  branches only ever receive promotion PRs, never feature branches or direct commits.

```bash
git switch <Default Branch> && git pull --ff-only
git switch -c <branch per Branch Name>
```

## Commits

- Short, meaningful, imperative subject lines, no trailing period, no emoticons anywhere.
- Atomic commits. Each commit is one coherent step that builds and passes on its own, with a message
  describing that step. A reviewer should be able to read the diff commit by commit; a revert of any
  single commit should make sense.
- Stage selectively so unrelated edits do not ride along: `git add -p`, never a blanket `git add -A`.
- Squash only true fixup noise before opening the PR; keep meaningful steps as separate commits.
- No `Co-Authored-By` or other attribution trailers.
- Never `--no-verify` and never skip hooks. Never commit secrets, credentials or `.env` values; use
  `.env.example` with placeholders.
- Do not rewrite shared history. Prefer a new commit over amending a pushed branch. If a pushed branch
  truly must be updated, use `--force-with-lease`, never `--force`, and never on a protected branch.

## Keeping a branch in sync

When your branch drifts behind its base, **merge the base into your branch; do not rebase**. Rebasing a
pushed branch rewrites history and forces everyone else to recover from it; a merge preserves history
and is safe to repeat.

```bash
git switch <Default Branch> && git pull --ff-only
git switch <your branch>
git merge <Default Branch>
```

## Before you push

- `git status` clean; no stray debug files, large binaries or generated artefacts.
- The **Gate Commands** in `/raise-pr` pass.
- Your branch is up to date with its base (merge it in if it drifted).

```bash
git status
git push -u origin HEAD
```

## Project-specific

Every value this file names — **Default Branch**, **Protected Branches**, **Promotion Chain**,
**Branch Name** — is registered once in `CLAUDE.md` under `## Project-specific`. Read it there.
Nothing is restated here, so nothing here can fall out of step with it.
