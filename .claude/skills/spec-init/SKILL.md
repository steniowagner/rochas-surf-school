---
name: spec-init
description: Set up the spec-driven workflow (spec-plan, spec-execute, spec-review, spec-finish) in a repo. Creates the .specs/ folder (changes, finished, memory, shared rules, templates) when it is missing, then interviews the user about the product and the technical stack — inferring the stack from existing code and asking the user to confirm it — and writes .specs/memory/product.md and .specs/memory/technical-context.md. Use whenever the user runs /spec-init, when the repo has no .specs folder, when spec-plan stops because .specs or the memory files are missing or incomplete, or when the user wants to set up spec-driven development, or define, document or update what the product is, who it is for, its domain concepts, or the project's stack and conventions — even if they don't mention specs. Not for planning a specific feature (that is spec-plan).
argument-hint: "[product | tech] [product description, or a path to a doc]"
---

# spec-init

Every spec in this repo is planned, executed and reviewed against two files: `.specs/memory/product.md`
(what the product is and why) and `.specs/memory/technical-context.md` (how it is built). `spec-plan` refuses
to run without them, and every agent downstream reads them cold, without the conversation that produced
them. An ambiguity here is copied into every spec that follows, so the job of this skill is to interview the
user until both files can be read by a newcomer — person or agent — without a single follow-up question.

The flow is: **set up `.specs/` → check state → gather what exists → product (interview, confirm, write) →
technical (infer, interview, confirm, write) → validate → report.**

Product comes first because the stack exists to serve it: knowing that one kind of user books from a phone
and gets reminders turns "which stack?" into concrete questions about mobile, push notifications and
scheduled jobs.

## 1. Set up `.specs/` and check the state

1. Install the framework files:

   ```bash
   node .claude/skills/spec-init/scripts/scaffold-specs.mjs
   ```

   It creates `.specs/` at the repo root when it doesn't exist — `changes/`, `finished/`, `memory/`,
   `shared/` (the rules every spec skill follows) and `templates/` — from the copy bundled in
   `assets/specs/`, and adds any file missing from an existing install. It never overwrites: a file that
   differs from the bundled version is reported as customized and left alone, because a project may adapt
   its rules. Tell the user what was created, if anything. If the script fails, stop and report why.
2. Run the same gate `spec-plan` uses, from the repo root:

   ```bash
   node .claude/skills/spec-plan/scripts/preflight.mjs
   ```

   It reports, per file, whether it is missing, has template leftovers or has thin required sections. If the
   script doesn't exist, compare the files with the "Required by `spec-plan`" notes in the templates yourself.
3. Decide per file:
   - **missing** → write it from the template;
   - **present but failing** → treat it as a draft: keep what is valid and interview for the rest;
   - **present and passing** → show a 2–3 line summary and ask whether to keep it, refine it or rewrite it.
     Don't overwrite a file the user hasn't agreed to replace.
4. Scope: if the arguments ask for one part only (`product`, or `tech`/`technical`), do only that part.
   Otherwise do both, product first.

## 2. Gather what already exists

Read before asking. The user's attention is the scarcest resource here, and anything already written down
is something to confirm, not to ask.

- **The arguments** — text, or a path to a file (pitch, PRD, notes): read it.
- **Docs** — `README*`, `CLAUDE.md`, `AGENTS.md`, doc folders (`docs/`, `.docs/`): user journeys, design
  files, decisions.
- **Specs** — `.specs/changes/`, `.specs/finished/`, and artifacts from other spec tools (proposals, PRDs).
  They often hold most of the product knowledge already.
- **Stack inventory**:

  ```bash
  node .claude/skills/spec-init/scripts/detect-stack.mjs
  ```

  It prints facts with their source files: package manager, workspaces, frameworks with installed versions,
  scripts, config files, env variable names, ORM schema and migrations, Docker/CI/deploy files, test setup,
  docs, project skills and recent commits. Then open the files that matter for decisions: entry points,
  configs, the schema, compose files, and the project skills in `.claude/skills/` — they usually encode the
  architecture and conventions.

Don't open `.env` files: they may hold secrets. Names from `.env.example` are enough, and no secret value
ever goes into memory.

## 3. Product context → `.specs/memory/product.md`

Read `.specs/shared/interviewing.md` (how to run the interview) and `references/product-interview.md` (what
to cover, mapped to the template sections, with red flags).

**First analysis**, in one message:

- **What I already know** — the product as the sources describe it, in plain words, each fact with its
  source. If there are no sources, skip the analysis and ask one open question: what they want to build, for
  whom, and what changes for those people once it exists.
- **Issues found** — contradictions between sources (quote both), ambiguities (name the readings), missing
  information, red flags.
- **First round of questions.**

**Interview** following the shared rules. Keep it about *what* and *why*: when the user answers with
technology ("we'll use Firebase for that"), note it for the technical phase and bring the question back to
behavior.

