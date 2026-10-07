// Project rule (technical-context.md → Coverage): the `typeof X === "undefined" ? Object : X` conditional that
// the test transform emits for `design:paramtypes` decorator metadata is not code a test can reach. v8 reports
// it as a one-line `cond-expr` branch on the class decorator (`@Injectable()`) or on the class declaration line,
// so the coverage gate skips exactly that branch.

const CLASS_DECLARATION = /^\s*(export\s+)?(default\s+)?(abstract\s+)?class\s+\w/;
const DECORATOR = /^\s*@\w/;
const STATEMENT_END = /[;{]\s*$|^\s*(import|export|const|let|function)\b/;

/** Whether 1-based `line` of `source` is a class decorator, or a class declaration with a decorator above it. */
export function isDecoratedClassLine(source, line) {
  const lines = source.split("\n");
  const text = lines[line - 1] ?? "";
  if (DECORATOR.test(text)) {
    // Walk down through the decorators (possibly multi-line) to the class they decorate.
    for (let i = line; i < lines.length && i < line + 40; i++) {
      if (CLASS_DECLARATION.test(lines[i])) return true;
      if (lines[i].trim() === "" || /;\s*$/.test(lines[i])) return false;
    }
    return false;
  }
  if (!CLASS_DECLARATION.test(text)) return false;
  // Walk up through a (possibly multi-line) decorator until its `@`.
  for (let i = line - 2; i >= 0 && i >= line - 40; i--) {
    if (DECORATOR.test(lines[i])) return true;
    if (lines[i].trim() === "" || STATEMENT_END.test(lines[i])) return false;
  }
  return false;
}

/** Whether an istanbul branch is the decorator-metadata conditional of a decorated class. */
export function isDecoratorMetadataBranch(branch, source) {
  const start = branch?.loc?.start?.line;
  const end = branch?.loc?.end?.line ?? start;
  return branch?.type === "cond-expr" && start !== undefined && start === end && isDecoratedClassLine(source, start);
}
