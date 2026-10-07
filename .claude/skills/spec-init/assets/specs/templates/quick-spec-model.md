---
id: "NNN"
slug: short-kebab-slug
title: Human readable title
template: quick
status: planned
created: YYYY-MM-DD
fronts: []
depends_on: []
---

# NNN — Title

> **How to use this template.** The quick spec is for a small change that still changes behavior, data or a
> contract — see [Spec lifecycle → When a spec is needed](../../shared/spec-lifecycle.md#when-a-spec-is-needed).
> Replace every placeholder and delete every `>` instruction block. It runs through the same workflow as a
> full spec — branch, one commit per task, related tests, the coverage gate, review, finish — with less
> planning: at most 3 Expected Results, no interview rounds when the request is unambiguous, and a review that
> may run in the same session. `Scope` and `Decisions` are optional: add them (from
> [base-spec-model.md](base-spec-model.md)) when something is deliberately left out or decided.

## Goal

> 1–2 sentences: what changes, for whom, and why.

## Context

> The Requirements line links the source-document sections this change implements, or says "none".

- Requirements: [<document> → <section>](../../../<path-to-document>#<section-anchor>) — what it requires.
- Existing code this changes: `path/to/file` — what it does today.

## Expected Results

> One to three, by the rules in [acceptance-criteria.md](../../shared/acceptance-criteria.md): observable,
> binary, with edge cases and a `Verify by`.

### ER-01 — Short name

- **Front:** backend
- **Behavior:** Given ..., when ..., then ...
- **Edge and error cases:** ...
- **Verify by:** `command` · test file and test name

## Tasks

> Rules: [task-breakdown.md](../../shared/task-breakdown.md) — the same as a full spec, usually one or two
> tasks plus the Verification task.

### <Front> (`<path>`)

- [ ] **T-01** — What to do, in `path/to/file`, with its tests.
  Covers: ER-01 · Done when: ...

### Verification

- [ ] **T-NN** — Run every command in the Verification Plan from the repo root; all pass. Record the output
  summary as evidence. Covers: all · Done when: every command exits 0.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs NNN` — the related tests pass (with coverage)
  - `node .specs/scripts/check-coverage.mjs NNN` — every line this spec adds or changes is covered
  - `command` — what it proves (lint, type check and build of the workspaces touched)

## Memory Impact

> What `spec-finish` must update in `.specs/memory/`, one bullet per file — or "None.".

- `memory/product.md` — ...

## Amendments

> Reserved for `spec-plan --amend` and `spec-execute`. Leave empty when planning.

## Review

> Reserved for `spec-review`. Leave empty when planning.
