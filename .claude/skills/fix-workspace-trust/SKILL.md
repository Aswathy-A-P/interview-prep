---
name: fix-workspace-trust
description: >-
  Diagnose and repair Claude Code workspace trust, the case where permissions.additionalDirectories
  from .claude/settings.json are silently ignored with "Ignoring N permissions.additionalDirectories
  entries … this workspace has not been trusted". Checks the project's hasTrustDialogAccepted flag in
  ~/.claude.json (both slash forms of the project key), backs the file up, sets the flag with one
  anchored edit scoped to this project, verifies the file still parses, and tells you to restart. Use
  when sibling directories are inaccessible or you see the trust warning.
---

# Fix workspace trust / permissions

Claude Code only honours `permissions.additionalDirectories` (the sibling-repo grants in
`.claude/settings.json`) once the **workspace is trusted**. Trust is recorded per project in
`~/.claude.json` under `projects["<project-path>"].hasTrustDialogAccepted`. If that flag is `false`,
or the project entry is half-initialized / missing, no trust dialog fires and the extra directories
are dropped with:

> Ignoring N permissions.additionalDirectories entries from .claude/settings.json: this workspace has
> not been trusted.

This skill repairs that flag safely. `~/.claude.json` is large, deeply nested, and shared by every
project on the machine, so the cardinal rule is: **never rewrite the whole file.** Read with `jq`
freely (read-only is safe); write only via a single anchored edit scoped to the current project key.

## 0. Locate the config and the project key

- The config file is `~/.claude.json` (`$HOME/.claude.json`; on Windows `C:\Users\<you>\.claude.json`).
- The project key is the **absolute path of the current working directory** as it appears in
  `~/.claude.json`. Claude Code may have stored it in either slash form, so resolve **both**:
  - forward-slash: e.g. `C:/Users/you/repo`
  - backslash: e.g. `C:\Users\you\repo`

```bash
CFG="$HOME/.claude.json"
CWD="$(pwd)"                          # forward-slash form on most shells
CWD_BS="${CWD//\//\\}"               # backslash form (Windows project keys)
```

List the candidate keys actually present so you edit the real one, not a guess:

```bash
jq -r '.projects | keys[]' "$CFG" | grep -iF -e "$CWD" -e "$CWD_BS"
```

Use the matching key verbatim from that output as `<KEY>` below.

## 1. Diagnose (read-only)

Report the current state before changing anything:

```bash
jq --arg k "<KEY>" '.projects[$k].hasTrustDialogAccepted' "$CFG"
```

- `true` → already trusted. **No-op:** report that trust is already set and stop (still confirm the
  warning is gone after a restart).
- `false` → needs the fix (step 2).
- `null` → either the flag is absent on an existing entry, or the project entry doesn't exist yet.
  - If the entry exists (`jq --arg k "<KEY>" '.projects | has($k)' "$CFG"` is `true`) but the flag is
    missing, add the flag in step 2.
  - If no entry exists at all, the project is half-initialized: the simplest safe fix is to let Claude
    Code create the entry (open the project once so it writes a `projects["<KEY>"]` block), then re-run
    this skill. Do **not** hand-craft a brand-new project object.

Also surface the related signals so the user sees the whole picture:

- `.claude/settings.json` → confirm `permissions.additionalDirectories` matches the `Local path`
  column of `.claude/conventions/sibling-repos.md`.
- `jq --arg k "<KEY>" '.projects[$k] | {hasTrustDialogAccepted, hasCompletedProjectOnboarding}' "$CFG"`
  — a `false`/missing onboarding flag often travels with the trust one; fix it the same anchored way
  if it's blocking trust.

## 2. Back up, then edit (anchored, scoped to this project only)

**Always back up first:**

```bash
cp "$CFG" "$CFG.bak.$(date +%Y%m%d-%H%M%S)"
```

Then make a **single anchored edit** — do not pipe the whole file through `jq -S` or reserialize it.

Preferred: use the editor's exact-string replace. Read the few lines around the project key, find the
`"hasTrustDialogAccepted": false` that belongs to **this** project (the one nested directly under your
`<KEY>` object — disambiguate using the surrounding key text so the match is unique across the file),
and replace `false` → `true` in that one spot. If the flag is missing, insert
`"hasTrustDialogAccepted": true,` as the first field inside this project's object, again anchored on
the unique `"<KEY>": {` opening so no other project is touched.

If you must do it from the shell, keep it anchored to the key and edit one occurrence only — never a
global `s/false/true/`. Verify the diff touches a single line inside your project's block before
saving.

## 3. Verify it still parses

A corrupt `~/.claude.json` breaks every project, so validate before declaring success:

```bash
jq empty "$CFG" && echo "valid JSON"
jq --arg k "<KEY>" '.projects[$k].hasTrustDialogAccepted' "$CFG"   # expect: true
```

If validation fails, restore the backup immediately:

```bash
cp "$CFG.bak.<stamp>" "$CFG"
```

…and retry with a tighter anchor.

## 4. Report and restart

End with a short report:

- **What changed:** the project key edited and the flag's old → new value (or "already trusted / no
  entry yet — nothing changed").
- **Backup:** the path of the `.bak.<stamp>` you wrote.
- **Validation:** JSON re-parsed OK.
- **Action required:** trust is read at startup — **fully restart Claude Code** (quit and reopen, not
  just `/clear`) for the new trust state to take effect and for `additionalDirectories` to load.

## Definition of done

`~/.claude.json` still parses; `projects["<KEY>"].hasTrustDialogAccepted` is `true` (or was already);
a timestamped backup exists; only this project's flag changed; the user has been told to restart.

## Project-specific

None.
