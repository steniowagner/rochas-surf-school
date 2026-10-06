---
id: "NNN"
slug: short-kebab-slug
title: Human readable title
status: planned
created: YYYY-MM-DD
fronts: []
depends_on: []
---

# NNN — Title

> **How to use this template.** Replace every placeholder, delete every `>` instruction block, and delete
> every section or task group that does not apply. List in `fronts` the fronts this spec touches, named as in
> [technical-context.md](../../memory/technical-context.md) → Applications (e.g. `backend`, `web`, `mobile`).
>
> A spec is a contract between three agents: the **planner** (writes it), the **executor** (implements it)
> and the **reviewer** (verifies it). The reviewer never sees the planning conversation, so everything it
> needs to decide pass/fail must be written here.

## Goal

> 2–4 sentences: what this change delivers, for whom, and why. The reviewer reads this first to judge
> whether the implementation is the *right* thing, not just *a* thing that passes the checks.

## Context

> Why the change exists and what it builds on. Link to memory instead of repeating it; add only technical
> context that is local to this change.
>
> **Requirements** links every section of the product's source documents (listed in `product.md` → Source
> documents) that this spec implements — the section itself, not the whole document — or says "none". The
> executor reads them for detail, and the reviewer checks the implementation doesn't contradict them. When the
> spec deliberately departs from a linked section, a Decision says so: the spec wins.

- Product: [product.md](../../memory/product.md) — relevant concepts: ...
- Requirements: [<document> → <section>](../../../<path-to-document>#<section-anchor>) — what it requires.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: ...
- Existing code this builds on: `path/to/file` — what it does today.
- Depends on: spec `NNN` (remove if none).

## Scope

### In scope

- ...

### Out of scope

> Name what a reasonable person might assume is included but is not. The executor must not build it, and
> the reviewer must not fail the spec for its absence.

- ...

## Decisions

> Every decision made during planning that is not obvious from the code or memory, with its reason.
> Decisions bind the executor; a reviewer checks the code against them.

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | ...      | ...    |

## Expected Results

> The acceptance contract. Each result is observable, binary (pass/fail) and carries a verification method
> that a reviewer agent can run or follow. Rules: [acceptance-criteria.md](../../shared/acceptance-criteria.md).

### ER-01 — Short name

- **Front:** backend
- **Behavior:** Given ..., when ..., then ...
- **Edge and error cases:** ...
- **Verify by:** `command` · test file and test name · HTTP request with expected status/body · manual step with the expected observation

## Tasks

> Rules: [task-breakdown.md](../../shared/task-breakdown.md). Every spec has tasks, however small:
> `spec-execute` executes tasks and nothing else. One group per front this spec touches, ordered by
> dependency (e.g. domain modules → shared packages → backend → web → mobile → infra), and the Verification
> group last. Each task: one front, one coherent change, real paths, the project skill when one fits,
> `Covers` (ER ids or `enabling`) and an observable `Done when`.

### <Front> (`<path>`)

- [ ] **T-01** — What to do, in `path/to/file`. Skill: [`skill-name`](../../../.claude/skills/skill-name).
  Covers: ER-01 · Done when: ...

- [ ] **T-02** — ...

### Verification

- [ ] **T-NN** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all

## Verification Plan

> Everything the reviewer runs or checks, in order. Commands are copy-pasteable from the repo root and follow
> [technical-context.md](../../memory/technical-context.md) → Automated validation. Manual checks say exactly
> what to open, what to do and what must be seen.

- Automated:
  - `command` — what it proves (every test suite, lint, type check, build, the e2e suites of the apps touched)
  - tests with coverage, then `node .claude/skills/spec-plan/scripts/check-coverage.mjs NNN` — 100% on every
    source file this spec creates or changes
- User journeys (e2e, followed in a browser or simulator):
  - ...

## Memory Impact

> What `spec-finish` must update in `.specs/memory/` once the spec is accepted, one bullet per file:
> `product.md` (new or changed concepts and product decisions), `technical-context.md` (stack items,
> conventions, integrations), `structure.md` (workspaces, modules, aggregates, routes created or moved),
> `modules.md` (a new module, or a responsibility moving between modules) and `modules/<module-id>.md`
> (the module's concepts, rules, permissions and boundaries). `product.md`'s Current state and
> `structure.md`'s `.specs/` section are always updated, so they don't need a bullet.

- `memory/product.md` — ...

## Assumptions

> Optional. Facts the user explicitly accepted as assumptions instead of deciding them. Never put an open
> question here: a spec with open questions is not ready to be written.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

> Reserved for `spec-execute`: changes to Scope, Decisions or Expected Results the user approved during
> execution (date, before → after, reason). Leave empty when planning.

## Review

> Reserved for `spec-review`. Leave empty when planning.
