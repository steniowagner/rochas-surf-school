// Programmatic checks of spec-execute's output evals (evals.json). Each returns { text, passed, evidence }.
export default {
  "execute-three-task-spec"({ check, sh, git, read, before }) {
    const branch = git("branch", "--show-current");
    const text = read(".specs/changes/001-arithmetic/spec.md") ?? "";
    const base = text.match(/^base_commit:\s*(\S+)/m)?.[1];
    const log = git("log", "--format=%H %s", `${before.head}..HEAD`).split("\n").filter(Boolean);
    const files = (subject) => {
      const line = log.find((l) => l.includes(subject));
      return line ? git("show", "--name-only", "--format=", line.split(" ")[0]) : "";
    };
    const t1 = files("(T-01)");
    const t2 = files("(T-02)");
    const checked = sh("node .specs/scripts/check-spec.mjs 001");
    const related = sh("node .specs/scripts/run-related-tests.mjs 001 2>&1 | tail -4");
    const coverage = sh("node .specs/scripts/check-coverage.mjs 001");
    const behavior = sh(
      `node --input-type=module -e 'import { subtract } from "./packages/calc/src/subtract.js"; import { multiply } from "./packages/calc/src/multiply.js";
       let t = 0; try { subtract("5", 3) } catch (e) { if (e instanceof TypeError) t++ } try { multiply(2, null) } catch (e) { if (e instanceof TypeError) t++ }
       console.log(subtract(5, 3), subtract(3, 5), multiply(4, 3), multiply(7, 0), t)'`,
    );
    return [
      check("the work is on spec/001-arithmetic", branch === "spec/001-arithmetic", branch),
      check("a start commit records base_commit", base === before.head && log.some((l) => /docs\(spec-001\): start/.test(l)), `base_commit ${base}; ${log.join(" | ")}`),
      check(
        "T-01 and T-02 each have their own commit, touching their own files",
        /subtract\.js/.test(t1) && !/multiply/.test(t1) && /multiply\.js/.test(t2) && !/subtract/.test(t2),
        `T-01: ${t1.replace(/\n/g, ", ")} · T-02: ${t2.replace(/\n/g, ", ")}`,
      ),
      check("every task is checked with ✅ evidence and check-spec.mjs passes", checked.code === 0 && /pending 0/.test(checked.out), checked.out.split("\n").slice(0, 8).join(" | ")),
      check("status is in-review", /^status:\s*in-review\s*$/m.test(text), text.match(/^status:.*$/m)?.[0]),
      check("the related tests pass", related.code === 0, related.out),
      check("every changed line is covered", coverage.code === 0, coverage.out.split("\n").slice(0, 6).join(" | ")),
      check("subtract and multiply behave as the Expected Results say", behavior.out.trim() === "2 -2 12 0 2", behavior.out.trim()),
      check("the working tree is clean", sh("git status --porcelain").out.trim() === "", sh("git status --porcelain").out),
    ];
  },
};