The product interview is done when all of these hold:

- A newcomer could say in one sentence what the product is, for whom, and what value it delivers.
- Every role is named with its goals, what it can do and see, the platform it uses and how it gets access.
- The data ownership / tenancy rule is explicit.
- Every domain concept has a definition, key fields, relationships with cardinality, a lifecycle and limits
  — and exactly one name.
- Product decisions someone could "fix" by mistake are recorded with their reasons.
- Current state matches what is actually built, and out of scope is written down.
- Nothing is "TBD", and no vague qualifier is left.

**Confirm and write.** Summarize what goes into each section and ask for a go-ahead. Then write
`.specs/memory/product.md` from the template:

- Remove the instruction blocks and every placeholder. Keep the template's sections in their order;
  `In one sentence`, `For whom` and `Domain concepts` must have real content (spec-plan checks them).
- Add a section only when the product needs it, where a reader needs it: `Roles and permissions` right
  after `For whom` when there are several roles; `Main journeys` (one line each, linking to detailed docs)
  after `Domain concepts`; `Glossary` when the UI language differs from the docs or the business uses
  aliases.
- No technology: no frameworks, tables or endpoints. Concept ids (`booking`) are the only bridge to code.
- Write in English, like the rest of `.specs/`; quote UI terms literally in the product's language.

Before saving, reread the file as someone who has never heard of the product: every concept it uses is
defined, no two sections contradict each other, and no sentence can be read two ways. Fix, then save.

## 4. Technical context → `.specs/memory/technical-context.md`

Read `references/technical-interview.md` (the areas mapped to the template sections, the evidence to look
for, and what code can't answer).

**Inferred or planned stack**, in one message:

- **When code exists:** present the stack area by area with evidence (`apps/backend/package.json` →
  NestJS 12.1.2). Separate what the code proves, what you inferred and need confirmed, and what the code
  can't tell — intent, such as whether template code stays or which of two test runners is the standard.
  Point out inconsistencies: docs that disagree with the code, two tools for the same job, stock template
  code.
- **When there is no code:** ask what they plan to use, area by area, with a recommendation for each that
  fits the product (platforms, roles, integrations) and any preference they stated. Recommend; don't impose.
- **Product → tech cross-check:** every product capability that needs technical support (push
  notifications, payments, file or photo storage, email, maps, scheduled jobs, offline use, real time) gets
  a decision or an explicit deferral ("provider chosen by the first spec that needs it"). A deferral is a
  decision; "TBD" is not.

**Interview** following the shared rules. It is done when:

- Every application has its framework and major version, port, key libraries by concern, build command
  and test setup.
- Persistence is decided: database, ORM, schema organization, migration and seed rules, connection variable
  names.
- Architecture names the style and each layer: where it lives, what it may contain, what it must not depend
  on.
- Fixed conventions cover languages (code, UI, docs), naming (the project's file suffixes and exceptions;
  the general rules stay in `../shared/naming-rules.md`), contracts, where validation happens, data
  ownership and the error format — each with its reason.
- Authentication, error handling and external integrations are decided or explicitly deferred.
- Automated validation says, per layer, what is tested automatically, with which tool and command, and what
  is checked manually; how coverage is produced in each workspace and which files are excluded, with
  reasons (the gate is 100% on every file a spec changes); and which apps have e2e suites. `spec-review`
  builds its verification on this section, so it can't be vague.

**Confirm and write**, as in the product phase, from `.specs/templates/technical-context-model.md`:

- `Applications`, `Architecture`, `Fixed conventions` and `Automated validation` are required (spec-plan
  checks them). Adapt the rest to the repo: `Repository` instead of `Monorepo` for a single package; remove
  sections that don't apply; add one for a real cross-cutting concern (deployment, caching, observability).
- Precise and verifiable: installed major versions (not guesses), ports, paths, environment variable names —
  never values.
- A non-obvious rule carries its reason.
- Don't copy command lists or explanations that already live in `CLAUDE.md` or a README; state the decision
  and link to them. If those docs disagree with what was decided, ask the user which is right and tell them
  which file needs fixing — don't edit those files unasked.

## 5. Validate

Run the preflight again. It must print `PREFLIGHT OK`: it is exactly the gate `spec-plan` applies, so
passing it is what "done" means. If it fails, fix the file and rerun.

Apart from installing missing framework files in step 1, this skill writes only these two memory files. It
doesn't change code, docs, other memory files, or framework files the project has customized. Project facts
go in memory, never in `shared/` or `templates/`: those stay valid for any repository.

## 6. Report

Keep it short: whether `.specs/` was created, the paths written, 2–3 lines on what each one says, the deferrals and accepted assumptions
worth a second look, any inconsistency the user should fix elsewhere (e.g. a stale `CLAUDE.md`), and the
next step: `/spec-plan <first feature>`.
