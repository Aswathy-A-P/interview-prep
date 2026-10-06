# API contract (v1)

Base path `/api/v1`. JSON everywhere. Money is a JSON number with two decimals (`BigDecimal` on the server).
Auth header: `Authorization: Bearer <accessToken>`. Every response carries an `X-Correlation-Id` header
(echoed when the request sends one).

## Errors

RFC 7807 `application/problem+json`:

```json
{ "type": "about:blank", "title": "Bad Request", "status": 400, "detail": "Validation failed",
  "instance": "/api/v1/cart/items", "correlationId": "…", "errors": [{ "field": "quantity", "message": "must be greater than 0" }] }
```

`errors` is present only for validation failures. Status codes: 400 invalid input, 401 unauthenticated,
403 forbidden, 404 missing, 409 conflict (stock, illegal status change, optimistic-lock failure, duplicate email).

## Paging

List endpoints take `page` (0-based, default 0), `size` (default 12, max 100), `sort` (`field,asc|desc`) and return:

```json
{ "content": [ … ], "page": 0, "size": 12, "totalElements": 31, "totalPages": 3 }
```

## Auth — public

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password (min 8), fullName }` | `201` AuthResponse |
| POST | `/auth/login` | `{ email, password }` | `200` AuthResponse |
| POST | `/auth/refresh` | `{ refreshToken }` | `200` AuthResponse (refresh token rotated; old one revoked) |
| POST | `/auth/logout` | `{ refreshToken }` | `204` |
| GET | `/auth/me` | — (authenticated) | `200` User |

AuthResponse: `{ accessToken, refreshToken, expiresIn (seconds), user: User }`
User: `{ id, email, fullName, role: "USER" | "ADMIN" }`

## Catalog — public reads

| Method | Path | Notes |
|---|---|---|
| GET | `/categories` | `200` `Category[]` (small fixed list, not paged) |
| GET | `/products` | query: `q` (name/description contains, case-insensitive), `categoryId`, `minPrice`, `maxPrice`, `page`, `size`, `sort` (`name`, `price`, `createdAt`). `200` Page<Product>. Only active products. |
| GET | `/products/{id}` | `200` Product, `404` |

Category: `{ id, name, slug }`
Product: `{ id, name, description, price, stock, imageUrl, active, category: Category }`

## Cart — USER or ADMIN

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/cart` | — | `200` Cart |
| POST | `/cart/items` | `{ productId, quantity (>=1) }` (adds to existing quantity) | `200` Cart |
| PUT | `/cart/items/{productId}` | `{ quantity (>=1) }` | `200` Cart |
| DELETE | `/cart/items/{productId}` | — | `200` Cart |
| DELETE | `/cart` | — | `204` |

Cart: `{ items: [{ productId, name, imageUrl, unitPrice, quantity, lineTotal }], totalItems, total }`
Adding more than the available stock → `409`.

## Orders — USER or ADMIN (own orders only)

| Method | Path | Notes |
|---|---|---|
| POST | `/orders` | header `Idempotency-Key` (required, ≤ 100 chars). Body `{ shippingAddress (required, ≤ 500) }`. Creates the order from the cart, reserves stock (optimistic locking), clears the cart. `201` Order. Repeating the same key for the same user returns the original order with `200`. Empty cart → `400`. Not enough stock → `409`. |
| POST | `/orders/{id}/pay` | Body `{ cardNumber }`. Mock gateway: a card number ending in `0000` is declined (`402`-style outcome reported as `409` with detail "Payment declined"); otherwise order → `PAID`. Only from `PENDING`. `200` Order. |
| POST | `/orders/{id}/cancel` | Allowed from `PENDING` or `PAID`; releases stock. `200` Order. |
| GET | `/orders` | Page<Order>, newest first. |
| GET | `/orders/{id}` | `200` Order, `404` if not the caller's. |

Order: `{ id, status, total, shippingAddress, paymentReference (nullable), createdAt, items: [{ productId, productName, unitPrice, quantity, lineTotal }] }`
Status lifecycle: `PENDING → PAID → SHIPPED → DELIVERED`; `PENDING|PAID → CANCELLED`. Anything else → `409`.

## Admin — ADMIN only

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/products` | Page<Product> including inactive; same query params as `/products`. |
| POST | `/admin/products` | ProductRequest → `201` Product |
| PUT | `/admin/products/{id}` | ProductRequest → `200` Product |
| DELETE | `/admin/products/{id}` | soft delete (`active=false`) → `204` |
| GET | `/admin/orders` | query `status` optional; Page<Order> with an extra `customerEmail` field |
| PATCH | `/admin/orders/{id}/status` | `{ status }` → `200` Order; lifecycle enforced (`409` otherwise) |

ProductRequest: `{ name (required, ≤ 200), description (≤ 2000), price (> 0, 2 decimals), stock (>= 0), imageUrl (≤ 500, optional), categoryId (required), active (default true) }`

## Ops

- `GET /actuator/health` — public
- Swagger UI at `/swagger-ui.html`, spec at `/v3/api-docs`
