# Interviewing

How the spec skills that talk to the user (`spec-init`, `spec-plan`) run an interview. The goal is shared
understanding with no ambiguity left, at the lowest cost of the user's attention. The agents that read the
result later never see the conversation: what isn't written down didn't happen, and what is written
ambiguously will be read the wrong way by someone.

## Before the first question

- Read everything that can already answer questions: the user's input, `.specs/memory/`, docs, specs, code.
  What those sources answer is not a question — it is a fact to state, and to confirm if it is uncertain.
- Open with a **first analysis**, in one message:
  - **What I understood** — restated in the user's domain terms, with where each fact came from.
  - **Issues found** — each concrete and sourced: *contradictions* (quote both sides), *ambiguities* (name
    the possible readings), *missing information*, *risks*.
  - **First round of questions.**
- Be direct: "this contradicts product.md, which says X" helps more than a polite hedge. Don't invent
  problems to look thorough either; say nothing about the areas that are solid.
- When there is nothing to anchor on (no input, no docs, no code), skip the analysis and ask one open
  question instead — describe it in your own words. A questionnaire before the user has spoken produces
  guesses, not answers.

## Asking

- **Rounds of at most 5 questions**, ordered so that decisions which unlock others come first. Walk the
  decision tree one branch at a time, resolving dependencies before details.
- **Number the questions and give each one your recommended answer and why**, grounded in the memory, the
  code or common practice. The user can reply "ok to all" and move on — fast without being shallow. When an
  honest recommendation isn't possible (the product vision is the user's call), offer 2–3 concrete options
  or ask open-ended.
- Discrete choices can use the AskUserQuestion tool when it is available (recommended option first). Open
  questions go in plain text.

## Handling answers

- **Push back on weak answers**: vague qualifiers (*fast, simple, intuitive, like app X, the usual, etc.*),
  answers that conflict with an earlier answer, the memory or the code, and answers that open a new branch.
  Say what's wrong and ask again. Never silently pick an interpretation.
- **"You decide"** → decide, state the decision and the reason, and record it.
- **"Leave it open"** → it becomes an assumption the user explicitly accepts, an explicit deferral ("decided
  by the first spec that needs it"), or out of scope. Never "TBD".
- **Keep a running decision log** (`D-01`, `D-02`…) as you go; it feeds the document you write.
- If the conversation shows the subject is really several things, propose a split and let the user choose.

## Closing

- The interview ends only when every exit criterion of the skill is met.
- Before writing any file, send a summary of what will be written and ask for an explicit go-ahead. When
  the user changes something, re-confirm only what changed.
