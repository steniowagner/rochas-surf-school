# Modules

> Template for the **modules header** file (`.specs/memory/modules.md`): the general, non-technical
> overview of the business modules — what each one does and why it exists.
> Before using it, replace the placeholders below and remove this instructions section.
>
> **Purpose of this file:**
> - It is the **index** of the business modules. It answers "where does this feature belong?" before anyone opens the code.
> - It stays **short and non-technical**: one block per module, describing responsibility and boundaries.
>   The detailed concepts and business rules of each module live in `memory/modules/<module-id>.md`.
> - It also lists the **infrastructure capabilities that are deliberately not business modules**
>   (e.g.: AI integration), so nobody creates a module for them by mistake.
> - `spec-finish` creates it when the first spec is finished, and updates it whenever a spec creates a module
>   or moves a responsibility between modules. Every block links to its detail file in `modules/`, and every
>   file in `modules/` is linked from here.
>
> **Placeholders:**
> - `{{product-name}}` — product name as the user sees it (e.g.: "Banco de Ideias").
> - `{{module-count}}` / `{{module-list}}` — how many business modules exist and their names (e.g.: "two" / **Authentication** and **Ideas**).
> - `{{growth-rule}}` — how new features enter the product (e.g.: "new features come in as a new area inside one of these modules; there is no plan for a third one").
> - `{{Module Name}}` — module name in plain language (e.g.: Authentication).
> - `{{module-id}}` — module folder name, kebab-case (e.g.: `auth`, `ideas`).
> - `{{module-responsibility}}` — what the module takes care of, from the user's point of view.
> - `{{module-boundary}}` — what the module explicitly does **not** do, and who does it instead.
> - `{{module-areas}}` — business areas grouped inside the module, if more than one (e.g.: Idea Types, Ideas, Processings, Dashboard).
> - `{{infra-capability}}` — technical capability that is not a business module (e.g.: AI Infrastructure).

This file is the **header of the business modules** of "{{product-name}}": a general,
non-technical overview of what each module does and why it exists. The details of the
concepts and business rules of each module live in their own markdown inside `modules/`.

The product has **{{module-count}} business modules**: {{module-list}}. {{growth-rule}}.
{{infra-summary}} (e.g.: "The integration with Artificial Intelligence is treated as **infrastructure**,
not as a business module.").

---

> Repeat the block below once per business module, in the order the user meets them.
> Describe responsibility and boundaries only — no entities, endpoints or tables.

## {{Module Name}}

{{module-responsibility}}. {{module-boundary}}.
{{module-areas}} (remove this sentence when the module has a single area).

- Where it physically lives: `modules/{{module-id}}`
- Business details: [modules/{{module-id}}.md](modules/{{module-id}}.md)

---

> Repeat the block below once per infrastructure capability that is **not** a business module.
> Remove it if there is none.

## {{infra-capability}} (not a business module)

{{infra-description}}: what it provides, which business concepts it deliberately does **not** know,
and through which abstract contract the business modules consume it (e.g.: "The Ideas module only
consumes this capability through an abstract contract, which makes it possible to swap the provider
without affecting the business rules.").
