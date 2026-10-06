---
name: raise-pr
description: >-
  Opens a pull request the way this repo requires. Verifies the branch, runs the gate commands,
  checks the version bump and changelog when the repo needs them, enforces clean commits, writes a
  body that closes the issue, and creates the PR with the required title. Use when work on an issue
  is done, e.g. "/raise-pr", "open the PR for this", "raise the PR".
---

# Raise a PR

Land the change as a PR that passes review on the first try. `.claude/conventions/git-hygiene.md` and
`.claude/conventions/github-pr.md` carry the full rules; this skill is the checklist that applies
them; the repo's values are in `CLAUDE.md` under `## Project-specific`.

**Precondition:** `gh` installed and authenticated (`gh auth status`).

## Pre-flight (block on any failure)

1. **Branch, not a protected branch.** `git rev-parse --abbrev-ref HEAD` must not be the
   **Default Branch** or any protected branch. If it is, stop, create a branch, and move the commits.
2. **Issue linkage.** Identify the issue this implements; every PR must `Closes #N`. If there is no
   issue, run `/create-issue` first.
3. **Gate Commands.** Run every command under **Gate Commands** that applies to the diff; each must
   exit 0. Fix failures rather than skipping them.
4. **Version Bump.** If **Version Bump** is set, confirm the bump is present exactly once and the
   changelog entry describes this change.
5. **Commit hygiene.** Atomic commits, short imperative messages, no fixup noise, no secrets, no
   `--no-verify`, `git status` clean, branch up to date with its base (merged, not rebased).
6. **Sibling impact.** If the change alters an interface a sibling consumes, say so in the body.
   Siblings are listed in `.claude/conventions/sibling-repos.md`.

## Write the body

Read the file **PR Template** names and fill every section it defines into `pr-body.md`. One
closing keyword per issue. Plain English; no pasted diffs.

## Open it

```bash
git push -u origin HEAD
gh pr create --base <Default Branch> --title "<title per PR Title>" --body-file pr-body.md
```

If **PR Title Regex** is set, check the title against it before running the command. Delete
`pr-body.md` afterwards.

## Definition of done

The PR exists against the **Default Branch**, its title matches **PR Title**, its body says
`Closes #N`, every gate command passed, and the version bump (if required) is in the diff. Post the PR
URL. The harness reviews it with `/pr-review <N>`.

## Project-specific

Every value this file names — **Default Branch**, **Protected Branches**, **PR Title**,
**PR Title Regex**, **PR Template**, **Gate Commands**, **Version Bump** — is registered once in
`CLAUDE.md` under `## Project-specific`. Read it there. Nothing is restated here, so nothing here
can fall out of step with it.
