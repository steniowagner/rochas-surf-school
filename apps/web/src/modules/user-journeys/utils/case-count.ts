/** "19 test cases" / "1 test case", in the page's language: `{count}` is filled in. */
export const formatCaseCount = (caseCount: { one: string; other: string }, count: number): string =>
  (count === 1 ? caseCount.one : caseCount.other).replace("{count}", String(count));
