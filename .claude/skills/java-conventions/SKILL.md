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


Every path below is relative to `backend/`. The build plan in the issue is the product source of truth;
these rules are how its code is held to account.

**Architecture rules**:
- A modular monolith under one base package `com.interviewprep.shop`: `common/`, `auth/`, `catalog/`,
  `cart/`, `order/`, `payment/` (and `ai/` when added). Each module splits into `api/` (controllers and
  request/response records), `application/` (services and use cases), `domain/` (entities, domain logic,
  repository interfaces) and `infrastructure/` (external clients and adapters).
- A module reaches another only through its `application/` services, never through its repositories or
  entities' internals.
- A controller holds no business logic: it validates input, calls one service method and returns its
  result. State transitions and invariants live on the entity or in the service.
- An entity never crosses the controller boundary. Requests and responses are Java records in `api/`.
- An external dependency such as a payment provider sits behind an interface in the module, with its
  implementation in `infrastructure/` chosen by configuration (strategy pattern).
- Side effects of a committed change, such as notifications after an order is placed, run from a
  domain event handled by `@TransactionalEventListener`.
- Dependency injection is constructor injection with `final` fields, never field injection.

**State, data and API rules**:
- Persistence is Spring Data JPA over PostgreSQL. The schema is owned by Flyway migrations in
  `src/main/resources/db/migration`; `ddl-auto` is `validate`, and an applied migration is never edited:
  a change adds a new versioned migration.
- Stock is protected by optimistic locking (`@Version`); a lost update surfaces as `409`, never as an
  oversell.
- Order placement takes an `Idempotency-Key`; a repeated key for the same user returns the original
  order rather than placing a second one.
- Money is `BigDecimal` with two decimal places, `NUMERIC(12,2)` in the database. Never `double` or `float`.
- A read-only service method carries `@Transactional(readOnly = true)`; a method that writes more than
  one row, or reads then writes, carries `@Transactional`.
- Queries address N+1 risk with `@EntityGraph` or `JOIN FETCH`. A query binds its parameters and is
  never assembled by string concatenation.
- Paths are versioned under `/api/v1/{resource}` as plural nouns; admin operations under
  `/api/v1/admin/...`. `docs/api.md` is the contract, and a change to it changes the frontend types in
  the same diff. Status codes are exact: `201` on create, `204` on no content, `400` invalid input,
  `401` unauthenticated, `403` forbidden, `404` missing, `409` conflicting state.
- Every list endpoint is paginated and returns the shared page record; page size is capped.
- A request record carries Jakarta validation constraints and the controller parameter carries `@Valid`.
- Every error response is an RFC 7807 `ProblemDetail` produced by the single `@RestControllerAdvice` in
  `common/`, including 401 and 403 from the security chain, and carries the request's correlation id.
  No stack trace or SQL reaches a response.
- A domain failure throws the exception named for its outcome, mapped once in the advice. No bare
  `RuntimeException`, no `Optional.get()`, no empty catch.
- Authentication is stateless JWT: short-lived access tokens, rotating refresh tokens stored hashed,
  passwords hashed with BCrypt. A user reads and changes only their own cart and orders.
- Configuration comes from profiles and environment variables. No secret, password hash or real key is
  committed; CORS allows configured origins only, never `*`.
- Logging goes through SLF4J with parameterized messages and the correlation id in the MDC.

**Testing rules**:
- Every code path a change adds or modifies has a test.
- Domain logic and services have JUnit 5 + Mockito unit tests that need no Spring context.
- Every endpoint has an integration test against real PostgreSQL through Testcontainers (the shared
  integration base class) driven by RestAssured, asserting the status code and the body.
- A test arranges, acts and asserts in that order, separated by blank lines and named locals, never by
  comment markers.
- A test method name states the guarantee it checks. Async work is never waited on with `Thread.sleep`.
- Edge cases are covered: invalid input, a missing id, another user's resource, insufficient stock, an
  illegal status change and a repeated idempotency key.

**Blocking in review**:
- A hardcoded secret, API key, credential or password hash.
- A controller parameter without its input validation, or a request record without its constraints.
- An entity returned from, or accepted by, a controller; business logic in a controller.
- A wrong status code, or an error response that is not a `ProblemDetail` or leaks internals.
- An edited Flyway migration that has already been applied, or `ddl-auto` other than `validate`.
- Stock changed without optimistic locking, or order placement without idempotency.
- A user able to read or change another user's cart or orders, or an admin endpoint open to `USER`.
- Money held as `double` or `float`.
- A list endpoint without pagination; a query assembled by string concatenation.
- A swallowed exception, a bare `Optional.get()`, or a bare `RuntimeException` for a domain failure.
- A contract change without the matching frontend change in the same diff.
- A changed code path with no test.
- Any comment in a source file, per `.claude/conventions/comment-conventions.md`.

**Not flagged**:
- Generated sources, including MapStruct implementations.
- Seed data volume in migrations.
- Test data setup verbosity.

**Definition of done**:
- The backend gate commands registered in `CLAUDE.md` are green, including the Testcontainers suite in CI.
- Module boundaries hold; DTOs at the boundary; rules in the domain and services.
- Every error is a `ProblemDetail` with the right status.
- Every changed path has a test.
