# Module: {{Module Name}}

> Template for a **module detail** file (`.specs/memory/modules/<module-id>.md`): the business-level
> description of one module — what it is for, its concepts and rules, who can do what, and its boundaries.
> Before using it, replace the placeholders below and remove this instructions section.
>
> **Purpose of this file:**
> - It is the **deep dive** behind the module's block in [Modules](../modules.md): what someone planning a
>   change needs to know about this module's business before touching it.
> - It describes **business, not code**: no classes, tables or endpoints. Where the code lives is in
>   [Project structure](../structure.md); stack and conventions are in [Technical context](../technical-context.md).
> - Concepts keep the **same names and ids** as in [Product](../product.md); this file adds the detail the
>   product summary leaves out (fields, lifecycle, limits, rules).
> - `spec-finish` creates it when a spec creates the module, and updates it whenever a spec changes the
>   module's concepts, rules or boundaries.
> - **One area or several.** A module with a single business area keeps `Main concepts` and `Relevant
>   business rules`. A module that groups several areas replaces those two sections with one `## {{Area}}`
>   section per area: a short description, then its concepts and rules.
>
> **Placeholders:**
> - `{{Module Name}}` / `{{module-id}}` — the module's name in plain language and its folder name (e.g.:
>   Authentication / `auth`).
> - `{{purpose}}` — why the module exists and which part of the product's value it delivers.
> - `{{Concept}}` / `{{concept-id}}` — a domain concept and its id, as in product.md.
> - `{{Role}}` — a role from product.md.
> - `{{spec}}` — the spec's id and slug (e.g.: `003-booking-cancellation`); its folder in `finished/` adds a
>   timestamp in front.

## What it is for

{{purpose}}. {{areas}} (only when the module groups several areas, e.g.: "It brings together three business
areas: **Bookings**, **Availability** and **Reviews**.").

## Main concepts

> One bullet per concept: what it is, key fields, relationships (with cardinality), lifecycle (states and
> who moves them between states) and limits.

- **{{Concept}}** (`{{concept-id}}`): {{what-it-is}}. Key fields: {{fields}}. Relationships:
  {{relationships}}. Lifecycle: {{states}}. Limits: {{limits}}.

## Relevant business rules

> Rules with their numbers. Bold the rule, then its reason or consequence — a rule without a reason is the
> first one to be "fixed" by mistake.

- **{{rule}}**: {{reason-or-consequence}}.

## Who can do what

> One bullet per role that interacts with this module. Remove the section when a single role uses the module
> and product.md already says what it can do.

- **{{Role}}** — {{what-they-can-do-and-see}}.

## Boundaries

{{boundaries}}: what the module deliberately does **not** do, and which module or infrastructure capability
does it instead.

## Spec history

> One line per finished spec that changed this module, oldest first. `spec-finish` appends to it.

- `{{spec}}` — {{what-it-changed-in-this-module}}.
