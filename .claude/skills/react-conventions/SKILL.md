---
name: react-conventions
description: >-
  Engineering standard for the React code in this repo. States the bar code is held to, what a
  review flags as blocking, and the gate commands that must pass. Loaded on demand by /start-issue,
  /pr-review and /fix-review-comments for issues and diffs that touch React code; never pre-read.
---

# React conventions

This skill is a **standard, not a description**: it states the bar this repo holds `React` code to,
not a narration of what the code currently does. Apply it to the lines a change **adds or modifies**;
pre-existing violations in untouched code are backlog issues, not blockers. Surrounding code is never
precedent for a new violation.

## How this skill is used

- `/start-issue` loads it when an issue touches this stack, before any code is written.
- `/pr-review` and `/pr-review-ci` hand it to the **Reviewer Agents**, which report only the
  violations listed under **Blocking in review** below.
- `/fix-review-comments` verifies each finding against it before changing code.
- `.claude/conventions/comment-conventions.md` applies to every source file in this stack and is a
  gate: a comment in a source file fails the change.

## What a blocking finding is

A review flags a change only for: a correctness bug, a security hole, data loss or a crash; a
regression the issue did not ask for; a break of a contract or interface without its accompanying
change; a rule in **Blocking in review** below; or an unmet acceptance criterion. Style preferences,
alternative designs and "consider" remarks are not findings and are never posted.

## Project-specific

**Package Manager** and **Gate Commands** are registered once in `CLAUDE.md` under
`## Project-specific`, with **Stack** naming every stack in the repo. Read them there; they are not
restated here.

What lives here is the standard itself — the **Scope** this skill governs and the rules a change is
held to. Keep it free of counts, versions, issue numbers, file inventories and dates; those move.

- **Scope**: `frontend/`

This app is a client of the REST API in `backend/`: domain and business rules belong to the backend,
and this app calls endpoints and renders the results. Every path below is relative to `frontend/`.

**Architecture rules**:
- A routed screen lives in `src/pages/` and every route is registered in `src/App.jsx`.
- A component lives in `src/components/` with its test beside it.
- Imports are relative and never climb more than one level.
- Every HTTP call goes through the single API module `src/api.js`, whose base URL comes from
  `import.meta.env.VITE_API_BASE_URL` and falls back to the `/api` path the Vite dev server proxies.
  A component never calls `fetch` itself.
- Money, where the app shows it, is parsed and formatted through one helper module in `src/`.
- Styling uses the class names and colour tokens in `src/index.css`, light and dark. An inline `style`
  object carries only a value computed at runtime.
- A new dependency justifies its bundle cost.

**State, data and API rules**:
- `src/api.js` declares every endpoint the app calls; no URL is hardcoded at a call site.
- A page loads its server data, and renders the loading, empty and error states of that load.
- The shapes `src/api.js` sends and reads match the backend's request and response DTOs, and the
  backend's error envelope is read in one place, `src/api.js`, which raises an `ApiError` carrying the
  message and field errors.
- A form validates on the client with the same constraints the backend enforces, and shows the error
  the backend returns when it still rejects the input.
- A typed amount is validated and turned into integer cents before any arithmetic, matching the
  backend's rounding. Floating point never sums money.
- An effect declares every dependency it reads, cleans up its timers and subscriptions, and ignores a
  response that arrives after the component unmounts or its dependency changes. State is never set
  synchronously in an effect body; derive it during render or reset it with a `key`.
- State is never mutated in place; an update produces a new object or array.
- A list rendered from data is keyed by a stable id, never by its array index.
- Context holds cross-cutting state only; it is not a cache for server data.

**Testing rules**:
- Every new or changed component or page has a test beside it, written with Vitest and React Testing
  Library, that exercises behaviour.
- A test drives the UI the way a person would, through `userEvent` rather than `fireEvent`.
- A test asserts what the user can observe, not implementation details.
- A test mocks the network at `src/api.js`, never by stubbing a component's internals; only the API
  module's own test stubs `fetch`.

**Blocking in review**:
- User-supplied data rendered as raw HTML (`dangerouslySetInnerHTML`) without sanitisation.
- A secret, API key or credential in source, or a token or personal data written to the console.
- A component that calls `fetch` itself, or an endpoint URL hardcoded at a call site.
- A request or response shape that no longer matches the backend DTO it talks to.
- A request whose loading or error state is not handled, so the UI crashes or hangs.
- Money summed in floating point, or an amount sent without the validation the backend enforces.
- An effect with a missing dependency, no cleanup, or a synchronous state update, causing a stale
  value, a leak, a cascading render or a state update after unmount.
- State mutated in place, or a reorderable list keyed by index.
- A form that submits without the validation the backend enforces, or drops the backend's error.
- A new or changed component or page with no test.
- A comment in a changed source file.

**Definition of done**:
- The frontend gate commands registered in `CLAUDE.md` pass.
- Every call goes through `src/api.js`.
- Loading, empty and error states render for every data-backed view.
- New routes are registered.
- Every new or changed component or page has a test that exercises behaviour.
