# Shop: E-commerce Platform (interview build)

A focused, production-style e-commerce MVP: **Java 21 / Spring Boot 3** modular-monolith backend,
**React + TypeScript** frontend, **PostgreSQL 16 + Flyway**, all started with one command.

## Run it

```bash
docker compose up --build
```

| What | URL |
|---|---|
| Storefront | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Health | http://localhost:8080/actuator/health |

Demo admin (seeded from env, see `.env.example`): `admin@shop.local` / `admin12345`. Register any
other account to shop as a normal user. Mock payment: any card number works except one ending in
`0000`, which is declined.

### Local development

```bash
docker compose up postgres                 # database only
cd backend && JWT_SECRET=local-dev-only-jwt-secret-change-me-0000 ADMIN_EMAIL=admin@shop.local ADMIN_PASSWORD=admin12345 ./mvnw spring-boot:run
cd frontend && npm install && npm run dev  # http://localhost:5173, proxies /api to :8080
```

## Features (MVP scope)

- **Auth:** register, login, JWT access tokens (15 min) + rotating refresh tokens (7 days, stored hashed), USER/ADMIN roles
- **Catalog:** categories, ~30 seeded products, search, category and price filters, sorting, pagination
- **Cart:** add, update, remove, one cart per user, stock-checked
- **Checkout and orders:** order from cart with an `Idempotency-Key`, stock reserved under optimistic locking,
  lifecycle `PENDING → PAID → SHIPPED → DELIVERED`, `PENDING|PAID → CANCELLED` (stock released)
- **Payments:** `PaymentGateway` interface with a mock implementation (strategy pattern)
- **Admin:** product CRUD (soft delete) and order management with lifecycle-enforced status changes

## Architecture

Modular monolith (`common`, `auth`, `catalog`, `cart`, `order`, `payment`), each module split into
`api / application / domain / infrastructure`. See [`docs/architecture.md`](docs/architecture.md) for the
diagram and [`docs/api.md`](docs/api.md) for the API contract.

### Key decisions ([ADRs](docs/adr))

1. [Modular monolith, not microservices](docs/adr/0001-modular-monolith.md)
2. [Stateless JWT with rotating refresh tokens](docs/adr/0002-jwt-with-refresh-tokens.md)
3. [Optimistic locking for stock + idempotent order placement](docs/adr/0003-optimistic-locking-for-stock.md)
4. [PostgreSQL with Flyway-owned schema](docs/adr/0004-postgres-and-flyway.md)
5. [Payment provider behind an interface](docs/adr/0005-payment-gateway-abstraction.md)

### Production-grade details

- RFC 7807 `ProblemDetail` for every error (including 401/403), with the request's correlation id
- `X-Correlation-Id` filter, id in the MDC and on every log line
- `/api/v1` versioning, pagination on every list endpoint, `BigDecimal` money (`NUMERIC(12,2)`)
- Constructor injection, records for DTOs, Bean Validation with `@Valid`, MapStruct mapping
- `ddl-auto=validate`; the schema is owned by Flyway migrations
- Config from profiles and env vars; no secrets in the repo; CORS allow-list
- Virtual threads enabled; Actuator health; Swagger UI

### Frontend

React + TypeScript + Vite, Tailwind CSS, **TanStack Query** for all server state, Context only for auth,
**React Hook Form + Zod** for forms, React Router with protected and admin routes, feature folders
(`src/features/{auth,catalog,cart,checkout,orders,admin}`). One API client handles the bearer token, a
single deduplicated refresh on `401`, and `ProblemDetail` → `ApiError` mapping.

## Testing and quality

| | |
|---|---|
| Backend unit | JUnit 5 + Mockito: order lifecycle, order placement (stock, idempotency, empty cart), JWT, payment |
| Backend integration | Testcontainers (real PostgreSQL 16) + RestAssured: auth, catalog, cart → order → pay → cancel, admin authorization, ProblemDetail shape |
| Frontend | Vitest + React Testing Library: API client refresh/retry, login validation, product list, cart, admin order transitions |
| Quality | Spotless, ESLint (`--max-warnings=0`), TypeScript strict, JaCoCo coverage report, gitleaks |
| CI | GitHub Actions: lint, typecheck, tests, build, JaCoCo artifact, `docker compose build` |

```bash
cd backend && ./mvnw spotless:apply && ./mvnw verify      # integration tests need Docker
cd frontend && npm run lint && npm test -- --run && npm run build
```

## How it was built (agentic harness)

`CLAUDE.md` and `.claude/` hold the conventions the coding agents followed: the Java and React
convention skills, senior reviewer agents, and guardrail hooks that block secrets, comments in source,
commits to `main` and unsafe shell commands, and lint every edited file. Work flows issue → branch →
gates → reviewer agents → PR.

## Trade-offs and next steps

- **AI layer** (shopping-assistant chat with tool use, pgvector semantic search, AI product descriptions)
  is the next phase; it slots in as an `ai` module behind an `LlmClient` interface.
- Typed API client is hand-written against `docs/api.md`; next step is generating it from the OpenAPI spec.
- Refresh token in `localStorage` → move to an httpOnly cookie once SPA and API share a domain.
- Scaling: read replicas and Redis caching for the catalog, extracting `order`, Kafka for domain events.
- Spring Modulith tests to enforce module boundaries; Checkstyle; Stripe test-mode gateway.
