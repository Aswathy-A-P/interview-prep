# Interview Prep

Full-stack interview preparation task.

- **Backend:** Java 21 · Spring Boot 3.5 · Spring Data JPA · H2 (file-based, persistent)
- **Frontend:** React 18 · Vite · React Router

## Running locally

Prerequisites: JDK 21+ and Node 20+. Maven is fetched by the wrapper.

```bash
# 1. Backend (http://localhost:8080)
cd backend
./mvnw spring-boot:run

# 2. Frontend (http://localhost:5173) - in a second terminal
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend.
`GET /api/health` returns `{ "status": "UP" }`.

## Checks

The same checks CI runs (see `CLAUDE.md` for the registered gate commands):

```bash
cd frontend && npm run lint && npm test -- --run && npm run build
cd backend && ./mvnw spotless:apply && ./mvnw test
```

## Claude Code harness

`CLAUDE.md` and `.claude/` carry the shared Claude Code harness: routing to the issue and PR skills
(`/create-issue`, `/start-issue`, `/raise-pr`, `/pr-review`, `/fix-review-comments`, `/triage-issues`),
the React and Java conventions, reviewer agents, and guardrail hooks that block secrets, comments in
source files, commits to `main` and unsafe shell commands. `node .claude/harness/verify.cjs` checks the
installation.
