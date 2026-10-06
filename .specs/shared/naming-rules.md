# Naming Rules

Naming conventions for files, folders and spec artifacts. The project's own conventions — its file suffixes
and any exceptions — are recorded in `.specs/memory/technical-context.md` (Fixed conventions → Naming) and
win over the defaults below. When a project skill (in `.claude/skills/`) generates a file, the skill's naming
wins too.

## Files and folders

- `kebab-case`, always lowercase, for files and folders.
- The name says the **responsibility**, not the implementation (`booking-card.component.tsx`, not
  `card2.tsx`).
- A suffix makes the file's role explicit when the folder doesn't already say it (`*.entity.ts`,
  `*.controller.ts`, `*.page.tsx`…). The project's list of suffixes lives in the technical context.
- Names required by tools keep their format: `README.md`, `SKILL.md`, `CLAUDE.md`, `package.json`,
  `tsconfig.json`, `spec.md`, and framework files such as `page.tsx` or `_layout.tsx`.
- Framework route folders keep the framework's syntax: `(private)`, `(tabs)`, `[id]`.

## Spec artifacts

- Spec folder: `NNN-slug` in `changes/`, `YYYYMMDDHHMMSS-NNN-slug` in `finished/`.
- Ids inside a spec: `ER-NN` (Expected Results), `T-NN` (tasks), `D-NN` (decisions). Two digits, sequential,
  never renumbered once the spec is written.

## Decision rule

When a name is ambiguous, prefer the one that makes clearest what the file represents, which layer it lives
in and what its main responsibility is.
