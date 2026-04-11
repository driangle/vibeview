## Workflow

- Run `make check-lite` frequently to catch compilation and lint errors early.
- After finishing a task, run `make check` to verify lint, tests, and build all pass.

## Coding Principles

- **Clarity over cleverness** — straightforward solutions, obvious naming, simple control flow.
- **Keep it simple (KISS)** — start with the simplest design that solves today's problem.
- **Design for change** — small modules, clear boundaries, minimal coupling.
- **Single responsibility** — each module/function does one thing well.
- **Composition over inheritance** — compose behavior from small pieces.
- **Explicit interfaces and contracts** — make inputs, outputs, and assumptions clear.
- **Test behavior, not implementation** — focus on critical paths and edge cases.
- **Test all new behavior** — every new feature or functionality must have a corresponding test.
- **One responsibility per file** — split by concept, not size.
- **Group by feature, not "utils"** — related code together, unrelated code apart.
- **Backend owns the logic, frontend is a thin display layer** — domain logic (state derivation, filtering, classification) lives in Go. The web client consumes server-provided values and handles rendering only.
- **Minimal UX for system-like events** — low-level session events (hooks, queue operations, last-prompt, etc.) use the shared inline `EventMessage` component: compact left-border style with a text preview, click to view raw JSON. Don't introduce custom card/expand UX for these.
