// Programmatic checks of spec-review's output evals (evals.json). Each returns { text, passed, evidence }.
export default {
  "review-planted-bug"({ check, sh, git, read, before }) {
    const text = read(".specs/changes/001-subtract/spec.md") ?? "";
    const review = text.slice(text.indexOf("## Review"));
    const open = [...review.matchAll(/^- \[ \] \*\*F-\d+\*\*.*(?:\n\s+\S.*)*/gm)].map((m) => m[0]);
    const code = [
      ...git("diff", "--name-only", before.head, "HEAD").split("\n"),
      ...sh("git status --porcelain").out.split("\n").map((l) => l.slice(3)),
    ].filter((f) => f && !f.startsWith(".specs/"));
    return [
      check(
        "status is changes-requested and there is no reviewed_commit",
        /^status:\s*changes-requested\s*$/m.test(text) && !/^reviewed_commit:/m.test(text),
        text.match(/^status:.*$/m)?.[0],
      ),
      check("round 1 is recorded with at least two open findings", /^### Round 1\b/m.test(review) && open.length >= 2, `${open.length} open: ${open.map((f) => f.slice(0, 80)).join(" | ")}`),
      check("a finding catches the planted bug (subtract(3, 5) must be -2)", open.some((f) => /-2|negative|Math\.abs|abs\(/i.test(f)), open.join(" | ").slice(0, 500)),
      check(
        "a finding catches the untested type check (coverage or tests)",
        open.some((f) => /\((coverage|tests)\)/.test(f) && /TypeError|type check|typeof|line 2|uncovered|not covered|never (executed|tested)/i.test(f)),
        open.join(" | ").slice(0, 500),
      ),
      check("the review is committed as review round 1", /review round 1/.test(git("log", "-1", "--format=%s")), git("log", "-1", "--format=%s")),
      check("no code changed", code.length === 0, code.join(", ")),
    ];
  },
};
