# ADR 0002: Stateless JWT with rotating refresh tokens

- Status: accepted
- Date: 2026-10-06

## Context
The React SPA and the API are separate deployables. Server sessions would need sticky sessions or a
shared session store to scale horizontally.

## Decision
Short-lived (15 min) signed JWT access tokens carry the user id and role. Long-lived (7 day) opaque
refresh tokens are stored hashed (SHA-256) in PostgreSQL and rotated on every use: the old token is
revoked when a new pair is issued, and logout revokes it. Passwords are hashed with BCrypt. The SPA keeps
the access token in memory and the refresh token in `localStorage`, refreshing once on a `401`.

## Consequences
- The API is stateless for every request except refresh, so it scales horizontally.
- Access tokens cannot be revoked before expiry; the short TTL bounds that window.
- `localStorage` is readable by injected script; an httpOnly cookie for the refresh token is the
  hardening step once the SPA and API share a domain.
