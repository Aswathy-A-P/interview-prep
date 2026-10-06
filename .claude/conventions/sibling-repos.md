# Sibling repositories

This file is the **only** place in the harness that names sibling repositories. `CLAUDE.md`, the
skills and the agents point here; they never list siblings themselves. The list in
`## Project-specific` covers every repository in the same project, whether or not this repo depends on
it, and `permissions.additionalDirectories` in `.claude/settings.json` carries exactly the `Local path`
column.

## How siblings are used

- Read a sibling for **context**: the contract it owns, the consumer it implements, the tests it runs.
- Never edit a sibling from this repo. A change there follows that repo's own workflow (its branch,
  conventions, version bump and PR).
- Sync a sibling to the latest of its own default branch **before** reading it, and only the sibling
  you are about to read.

## Sync before reading

A stale sibling produces wrong conclusions that nothing downstream catches. Before reading one:

```bash
SIB=<Local path from the table>
git -C "$SIB" status --porcelain          # non-empty: stop and ask the user to stash or discard
git -C "$SIB" fetch origin
git -C "$SIB" switch "$(git -C "$SIB" symbolic-ref --short refs/remotes/origin/HEAD | sed 's#^origin/##')"
git -C "$SIB" pull --ff-only
```

Resolve the default branch from `origin/HEAD` as above; the `Default branch` column is orientation
only. If `origin/HEAD` is missing, repair it with `git -C "$SIB" remote set-head origin -a` rather
than guessing. Never switch or pull a sibling with uncommitted changes without the user's consent.

## Project-specific

This table is the exception to the single register in `CLAUDE.md`: a sibling repository is named here
and nowhere else, so `CLAUDE.md` points at this file instead of listing them. Every other repo value
is registered there.

- **Project**: NULL

This repository has no siblings. The frontend and the backend it would otherwise split into live
side by side in `frontend/` and `backend/`, so the API contract and its client change in one branch
and one pull request, and `permissions.additionalDirectories` in `.claude/settings.json` grants
nothing.
