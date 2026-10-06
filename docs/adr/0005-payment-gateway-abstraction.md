# ADR 0005: Payment provider behind an interface

- Status: accepted
- Date: 2026-10-06

## Context
The MVP needs a working checkout without a real payment provider, but a real one (Stripe) must be
pluggable later without touching order logic.

## Decision
The `payment` module exposes a `PaymentGateway` interface (strategy pattern). `MockPaymentGateway` in
`infrastructure` approves every card except one ending in `0000`, which it declines, so both paths can be
demonstrated. The order service depends only on the interface. `OrderPlacedEvent` is published on
placement and handled after commit by `@TransactionalEventListener`, the hook for notifications.

## Consequences
- Swapping in Stripe test mode is a new `PaymentGateway` implementation plus configuration.
- Payment runs synchronously in the request; a webhook-driven flow is the production follow-up.
