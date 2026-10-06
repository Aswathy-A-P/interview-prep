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


This app is a client of the REST API in `backend/`, whose contract is `docs/api.md`: business rules
belong to the backend, and this app calls endpoints and renders the results. Every path below is
relative to `frontend/`.

**Architecture rules**:
- TypeScript everywhere under `src/`, strict mode, no `any` that escapes a module boundary.
- Feature folders under `src/features/<feature>/` hold that feature's pages, components, query hooks
  and tests. Shared primitives live in `src/components/ui/`, shared layout in `src/components/`.
- A new feature copies the structure of an existing one, so every feature reads the same way.
- Every route is registered in `src/App.tsx`; protected routes go through the auth guards, and admin
  routes through the admin guard.
- Every HTTP call goes through the single client in `src/lib/api/`, whose base URL comes from
  `import.meta.env.VITE_API_BASE_URL` and falls back to the `/api/v1` path the dev server and nginx
  proxy. A component never calls `fetch` itself. The types in `src/lib/api/types.ts` mirror the contract.
- Styling is Tailwind utility classes through the primitives in `src/components/ui/`.
- A new dependency justifies its bundle cost.

**State, data and API rules**:
- Server state lives in TanStack Query only; a mutation invalidates the queries it changes. React
  Context holds auth and UI state, never a copy of server data.
- Every form uses React Hook Form with a Zod schema that mirrors the backend's constraints, and shows
  the backend's `ProblemDetail` detail and field errors when it still rejects the input.
- The client reads the `ProblemDetail` envelope in one place and raises an `ApiError`.
- The access token lives in memory and the refresh token in `localStorage`; a `401` triggers one
  deduplicated refresh and a retry, and a failed refresh logs the user out.
- Order placement sends an `Idempotency-Key` that stays stable across retries of the same checkout.
- Money is displayed through `src/lib/money.ts`; totals come from the server and are never summed in
  floating point on the client.
- Every data-backed view renders its loading, empty and error states.
- An effect declares every dependency it reads and cleans up after itself; state is never set
  synchronously in an effect body, and never mutated in place.
- A list rendered from data is keyed by a stable id, never by its array index.

**Testing rules**:
- Every new or changed component or page has a test beside it, written with Vitest and React Testing
  Library, that exercises behaviour through `userEvent`.
- A test asserts what the user can observe, not implementation details.
- A test mocks the network at the API layer; only the client's own test stubs `fetch`.

**Blocking in review**:
- User-supplied data rendered as raw HTML without sanitisation.
- A secret or credential in source, or a token or personal data written to the console.
- A component that calls `fetch` itself, or an endpoint URL hardcoded at a call site.
- A type or request shape that no longer matches `docs/api.md`.
- Server data held outside TanStack Query, or a mutation that leaves stale queries.
- A form without its Zod schema, or one that drops the backend's error.
- A request whose loading or error state is not handled.
- A protected or admin page reachable without its guard.
- An effect with a missing dependency or no cleanup; state mutated in place; a list keyed by index.
- A new or changed component or page with no test.
- A comment in a changed source file.

**Definition of done**:
- The frontend gate commands registered in `CLAUDE.md` pass.
- Every call goes through `src/lib/api/`.
- Loading, empty and error states render for every data-backed view.
- New routes are registered and guarded.
- Every new or changed component or page has a test that exercises behaviour.
