# Architecture

```mermaid
flowchart LR
  Browser["React SPA<br/>(TanStack Query, RHF + Zod)"] -->|/api/v1 via nginx| API
  subgraph API["Spring Boot modular monolith"]
    direction TB
    common["common<br/>ProblemDetail, correlation id, paging"]
    auth["auth<br/>JWT, refresh tokens, users"]
    catalog["catalog<br/>categories, products, search"]
    cart["cart"]
    order["order<br/>lifecycle, stock reservation, idempotency"]
    payment["payment<br/>PaymentGateway → MockPaymentGateway"]
    cart --> catalog
    order --> cart
    order --> catalog
    order --> payment
  end
  API -->|JPA + Flyway| DB[("PostgreSQL 16")]
```

## Modules

Each module has `api/` (controllers, request/response records), `application/` (services), `domain/`
(entities, domain logic, repositories) and, where needed, `infrastructure/` (adapters).

| Module | Responsibility |
|---|---|
| `common` | Global exception handler returning RFC 7807 `ProblemDetail`, correlation-id filter, page response, security config |
| `auth` | Register, login, JWT access tokens, rotating refresh tokens, USER/ADMIN roles, admin seeding |
| `catalog` | Categories, products, public search with filters/sort/pagination, admin CRUD |
| `cart` | One cart per user; add, update, remove with stock checks |
| `order` | Checkout from cart with idempotency key, optimistic-lock stock reservation, status lifecycle, `OrderPlacedEvent` |
| `payment` | `PaymentGateway` interface and the mock implementation |

## Order lifecycle

```mermaid
stateDiagram-v2
  [*] --> PENDING: place order (stock reserved)
  PENDING --> PAID: pay
  PAID --> SHIPPED: admin
  SHIPPED --> DELIVERED: admin
  PENDING --> CANCELLED: cancel (stock released)
  PAID --> CANCELLED: cancel (stock released)
```

## Runtime

`docker compose up` starts PostgreSQL (named volume, healthcheck), the backend (starts once the database
is healthy, runs Flyway on boot) and the frontend (static build served by nginx, which proxies `/api`).
