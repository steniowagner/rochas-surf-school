// Programmatic checks of spec-status's output evals (evals.json). Each returns { text, passed, evidence }.
export default {
  board({ check, sh, git, final, before }) {
    const status = sh("git status --porcelain").out.trim();
    return [
      check("it reports 001 as accepted and suggests /spec-finish 001", /001[\s\S]{0,200}accepted/i.test(final) && /spec-finish 001/.test(final), final.slice(0, 600)),
      check("it reports 002 as planned and suggests /spec-execute 002", /002[\s\S]{0,200}planned/i.test(final) && /spec-execute 002/.test(final), final.slice(0, 600)),
      check("it flags the orphan branch spec/009-orphan", /009-orphan/.test(final), final.slice(0, 600)),
      check(
        "nothing changed in the repository",
        git("rev-parse", "HEAD") === before.head && git("branch", "--show-current") === before.branch && status === "?? .specs/changes/002-multiply/",
        `${git("branch", "--show-current")} · ${status}`,
      ),
    ];
  },
};
