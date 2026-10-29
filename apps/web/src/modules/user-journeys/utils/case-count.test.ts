import { describe, expect, it } from "vitest";

import { en } from "@/i18n/dictionaries/en";
import { ptBr } from "@/i18n/dictionaries/pt-br";

import { formatCaseCount } from "./case-count";

describe("formatCaseCount", () => {
  it("uses the singular for one case and the plural otherwise", () => {
    expect(formatCaseCount(en.userJourneys.caseCount, 1)).toBe("1 test case");
    expect(formatCaseCount(en.userJourneys.caseCount, 19)).toBe("19 test cases");
    expect(formatCaseCount(ptBr.userJourneys.caseCount, 33)).toBe("33 casos de teste");
  });
});
