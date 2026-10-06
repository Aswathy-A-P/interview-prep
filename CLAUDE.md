# CLAUDE.md

Thin router for this repository. It stays small and loads every session; everything else loads on
demand. When work starts from an issue, run `/start-issue <N>` first and load only what that work
needs. Do not pre-read the convention skills "just in case".

## Routing (run these even if the user never typed the command)

| The user wants to… | Run |
|---|---|
| decide what to work on next ("what's next", "triage the backlog") | `/triage-issues` |
| start an issue (a pasted issue URL or number, "work on this", "pick up #N") | `/start-issue <N>` |
| create an issue ("file an issue", "raise a ticket", "log this bug", "track this") | `/create-issue` |
| open a PR ("raise the PR", "open the PR") | `/raise-pr` |
| review a PR ("review this PR", a pasted PR URL) | `/pr-review <N>` |
| act on a review ("fix the review comments on PR N", "address the review") | `/fix-review-comments <N>` |
| repair ignored sibling-directory permissions (the "workspace has not been trusted" warning) | `/fix-workspace-trust` |

`/start-issue` maps the issue's labels to the stack conventions in **Label Routing** below and loads
only those. Stack conventions are skills named `<stack>-conventions`; they are never pre-read.

## Guardrails (hooks)

`.claude/hooks/` block secrets on write, block edits to files this repository does not own, block
commits to protected branches, block unsafe shell commands, and lint touched files. They fire
automatically. If one blocks you, fix the cause; do not work around it.

## Which files are this repository's

Most of what sits under `.claude/` is not this repository's own. It belongs to a shared set every
repository in this harness carries: it is changed there once and copied out, and the next install
overwrites whatever a repository has written over it in the meantime.
`.claude/harness/manifest.json` records which files are which, and reading it needs nothing outside
this repository:

| What the manifest records against a file | What that means here |
|---|---|
| `"match": "full"` or `"match": "generated"` | shared whole — never change it here |
| `"match": "common"` | shared above its final `## Project-specific` heading; that section is this repository's to fill |
| `"match": "present"`, a `"stack"` scope, or no entry at all | this repository's own — change it freely |

A change to a shared file belongs in the shared set, where it is made once and reaches every
repository; `.claude/conventions/sibling-repos.md` records where that repository sits. Made here
instead, it is reported as drift once it is pushed and then silently overwritten at the next install.
`.claude/hooks/protect-shared-files.cjs` refuses such a change made with the edit tools; it does not
watch writes made through the shell, so this rule binds whatever the change is written with. The
shared set itself is exempt, since that is where a shared file is meant to be changed.

## Where the rules live

| Topic | Source |
|---|---|
| Stack standards, gate commands, what review flags | the `<stack>-conventions` skill(s) named below |
| Comments in source files | `.claude/conventions/comment-conventions.md` |
| Git, commit and branch hygiene | `.claude/conventions/git-hygiene.md` |
| Issues, PR titles, boards, merge rules | `.claude/conventions/github-pr.md` |
| Review method and the review body shape | `.claude/conventions/review-conventions.md`, `review-template.md` |
| Sibling repositories (the only place they are named) | `.claude/conventions/sibling-repos.md` |
| Reviewer agents | `.claude/agents/` |

Each rule lives in one place; everything else points there. Do not repeat a rule here.

## Project-specific

This is the **only** register of this repo's values. Every convention file and skill that needs one
reads it here; none of them restates it, so a value changes in exactly one place. The two exceptions
are `.claude/conventions/sibling-repos.md`, which holds the sibling table because a sibling repository
is named there and nowhere else, and each `<stack>-conventions` skill, which holds the rules and the
**Scope** of its own stack.

- **Repo**: Aswathy-A-P/interview-prep — a single full-stack monorepo for an e-commerce platform
  (catalog, cart, checkout, orders, payments, admin) built for interview preparation: a React frontend
  in `frontend/` and a Java REST API in `backend/`, run together with `docker compose up`.
- **Stack**: `frontend/` is a Vite + React + TypeScript single-page app with Tailwind CSS, TanStack
  Query, React Hook Form + Zod, React Router, ESLint and Vitest + React Testing Library, served by nginx
  in Docker; `backend/` is a Spring Boot 3 REST service on Java 21, a modular monolith with Spring
  Security (JWT), Spring Data JPA over PostgreSQL 16 with Flyway migrations, springdoc-openapi and
  Testcontainers integration tests, formatted with Spotless and built with the Maven wrapper.
  `docker-compose.yml` at the root runs PostgreSQL, the backend and the frontend.
- **Package Manager**: npm in `frontend/`; maven (through `./mvnw`) in `backend/`
- **Default Branch**: `main`
- **Protected Branches**: `main`, `master`
- **Promotion Chain**: `feature -> main`
- **Branch Name**: `<type>/<short-slug>`, where type is `feat`, `fix`, `chore`, `refactor`, `test` or `docs`
- **Ticket Prefix**: NULL
- **PR Title**: `<type>(<area>): <short description>` — area is `frontend`, `backend` or `fullstack` (10–100 chars)
- **PR Title Regex**: ^(feat|fix|chore|refactor|test|docs)\((frontend|backend|fullstack)\): .+
- **PR Template**: `.github/PULL_REQUEST_TEMPLATE.md`
- **Project Board**: NULL
- **Assign On Start**: yes
- **Milestones**: no
- **Gate Commands**: run the set for every area the diff touches; a cross-cutting change runs both.
  - frontend, from `frontend/`: `npm run lint`
  - frontend, from `frontend/`: `npm test -- --run`
  - frontend, from `frontend/`: `npm run build`
  - backend, from `backend/`: `./mvnw spotless:apply`
  - backend, from `backend/`: `./mvnw test`
- **Version Bump**: NULL
- **Merge Method**: merge commit — `gh pr merge <N> --merge`; never squash.
- **Conventions Skills**: `react-conventions`, `java-conventions`
- **Reviewer Agents**: `senior-react-engineer`, `senior-java-engineer`
- **Label Routing**: the table below. An issue with no area label routes by the paths it names; a
  change under both `frontend/` and `backend/` loads both skills and runs both reviewer agents.

  | Label | Path | Conventions skill | Reviewer agent |
  |---|---|---|---|
  | `frontend` | `frontend/` | `react-conventions` | `senior-react-engineer` |
  | `backend` | `backend/` | `java-conventions` | `senior-java-engineer` |
  | `fullstack` | both | both | both |

- **Repo-specific skills**: NULL
- **Siblings**: see `.claude/conventions/sibling-repos.md`
