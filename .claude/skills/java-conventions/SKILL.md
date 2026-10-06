---
name: java-conventions
description: >-
  Engineering standard for the Java code in this repo. States the bar code is held to, what a
  review flags as blocking, and the gate commands that must pass. Loaded on demand by /start-issue,
  /pr-review and /fix-review-comments for issues and diffs that touch Java code; never pre-read.
---

# Java conventions

This skill is a **standard, not a description**: it states the bar this repo holds `Java` code to,
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

- **Scope**: `backend/`

Every path below is relative to `backend/`.

**Architecture rules**:
- The application has one base package under `src/main/java`, organised by layer: `controller/`,
  `service/`, `repository/`, `model/`, `dto/`, `exception/`, `config/` and `util/`. A layer calls only
  the one below it: controller -> service -> repository -> model.
- A controller holds no business logic: it validates input, calls one service method and returns its
  result.
- An entity in `model/` never crosses the controller boundary. Requests and responses are records in
  `dto/`, and a response record builds itself from an entity through a static `from(...)` factory.
- Cross-cutting configuration such as CORS lives in `config/`; the global exception handler and the
  domain exceptions live in `exception/`.
- Dependency injection is constructor injection with `final` fields, never field injection.

**State, data and API rules**:
- Persistence is Spring Data JPA over a file-based H2 database, so data survives a restart. A primary
  key is a `Long` with `GenerationType.IDENTITY`; an enum persists as `@Enumerated(EnumType.STRING)`.
- Money, where the domain has it, is a whole number of cents in a `long` inside the domain and a
  `BigDecimal` with at most two decimal places at the API boundary, converted only through one helper in
  `util/`. Never `double` or `float`.
- A read-only service method carries `@Transactional(readOnly = true)`; a method that writes more
  than one row, or reads then writes, carries `@Transactional`.
- Queries address N+1 risk with `@EntityGraph` or `JOIN FETCH`. A `@Query` binds its parameters and is
  never assembled by string concatenation.
- Paths sit under `/api/{resource}` as plural nouns, nesting a child resource under its parent as
  `/api/{parents}/{parentId}/{children}`. Status codes are exact: `201` on create, `400` on invalid
  input, `404` on a missing resource, `409` on a conflicting state.
- A request DTO carries Jakarta validation constraints and the controller parameter carries `@Valid`.
  A rule that needs stored data, such as ownership or a cross-field total, is checked in the service.
- Every error response is the `ErrorResponse` envelope (`status`, `error`, `message`, `fieldErrors`)
  produced by the single `@RestControllerAdvice`, with a message a person can act on. No stack trace or
  SQL reaches a response.
- A domain failure throws the exception named for its outcome in `exception/`, mapped once in the
  advice. No bare `RuntimeException`, no `.get()` on an `Optional` where `.orElseThrow(...)` belongs,
  no empty catch.
- CORS allows the frontend origin from configuration (`app.cors.allowed-origins`), never `*`.
- Logging goes through an SLF4J `Logger` with parameterized messages.

**Testing rules**:
- Every code path a change adds or modifies has a test.
- Pure domain logic, such as a calculation or a state transition, has plain JUnit unit tests. API behaviour is
  tested through `MockMvc` against the full application with the in-memory H2 configuration in
  `src/test/resources`, asserting the status code and the response body.
- A test arranges, acts and asserts in that order, and shows the three phases through blank lines and
  named locals rather than `// Given` / `// When` / `// Then` markers, which the comment conventions
  ban like any other comment.
- A test method name states the guarantee it checks.
- Exceptions are asserted with `assertThrows` or `assertThatThrownBy`. Async work is never waited on
  with `Thread.sleep`.
- Edge cases are covered, not only the happy path: invalid input, a missing id, a reference to a
  resource that does not belong to its parent, and the boundary of every business rule.

**Blocking in review**:
- A hardcoded secret, API key or credential.
- A controller parameter without its input validation, or a request DTO without its constraints.
- An entity returned from, or accepted by, a controller.
- Business logic in a controller.
- A wrong status code for the outcome.
- An error response outside the `ErrorResponse` envelope, or one that leaks a stack trace, SQL or
  internals.
- A business rule enforced outside a transaction.
- Money held as `double` or `float`, or arithmetic that loses or invents a cent.
- A `@Query` assembled by string concatenation.
- A swallowed exception, a bare `Optional.get()`, or a bare `RuntimeException` for a domain failure.
- CORS opened to `*`.
- A response shape change without the matching change to the frontend API module in the same diff.
- A changed code path with no test.
- Any comment in a source file, per `.claude/conventions/comment-conventions.md`.

**Not flagged**:
- Generated sources.
- `application.properties` formatting.
- Test data setup verbosity in `@BeforeEach`.

**Definition of done**:
- The backend gate commands registered in `CLAUDE.md` are green.
- Layers hold: thin controllers, DTOs at the boundary, rules in the service.
- Every error is an `ErrorResponse` with the right status.
- Every changed path has a test.
