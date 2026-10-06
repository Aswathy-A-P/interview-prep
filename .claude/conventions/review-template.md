# PR review body template

Every review posted by `/pr-review` and `/pr-review-ci` uses this exact shape. It is written for a
reader who does not code: one verdict word, one count, one table. Nothing else goes in the body: no
summary paragraph, no praise, no non-blocking notes, no suggestions, no explanation of method.

Write the body to a file and post it with `--body-file`. Every `#` heading below is safe because the
body never becomes part of a shell command string.

---

```markdown
# Verdict: ✅ PASS

## Review count: 1
```

or

```markdown
# Verdict: ❌ FAIL

## Review count: 2

## Findings

| No. | File | Issue | Fix |
|---|---|---|---|
| 1 | `src/app/store.js:42-45` | Session token is stored in localStorage where any script can read it. | Use `sessionStorage` and clear it on logout. |
| 2 | `src/pages/Login.jsx:88` | The retry loop never stops when the server keeps returning 500. | `if (attempt >= 3) throw err;` |
```

or, when the branch conflicts with its base (`review-conventions.md` §0):

```markdown
# Verdict: ❌ FAIL

## Review count: 3

## Findings

| No. | File | Issue | Fix |
|---|---|---|---|
| 1 | `whole branch` | This branch conflicts with `main`, so nothing here can be merged or reviewed yet. | Merge `main` into the branch, resolve the conflicts and push; the review then runs again. |
```

---

## Rules for each part

- **Verdict**: `❌ FAIL` when at least one finding remains on the PR's current HEAD, otherwise
  `✅ PASS`. Nothing else appears on this line.
- **Review count**: how many times this PR has been reviewed by the harness including this one. Count
  every earlier review or comment on the PR whose body starts with `# Verdict:` and add one. The count
  never resets while the PR stays open.
- **Findings**: present only on `FAIL`. Omit the heading and table entirely on `PASS`.
  - **No.**: 1, 2, 3 … in the order a developer should fix them (most serious first).
  - **File**: repo-root-relative path with the line or line range, in backticks.
  - **Issue**: what is wrong, in plain English, one line, at most 25 words. No jargon a newcomer
    could not follow. Name the consequence ("users lose their draft"), not the rule number.
  - **Fix**: the corrected code in backticks if it fits on one line, otherwise what to do, at most
    25 words.
- **The conflict body**: the whole review when the PR is `CONFLICTING`. It carries exactly one
  finding, the conflict itself; the **File** cell is `whole branch` rather than a path, and the base
  branch is named as the PR's own base. No code finding is added to it, because no code was reviewed.
- Every finding is blocking. A point that would not stop the merge is not a finding and is not
  written anywhere in the body.

## Project-specific

None.
