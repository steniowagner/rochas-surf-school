// Programmatic checks of spec-plan's output evals (evals.json). Each returns { text, passed, evidence }.
export default {
  "plan-multiply-from-requirements"({ check, sh, git, read, before }) {
    const specs = sh("ls -d .specs/changes/*/ 2>/dev/null").out.trim().split("\n").filter(Boolean);
    const folder = specs[0]?.replace(/\/$/, "").split("/").pop() ?? "";
    const text = folder ? read(`.specs/changes/${folder}/spec.md`) ?? "" : "";
    const checked = sh("node .specs/scripts/check-spec.mjs 001");
    const ers = text.slice(text.indexOf("## Expected Results"), text.indexOf("## Tasks"));
    const plan = text.slice(text.indexOf("## Verification Plan"));
    const changed = sh("git status --porcelain").out.trim().split("\n").filter(Boolean);
    return [
      check("exactly one spec, with id 001, in .specs/changes/", specs.length === 1 && folder.startsWith("001-"), specs.join(", ") || "none"),
      check("check-spec.mjs passes", checked.code === 0, checked.out.split("\n").slice(0, 12).join(" | ")),
      check("status is planned", /^status:\s*planned\s*$/m.test(text), text.match(/^status:.*$/m)?.[0]),
      check(
        "the Requirements line links requirements.md#multiplying-numbers",
        /^\s*-\s*Requirements:.*requirements\.md#multiplying-numbers/m.test(text),
        text.match(/^\s*-\s*Requirements:.*$/m)?.[0],
      ),
      check("the Expected Results cover multiplying by zero and the TypeError", /\b0\b|zero/i.test(ers) && /TypeError/.test(ers), ers.slice(0, 400)),
      check(
        "the Verification Plan runs the related tests and the coverage gate for 001",
        /run-related-tests\.mjs 001/.test(plan) && /check-coverage\.mjs 001/.test(plan),
        plan.slice(0, 300),
      ),
      check(
        "nothing outside .specs/ changed and nothing was committed",
        git("rev-parse", "HEAD") === before.head && changed.every((l) => l.slice(3).startsWith(".specs/")),
        changed.join(", "),
      ),
    ];
  },
};
