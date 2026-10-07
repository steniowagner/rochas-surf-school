// Programmatic checks of spec-finish's output evals (evals.json). Each returns { text, passed, evidence }.
export default {
  "finish-accepted-spec"({ check, sh, git, read, final }) {
    const archived = sh("ls -d .specs/finished/*/ 2>/dev/null").out.trim().split("\n").filter(Boolean);
    const folder = archived[0]?.replace(/\/$/, "").split("/").pop() ?? "";
    const spec = folder ? read(`.specs/finished/${folder}/spec.md`) ?? "" : "";
    const product = read(".specs/memory/product.md") ?? "";
    const current = product.slice(product.indexOf("## Current state"), product.indexOf("## Out of scope"));
    const requirements = read(".docs/requirements.md") ?? "";
    const section = requirements.slice(requirements.indexOf("### Subtracting numbers"), requirements.indexOf("### Multiplying numbers"));
    const preflight = sh("node .specs/scripts/preflight.mjs");
    const pushed = sh("git ls-remote origin spec/001-subtract").out.trim();
    const gate = sh("node .specs/scripts/check-pr.mjs spec/001-subtract --no-tests");
    return [
      check(
        "the spec is archived in .specs/finished/<YYYYMMDDHHMMSS>-001-subtract with status finished",
        /^\d{14}-001-subtract$/.test(folder) && /^status:\s*finished\s*$/m.test(spec) && !read(".specs/changes/001-subtract/spec.md"),
        `${folder} · ${spec.match(/^status:.*$/m)?.[0]}`,
      ),
      check("product.md's Current state mentions subtract", /subtract/i.test(current), current.slice(0, 300)),
      check("structure.md exists and the preflight passes (no template leftovers)", Boolean(read(".specs/memory/structure.md")) && preflight.code === 0, preflight.out.slice(0, 400)),
      check("requirements.md marks Subtracting numbers as implemented in spec 001-subtract", /Implemented in spec 001-subtract/.test(section), section),
      check(
        "one finish commit and a clean tree",
        /docs\(spec-001\): finish/.test(git("log", "-1", "--format=%s")) && sh("git status --porcelain").out.trim() === "",
        `${git("log", "-1", "--format=%s")} · ${sh("git status --porcelain").out}`,
      ),
      check("the branch is pushed to origin", pushed.split(/\s/)[0] === git("rev-parse", "HEAD"), pushed || "not pushed"),
      check("the CI gate (check-pr.mjs) passes on the branch", gate.code === 0, gate.out.split("\n").slice(-5).join(" | ")),
      check("the final message gives a pull request title naming spec 001", /\[spec 001\]|spec 001/i.test(final), final.slice(0, 400)),
    ];
  },
};
