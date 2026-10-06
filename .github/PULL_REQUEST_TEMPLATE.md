## Summary

<!-- What this changes and why, in a few sentences a non-technical reader can follow. -->

Closes #

## How this was verified

<!-- What you ran or exercised and what it reported, plus anything you checked by hand. -->

## Contract or schema change

<!-- Delete this heading and its comment if no interface, schema or public contract changed.
     Otherwise: what changed, what accompanies it (version bump, migration note, regenerated
     artefact), and what a consumer has to do. -->

## Checklist

- [ ] The change does what the issue asks, and nothing it does not ask for
- [ ] Every gate command this repo registers passes on this branch
- [ ] The version bump and changelog entry this repo registers are present, exactly once
- [ ] Commits are clean: meaningful messages, no secrets, no `--no-verify`

## Project-specific

- [ ] Area: `frontend` / `backend` / `fullstack` (delete the ones that do not apply)
- [ ] Tests added or updated for every changed code path
- [ ] A change to an endpoint's shape updates the backend controller, its DTOs and the frontend API
      client in this same pull request
