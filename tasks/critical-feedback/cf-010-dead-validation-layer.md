---
id: "cf-010"
title: "Remove or actually use the dead runtime-validation layer"
status: pending
priority: medium
effort: small
type: improvement
tags: [dead-code, frontend, type-safety]
group: critical-feedback
phase: critical-feedback
touches: ["web/api", "web/validation"]
created: 2026-08-03
context:
  - "apps/web/src/lib/api.ts"
  - "apps/web/src/lib/validation.ts"
---

# Remove or actually use the dead runtime-validation layer

## Findings

`api.ts` defines `validatedFetcher` and `validation.ts` defines the type guards
`isMessageResponse`, `isSessionDetail`, and `isPaginatedSessions` — and **none of them are
used anywhere in production**. Verified: grepping `src` for those symbols outside
`api.ts`/`validation.ts` returns nothing.

Every hook calls the raw `fetcher`, whose `res.json()` result is blind-cast to `T`
(`api.ts:30`). So server responses are fully trusted at runtime while a complete
runtime-validation apparatus sits unused right next to the code that would benefit from it.

## Acceptance Criteria

- [ ] Decide: adopt `validatedFetcher` on the session/message/list fetch paths, or remove the unused validators
- [ ] If adopting: route the primary data hooks through `validatedFetcher` and surface a typed error when the wire shape is wrong
- [ ] If removing: delete `validatedFetcher` and the unused guards so the code doesn't imply validation that never runs
- [ ] `typeCheck`/`lint`/`test` stay green

## verify
```yaml
verify:
  - type: bash
    run: "npm run typeCheck && npm run lint"
    dir: "apps/web"
  - type: assert
    check: "Either server responses are validated at runtime on the primary fetch paths, or the unused validation layer is gone"
```
