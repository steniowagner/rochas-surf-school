# Product — "{{product-name}}"

> Template for the **product memory** file (`.specs/memory/product.md`): the living, non-technical
> description of what the product is, for whom, which concepts it handles, which product decisions
> were made, where it stands today and what was intentionally left out.
> Before using it, replace the placeholders below and remove this instructions section.
>
> **Purpose of this file:**
> - It is the **entry point** for anyone (person or agent) who needs to understand the product before reading a spec.
> - It describes **what** and **why**, never **how**. Stack, libraries, folders and code patterns belong in
>   [Global technical context](../memory/technical-context.md) and [Project structure](../memory/structure.md).
> - It is a **summary**: the detailed business rules of each module live in [Modules](../memory/modules.md).
> - **Required by `spec-plan`**: `In one sentence`, `For whom` and `Domain concepts` must exist with real content,
>   and no `{{placeholder}}` may remain. Otherwise `spec-plan` refuses to run.
> - It must be **kept up to date** whenever a spec is finished (mainly "Current state" and "Out of scope").
>
> **Placeholders:**
> - `{{product-name}}` — product name as the user sees it (e.g.: "Banco de Ideias").
> - `{{one-sentence}}` — what the product is, what the user does with it and what value they get, in a single sentence.
> - `{{central-narrative}}` — short slogan that summarizes the value cycle (e.g.: "capture ideas, process with AI, reuse as many times as you need").
> - `{{target-user}}` — who uses the product and what they produce/solve with it, with concrete examples.
> - `{{data-ownership-rule}}` — how data is isolated between users/tenants (e.g.: every entity belongs to a `userId` and every query filters by it).
> - `{{concept}}` / `{{concept-id}}` — name of a domain concept and its identifier in the code, kebab-case (e.g.: Idea / `idea`).
> - `{{decision}}` — a product decision that shapes behavior and is not obvious from reading the code.
> - `{{spec-count}}` / `{{delivered-scope}}` — how many specs were delivered and a summary of what they cover.
> - `{{out-of-scope-items}}` — features consciously postponed, as recorded in the specs.
> - `{{document}}` / `{{document-role}}` — a product document and what it holds (e.g.: `.docs/requirements.md` —
>   the detailed requirements, by area).

## In one sentence

**"{{product-name}}"** is {{one-sentence}}.

Central narrative of the product: **"{{central-narrative}}"**.

## For whom

{{target-user}}. {{data-ownership-rule}}.

## Domain concepts

> One bullet per concept, in the order the user meets them in the value cycle. For each one, state:
> what it is, its key fields, how it relates to the other concepts and any limits (e.g.: max. N per parent).
> Describe the concept from the product's point of view — not its database table.

- **{{Concept}}** (`{{concept-id}}`): what it is and why it exists. Key fields: `{{field}}`, `{{field}}`.
  Relationship with other concepts: {{relationship}}. Limits/rules: {{limits}}.
- **{{Concept}}** (`{{concept-id}}`): ...

## Relevant product decisions

> Only decisions that change how the product behaves and that someone could "fix" by mistake if they
> did not know the reason. Write the decision in **bold** and follow it with the reason/consequence.

- **{{decision}}**: {{reason-and-consequence}}.
- **{{decision}}**: ...

## Current state

{{product-stage}} (e.g.: "End-to-end functional MVP") delivered by {{spec-count}} specs
({{where-they-are}}, e.g.: all finished in `.specs/finished/`): {{delivered-scope}}.
{{active-specs}} (e.g.: "There are no active specs in `.specs/changes/`." or the list of the ones in progress).

## Out of scope (future evolution, recorded in the specs)

{{out-of-scope-items}}.

## Source documents

> The documents this summary is based on, with what each one holds: a product brief, detailed requirements,
> designs. Paths from the repo root. Every spec links the sections of these documents it implements, so keep
> this list current. Write "None." when the product has no documents beyond this file.

- `{{document}}` — {{document-role}}.
